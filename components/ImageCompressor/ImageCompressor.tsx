'use client';

import { useState, useRef, useCallback, DragEvent } from 'react';
import styles from './ImageCompressor.module.css';

type OutputFormat = 'jpeg' | 'webp' | 'png';
type ItemStatus = 'pending' | 'processing' | 'done' | 'error';

interface ImageItem {
  id: string;
  file: File;
  thumbUrl: string;
  originalSize: number;
  compressedSize: number | null;
  compressedUrl: string | null;
  status: ItemStatus;
}

function formatBytes(n: number) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function savingPct(orig: number, compressed: number) {
  return Math.round((1 - compressed / orig) * 100);
}

async function compressImage(
  file: File,
  quality: number,
  maxWidth: number,
  format: OutputFormat
): Promise<{ blob: Blob; size: number }> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });
  URL.revokeObjectURL(url);

  let w = img.naturalWidth;
  let h = img.naturalHeight;

  if (maxWidth > 0 && w > maxWidth) {
    h = Math.round(h * (maxWidth / w));
    w = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (format === 'jpeg') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(img, 0, 0, w, h);

  const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
  const q = format === 'png' ? undefined : quality / 100;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      mimeType,
      q
    );
  });

  return { blob, size: blob.size };
}

const ACCEPTED = 'image/png,image/jpeg,image/webp,image/bmp,image/tiff';

export default function ImageCompressor() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [quality, setQuality] = useState(80);
  const [maxWidth, setMaxWidth] = useState(0);
  const [format, setFormat] = useState<OutputFormat>('jpeg');
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const images = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!images.length) return;
    const newItems: ImageItem[] = images.map(file => ({
      id: crypto.randomUUID(),
      file,
      thumbUrl: URL.createObjectURL(file),
      originalSize: file.size,
      compressedSize: null,
      compressedUrl: null,
      status: 'pending',
    }));
    setItems(prev => [...prev, ...newItems]);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeItem = (id: string) => {
    setItems(prev => {
      const item = prev.find(i => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.thumbUrl);
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      }
      return prev.filter(i => i.id !== id);
    });
  };

  const updateItem = (id: string, patch: Partial<ImageItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const compressAll = async () => {
    setBusy(true);
    const pending = items.filter(i => i.status !== 'done');

    for (const item of pending) {
      updateItem(item.id, { status: 'processing' });
      try {
        const { blob, size } = await compressImage(item.file, quality, maxWidth, format);
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
        const url = URL.createObjectURL(blob);
        updateItem(item.id, { status: 'done', compressedSize: size, compressedUrl: url });
      } catch {
        updateItem(item.id, { status: 'error' });
      }
    }
    setBusy(false);
  };

  const downloadOne = (item: ImageItem) => {
    if (!item.compressedUrl) return;
    const ext = format === 'jpeg' ? 'jpg' : format;
    const base = item.file.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = item.compressedUrl;
    a.download = `${base}-compressed.${ext}`;
    a.click();
  };

  const clearAll = () => {
    items.forEach(i => {
      URL.revokeObjectURL(i.thumbUrl);
      if (i.compressedUrl) URL.revokeObjectURL(i.compressedUrl);
    });
    setItems([]);
  };

  const qualityDisabled = format === 'png';

  return (
    <div className={styles.wrapper}>
      {/* Drop zone */}
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className={styles.dropIcon}>🖼️</div>
        <p><strong>Click or drag images here</strong></p>
        <small>PNG, JPG, WebP, BMP · Multiple files supported</small>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          style={{ display: 'none' }}
          onChange={e => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* Settings */}
      <div className={styles.settings}>
        <div className={styles.settingRow}>
          <label className={styles.settingLabel}>
            Output format
          </label>
          <select value={format} onChange={e => setFormat(e.target.value as OutputFormat)}>
            <option value="jpeg">JPEG (best compression for photos)</option>
            <option value="webp">WebP (modern, excellent compression)</option>
            <option value="png">PNG (lossless, larger file)</option>
          </select>
        </div>

        <div className={styles.settingRow}>
          <label className={styles.settingLabel}>
            Quality
            {!qualityDisabled && <span className={styles.settingValue}>{quality}%</span>}
          </label>
          <input
            type="range"
            className={styles.slider}
            min={10}
            max={100}
            value={quality}
            onChange={e => setQuality(Number(e.target.value))}
            disabled={qualityDisabled}
          />
          {qualityDisabled && <span className={styles.hint}>PNG is lossless — quality setting does not apply</span>}
        </div>

        <div className={styles.settingRow}>
          <label className={styles.settingLabel}>Max width (px)</label>
          <input
            type="number"
            min={0}
            max={8000}
            step={100}
            value={maxWidth === 0 ? '' : maxWidth}
            placeholder="Original (no resize)"
            onChange={e => setMaxWidth(Math.max(0, parseInt(e.target.value) || 0))}
          />
          <span className={styles.hint}>Leave blank to keep original dimensions</span>
        </div>
      </div>

      {/* Image list */}
      {items.length > 0 && (
        <div className={styles.imageList}>
          {items.map(item => {
            const saving = item.compressedSize != null ? savingPct(item.originalSize, item.compressedSize) : null;
            return (
              <div key={item.id} className={styles.imageItem}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumbUrl} alt={item.file.name} className={styles.thumb} />
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{item.file.name}</div>
                  <div className={styles.itemSizes}>
                    <span className={styles.sizeOriginal}>{formatBytes(item.originalSize)}</span>
                    {item.compressedSize != null && (
                      <>
                        <span className={styles.sizeArrow}>→</span>
                        <span className={`${styles.sizeNew} ${saving != null && saving <= 0 ? styles.sizeSame : ''}`}>
                          {formatBytes(item.compressedSize)}
                        </span>
                        {saving != null && saving > 0 && (
                          <span className={styles.saving}>−{saving}%</span>
                        )}
                      </>
                    )}
                  </div>
                  <span className={`${styles.statusBadge} ${styles[`status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`]}`}>
                    {item.status === 'pending' ? 'Pending' : item.status === 'processing' ? 'Compressing…' : item.status === 'done' ? 'Done' : 'Error'}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    className={styles.downloadBtn}
                    disabled={item.status !== 'done'}
                    onClick={() => downloadOne(item)}
                  >
                    ⬇ Save
                  </button>
                  <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {items.length > 0 && (
        <div className={styles.actions}>
          <button
            className={styles.primaryBtn}
            disabled={busy || items.length === 0}
            onClick={compressAll}
          >
            {busy ? 'Compressing…' : `Compress ${items.length} image${items.length !== 1 ? 's' : ''}`}
          </button>
          <button className={styles.secondaryBtn} onClick={clearAll}>Clear all</button>
        </div>
      )}
    </div>
  );
}
