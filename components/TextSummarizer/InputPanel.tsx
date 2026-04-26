'use client';

import { useRef, useState } from 'react';
import type { InputTab, SummaryLength } from '@/hooks/useTextSummarizer';
import styles from './InputPanel.module.css';

interface Props {
  activeTab: InputTab;
  onTabChange: (tab: InputTab) => void;
  text: string;
  onTextChange: (v: string) => void;
  url: string;
  onUrlChange: (v: string) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  summaryLength: SummaryLength;
  onLengthChange: (l: SummaryLength) => void;
  isLoading: boolean;
  loadingStep: string;
  onSubmit: () => void;
  onClear: () => void;
}

const TABS: { id: InputTab; label: string; icon: string }[] = [
  { id: 'text', label: 'Paste Text', icon: '📝' },
  { id: 'file', label: 'Upload File', icon: '📎' },
  { id: 'url',  label: 'Web Link',   icon: '🔗' },
];

const LENGTHS: { id: SummaryLength; label: string; hint: string }[] = [
  { id: 'short',  label: 'Short',  hint: '2–3 sentences' },
  { id: 'medium', label: 'Medium', hint: '1 paragraph'   },
  { id: 'long',   label: 'Long',   hint: '3–4 paragraphs' },
];

export default function InputPanel({
  activeTab, onTabChange,
  text, onTextChange,
  url, onUrlChange,
  file, onFileChange,
  summaryLength, onLengthChange,
  isLoading, loadingStep,
  onSubmit, onClear,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileChange(f);
  }

  const hasInput =
    (activeTab === 'text' && text.trim().length > 0) ||
    (activeTab === 'url' && url.trim().length > 0) ||
    (activeTab === 'file' && file !== null);

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.inputArea}>
        {activeTab === 'text' && (
          <textarea
            className={styles.textarea}
            placeholder="Paste your article, news, document, or any long text here…"
            value={text}
            onChange={e => onTextChange(e.target.value)}
            rows={12}
          />
        )}

        {activeTab === 'url' && (
          <div className={styles.urlArea}>
            <input
              className={styles.urlInput}
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={e => onUrlChange(e.target.value)}
            />
            <p className={styles.urlHint}>Paste a link to a news article, blog post, or any webpage.</p>
          </div>
        )}

        {activeTab === 'file' && (
          <div
            className={`${styles.dropzone} ${dragging ? styles.dropzoneDragging : ''} ${file ? styles.dropzoneHasFile : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className={styles.fileInput}
              onChange={e => onFileChange(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <>
                <span className={styles.fileIcon}>📄</span>
                <p className={styles.fileName}>{file.name}</p>
                <p className={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</p>
                <button
                  type="button"
                  className={styles.removeFile}
                  onClick={e => { e.stopPropagation(); onFileChange(null); }}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <span className={styles.dropIcon}>📁</span>
                <p className={styles.dropTitle}>Drop file here or click to browse</p>
                <p className={styles.dropHint}>Supports PDF, Word (.docx), and plain text (.txt)</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.lengthSelector}>
          <span className={styles.lengthLabel}>Summary length</span>
          <div className={styles.lengthOptions}>
            {LENGTHS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={`${styles.lengthBtn} ${summaryLength === opt.id ? styles.lengthBtnActive : ''}`}
                onClick={() => onLengthChange(opt.id)}
                title={opt.hint}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          {hasInput && (
            <button type="button" className={styles.clearBtn} onClick={onClear} disabled={isLoading}>
              Clear
            </button>
          )}
          <button
            type="button"
            className={styles.submitBtn}
            onClick={onSubmit}
            disabled={isLoading || !hasInput}
          >
            {isLoading ? (
              <><span className={styles.spinner} />{loadingStep || 'Processing…'}</>
            ) : (
              '✨ Summarize'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
