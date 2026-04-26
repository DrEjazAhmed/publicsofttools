'use client';

import { useCallback, useReducer } from 'react';
import { convertImage, getOutputFilename, preprocessFile } from '@/lib/imageConvert';
import {
  ACCEPTED_INPUT_EXTENSIONS,
  ACCEPTED_INPUT_TYPES,
  ConversionSettings,
  DEFAULT_SETTINGS,
  ImageItem,
  ItemStatus,
} from '@/lib/imageTypes';

// ── State / Actions ───────────────────────────────────────────────────

interface State {
  items: ImageItem[];
  settings: ConversionSettings;
  batchConverting: boolean;
}

type Action =
  | { type: 'ADD_ITEMS'; items: ImageItem[] }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'CLEAR_ALL' }
  | { type: 'UPDATE_SETTINGS'; patch: Partial<ConversionSettings> }
  | { type: 'ITEM_STATUS'; id: string; status: ItemStatus }
  | { type: 'ITEM_DONE'; id: string; blob: Blob; url: string }
  | { type: 'ITEM_ERROR'; id: string; error: string }
  | { type: 'BATCH_CONVERTING'; value: boolean };

function revokeItem(item: ImageItem): void {
  URL.revokeObjectURL(item.previewUrl);
  if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
}

function patchItem(
  items: ImageItem[],
  id: string,
  patch: Partial<ImageItem>,
): ImageItem[] {
  return items.map(i => (i.id === id ? { ...i, ...patch } : i));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ITEMS':
      return { ...state, items: [...state.items, ...action.items] };

    case 'REMOVE_ITEM': {
      const target = state.items.find(i => i.id === action.id);
      if (target) revokeItem(target);
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    }

    case 'CLEAR_ALL':
      state.items.forEach(revokeItem);
      return { ...state, items: [] };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'ITEM_STATUS':
      return { ...state, items: patchItem(state.items, action.id, { status: action.status }) };

    case 'ITEM_DONE':
      return {
        ...state,
        items: patchItem(state.items, action.id, {
          status: 'done',
          outputBlob: action.blob,
          outputUrl: action.url,
          outputSize: action.blob.size,
          error: undefined,
        }),
      };

    case 'ITEM_ERROR':
      return {
        ...state,
        items: patchItem(state.items, action.id, { status: 'error', error: action.error }),
      };

    case 'BATCH_CONVERTING':
      return { ...state, batchConverting: action.value };

    default:
      return state;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function readImageDimensions(
  url: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not read image dimensions'));
    img.src = url;
  });
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// ── Hook ──────────────────────────────────────────────────────────────

export interface ImageConverterReturn {
  items: ImageItem[];
  settings: ConversionSettings;
  batchConverting: boolean;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeItem: (id: string) => void;
  clearAll: () => void;
  updateSettings: (patch: Partial<ConversionSettings>) => void;
  convertOne: (item: ImageItem) => Promise<void>;
  convertAll: () => Promise<void>;
  downloadOne: (item: ImageItem) => void;
  downloadAll: () => void;
}

export function useImageConverter(): ImageConverterReturn {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    settings: DEFAULT_SETTINGS,
    batchConverting: false,
  });

  // ── File ingestion ────────────────────────────────────────────────

  const addFiles = useCallback(async (files: FileList | File[]) => {
    // Accept by MIME type or by file extension (HEIC/TIFF often arrive with
    // an empty MIME type depending on OS/browser registration)
    const extPattern = new RegExp(
      `(${ACCEPTED_INPUT_EXTENSIONS.replace(/\./g, '\\.').replace(/,/g, '|')})$`,
      'i',
    );
    const accepted = Array.from(files).filter(
      f => ACCEPTED_INPUT_TYPES.has(f.type) || extPattern.test(f.name),
    );
    if (!accepted.length) return;

    const newItems = await Promise.all(
      accepted.map(async (file): Promise<ImageItem> => {
        // preprocessFile handles HEIC/TIFF decoding; returns a blob URL
        // that HTMLImageElement can render natively
        const previewUrl = await preprocessFile(file);
        const { width, height } = await readImageDimensions(previewUrl);
        return {
          id: crypto.randomUUID(),
          file,
          previewUrl,
          naturalWidth: width,
          naturalHeight: height,
          status: 'idle',
        };
      }),
    );

    dispatch({ type: 'ADD_ITEMS', items: newItems });
  }, []);

  // ── Item management ───────────────────────────────────────────────

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const updateSettings = useCallback((patch: Partial<ConversionSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', patch });
  }, []);

  // ── Conversion ────────────────────────────────────────────────────

  // settings is passed explicitly so callers can snapshot it for batch ops
  const processItem = useCallback(
    async (item: ImageItem, settings: ConversionSettings): Promise<void> => {
      dispatch({ type: 'ITEM_STATUS', id: item.id, status: 'processing' });
      try {
        const blob = await convertImage(item, settings);
        const url = URL.createObjectURL(blob);
        dispatch({ type: 'ITEM_DONE', id: item.id, blob, url });
      } catch (err) {
        dispatch({
          type: 'ITEM_ERROR',
          id: item.id,
          error: err instanceof Error ? err.message : 'Conversion failed',
        });
      }
    },
    [],
  );

  const convertOne = useCallback(
    (item: ImageItem) => processItem(item, state.settings),
    [processItem, state.settings],
  );

  const convertAll = useCallback(async () => {
    const convertible = state.items.filter(i => i.status !== 'processing');
    if (!convertible.length) return;

    // Snapshot settings so all items in the batch use identical config
    const { settings } = state;
    dispatch({ type: 'BATCH_CONVERTING', value: true });
    await Promise.all(convertible.map(item => processItem(item, settings)));
    dispatch({ type: 'BATCH_CONVERTING', value: false });
  }, [state, processItem]);

  // ── Download ──────────────────────────────────────────────────────

  const downloadOne = useCallback(
    (item: ImageItem) => {
      if (!item.outputUrl) return;
      triggerDownload(
        item.outputUrl,
        getOutputFilename(item.file.name, state.settings.outputFormat),
      );
    },
    [state.settings.outputFormat],
  );

  const downloadAll = useCallback(() => {
    state.items
      .filter(i => i.status === 'done')
      .forEach(downloadOne);
  }, [state.items, downloadOne]);

  return {
    items: state.items,
    settings: state.settings,
    batchConverting: state.batchConverting,
    addFiles,
    removeItem,
    clearAll,
    updateSettings,
    convertOne,
    convertAll,
    downloadOne,
    downloadAll,
  };
}
