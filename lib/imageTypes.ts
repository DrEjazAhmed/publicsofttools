export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/bmp' | 'image/tiff';

export type Rotation = 0 | 90 | 180 | 270;

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/bmp': 'BMP',
  'image/tiff': 'TIFF',
};

export const FORMAT_EXTENSIONS: Record<OutputFormat, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
};

export const OUTPUT_FORMATS: OutputFormat[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff',
];

/** Formats that support a quality parameter (BMP and PNG are lossless) */
export const LOSSY_FORMATS: ReadonlySet<OutputFormat> = new Set([
  'image/jpeg',
  'image/webp',
]);

/** MIME types accepted as input */
export const ACCEPTED_INPUT_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/heic',
  'image/heif',
  // empty string — common when OS doesn't register HEIC/TIFF MIME
  '',
]);

export const ACCEPTED_INPUT_EXTENSIONS = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif';

// ── Domain types ──────────────────────────────────────────────────────

export type ItemStatus = 'idle' | 'processing' | 'done' | 'error';

export interface ImageItem {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  status: ItemStatus;
  outputBlob?: Blob;
  outputUrl?: string;
  outputSize?: number;
  error?: string;
}

export interface ConversionSettings {
  outputFormat: OutputFormat;
  quality: number;            // 0.1–1.0; applies only to LOSSY_FORMATS
  resizeEnabled: boolean;
  targetWidth: number;
  targetHeight: number;
  maintainAspectRatio: boolean;
  rotation: Rotation;
  flipHorizontal: boolean;
  flipVertical: boolean;
  grayscale: boolean;
}

export const DEFAULT_SETTINGS: ConversionSettings = {
  outputFormat: 'image/jpeg',
  quality: 0.92,
  resizeEnabled: false,
  targetWidth: 1920,
  targetHeight: 1080,
  maintainAspectRatio: true,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  grayscale: false,
};
