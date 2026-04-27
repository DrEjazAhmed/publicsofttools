'use client';

import { useState } from 'react';
import styles from './SummaryOutput.module.css';

interface Props {
  summary: string;
  summaryMode?: 'openai' | 'extractive' | null;
  isExtractive?: boolean;
  error: string | null;
}

export default function SummaryOutput({ summary, summaryMode, isExtractive, error }: Props) {
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
        <div className={styles.cardMeta}>
          {summaryMode === 'openai' && <span className={styles.modeBadgeAi}>✨ AI</span>}
          {summaryMode === 'extractive' && <span className={styles.modeBadgeExtract}>📄 Extractive</span>}
          <span className={styles.wordCount}>{wordCount} words</span>
        </div>
      </div>
      {isExtractive && (
        <div className={styles.extractiveNote}>
          ⓘ No API key detected — showing an extractive summary (original sentences). Add <strong>OPENAI_API_KEY</strong> in Vercel environment variables for AI-generated summaries.
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
