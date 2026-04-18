/**
 * Coordinate transformation utilities
 * Converts between PDF-space and screen-space coordinates
 */

import { PDFPageProxy } from 'pdfjs-dist';

export type PageViewport = ReturnType<PDFPageProxy['getViewport']>;

/**
 * Convert PDF-space coordinates to screen-space (viewport) coordinates
 */
export function pdfToScreen(
  pdfX: number,
  pdfY: number,
  viewport: PageViewport
): { x: number; y: number } {
  const [sx, sy] = viewport.convertToViewportPoint(pdfX, pdfY);
  return { x: sx, y: sy };
}

/**
 * Convert screen-space coordinates to PDF-space coordinates
 */
export function screenToPdf(
  screenX: number,
  screenY: number,
  viewport: PageViewport
): { x: number; y: number } {
  const [px, py] = viewport.convertToPdfPoint(screenX, screenY);
  return { x: px, y: py };
}

/**
 * Convert a PDF-space bounding box to screen-space rectangle
 * Useful for rendering SVG elements
 */
export function pdfRectToScreen(
  pdfX: number,
  pdfY: number,
  pdfW: number,
  pdfH: number,
  viewport: PageViewport
): { x: number; y: number; width: number; height: number } {
  // Convert top-left corner of rect in PDF space
  // (pdfY + pdfH is the top edge since PDF y-axis is bottom-up)
  const topLeftInPdf = viewport.convertToViewportPoint(pdfX, pdfY + pdfH);
  const topRightInPdf = viewport.convertToViewportPoint(pdfX + pdfW, pdfY + pdfH);

  const screenX = topLeftInPdf[0];
  const screenY = topLeftInPdf[1];
  const screenWidth = topRightInPdf[0] - screenX;
  const screenHeight = Math.abs(
    viewport.convertToViewportPoint(pdfX, pdfY)[1] - screenY
  );

  return {
    x: screenX,
    y: screenY,
    width: screenWidth,
    height: screenHeight,
  };
}

/**
 * Get the bounding box of a screen-space rect in PDF-space
 * Used when resizing/moving objects
 */
export function screenRectToPdf(
  screenX: number,
  screenY: number,
  screenW: number,
  screenH: number,
  viewport: PageViewport
): { x: number; y: number; width: number; height: number } {
  // Top-left corner in PDF space
  const [pdfX, pdfTopY] = viewport.convertToPdfPoint(screenX, screenY);
  // Bottom-right corner in PDF space
  const [pdfRight, pdfBottomY] = viewport.convertToPdfPoint(
    screenX + screenW,
    screenY + screenH
  );

  const pdfW = pdfRight - pdfX;
  const pdfH = pdfTopY - pdfBottomY; // top - bottom

  return {
    x: pdfX,
    y: pdfBottomY, // bottom-left is the origin
    width: pdfW,
    height: pdfH,
  };
}
