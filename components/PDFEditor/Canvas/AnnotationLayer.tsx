'use client';

import { useRef, useState, useEffect } from 'react';
import { Annotation, ToolType } from '@/lib/annotationTypes';
import { screenToPdf, pdfRectToScreen, screenRectToPdf } from '@/lib/coordinateUtils';
import AnnotationObject from './AnnotationObject';
import { PageViewport } from './PageCanvas';
import styles from './AnnotationLayer.module.css';

interface AnnotationLayerProps {
  pageNum: number;
  viewport: PageViewport;
  annotations: Annotation[];
  selectedId: string | null;
  editingId: string | null;
  activeTool: ToolType;
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

interface DrawState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface DragState {
  selectedId: string;
  offsetX: number;
  offsetY: number;
}

interface ResizeState {
  selectedId: string;
  handle: string; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
}

export default function AnnotationLayer({
  pageNum,
  viewport,
  annotations,
  selectedId,
  editingId,
  activeTool,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onAnnotationMove,
  onAnnotationResize,
  onSelect,
  onEditing,
}: AnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mouseState, setMouseState] = useState<'idle' | 'drawing' | 'dragging' | 'resizing'>(
    'idle'
  );
  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);

  // Handle mouse down on SVG
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || editingId) return;

    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (activeTool === 'select') {
      // Check if clicking on an annotation
      const target = e.target as SVGElement;
      const annotId = target.getAttribute('data-annotation-id');

      if (annotId) {
        onSelect(annotId);
        if (target.getAttribute('data-handle')) {
          const handle = target.getAttribute('data-handle')!;
          const ann = annotations.find((a) => a.id === annotId);
          if (ann) {
            setResizeState({
              selectedId: annotId,
              handle,
              startX: screenX,
              startY: screenY,
              startWidth: ann.width,
              startHeight: ann.height,
            });
            setMouseState('resizing');
          }
        } else {
          // Prepare to drag
          const ann = annotations.find((a) => a.id === annotId);
          if (ann) {
            const screenRect = pdfRectToScreen(ann.x, ann.y, ann.width, ann.height, viewport);
            setDragState({
              selectedId: annotId,
              offsetX: screenX - screenRect.x,
              offsetY: screenY - screenRect.y,
            });
            setMouseState('dragging');
          }
        }
      } else {
        onSelect(null);
      }
    } else if (activeTool !== 'eraser') {
      // Start drawing
      const { x: pdfX, y: pdfY } = screenToPdf(screenX, screenY, viewport);
      setDrawState({ startX: pdfX, startY: pdfY, currentX: pdfX, currentY: pdfY });
      setMouseState('drawing');
    }
  };

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x: pdfX, y: pdfY } = screenToPdf(screenX, screenY, viewport);

    if (mouseState === 'drawing' && drawState) {
      setDrawState((prev) => (prev ? { ...prev, currentX: pdfX, currentY: pdfY } : null));
    } else if (mouseState === 'dragging' && dragState && selectedId) {
      const ann = annotations.find((a) => a.id === selectedId);
      if (ann) {
        const screenRect = pdfRectToScreen(ann.x, ann.y, ann.width, ann.height, viewport);
        const newScreenX = screenX - dragState.offsetX;
        const newScreenY = screenY - dragState.offsetY;
        const { x: newPdfX, y: newPdfY } = screenToPdf(newScreenX, newScreenY, viewport);

        const dx = newPdfX - ann.x;
        const dy = newPdfY - ann.y;
        onAnnotationMove(selectedId, pageNum, dx, dy);
      }
    } else if (mouseState === 'resizing' && resizeState && selectedId) {
      const ann = annotations.find((a) => a.id === selectedId);
      if (ann) {
        const deltaX = screenX - resizeState.startX;
        const deltaY = screenY - resizeState.startY;

        let newX = ann.x;
        let newY = ann.y;
        let newW = resizeState.startWidth;
        let newH = resizeState.startHeight;

        const handle = resizeState.handle;

        // Adjust based on which handle is being dragged
        if (handle.includes('w')) {
          // West handles move left
          const { x: deltaInPdf } = screenToPdf(deltaX, 0, viewport);
          newX = ann.x + deltaInPdf;
          newW = resizeState.startWidth - deltaInPdf;
        }
        if (handle.includes('e')) {
          // East handles
          const { x: deltaInPdf } = screenToPdf(deltaX, 0, viewport);
          newW = resizeState.startWidth + deltaInPdf;
        }
        if (handle.includes('n')) {
          // North handles (up, y increases in PDF space)
          const { y: deltaInPdf } = screenToPdf(0, deltaY, viewport);
          newH = resizeState.startHeight + deltaInPdf;
        }
        if (handle.includes('s')) {
          // South handles (down, y decreases in PDF space)
          const { y: deltaInPdf } = screenToPdf(0, deltaY, viewport);
          newY = ann.y + deltaInPdf;
          newH = resizeState.startHeight - deltaInPdf;
        }

        // Enforce minimum size
        if (newW < 10) newW = 10;
        if (newH < 10) newH = 10;

        onAnnotationResize(selectedId, pageNum, newX, newY, newW, newH);
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    if (mouseState === 'drawing' && drawState && activeTool !== 'select') {
      // Create annotation
      const minPdfX = Math.min(drawState.startX, drawState.currentX);
      const maxPdfX = Math.max(drawState.startX, drawState.currentX);
      const minPdfY = Math.min(drawState.startY, drawState.currentY);
      const maxPdfY = Math.max(drawState.startY, drawState.currentY);

      const width = maxPdfX - minPdfX;
      const height = maxPdfY - minPdfY;

      // Only create if large enough (> 1 point in PDF space)
      if (width > 1 && height > 1) {
        const newAnn: Annotation = {
          id: crypto.randomUUID(),
          page: pageNum,
          x: minPdfX,
          y: minPdfY,
          width,
          height,
          ...(activeTool === 'text' && {
            type: 'text',
            content: 'Text',
            fontSize: 12,
            fontFamily: 'Helvetica',
            fontColor: '#000000',
            bold: false,
            italic: false,
            opacity: 1,
          }),
          ...(activeTool === 'highlight' && {
            type: 'highlight',
            color: '#FFFF00',
            opacity: 0.4,
          }),
          ...(activeTool === 'rectangle' && {
            type: 'rectangle',
            fillColor: null,
            strokeColor: '#000000',
            strokeWidth: 1,
            opacity: 1,
          }),
          ...(activeTool === 'circle' && {
            type: 'circle',
            fillColor: null,
            strokeColor: '#000000',
            strokeWidth: 1,
            opacity: 1,
          }),
          ...(activeTool === 'watermark' && {
            type: 'watermark',
            text: 'WATERMARK',
            fontSize: 48,
            color: '#CCCCCC',
            opacity: 0.2,
            angle: -45,
            displayOnAllPages: false,
          }),
        } as Annotation;

        onAnnotationAdd(newAnn);

        if (activeTool === 'text') {
          onEditing(newAnn.id);
        } else if (activeTool === 'watermark') {
          onEditing(newAnn.id);
        }
      }
    }

    setMouseState('idle');
    setDrawState(null);
    setDragState(null);
    setResizeState(null);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelect(null);
        onEditing(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        // Undo is handled by parent
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        // Redo is handled by parent
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && editingId !== selectedId) {
          e.preventDefault();
          onAnnotationDelete(selectedId, pageNum);
          onSelect(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, editingId, pageNum, onAnnotationDelete, onSelect, onEditing]);

  return (
    <svg
      ref={svgRef}
      className={styles.overlay}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background rect for event capture */}
      <rect width={viewport.width} height={viewport.height} fill="transparent" />

      {/* Render all annotations */}
      {annotations.map((ann) => (
        <AnnotationObject
          key={ann.id}
          annotation={ann}
          viewport={viewport}
          isSelected={ann.id === selectedId}
          isEditing={ann.id === editingId}
        />
      ))}

      {/* Draw draft annotation while drawing */}
      {mouseState === 'drawing' && drawState && (
        <rect
          x={Math.min(drawState.startX, drawState.currentX)}
          y={Math.min(drawState.startY, drawState.currentY)}
          width={Math.abs(drawState.currentX - drawState.startX)}
          height={Math.abs(drawState.currentY - drawState.startY)}
          fill="none"
          stroke="#667eea"
          strokeWidth={2}
          strokeDasharray="4 4"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
