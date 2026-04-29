'use client';

import { useState, useRef, useCallback, DragEvent } from 'react';
import { PDFDocument } from 'pdf-lib';
import styles from './PDFMerge.module.css';

type Tab = 'merge' | 'split';

interface PDFFile {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  sizeMB: string;
}

type Status = { type: 'idle' } | { type: 'busy'; msg: string } | { type: 'error'; msg: string };

interface DownloadResult {
  url: string;
  name: string;
}

function formatMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function loadPDFFile(file: File): Promise<PDFFile> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    id: crypto.randomUUID(),
    name: file.name,
    bytes,
    pageCount: doc.getPageCount(),
    sizeMB: formatMB(file.size),
  };
}

function parsePageRanges(input: string, total: number): number[][] {
  const groups: number[][] = [];
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);

  if (parts.length === 0) {
    return [Array.from({ length: total }, (_, i) => i)];
  }

  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(s => parseInt(s.trim(), 10));
      if (isNaN(a) || isNaN(b)) continue;
      const lo = Math.max(1, Math.min(a, b));
      const hi = Math.min(total, Math.max(a, b));
      groups.push(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i - 1));
    } else {
      const n = parseInt(part, 10);
      if (!isNaN(n) && n >= 1 && n <= total) groups.push([n - 1]);
    }
  }

  return groups.length ? groups : [Array.from({ length: total }, (_, i) => i)];
}

export default function PDFMerge() {
  const [tab, setTab] = useState<Tab>('merge');

  // Merge state
  const [mergeFiles, setMergeFiles] = useState<PDFFile[]>([]);
  const [mergeDragOver, setMergeDragOver] = useState(false);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  // Split state
  const [splitFile, setSplitFile] = useState<PDFFile | null>(null);
  const [splitDragOver, setSplitDragOver] = useState(false);
  const [splitMode, setSplitMode] = useState<'range' | 'every'>('range');
  const [splitRange, setSplitRange] = useState('');
  const [splitEvery, setSplitEvery] = useState(2);
  const splitInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const [results, setResults] = useState<DownloadResult[]>([]);

  // ── Merge file helpers ──────────────────────────────────────────────

  const addMergeFiles = useCallback(async (files: FileList | File[]) => {
    const pdfs = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!pdfs.length) return;
    setStatus({ type: 'busy', msg: 'Loading files…' });
    try {
      const loaded = await Promise.all(pdfs.map(loadPDFFile));
      setMergeFiles(prev => [...prev, ...loaded]);
      setStatus({ type: 'idle' });
    } catch {
      setStatus({ type: 'error', msg: 'Failed to load one or more PDFs.' });
    }
  }, []);

  const handleMergeDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setMergeDragOver(false);
    addMergeFiles(e.dataTransfer.files);
  }, [addMergeFiles]);

  const moveFile = (id: string, dir: -1 | 1) => {
    setMergeFiles(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const removeFile = (id: string) => setMergeFiles(prev => prev.filter(f => f.id !== id));

  // ── Split file helpers ──────────────────────────────────────────────

  const loadSplitFile = useCallback(async (files: FileList | File[]) => {
    const pdf = Array.from(files).find(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (!pdf) return;
    setStatus({ type: 'busy', msg: 'Loading PDF…' });
    try {
      setSplitFile(await loadPDFFile(pdf));
      setStatus({ type: 'idle' });
    } catch {
      setStatus({ type: 'error', msg: 'Could not load this PDF.' });
    }
  }, []);

  const handleSplitDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setSplitDragOver(false);
    loadSplitFile(e.dataTransfer.files);
  }, [loadSplitFile]);

  // ── Merge action ────────────────────────────────────────────────────

  const doMerge = async () => {
    if (mergeFiles.length < 2) return;
    setStatus({ type: 'busy', msg: 'Merging PDFs…' });
    setResults([]);
    try {
      const merged = await PDFDocument.create();
      for (const f of mergeFiles) {
        const src = await PDFDocument.load(f.bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResults([{ url, name: 'merged.pdf' }]);
      setStatus({ type: 'idle' });
    } catch (err) {
      setStatus({ type: 'error', msg: 'Merge failed. Make sure the PDFs are not encrypted.' });
    }
  };

  // ── Split action ────────────────────────────────────────────────────

  const doSplit = async () => {
    if (!splitFile) return;
    setStatus({ type: 'busy', msg: 'Splitting PDF…' });
    setResults([]);
    try {
      const src = await PDFDocument.load(splitFile.bytes, { ignoreEncryption: true });
      const total = src.getPageCount();
      let groups: number[][] = [];

      if (splitMode === 'every') {
        const n = Math.max(1, splitEvery);
        for (let i = 0; i < total; i += n) {
          groups.push(Array.from({ length: Math.min(n, total - i) }, (_, j) => i + j));
        }
      } else {
        groups = parsePageRanges(splitRange, total);
      }

      const out: DownloadResult[] = [];
      for (let i = 0; i < groups.length; i++) {
        const pages = groups[i];
        const doc = await PDFDocument.create();
        const copied = await doc.copyPages(src, pages);
        copied.forEach(p => doc.addPage(p));
        const bytes = await doc.save();
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const label = splitMode === 'every'
          ? `part-${i + 1}.pdf`
          : `pages-${pages.map(p => p + 1).join('-')}.pdf`;
        out.push({ url, name: label });
      }

      setResults(out);
      setStatus({ type: 'idle' });
    } catch {
      setStatus({ type: 'error', msg: 'Split failed. Make sure the PDF is not encrypted.' });
    }
  };

  const clearResults = () => {
    results.forEach(r => URL.revokeObjectURL(r.url));
    setResults([]);
  };

  const isBusy = status.type === 'busy';

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'merge' ? styles.tabActive : ''}`}
          onClick={() => { setTab('merge'); clearResults(); setStatus({ type: 'idle' }); }}
        >
          Merge PDFs
        </button>
        <button
          className={`${styles.tab} ${tab === 'split' ? styles.tabActive : ''}`}
          onClick={() => { setTab('split'); clearResults(); setStatus({ type: 'idle' }); }}
        >
          Split PDF
        </button>
      </div>

      {/* ── MERGE TAB ───────────────────────────────────── */}
      {tab === 'merge' && (
        <>
          <div
            className={`${styles.dropzone} ${mergeDragOver ? styles.dropzoneActive : ''}`}
            onDragOver={e => { e.preventDefault(); setMergeDragOver(true); }}
            onDragLeave={() => setMergeDragOver(false)}
            onDrop={handleMergeDrop}
            onClick={() => mergeInputRef.current?.click()}
          >
            <div className={styles.dropIcon}>📄</div>
            <p><strong>Click or drag PDFs here</strong></p>
            <small>PDF files only · You can add multiple files</small>
            <input
              ref={mergeInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              style={{ display: 'none' }}
              onChange={e => e.target.files && addMergeFiles(e.target.files)}
            />
          </div>

          {mergeFiles.length > 0 && (
            <div className={styles.fileList}>
              {mergeFiles.map((f, idx) => (
                <div key={f.id} className={styles.fileItem}>
                  <span className={styles.fileIcon}>📄</span>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName}>{f.name}</div>
                    <div className={styles.fileMeta}>{f.pageCount} page{f.pageCount !== 1 ? 's' : ''} · {f.sizeMB}</div>
                  </div>
                  <div className={styles.fileActions}>
                    <button className={styles.iconBtn} onClick={() => moveFile(f.id, -1)} disabled={idx === 0} title="Move up">↑</button>
                    <button className={styles.iconBtn} onClick={() => moveFile(f.id, 1)} disabled={idx === mergeFiles.length - 1} title="Move down">↓</button>
                    <button className={`${styles.iconBtn} ${styles.removeBtn}`} onClick={() => removeFile(f.id)} title="Remove">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              disabled={mergeFiles.length < 2 || isBusy}
              onClick={doMerge}
            >
              {isBusy ? 'Merging…' : `Merge ${mergeFiles.length} PDF${mergeFiles.length !== 1 ? 's' : ''}`}
            </button>
            {mergeFiles.length > 0 && (
              <button className={styles.secondaryBtn} onClick={() => { setMergeFiles([]); clearResults(); }}>
                Clear all
              </button>
            )}
          </div>
        </>
      )}

      {/* ── SPLIT TAB ───────────────────────────────────── */}
      {tab === 'split' && (
        <>
          {!splitFile ? (
            <div
              className={`${styles.dropzone} ${splitDragOver ? styles.dropzoneActive : ''}`}
              onDragOver={e => { e.preventDefault(); setSplitDragOver(true); }}
              onDragLeave={() => setSplitDragOver(false)}
              onDrop={handleSplitDrop}
              onClick={() => splitInputRef.current?.click()}
            >
              <div className={styles.dropIcon}>📄</div>
              <p><strong>Click or drag a PDF here</strong></p>
              <small>Single PDF file</small>
              <input
                ref={splitInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={e => e.target.files && loadSplitFile(e.target.files)}
              />
            </div>
          ) : (
            <div className={styles.fileList}>
              <div className={styles.fileItem}>
                <span className={styles.fileIcon}>📄</span>
                <div className={styles.fileInfo}>
                  <div className={styles.fileName}>{splitFile.name}</div>
                  <div className={styles.fileMeta}>{splitFile.pageCount} page{splitFile.pageCount !== 1 ? 's' : ''} · {splitFile.sizeMB}</div>
                </div>
                <div className={styles.fileActions}>
                  <button className={`${styles.iconBtn} ${styles.removeBtn}`} onClick={() => { setSplitFile(null); clearResults(); }}>✕</button>
                </div>
              </div>
            </div>
          )}

          {splitFile && (
            <div className={styles.controls}>
              <div className={styles.controlRow}>
                <span className={styles.controlLabel}>Split by</span>
                <div className={styles.radioGroup}>
                  <label>
                    <input type="radio" name="splitMode" value="range" checked={splitMode === 'range'} onChange={() => setSplitMode('range')} />
                    Page range
                  </label>
                  <label>
                    <input type="radio" name="splitMode" value="every" checked={splitMode === 'every'} onChange={() => setSplitMode('every')} />
                    Every N pages
                  </label>
                </div>
              </div>

              {splitMode === 'range' ? (
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Pages</span>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="e.g. 1-3, 5, 7-9"
                    value={splitRange}
                    onChange={e => setSplitRange(e.target.value)}
                  />
                  <span className={styles.hint}>Leave blank to get all pages as one file</span>
                </div>
              ) : (
                <div className={styles.controlRow}>
                  <span className={styles.controlLabel}>Every</span>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    max={splitFile.pageCount}
                    value={splitEvery}
                    onChange={e => setSplitEvery(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ maxWidth: 80 }}
                  />
                  <span className={styles.hint}>page{splitEvery !== 1 ? 's' : ''} → {Math.ceil(splitFile.pageCount / splitEvery)} part{Math.ceil(splitFile.pageCount / splitEvery) !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.primaryBtn}
              disabled={!splitFile || isBusy}
              onClick={doSplit}
            >
              {isBusy ? 'Splitting…' : 'Split PDF'}
            </button>
          </div>
        </>
      )}

      {/* ── Status ───────────────────────────────────────── */}
      {status.type === 'busy' && (
        <p className={styles.status}>{status.msg}</p>
      )}
      {status.type === 'error' && (
        <p className={`${styles.status} ${styles.statusError}`}>{status.msg}</p>
      )}

      {/* ── Results ──────────────────────────────────────── */}
      {results.length > 0 && (
        <div className={styles.results}>
          {results.map(r => (
            <a key={r.url} href={r.url} download={r.name} className={styles.downloadLink}>
              ⬇ {r.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
