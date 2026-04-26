'use client';

import { useRef, useState, DragEvent } from 'react';
import { ACCEPTED_INPUT_EXTENSIONS } from '@/lib/imageTypes';
import styles from './Dropzone.module.css';

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export default function Dropzone({ onFiles, compact = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    onFiles(Array.from(fileList));
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${compact ? styles.compact : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      aria-label="Upload images"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_INPUT_EXTENSIONS}
        className={styles.input}
        onChange={e => handleFiles(e.target.files)}
        onClick={e => { (e.target as HTMLInputElement).value = ''; }}
      />

      {compact ? (
        <div className={styles.compactContent}>
          <span className={styles.compactIcon}>+</span>
          <span>Add more images</span>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.icon}>🖼️</div>
          <h2 className={styles.heading}>Drop images here</h2>
          <p className={styles.sub}>or click to browse your files</p>
          <p className={styles.formats}>
            JPEG · PNG · WebP · GIF · BMP · TIFF · SVG · AVIF
          </p>
          <button className={styles.button} type="button" tabIndex={-1}>
            Choose Files
          </button>
        </div>
      )}
    </div>
  );
}
