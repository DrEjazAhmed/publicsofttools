'use client';

import { formatBytes, sizeDelta } from '@/lib/imageConvert';
import { FORMAT_LABELS, ImageItem, OutputFormat } from '@/lib/imageTypes';
import styles from './ImageQueueItem.module.css';

interface ImageQueueItemProps {
  item: ImageItem;
  outputFormat: OutputFormat;
  onConvert: () => void;
  onDownload: () => void;
  onRemove: () => void;
}

export default function ImageQueueItem({
  item,
  outputFormat,
  onConvert,
  onDownload,
  onRemove,
}: ImageQueueItemProps) {
  const originalSize = formatBytes(item.file.size);
  const outputSize = item.outputSize ? formatBytes(item.outputSize) : null;
  const delta = item.outputSize ? sizeDelta(item.file.size, item.outputSize) : null;

  return (
    <div className={`${styles.item} ${styles[item.status]}`}>

      {/* Thumbnail */}
      <div className={styles.thumb}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.previewUrl} alt={item.file.name} className={styles.thumbImg} />
      </div>

      {/* File info */}
      <div className={styles.info}>
        <p className={styles.name} title={item.file.name}>{item.file.name}</p>
        <p className={styles.meta}>
          {item.naturalWidth} × {item.naturalHeight}px &nbsp;·&nbsp; {originalSize}
        </p>

        {/* Status line */}
        <div className={styles.status}>
          {item.status === 'idle' && (
            <span className={styles.badgeIdle}>Ready</span>
          )}
          {item.status === 'processing' && (
            <span className={styles.badgeProcessing}>
              <span className={styles.spinner} />
              Converting…
            </span>
          )}
          {item.status === 'done' && outputSize && (
            <span className={styles.badgeDone}>
              ✓ {FORMAT_LABELS[outputFormat]} · {outputSize}
              {delta !== null && (
                <span className={delta <= 0 ? styles.saving : styles.growing}>
                  &nbsp;({delta > 0 ? '+' : ''}{delta}%)
                </span>
              )}
            </span>
          )}
          {item.status === 'error' && (
            <span className={styles.badgeError} title={item.error}>
              ✕ {item.error ?? 'Failed'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {item.status !== 'processing' && (
          <button
            className={styles.btnConvert}
            onClick={onConvert}
            title={item.status === 'done' ? 'Re-convert with current settings' : 'Convert this image'}
          >
            ▶
          </button>
        )}
        {item.status === 'done' && (
          <button
            className={styles.btnDownload}
            onClick={onDownload}
            title="Download converted image"
          >
            ↓
          </button>
        )}
        {item.status === 'processing' && (
          <div className={styles.btnPlaceholder} />
        )}
        <button
          className={styles.btnRemove}
          onClick={onRemove}
          title="Remove"
        >
          ×
        </button>
      </div>

    </div>
  );
}
