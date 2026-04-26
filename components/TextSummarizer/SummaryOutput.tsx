'use client';

import { useState } from 'react';
import styles from './SummaryOutput.module.css';

interface Props {
  summary: string;
  isExtractive?: boolean;
  error: string | null;
}

export default function SummaryOutput({ summary, isExtractive, error }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) {
    return (
      <div className={styles.errorCard}>
        <span className={styles.errorIcon}>⚠️</span>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>✨</span>
        <p className={styles.emptyTitle}>Your summary will appear here</p>
        <p className={styles.emptyHint}>Paste text, upload a file, or enter a URL — then click Summarize.</p>
      </div>
    );
  }

  const wordCount = summary.trim().split(/\s+/).length;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Summary</span>
        <span className={styles.wordCount}>{wordCount} words</span>
      </div>
      {isExtractive && (
        <div className={styles.extractiveNote}>
          ⓘ Extractive summary — key sentences selected from the original text. Add a <strong>HUGGINGFACE_API_KEY</strong> for AI-generated summaries.
        </div>
      )}

      <p className={styles.summaryText}>{summary}</p>

      <div className={styles.cardActions}>
        <button type="button" className={styles.actionBtn} onClick={handleCopy}>
          {copied ? '✅ Copied!' : '📋 Copy'}
        </button>
        <button type="button" className={styles.actionBtn} onClick={handleDownload}>
          💾 Download
        </button>
      </div>
    </div>
  );
}
