'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import styles from './QRCodeGenerator.module.css';

type ErrorLevel = 'L' | 'M' | 'Q' | 'H';

const SIZE_MAP = { small: 200, medium: 300, large: 400 };

export default function QRCodeGenerator() {
  const [text, setText] = useState('');
  const [size, setSize] = useState<keyof typeof SIZE_MAP>('medium');
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>('M');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [hasQR, setHasQR] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const px = SIZE_MAP[size];

    if (!text.trim()) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = px;
        canvas.height = px;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, px, px);
      }
      setHasQR(false);
      return;
    }

    QRCode.toCanvas(canvas, text, {
      width: px,
      margin: 2,
      errorCorrectionLevel: errorLevel,
      color: { dark: fgColor, light: bgColor },
    }).then(() => setHasQR(true)).catch(() => setHasQR(false));
  }, [text, size, errorLevel, fgColor, bgColor]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputSection}>
        <label className={styles.label} htmlFor="qr-text">Text or URL</label>
        <textarea
          id="qr-text"
          className={styles.textarea}
          placeholder="Enter text or paste a URL…"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
        />

        <div className={styles.options}>
          <div className={styles.optionGroup}>
            <label className={styles.optionLabel}>Size</label>
            <select
              className={styles.select}
              value={size}
              onChange={e => setSize(e.target.value as keyof typeof SIZE_MAP)}
            >
              <option value="small">Small (200px)</option>
              <option value="medium">Medium (300px)</option>
              <option value="large">Large (400px)</option>
            </select>
          </div>

          <div className={styles.optionGroup}>
            <label className={styles.optionLabel}>Error correction</label>
            <select
              className={styles.select}
              value={errorLevel}
              onChange={e => setErrorLevel(e.target.value as ErrorLevel)}
            >
              <option value="L">Low (7%)</option>
              <option value="M">Medium (15%)</option>
              <option value="Q">Quartile (25%)</option>
              <option value="H">High (30%)</option>
            </select>
          </div>

          <div className={styles.optionGroup}>
            <label className={styles.optionLabel}>Foreground</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={fgColor}
                onChange={e => setFgColor(e.target.value)}
              />
              <span className={styles.colorHex}>{fgColor}</span>
            </div>
          </div>

          <div className={styles.optionGroup}>
            <label className={styles.optionLabel}>Background</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                className={styles.colorInput}
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
              />
              <span className={styles.colorHex}>{bgColor}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.previewSection}>
        <div className={styles.canvasWrapper}>
          <canvas ref={canvasRef} className={styles.canvas} />
          {!text.trim() && (
            <div className={styles.placeholder}>
              <span>Enter text above to generate a QR code</span>
            </div>
          )}
        </div>

        <button
          className={styles.downloadBtn}
          onClick={handleDownload}
          disabled={!hasQR}
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
