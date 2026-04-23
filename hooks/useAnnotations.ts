import { useCallback, useRef, useState } from 'react';
import {
  Annotation,
  PageAnnotations,
  HistoryEntry,
} from '@/lib/annotationTypes';

const MAX_HISTORY = 50;

interface HistoryState {
  entries: HistoryEntry[];
  index: number;
}

export function useAnnotations() {
  const [pageAnnotations, setPageAnnotations] = useState<PageAnnotations>(new Map());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pageAnnotationsRef = useRef(pageAnnotations);
  pageAnnotationsRef.current = pageAnnotations;

  const historyRef = useRef<HistoryState>({
    entries: [{ pageAnnotations: new Map() }],
    index: 0,
  });

  const pushHistory = useCallback((annotations: PageAnnotations) => {
    const h = historyRef.current;
    const entries = h.entries.slice(0, h.index + 1);
    entries.push({ pageAnnotations: new Map(annotations) });
    if (entries.length > MAX_HISTORY) entries.shift();
    const newIndex = entries.length - 1;
    historyRef.current = { entries, index: newIndex };
    setCanUndo(newIndex > 0);
    setCanRedo(false);
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    const prev = pageAnnotationsRef.current;
    const newMap = new Map(prev);
    const pageAnnots = newMap.get(annotation.page) || [];
    newMap.set(annotation.page, [...pageAnnots, annotation]);
    setPageAnnotations(newMap);
    pushHistory(newMap);
  }, [pushHistory]);

  const updateAnnotation = useCallback((id: string, page: number, changes: Partial<Annotation>) => {
    setPageAnnotations((prev) => {
      const newMap = new Map(prev);
      const pageAnnots = newMap.get(page) || [];
      const idx = pageAnnots.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const updated = [...pageAnnots];
      updated[idx] = { ...updated[idx], ...changes } as Annotation;
      newMap.set(page, updated);
      return newMap;
    });
  }, []);

  const findAnnotationPage = (map: PageAnnotations, id: string, hint: number): number => {
    if ((map.get(hint) || []).some((a) => a.id === id)) return hint;
    for (const [p, anns] of map) {
      if (anns.some((a) => a.id === id)) return p;
    }
    return hint;
  };

  const deleteAnnotation = useCallback((id: string, page: number) => {
    const prev = pageAnnotationsRef.current;
    const newMap = new Map(prev);
    const actualPage = findAnnotationPage(newMap, id, page);
    const pageAnnots = newMap.get(actualPage) || [];
    newMap.set(actualPage, pageAnnots.filter((a) => a.id !== id));
    setPageAnnotations(newMap);
    pushHistory(newMap);
  }, [pushHistory]);

  const moveAnnotation = useCallback((id: string, page: number, dx: number, dy: number) => {
    setPageAnnotations((prev) => {
      const newMap = new Map(prev);
      const actualPage = findAnnotationPage(newMap, id, page);
      const pageAnnots = newMap.get(actualPage) || [];
      const idx = pageAnnots.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const ann = pageAnnots[idx];
      const updated = [...pageAnnots];
      updated[idx] = {
        ...ann,
        x: ann.x + dx,
        y: ann.y + dy,
        ...(ann.type === 'line' && {
          x2: (ann as any).x2 + dx,
          y2: (ann as any).y2 + dy,
        }),
      };
      newMap.set(actualPage, updated);
      return newMap;
    });
  }, []);

  const resizeAnnotation = useCallback((
    id: string,
    page: number,
    newX: number,
    newY: number,
    newWidth: number,
    newHeight: number,
  ) => {
    setPageAnnotations((prev) => {
      const newMap = new Map(prev);
      const actualPage = findAnnotationPage(newMap, id, page);
      const pageAnnots = newMap.get(actualPage) || [];
      const idx = pageAnnots.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const updated = [...pageAnnots];
      updated[idx] = { ...updated[idx], x: newX, y: newY, width: newWidth, height: newHeight };
      newMap.set(actualPage, updated);
      return newMap;
    });
  }, []);

  const getPageAnnotations = useCallback(
    (page: number): Annotation[] => pageAnnotations.get(page) || [],
    [pageAnnotations]
  );

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.index <= 0) return;
    const newIndex = h.index - 1;
    historyRef.current = { ...h, index: newIndex };
    setPageAnnotations(new Map(h.entries[newIndex].pageAnnotations));
    setCanUndo(newIndex > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.index >= h.entries.length - 1) return;
    const newIndex = h.index + 1;
    historyRef.current = { ...h, index: newIndex };
    setPageAnnotations(new Map(h.entries[newIndex].pageAnnotations));
    setCanUndo(true);
    setCanRedo(newIndex < h.entries.length - 1);
  }, []);

  return {
    pageAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    moveAnnotation,
    resizeAnnotation,
    getPageAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
