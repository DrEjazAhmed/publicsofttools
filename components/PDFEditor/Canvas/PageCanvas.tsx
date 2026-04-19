'use client';

import { useEffect, useRef, useState } from 'react';
import { PDFPageProxy } from 'pdfjs-dist';
import { Annotation, ToolType } from '@/lib/annotationTypes';
import AnnotationLayer from './AnnotationLayer';
import styles from './PageCanvas.module.css';

// PageViewport type from pdfjs-dist
export type PageViewport = ReturnType<PDFPageProxy['getViewport']>;

interface PageCanvasProps {
  pageNum: number;
  pdfPage: PDFPageProxy;
  zoom: number;
  activeTool: ToolType;
  annotations: Annotation[];
  selectedId: string | null;
  editingId: string | null;
  onAnnotationAdd: (ann: Annotation) => void;
  onAnnotationUpdate: (id: string, page: number, changes: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string, page: number) => void;
  onAnnotationMove: (id: string, page: number, dx: number, dy: number) => void;
  onAnnotationResize: (
    id: string,
    page: number,
    x: number,
    y: number,
    w: number,
    h: number
  ) => void;
  onSelect: (id: string | null) => void;
  onEditing: (id: string | null) => void;
}

export default function PageCanvas({
  pageNum,
  pdfPage,
  zoom,
  activeTool,
  annotations,
  selectedId,
  editingId,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationMove,
  onAnnotationResize,
  onSelect,
  onEditing,
}: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewport, setViewport] = useState<PageViewport | null>(null);

  // Render PDF page to canvas
  useEffect(() => {
    if (!canvasRef.current || !pdfPage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pageViewport = pdfPage.getViewport({ scale: zoom });

    // Handle HiDPI displays
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(pageViewport.width * pixelRatio);
    canvas.height = Math.floor(pageViewport.height * pixelRatio);
    canvas.style.width = `${pageViewport.width}px`;
    canvas.style.height = `${pageViewport.height}px`;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // Render page
    const renderTask = pdfPage.render({
      canvasContext: ctx,
      viewport: pageViewport,
    });

    renderTask.promise.catch((err) => {
      // Ignore cancellation errors
      if (err.name !== 'RenderingCancelledException') {
        console.error('PDF render error:', err);
      }
    });

    setViewport(pageViewport);

    return () => {
      renderTask.cancel();
    };
  }, [pdfPage, zoom]);

  // Canvas must always be in the DOM so the useEffect can find canvasRef.current.
  // Hiding it (instead of conditional return) breaks the chicken-and-egg: effect needs
  // the canvas to render, but viewport (which gates rendering) is set inside the effect.
  return (
    <div className={styles.pageWrapper}>
      {!viewport && <div className={styles.loadingPlaceholder}>Loading page...</div>}
      <canvas
        ref={canvasRef}
        className={styles.pdfCanvas}
        style={!viewport ? { display: 'none' } : undefined}
      />
      {viewport && (
        <AnnotationLayer
          pageNum={pageNum}
          viewport={viewport}
          annotations={annotations}
          selectedId={selectedId}
          editingId={editingId}
          activeTool={activeTool}
          onAnnotationAdd={onAnnotationAdd}
          onAnnotationUpdate={onAnnotationUpdate}
          onAnnotationDelete={onAnnotationDelete}
          onAnnotationMove={onAnnotationMove}
          onAnnotationResize={onAnnotationResize}
          onSelect={onSelect}
          onEditing={onEditing}
        />
      )}
    </div>
  );
}
