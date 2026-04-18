/**
 * PDF Export utility
 * Merges annotations with the original PDF using pdf-lib
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from 'pdf-lib';
import {
  Annotation,
  TextAnnotation,
  HighlightAnnotation,
  RectangleAnnotation,
  CircleAnnotation,
  LineAnnotation,
  WatermarkAnnotation,
  PageAnnotations,
} from './annotationTypes';

/**
 * Convert hex color to RGB (0-1 range for pdf-lib)
 */
function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Resolve PDF font based on annotation properties
 */
function resolveFont(
  ann: TextAnnotation,
  fonts: Record<string, any>
): any {
  const { fontFamily, bold, italic } = ann;

  if (fontFamily === 'Courier') {
    return fonts.courier;
  } else if (fontFamily === 'Times-Roman') {
    return fonts.timesRoman;
  } else {
    // Helvetica
    if (bold && italic) {
      return fonts.helveticaBoldOblique || fonts.helveticaBold || fonts.helvetica;
    } else if (bold) {
      return fonts.helveticaBold;
    } else if (italic) {
      return fonts.helveticaOblique || fonts.helvetica;
    }
    return fonts.helvetica;
  }
}

/**
 * Export PDF with all annotations merged in
 */
export async function exportPDF(
  originalFile: File,
  pageAnnotations: PageAnnotations
): Promise<Uint8Array | ArrayBuffer> {
  // Load the original PDF
  const arrayBuffer = await originalFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Embed all standard fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(
    StandardFonts.HelveticaOblique
  );
  const helveticaBoldOblique = await pdfDoc.embedFont(
    StandardFonts.HelveticaBoldOblique
  );
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const pages = pdfDoc.getPages();
  const fonts = {
    helvetica,
    helveticaBold,
    helveticaOblique,
    helveticaBoldOblique,
    timesRoman,
    courier,
  };

  // Process each page
  for (const [pageNum, annotations] of pageAnnotations.entries()) {
    // 1-indexed to 0-indexed
    const pageIndex = pageNum - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    // Draw each annotation
    for (const ann of annotations) {
      try {
        switch (ann.type) {
          case 'text': {
            const textAnn = ann as TextAnnotation;
            const font = resolveFont(textAnn, fonts);
            page.drawText(textAnn.content, {
              x: textAnn.x,
              y: textAnn.y,
              size: textAnn.fontSize,
              font,
              color: hexToRgb(textAnn.fontColor),
              opacity: textAnn.opacity,
            });
            break;
          }

          case 'highlight': {
            const highlightAnn = ann as HighlightAnnotation;
            page.drawRectangle({
              x: highlightAnn.x,
              y: highlightAnn.y,
              width: highlightAnn.width,
              height: highlightAnn.height,
              color: hexToRgb(highlightAnn.color),
              opacity: highlightAnn.opacity,
              borderWidth: 0,
            });
            break;
          }

          case 'rectangle': {
            const rectAnn = ann as RectangleAnnotation;
            page.drawRectangle({
              x: rectAnn.x,
              y: rectAnn.y,
              width: rectAnn.width,
              height: rectAnn.height,
              color: rectAnn.fillColor ? hexToRgb(rectAnn.fillColor) : undefined,
              borderColor: hexToRgb(rectAnn.strokeColor),
              borderWidth: rectAnn.strokeWidth,
              opacity: rectAnn.opacity,
            });
            break;
          }

          case 'circle': {
            const circleAnn = ann as CircleAnnotation;
            const cx = circleAnn.x + circleAnn.width / 2;
            const cy = circleAnn.y + circleAnn.height / 2;
            const xScale = circleAnn.width / 2;
            const yScale = circleAnn.height / 2;

            page.drawEllipse({
              x: cx,
              y: cy,
              xScale,
              yScale,
              color: circleAnn.fillColor ? hexToRgb(circleAnn.fillColor) : undefined,
              borderColor: hexToRgb(circleAnn.strokeColor),
              borderWidth: circleAnn.strokeWidth,
              opacity: circleAnn.opacity,
            });
            break;
          }

          case 'line': {
            const lineAnn = ann as LineAnnotation;
            page.drawLine({
              start: { x: lineAnn.x, y: lineAnn.y },
              end: { x: lineAnn.x2, y: lineAnn.y2 },
              color: hexToRgb(lineAnn.strokeColor),
              thickness: lineAnn.strokeWidth,
              opacity: lineAnn.opacity,
            });
            break;
          }

          case 'watermark': {
            const watermarkAnn = ann as WatermarkAnnotation;

            // Determine which pages to apply the watermark to
            const pagesToApply = watermarkAnn.displayOnAllPages
              ? Array.from({ length: pages.length }, (_, i) => i)
              : [pageIndex];

            for (const applyPageIndex of pagesToApply) {
              const applyPage = pages[applyPageIndex];

              // Calculate center position for watermark
              const cx = watermarkAnn.x + watermarkAnn.width / 2;
              const cy = watermarkAnn.y + watermarkAnn.height / 2;

              applyPage.drawText(watermarkAnn.text, {
                x: cx,
                y: cy,
                size: watermarkAnn.fontSize,
                font: helvetica,
                color: hexToRgb(watermarkAnn.color),
                opacity: watermarkAnn.opacity,
                rotate: degrees(watermarkAnn.angle),
              });
            }
            break;
          }
        }
      } catch (err) {
        console.warn(`Failed to draw annotation on page ${pageNum}:`, err);
      }
    }
  }

  // Save and return
  const bytes = await pdfDoc.save();
  return bytes as Uint8Array;
}
