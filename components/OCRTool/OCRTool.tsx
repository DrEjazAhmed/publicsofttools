'use client';

import { useState, useRef, useCallback, DragEvent } from 'react';
import styles from './OCRTool.module.css';

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'por', label: 'Portuguese' },
  { code: 'ita', label: 'Italian' },
  { code: 'nld', label: 'Dutch' },
  { code: 'rus', label: 'Russian' },
  { code: 'ara', label: 'Arabic' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'hin', label: 'Hindi' },
  { code: 'tur', label: 'Turkish' },
  { code: 'pol', label: 'Polish' },
];

const ACCEPTED = '.png,.jpg,.jpeg,.webp,.bmp,.tiff,.tif,.gif';

function formatBytes(n: number) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

export default function OCRTool() {
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [lang, setLang] = useState('eng');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadImage = useCallback((file: File) => {
    if (image) URL.revokeObjectURL(image.url);
    const url = URL.createObjectURL(file);
    setImage({ file, url });
    setResult('');
    setError('');
    setProgress(0);
    setProgressLabel('');
  }, [image]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadImage(file);
  }, [loadImage]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImage(file);
  };

  const clear = () => {
    if (image) URL.revokeObjectURL(image.url);
    setImage(null);
    setResult('');
    setError('');
    setProgress(0);
    setProgressLabel('');
  };

  const runOCR = async () => {
    if (!image) return;
    setBusy(true);
    setResult('');
    setError('');
    setProgress(0);
    setProgressLabel('Initialising…');

    try {
      const { createWorker } = await import('tesseract.js');

      const worker = await createWorker(lang, 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'loading tesseract core') {
            setProgressLabel('Loading OCR engine…');
            setProgress(m.progress * 20);
          } else if (m.status === 'initializing tesseract') {
            setProgressLabel('Initialising…');
            setProgress(20 + m.progress * 10);
          } else if (m.status === 'loading language traineddata') {
            setProgressLabel(`Loading language data…`);
            setProgress(30 + m.progress * 30);
          } else if (m.status === 'initializing api') {
            setProgressLabel('Starting recognition…');
            setProgress(60 + m.progress * 10);
          } else if (m.status === 'recognizing text') {
            setProgressLabel('Recognising text…');
            setProgress(70 + m.progress * 30);
          }
        },
      });

      const { data } = await worker.recognize(image.file);
      await worker.terminate();

      const text = data.text.trim();
      setResult(text);
      setWordCount(text ? text.split(/\s+/).filter(Boolean).length : 0);
      setProgress(100);
      setProgressLabel('Done');
    } catch (err) {
      setError('OCR failed. Please try another image or a clearer photo of the text.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.wrapper}>
      {!image ? (
        <div
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className={styles.dropIcon}>🔍</div>
          <p><strong>Click or drag an image here</strong></p>
          <small>PNG, JPG, WebP, BMP, TIFF, GIF</small>
          <input ref={inputRef} type="file" accept={ACCEPTED} style={{ display: 'none' }} onChange={handleFile} />
        </div>
      ) : (
        <div className={styles.previewArea}>
          <div className={styles.imagePreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="Selected" />
            <div className={styles.imageInfo}>{image.file.name} · {formatBytes(image.file.size)}</div>
          </div>
        </div>
      )}

      <div className={styles.controls}>
        <select
          className={styles.select}
          value={lang}
          onChange={e => setLang(e.target.value)}
          disabled={busy}
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <button
          className={styles.primaryBtn}
          disabled={!image || busy}
          onClick={runOCR}
        >
          {busy ? 'Recognising…' : 'Extract Text'}
        </button>

        {image && !busy && (
          <button className={styles.clearBtn} onClick={clear}>Clear</button>
        )}
      </div>

      {busy && (
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>{progressLabel}</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <p className={styles.statusError}>{error}</p>}

      {result !== '' && !busy && (
        <div className={styles.resultBox}>
          <div className={styles.resultHeader}>
            <div>
              <h3>Extracted Text</h3>
              <div className={styles.resultMeta}>{wordCount} word{wordCount !== 1 ? 's' : ''} · {result.length} character{result.length !== 1 ? 's' : ''}</div>
            </div>
            <button
              className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
              onClick={copy}
            >
              {copied ? 'Copied!' : 'Copy text'}
            </button>
          </div>
          <textarea
            className={styles.resultText}
            value={result}
            onChange={e => setResult(e.target.value)}
          />
        </div>
      )}

      {!result && !busy && !error && image && (
        <div className={styles.emptyState}>
          Select a language above and click <strong>Extract Text</strong> to start.
        </div>
      )}
    </div>
  );
}
