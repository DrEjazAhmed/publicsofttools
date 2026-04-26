'use client';

import { ImageItem, OutputFormat } from '@/lib/imageTypes';
import Dropzone from './Dropzone';
import ImageQueueItem from './ImageQueueItem';
import styles from './ImageQueue.module.css';

interface ImageQueueProps {
  items: ImageItem[];
  outputFormat: OutputFormat;
  onAddFiles: (files: File[]) => void;
  onConvert: (item: ImageItem) => void;
  onDownload: (item: ImageItem) => void;
  onRemove: (id: string) => void;
}

export default function ImageQueue({
  items,
  outputFormat,
  onAddFiles,
  onConvert,
  onDownload,
  onRemove,
}: ImageQueueProps) {
  return (
    <div className={styles.queue}>
      <Dropzone onFiles={onAddFiles} compact />

      {items.length > 0 && (
        <ul className={styles.list}>
          {items.map(item => (
            <li key={item.id}>
              <ImageQueueItem
                item={item}
                outputFormat={outputFormat}
                onConvert={() => onConvert(item)}
                onDownload={() => onDownload(item)}
                onRemove={() => onRemove(item.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
