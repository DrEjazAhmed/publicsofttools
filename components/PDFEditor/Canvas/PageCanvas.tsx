'use client';

import { useEffect, useRef, useState } from 'react';
import { PDFPageProxy } from 'pdfjs-dist';
import { Annotation, TextAnnotation, ToolType } from '@/lib/annotationTypes';
import { pdfRectToScreen } from '@/lib/coordinateUtils';
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

  // Text annotation being edited on this page
  const editingTextAnn = editingId
    ? (annotations.find((a) => a.id === editingId && a.type === 'text') as TextAnnotation | undefined)
    : undefined;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fallback focus: autoFocus can be unreliable in React StrictMode
  useEffect(() => {
    if (editingTextAnn && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextAnn?.id]);

  const handleTextEditDone = () => {
    if (editingTextAnn && textareaRef.current) {
      onAnnotationUpdate(editingTextAnn.id, editingTextAnn.page, {
        content: textareaRef.current.value,
      });
    }
    onEditing(null);
  };

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
      {viewport && editingTextAnn && (() => {
        const rect = pdfRectToScreen(
          editingTextAnn.x, editingTextAnn.y,
          editingTextAnn.width, editingTextAnn.height,
          viewport
        );
        return (
          <textarea
            key={editingTextAnn.id}
            ref={textareaRef}
            defaultValue={editingTextAnn.content}
            onFocus={(e) => e.target.select()}
            onBlur={handleTextEditDone}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); handleTextEditDone(); }
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${Math.max(rect.width, 120)}px`,
              minHeight: `${Math.max(rect.height, 28)}px`,
              fontSize: `${editingTextAnn.fontSize * viewport.scale}px`,
              fontFamily: editingTextAnn.fontFamily.replace('-', ' '),
              color: editingTextAnn.fontColor,
              fontWeight: editingTextAnn.bold ? 'bold' : 'normal',
              fontStyle: editingTextAnn.italic ? 'italic' : 'normal',
              opacity: editingTextAnn.opacity,
              background: 'rgba(255,255,255,0.95)',
              border: '2px solid #667eea',
              borderRadius: '2px',
              resize: 'none',
              outline: 'none',
              zIndex: 20,
              padding: '2px 4px',
              lineHeight: '1.3',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          />
        );
      })()}
    </div>
  );
}
