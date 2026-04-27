'use client';

import { useState } from 'react';
import styles from './DevTools.module.css';

// ── JWT Decoder ───────────────────────────────────────────────────────

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function JWTDecoder() {
  const [token, setToken] = useState('');

  let header: Record<string, unknown> | null = null;
  let payload: Record<string, unknown> | null = null;
  let errorMsg = '';

  if (token.trim()) {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      errorMsg = 'Invalid JWT — must have 3 dot-separated parts.';
    } else {
      try {
        header = JSON.parse(base64UrlDecode(parts[0]));
        payload = JSON.parse(base64UrlDecode(parts[1]));
      } catch {
        errorMsg = 'Invalid JWT — could not decode header or payload.';
      }
    }
  }

  const formatDate = (ts: unknown) =>
    typeof ts === 'number' ? new Date(ts * 1000).toLocaleString() : null;

  const isExpired =
    payload?.exp && typeof payload.exp === 'number'
      ? Date.now() > payload.exp * 1000
      : null;

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>JWT Decoder</h2>
      <textarea
        className={`${styles.textarea} ${styles.monoTextarea}`}
        rows={4}
        placeholder="Paste your JWT token here…"
        value={token}
        onChange={e => setToken(e.target.value)}
        spellCheck={false}
      />
      {token.trim() && errorMsg && (
        <p className={styles.errorMsg}>{errorMsg}</p>
      )}
      {header && payload && (
        <>
          <div className={styles.jwtGrid}>
            <div>
              <div className={styles.jwtSectionLabel}>Header</div>
              <pre className={styles.jsonPre}>{JSON.stringify(header, null, 2)}</pre>
            </div>
            <div>
              <div className={styles.jwtSectionLabel}>Payload</div>
              <pre className={styles.jsonPre}>{JSON.stringify(payload, null, 2)}</pre>
            </div>
          </div>
          <div className={styles.jwtMeta}>
            {payload.iss != null && (
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Issuer</span>
                <span>{String(payload.iss)}</span>
              </div>
            )}
            {payload.sub != null && (
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Subject</span>
                <span>{String(payload.sub)}</span>
              </div>
            )}
            {payload.iat != null && (
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Issued at</span>
                <span>{formatDate(payload.iat)}</span>
              </div>
            )}
            {payload.exp != null && (
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Expires</span>
                <span className={isExpired ? styles.expiredBadge : styles.validBadge}>
                  {formatDate(payload.exp)} &mdash; {isExpired ? 'Expired' : 'Valid'}
                </span>
              </div>
            )}
          </div>
          <p className={styles.sigNote}>
            Signature is not verified — validation requires the secret key server-side.
          </p>
        </>
      )}
    </div>
  );
}

// ── Regex Tester ──────────────────────────────────────────────────────

function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false });
  const [testStr, setTestStr] = useState('');

  const flagStr = (Object.keys(flags) as Array<keyof typeof flags>)
    .filter(k => flags[k])
    .join('');

  let matches: RegExpMatchArray[] = [];
  let regexError = '';

  if (pattern && testStr) {
    try {
      const reFlags = new Set(flagStr);
      reFlags.add('g');
      const allMatches = [...testStr.matchAll(new RegExp(pattern, [...reFlags].join('')))];
      matches = flags.g ? allMatches : allMatches.slice(0, 1);
    } catch (e) {
      regexError = (e as Error).message;
    }
  }

  const toggleFlag = (f: keyof typeof flags) =>
    setFlags(prev => ({ ...prev, [f]: !prev[f] }));

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>Regex Tester</h2>
      <div className={styles.regexRow}>
        <span className={styles.regexSlash}>/</span>
        <input
          className={styles.regexInput}
          placeholder="pattern"
          value={pattern}
          onChange={e => setPattern(e.target.value)}
          spellCheck={false}
        />
        <span className={styles.regexSlash}>/</span>
        <div className={styles.flagsRow}>
          {(['g', 'i', 'm', 's'] as const).map(f => (
            <label
              key={f}
              className={`${styles.flagLabel} ${flags[f] ? styles.flagActive : ''}`}
              title={{ g: 'Global', i: 'Case insensitive', m: 'Multiline', s: 'Dot matches newline' }[f]}
            >
              <input type="checkbox" checked={flags[f]} onChange={() => toggleFlag(f)} hidden />
              {f}
            </label>
          ))}
        </div>
      </div>
      {regexError && <p className={styles.errorMsg}>{regexError}</p>}
      <textarea
        className={styles.textarea}
        rows={6}
        placeholder="Paste your test string here…"
        value={testStr}
        onChange={e => setTestStr(e.target.value)}
        spellCheck={false}
      />
      {pattern && testStr && !regexError && (
        <div className={styles.matchResults}>
          <div className={styles.matchCount}>
            {matches.length === 0
              ? 'No matches found'
              : `${matches.length} match${matches.length !== 1 ? 'es' : ''} found`}
          </div>
          {matches.length > 0 && (
            <ol className={styles.matchList}>
              {matches.map((m, i) => (
                <li key={i} className={styles.matchItem}>
                  <span className={styles.matchValue}>{m[0] === '' ? '(empty)' : m[0]}</span>
                  <span className={styles.matchMeta}>index {m.index}</span>
                  {m.length > 1 && (
                    <span className={styles.matchMeta}>
                      groups: {m.slice(1).map(g => g ?? 'undefined').join(', ')}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ── JSON / CSV / XML Converter ────────────────────────────────────────

type ConvMode = 'json-csv' | 'csv-json' | 'json-xml' | 'xml-json';

function jsonToCsv(json: string): string {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error('JSON root must be an array of objects');
  if (data.length === 0) return '';
  const keys = Object.keys(data[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [keys.join(','), ...data.map(row => keys.map(k => esc((row as Record<string, unknown>)[k])).join(','))].join('\n');
}

function csvToJson(csv: string): string {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
      else cur += c;
    }
    result.push(cur);
    return result;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const vals = parseLine(l);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
  return JSON.stringify(rows, null, 2);
}

function jsonToXml(json: string): string {
  const data = JSON.parse(json);
  const toXml = (val: unknown, tag: string, indent: number): string => {
    const pad = '  '.repeat(indent);
    if (Array.isArray(val)) {
      return val.map(item => toXml(item, tag, indent)).join('\n');
    }
    if (val !== null && typeof val === 'object') {
      const inner = Object.entries(val as Record<string, unknown>)
        .map(([k, v]) => toXml(v, k, indent + 1))
        .join('\n');
      return `${pad}<${tag}>\n${inner}\n${pad}</${tag}>`;
    }
    return `${pad}<${tag}>${String(val ?? '')}</${tag}>`;
  };
  const root = Array.isArray(data) ? 'items' : 'root';
  const inner = Array.isArray(data)
    ? data.map(item => toXml(item, 'item', 1)).join('\n')
    : Object.entries(data as Record<string, unknown>).map(([k, v]) => toXml(v, k, 1)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<${root}>\n${inner}\n</${root}>`;
}

function xmlToJson(xml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('Invalid XML: ' + err.textContent?.slice(0, 120));

  function nodeToObj(node: Element): unknown {
    const children = Array.from(node.children);
    if (children.length === 0) return node.textContent ?? '';
    const tags = children.map(c => c.tagName);
    if (tags.length > 1 && tags.every(t => t === tags[0])) {
      return children.map(nodeToObj);
    }
    return Object.fromEntries(children.map(c => [c.tagName, nodeToObj(c)]));
  }

  return JSON.stringify(nodeToObj(doc.documentElement), null, 2);
}

const modeLabels: Record<ConvMode, string> = {
  'json-csv': 'JSON → CSV',
  'csv-json': 'CSV → JSON',
  'json-xml': 'JSON → XML',
  'xml-json': 'XML → JSON',
};

function DataConverter() {
  const [mode, setMode] = useState<ConvMode>('json-csv');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function convert() {
    setError('');
    setOutput('');
    try {
      let result = '';
      if (mode === 'json-csv') result = jsonToCsv(input);
      else if (mode === 'csv-json') result = csvToJson(input);
      else if (mode === 'json-xml') result = jsonToXml(input);
      else if (mode === 'xml-json') result = xmlToJson(input);
      setOutput(result);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const inputLabel = mode.split('-')[0].toUpperCase();

  return (
    <div className={styles.card}>
      <h2 className={styles.cardTitle}>JSON / CSV / XML Converter</h2>
      <div className={styles.modeRow}>
        {(Object.keys(modeLabels) as ConvMode[]).map(m => (
          <button
            key={m}
            className={`${styles.modeBtn} ${mode === m ? styles.modeBtnActive : ''}`}
            onClick={() => { setMode(m); setOutput(''); setError(''); }}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>
      <textarea
        className={`${styles.textarea} ${styles.monoTextarea}`}
        rows={8}
        placeholder={`Paste your ${inputLabel} here…`}
        value={input}
        onChange={e => { setInput(e.target.value); setError(''); setOutput(''); }}
        spellCheck={false}
      />
      <div className={styles.buttonRow}>
        <button className={styles.actionBtn} onClick={convert} disabled={!input.trim()}>
          Convert
        </button>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
      {output && (
        <div className={styles.outputWrapper}>
          <textarea
            className={`${styles.textarea} ${styles.outputTextarea} ${styles.monoTextarea}`}
            rows={10}
            value={output}
            readOnly
            spellCheck={false}
          />
          <button className={`${styles.actionBtn} ${styles.copyBtn}`} onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────

export default function DevTools() {
  return (
    <div className={styles.wrapper}>
      <JWTDecoder />
      <RegexTester />
      <DataConverter />
    </div>
  );
}
