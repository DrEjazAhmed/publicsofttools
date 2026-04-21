'use client';

import { useEffect, useRef, useState } from 'react';
import { PDFPageProxy } from 'pdfjs-dist';
import { Annotation, PDFTextItem, TextAnnotation, TextReplacements, ToolType } from '@/lib/annotationTypes';
import { pdfRectToScreen } from '@/lib/coordinateUtils';
import AnnotationLayer from './AnnotationLayer';
import styles from './PageCanvas.module.css';

export type PageViewport = ReturnType<PDFPageProxy['getViewport']>;

interface PageCanvasProps {
  pageNum: number;
  pdfPage: PDFPageProxy;
  zoom: number;
  activeTool: ToolType;
  annotations: Annotation[];
  selectedId: string | null;
  editingId: string | null;
  editingTextItemId: string | null;
  textItems: PDFTextItem[];
  textReplacements: TextReplacements;
  onAnnotationAdd: (ann: Annotation) => void;
  onAnnotationUpdate: (id: string, page: number, changes: Partial<Annotation>) => void;
  onAnnotationDelete: (id: string, page: number) => void;
  onAnnotationMove: (id: string, page: number, dx: number, dy: number) => void;
  onAnnotationResize: (id: string, page: number, x: number, y: number, w: number, h: number) => void;
  onSelect: (id: string | null) => void;
  onEditing: (id: string | null) => void;
  onTextItemsLoaded: (pageNum: number, items: PDFTextItem[]) => void;
  onTextReplace: (itemId: string, newText: string) => void;
  onTextItemEdit: (id: string) => void;
  onTextItemEditDone: () => void;
}

export default function PageCanvas({
  pageNum,
  pdfPage,
  zoom,
  activeTool,
  annotations,
  selectedId,
  editingId,
  editingTextItemId,
  textItems,
  textReplacements,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationMove,
  onAnnotationResize,
  onSelect,
  onEditing,
  onTextItemsLoaded,
  onTextReplace,
  onTextItemEdit,
  onTextItemEditDone,
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
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(pageViewport.width * pixelRatio);
    canvas.height = Math.floor(pageViewport.height * pixelRatio);
    canvas.style.width = `${pageViewport.width}px`;
    canvas.style.height = `${pageViewport.height}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const renderTask = pdfPage.render({ canvasContext: ctx, viewport: pageViewport });
    renderTask.promise.catch((err) => {
      if (err.name !== 'RenderingCancelledException') console.error('PDF render error:', err);
    });

    setViewport(pageViewport);
    return () => { renderTask.cancel(); };
  }, [pdfPage, zoom]);

  // Extract text items once per page (not per zoom change)
  useEffect(() => {
    if (!pdfPage) return;
    pdfPage.getTextContent().then((content) => {
      const items: PDFTextItem[] = (content.items as any[])
        .filter((item) => 'str' in item && item.str.trim().length > 0)
        .map((item, index) => {
          const t: number[] = item.transform;
          // font size = vertical scale factor from the transform matrix
          const fontSize = Math.abs(t[3]) || Math.abs(t[0]) || 12;
          return {
            id: `${pageNum}-${index}`,
            pageNum,
            str: item.str as string,
            x: t[4],
            y: t[5],
            width: item.width > 0 ? item.width : fontSize * (item.str as string).length * 0.55,
            height: item.height > 0 ? item.height : fontSize,
            fontSize,
            fontName: (item.fontName as string) || '',
          };
        });
      onTextItemsLoaded(pageNum, items);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfPage]);

  // --- Annotation text editing ---
  const editingTextAnn = editingId
    ? (annotations.find((a) => a.id === editingId && a.type === 'text') as TextAnnotation | undefined)
    : undefined;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editingTextAnn && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextAnn?.id]);

  const handleAnnotationEditDone = () => {
    if (editingTextAnn && textareaRef.current) {
      onAnnotationUpdate(editingTextAnn.id, editingTextAnn.page, { content: textareaRef.current.value });
    }
    onEditing(null);
  };

  // --- Text item inline editing ---
  const editingTextItem = editingTextItemId
    ? textItems.find((item) => item.id === editingTextItemId)
    : undefined;

  const textItemTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (editingTextItem && textItemTextareaRef.current) {
      textItemTextareaRef.current.focus();
      textItemTextareaRef.current.select();
    }
  }, [editingTextItem?.id]);

  const handleTextItemEditDone = () => {
    if (editingTextItem && textItemTextareaRef.current) {
      const newText = textItemTextareaRef.current.value;
      onTextReplace(editingTextItem.id, newText);
    }
    onTextItemEditDone();
  };

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
          editingTextItemId={editingTextItemId}
          activeTool={activeTool}
          textItems={textItems}
          textReplacements={textReplacements}
          onAnnotationAdd={onAnnotationAdd}
          onAnnotationUpdate={onAnnotationUpdate}
          onAnnotationDelete={onAnnotationDelete}
          onAnnotationMove={onAnnotationMove}
          onAnnotationResize={onAnnotationResize}
          onSelect={onSelect}
          onEditing={onEditing}
          onTextItemEdit={onTextItemEdit}
        />
      )}

      {/* Annotation text editing textarea */}
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
            onBlur={handleAnnotationEditDone}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); handleAnnotationEditDone(); }
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

      {/* PDF text item inline editing textarea */}
      {viewport && editingTextItem && (() => {
        const rect = pdfRectToScreen(
          editingTextItem.x, editingTextItem.y,
          editingTextItem.width, editingTextItem.height,
          viewport
        );
        const currentText = textReplacements.get(editingTextItem.id) ?? editingTextItem.str;
        const fontSizePx = editingTextItem.fontSize * viewport.scale;
        return (
          <textarea
            key={`ti-${editingTextItem.id}`}
            ref={textItemTextareaRef}
            defaultValue={currentText}
            onFocus={(e) => e.target.select()}
            onBlur={handleTextItemEditDone}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); handleTextItemEditDone(); }
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextItemEditDone(); }
              e.stopPropagation();
            }}
            style={{
              position: 'absolute',
              left: `${rect.x}px`,
              top: `${rect.y}px`,
              width: `${Math.max(rect.width + 80, 120)}px`,
              minHeight: `${Math.max(rect.height, 20)}px`,
              fontSize: `${fontSizePx}px`,
              fontFamily: 'sans-serif',
              color: '#000',
              background: 'rgba(255,255,255,0.97)',
              border: '2px solid #16a34a',
              borderRadius: '2px',
              resize: 'none',
              outline: 'none',
              zIndex: 20,
              padding: '0 2px',
              lineHeight: '1',
              boxSizing: 'border-box',
              overflow: 'hidden',
              whiteSpace: 'pre',
            }}
          />
        );
      })()}
    </div>
  );
}
