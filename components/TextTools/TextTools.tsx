'use client';

import { useState } from 'react';
import styles from './TextTools.module.css';

// ── Word / Character Counter ──────────────────────────────────────────

function WordCounter() {
  const [text, setText] = useState('');

  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.trim() ? (text.match(/[^.!?]*[.!?]+/g) ?? []).length : 0;
  const paragraphs = text.trim() ? text.split(/\n\s*\n/).filter(p => p.trim()).length : 0;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Word &amp; Character Counter</h2>
      <textarea
        className={styles.textarea}
        rows={6}
        placeholder="Paste or type your text here…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{chars.toLocaleString()}</span>
          <span className={styles.statLabel}>Characters</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{charsNoSpaces.toLocaleString()}</span>
          <span className={styles.statLabel}>No spaces</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{words.toLocaleString()}</span>
          <span className={styles.statLabel}>Words</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sentences.toLocaleString()}</span>
          <span className={styles.statLabel}>Sentences</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{paragraphs.toLocaleString()}</span>
          <span className={styles.statLabel}>Paragraphs</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>~{readingTime} min</span>
          <span className={styles.statLabel}>Read time</span>
        </div>
      </div>
    </div>
  );
}

// ── Case Converter ────────────────────────────────────────────────────

function toTitleCase(s: string) {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function toSentenceCase(s: string) {
  return s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase());
}

function CaseConverter() {
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  function apply(fn: (s: string) => string) {
    setText(fn(text));
  }

  function handleCopy() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Case Converter</h2>
      <textarea
        className={styles.textarea}
        rows={6}
        placeholder="Paste or type your text here…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className={styles.buttonRow}>
        <button className={styles.actionBtn} onClick={() => apply(s => s.toUpperCase())}>UPPER</button>
        <button className={styles.actionBtn} onClick={() => apply(s => s.toLowerCase())}>lower</button>
        <button className={styles.actionBtn} onClick={() => apply(toTitleCase)}>Title Case</button>
        <button className={styles.actionBtn} onClick={() => apply(toSentenceCase)}>Sentence case</button>
        <button className={`${styles.actionBtn} ${styles.copyBtn}`} onClick={handleCopy} disabled={!text}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ── URL / Base64 Encoder-Decoder ──────────────────────────────────────

function encodeBase64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

function decodeBase64(s: string) {
  try { return decodeURIComponent(escape(atob(s.trim()))); }
  catch { return 'Invalid Base64 input'; }
}

function decodeURL(s: string) {
  try { return decodeURIComponent(s); }
  catch { return 'Invalid URL-encoded input'; }
}

function EncoderDecoder() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  function run(fn: (s: string) => string) {
    setOutput(fn(input));
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>URL / Base64 Encoder &amp; Decoder</h2>
      <textarea
        className={styles.textarea}
        rows={4}
        placeholder="Input text…"
        value={input}
        onChange={e => { setInput(e.target.value); setOutput(''); }}
      />
      <div className={styles.buttonRow}>
        <button className={styles.actionBtn} onClick={() => run(encodeURIComponent)} disabled={!input}>URL Encode</button>
        <button className={styles.actionBtn} onClick={() => run(decodeURL)} disabled={!input}>URL Decode</button>
        <button className={styles.actionBtn} onClick={() => run(encodeBase64)} disabled={!input}>Base64 Encode</button>
        <button className={styles.actionBtn} onClick={() => run(decodeBase64)} disabled={!input}>Base64 Decode</button>
      </div>
      <div className={styles.outputWrapper}>
        <textarea
          className={`${styles.textarea} ${styles.outputTextarea}`}
          rows={4}
          placeholder="Output will appear here…"
          value={output}
          readOnly
        />
        <button
          className={`${styles.actionBtn} ${styles.copyBtn}`}
          onClick={handleCopy}
          disabled={!output}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ── JSON Formatter ────────────────────────────────────────────────────

function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState<2 | 4>( 2);
  const [copied, setCopied] = useState(false);

  function format() {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  }

  function minify() {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e) {
      setError((e as Error).message);
      setOutput('');
    }
  }

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>JSON Formatter &amp; Beautifier</h2>
      <textarea
        className={styles.textarea}
        rows={8}
        placeholder='Paste your JSON here…'
        value={input}
        onChange={e => { setInput(e.target.value); setError(''); setOutput(''); }}
        spellCheck={false}
      />
      <div className={styles.buttonRow}>
        <button className={styles.actionBtn} onClick={format} disabled={!input.trim()}>Beautify</button>
        <button className={styles.actionBtn} onClick={minify} disabled={!input.trim()}>Minify</button>
        <label className={styles.indentLabel}>
          Indent:
          <select
            className={styles.indentSelect}
            value={indent}
            onChange={e => setIndent(Number(e.target.value) as 2 | 4)}
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </label>
      </div>
      {error && <p className={styles.jsonError}>{error}</p>}
      {output && (
        <div className={styles.outputWrapper}>
          <textarea
            className={`${styles.textarea} ${styles.outputTextarea} ${styles.monoTextarea}`}
            rows={10}
            value={output}
            readOnly
            spellCheck={false}
          />
          <button
            className={`${styles.actionBtn} ${styles.copyBtn}`}
            onClick={handleCopy}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────

export default function TextTools() {
  return (
    <div className={styles.wrapper}>
      <WordCounter />
      <CaseConverter />
      <EncoderDecoder />
      <JsonFormatter />
    </div>
  );
}
