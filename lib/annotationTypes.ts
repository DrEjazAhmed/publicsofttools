/**
 * Annotation Data Model
 * All coordinates are in PDF-space points (origin bottom-left, y-axis up)
 */

export type AnnotationType =
  | 'text'
  | 'highlight'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'watermark';

export interface BaseAnnotation {
  id: string;           // crypto.randomUUID()
  page: number;         // 1-based page index
  x: number;            // PDF-space: left edge (or line x1)
  y: number;            // PDF-space: bottom edge (or line y1)
  width: number;        // PDF-space: bounding width
  height: number;       // PDF-space: bounding height
  locked?: boolean;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  content: string;
  fontSize: number;     // points
  fontFamily: 'Helvetica' | 'Times-Roman' | 'Courier';
  fontColor: string;    // hex color #RRGGBB
  bold: boolean;
  italic: boolean;
  opacity: number;      // 0–1
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  color: string;        // hex color, default "#FFFF00"
  opacity: number;      // default 0.4
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle';
  fillColor: string | null;    // null = transparent
  strokeColor: string;         // hex color
  strokeWidth: number;         // points
  opacity: number;             // 0–1
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  fillColor: string | null;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface LineAnnotation extends BaseAnnotation {
  type: 'line';
  x2: number;           // end x in PDF space
  y2: number;           // end y in PDF space
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
}

export interface WatermarkAnnotation extends BaseAnnotation {
  type: 'watermark';
  text: string;         // watermark text
  fontSize: number;     // points
  color: string;        // hex color
  opacity: number;      // 0–1, typically 0.15-0.3
  angle: number;        // degrees, typically -45 to 45
  displayOnAllPages: boolean;  // if true, watermark applies to all pages
}

export type Annotation =
  | TextAnnotation
  | HighlightAnnotation
  | RectangleAnnotation
  | CircleAnnotation
  | LineAnnotation
  | WatermarkAnnotation;

export type ToolType =
  | 'select'
  | 'text'
  | 'highlight'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'watermark'
  | 'eraser';

// Per-page annotations store
export type PageAnnotations = Map<number, Annotation[]>;

// History snapshot for undo/redo
export interface HistoryEntry {
  pageAnnotations: Map<number, Annotation[]>;
}
