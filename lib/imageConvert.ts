import {
  ConversionSettings,
  FORMAT_EXTENSIONS,
  ImageItem,
  LOSSY_FORMATS,
} from './imageTypes';

// ── Helpers ───────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = src;
  });
}

function computeDrawSize(
  naturalW: number,
  naturalH: number,
  settings: ConversionSettings,
): { width: number; height: number } {
  if (!settings.resizeEnabled) {
    return { width: naturalW, height: naturalH };
  }

  if (!settings.maintainAspectRatio) {
    return {
      width: Math.max(1, settings.targetWidth),
      height: Math.max(1, settings.targetHeight),
    };
  }

  const ratio = naturalW / naturalH;
  let w = settings.targetWidth;
  let h = settings.targetHeight;

  if (w / h > ratio) {
    w = Math.round(h * ratio);
  } else {
    h = Math.round(w / ratio);
  }

  return { width: Math.max(1, w), height: Math.max(1, h) };
}

// ── BMP encoder ───────────────────────────────────────────────────────
// Canvas.toBlob does not support image/bmp in all browsers, so we encode
// manually: 24-bit BGR, 4-byte-aligned rows, top-down (negative height).

function encodeBmp(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Blob {
  const { width: w, height: h } = canvas;
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const pixelDataSize = rowSize * h;
  const fileSize = 54 + pixelDataSize;
  const buf = new ArrayBuffer(fileSize);
  const dv = new DataView(buf);

  // File header (14 bytes)
  dv.setUint8(0, 0x42); dv.setUint8(1, 0x4d); // 'BM'
  dv.setUint32(2, fileSize, true);
  dv.setUint32(6, 0, true);
  dv.setUint32(10, 54, true); // pixel data offset

  // BITMAPINFOHEADER (40 bytes)
  dv.setUint32(14, 40, true);
  dv.setInt32(18, w, true);
  dv.setInt32(22, -h, true); // negative height = top-down scan order
  dv.setUint16(26, 1, true);
  dv.setUint16(28, 24, true); // 24 bpp
  dv.setUint32(30, 0, true);  // no compression
  dv.setUint32(34, pixelDataSize, true);
  dv.setInt32(38, 2835, true); // ~72 DPI
  dv.setInt32(42, 2835, true);
  dv.setUint32(46, 0, true);
  dv.setUint32(50, 0, true);

  const { data } = ctx.getImageData(0, 0, w, h);
  let off = 54;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      dv.setUint8(off++, data[i + 2]); // B
      dv.setUint8(off++, data[i + 1]); // G
      dv.setUint8(off++, data[i]);     // R
    }
    for (let p = w * 3; p < rowSize; p++) dv.setUint8(off++, 0);
  }

  return new Blob([buf], { type: 'image/bmp' });
}

// ── TIFF encoder ─────────────────────────────────────────────────────
// Uncompressed 24-bit RGB TIFF (little-endian). canvas.toBlob does not
// support image/tiff, so we write the binary structure manually.

function encodeTiff(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Blob {
  const { width: w, height: h } = canvas;
  const rgba = ctx.getImageData(0, 0, w, h).data;

  // Convert RGBA → packed RGB
  const pixelBytes = w * h * 3;
  const rgb = new Uint8Array(pixelBytes);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2];
  }

  // Layout: header(8) + IFD(2+12*12+4=150) + extras(22) + pixels
  const NUM_ENTRIES = 12;
  const IFD_OFFSET = 8;
  const IFD_SIZE = 2 + NUM_ENTRIES * 12 + 4;
  const EXTRA_OFFSET = IFD_OFFSET + IFD_SIZE; // BPS(6) + Xres(8) + Yres(8)
  const BPS_OFF = EXTRA_OFFSET;
  const XRES_OFF = BPS_OFF + 6;
  const YRES_OFF = XRES_OFF + 8;
  const PIX_OFF = YRES_OFF + 8;
  const buf = new ArrayBuffer(PIX_OFF + pixelBytes);
  const dv = new DataView(buf);

  // File header
  dv.setUint8(0, 0x49); dv.setUint8(1, 0x49); // 'II' little-endian
  dv.setUint16(2, 42, true);
  dv.setUint32(4, IFD_OFFSET, true);

  // IFD
  let p = IFD_OFFSET;
  dv.setUint16(p, NUM_ENTRIES, true); p += 2;

  // tag(2) type(2) count(4) value/offset(4) — TIFF types: SHORT=3 LONG=4 RATIONAL=5
  const E = (tag: number, type: number, count: number, val: number) => {
    dv.setUint16(p, tag, true);
    dv.setUint16(p + 2, type, true);
    dv.setUint32(p + 4, count, true);
    dv.setUint32(p + 8, val, true);
    p += 12;
  };
  E(256, 4, 1, w);          // ImageWidth
  E(257, 4, 1, h);          // ImageLength
  E(258, 3, 3, BPS_OFF);    // BitsPerSample — 3 SHORTs, stored at offset
  E(259, 3, 1, 1);          // Compression = none
  E(262, 3, 1, 2);          // PhotometricInterpretation = RGB
  E(273, 4, 1, PIX_OFF);    // StripOffsets
  E(277, 3, 1, 3);          // SamplesPerPixel
  E(278, 4, 1, h);          // RowsPerStrip = full image
  E(279, 4, 1, pixelBytes); // StripByteCounts
  E(282, 5, 1, XRES_OFF);   // XResolution — RATIONAL at offset
  E(283, 5, 1, YRES_OFF);   // YResolution — RATIONAL at offset
  E(296, 3, 1, 2);          // ResolutionUnit = inch
  dv.setUint32(p, 0, true); // next IFD = 0

  // BitsPerSample: [8, 8, 8]
  dv.setUint16(BPS_OFF, 8, true);
  dv.setUint16(BPS_OFF + 2, 8, true);
  dv.setUint16(BPS_OFF + 4, 8, true);

  // XResolution and YResolution: 72/1
  dv.setUint32(XRES_OFF, 72, true); dv.setUint32(XRES_OFF + 4, 1, true);
  dv.setUint32(YRES_OFF, 72, true); dv.setUint32(YRES_OFF + 4, 1, true);

  new Uint8Array(buf).set(rgb, PIX_OFF);
  return new Blob([buf], { type: 'image/tiff' });
}

// ── Input pre-processing ──────────────────────────────────────────────
// HEIC and TIFF cannot be rendered by HTMLImageElement in most browsers.
// We decode them eagerly at add-time and return a PNG blob URL the canvas
// can use. The caller is responsible for revoking the returned URL.

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  );
}

function isTiff(file: File): boolean {
  return file.type === 'image/tiff' || /\.tiff?$/i.test(file.name);
}

export async function preprocessFile(file: File): Promise<string> {
  if (isHeic(file)) {
    const { default: heic2any } = await import('heic2any');
    const result = await heic2any({ blob: file, toType: 'image/png' });
    const blob: Blob = Array.isArray(result) ? result[0] : result;
    return URL.createObjectURL(blob);
  }

  if (isTiff(file)) {
    const UTIF = await import('utif');
    const buf = await file.arrayBuffer();
    const ifds = UTIF.decode(buf);
    UTIF.decodeImage(buf, ifds[0]);
    const rgba: Uint8Array = UTIF.toRGBA8(ifds[0]);
    const { width, height } = ifds[0] as { width: number; height: number };

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(width, height);
    imgData.data.set(rgba);
    ctx.putImageData(imgData, 0, 0);

    return new Promise<string>((resolve, reject) => {
      canvas.toBlob(
        b =>
          b
            ? resolve(URL.createObjectURL(b))
            : reject(new Error('TIFF decode failed')),
        'image/png',
      );
    });
  }

  return URL.createObjectURL(file);
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Converts a single ImageItem using the provided settings.
 * Runs entirely in the browser via the Canvas 2D API.
 */
export async function convertImage(
  item: ImageItem,
  settings: ConversionSettings,
): Promise<Blob> {
  const img = await loadImage(item.previewUrl);

  const { width: drawW, height: drawH } = computeDrawSize(
    item.naturalWidth,
    item.naturalHeight,
    settings,
  );

  const swapAxes = settings.rotation === 90 || settings.rotation === 270;
  const canvasW = swapAxes ? drawH : drawW;
  const canvasH = swapAxes ? drawW : drawH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // JPEG/BMP/TIFF have no alpha — composite over white to avoid black fill
  if (
    settings.outputFormat === 'image/jpeg' ||
    settings.outputFormat === 'image/bmp' ||
    settings.outputFormat === 'image/tiff'
  ) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  if (settings.rotation !== 0) {
    ctx.rotate((settings.rotation * Math.PI) / 180);
  }
  ctx.scale(
    settings.flipHorizontal ? -1 : 1,
    settings.flipVertical ? -1 : 1,
  );
  if (settings.grayscale) {
    ctx.filter = 'grayscale(1)';
  }
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  if (settings.outputFormat === 'image/bmp') {
    return encodeBmp(canvas, ctx);
  }

  if (settings.outputFormat === 'image/tiff') {
    return encodeTiff(canvas, ctx);
  }

  const quality = LOSSY_FORMATS.has(settings.outputFormat)
    ? settings.quality
    : undefined;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob =>
        blob
          ? resolve(blob)
          : reject(new Error(`toBlob returned null for ${settings.outputFormat}`)),
      settings.outputFormat,
      quality,
    );
  });
}

// ── Utilities ─────────────────────────────────────────────────────────

export function getOutputFilename(
  originalName: string,
  format: ConversionSettings['outputFormat'],
): string {
  const stem = originalName.replace(/\.[^.]+$/, '');
  return `${stem}.${FORMAT_EXTENSIONS[format]}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Returns signed percentage change, e.g. -34 means 34% smaller. */
export function sizeDelta(original: number, output: number): number {
  return Math.round(((output - original) / original) * 100);
}
