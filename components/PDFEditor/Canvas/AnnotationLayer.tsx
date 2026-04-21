'use client';

import { useRef, useState, useEffect } from 'react';
import { Annotation, ToolType } from '@/lib/annotationTypes';
import { screenToPdf, pdfToScreen, pdfRectToScreen, screenRectToPdf, screenDeltaToPdf } from '@/lib/coordinateUtils';
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
  startAnnX: number;
  startAnnY: number;
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

  // Refs mirror the above state for use in event handlers — avoids stale-closure
  // issues when mousedown and mouseup fire before a React re-render commits.
  const drawStateRef = useRef<DrawState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);

  // Handle mouse down on SVG
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    console.log('[AnnotationLayer] mousedown — tool:', activeTool, 'editingId:', editingId, 'svgRef:', !!svgRef.current);
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
            const rs: ResizeState = {
              selectedId: annotId,
              handle,
              startX: screenX,
              startY: screenY,
              startAnnX: ann.x,
              startAnnY: ann.y,
              startWidth: ann.width,
              startHeight: ann.height,
            };
            resizeStateRef.current = rs;
            setResizeState(rs);
            setMouseState('resizing');
          }
        } else {
          // Prepare to drag — anchor is the PDF x,y point in screen space
          const ann = annotations.find((a) => a.id === annotId);
          if (ann) {
            const anchor = pdfToScreen(ann.x, ann.y, viewport);
            const ds: DragState = {
              selectedId: annotId,
              offsetX: screenX - anchor.x,
              offsetY: screenY - anchor.y,
            };
            dragStateRef.current = ds;
            setDragState(ds);
            setMouseState('dragging');
          }
        }
      } else {
        onSelect(null);
      }
    } else if (activeTool === 'eraser') {
      const target = e.target as SVGElement;
      const annotId = target.getAttribute('data-annotation-id');
      if (annotId) {
        onAnnotationDelete(annotId, pageNum);
        if (selectedId === annotId) onSelect(null);
      }
    } else {
      // Start drawing
      const { x: pdfX, y: pdfY } = screenToPdf(screenX, screenY, viewport);
      const ds: DrawState = { startX: pdfX, startY: pdfY, currentX: pdfX, currentY: pdfY };
      drawStateRef.current = ds;
      setDrawState(ds);
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

    const activeDraw = drawStateRef.current;
    const activeDrag = dragStateRef.current;
    const activeResize = resizeStateRef.current;

    if (activeDraw) {
      const updated = { ...activeDraw, currentX: pdfX, currentY: pdfY };
      drawStateRef.current = updated;
      setDrawState(updated);
    } else if (activeDrag && selectedId) {
      const ann = annotations.find((a) => a.id === selectedId);
      if (ann) {
        const newScreenX = screenX - activeDrag.offsetX;
        const newScreenY = screenY - activeDrag.offsetY;
        const { x: newPdfX, y: newPdfY } = screenToPdf(newScreenX, newScreenY, viewport);
        const dx = newPdfX - ann.x;
        const dy = newPdfY - ann.y;
        onAnnotationMove(selectedId, pageNum, dx, dy);
      }
    } else if (activeResize && selectedId) {
      const deltaX = screenX - activeResize.startX;
      const deltaY = screenY - activeResize.startY;
      const pdfDeltaX = screenDeltaToPdf(deltaX, 0, viewport).x;
      const pdfDeltaY = screenDeltaToPdf(0, deltaY, viewport).y;

      let newX = activeResize.startAnnX;
      let newY = activeResize.startAnnY;
      let newW = activeResize.startWidth;
      let newH = activeResize.startHeight;

      const handle = activeResize.handle;

      if (handle.includes('w')) {
        newX = activeResize.startAnnX + pdfDeltaX;
        newW = activeResize.startWidth - pdfDeltaX;
      }
      if (handle.includes('e')) {
        newW = activeResize.startWidth + pdfDeltaX;
      }
      if (handle.includes('n')) {
        newH = activeResize.startHeight + pdfDeltaY;
      }
      if (handle.includes('s')) {
        newY = activeResize.startAnnY + pdfDeltaY;
        newH = activeResize.startHeight - pdfDeltaY;
      }

      if (newW < 10) newW = 10;
      if (newH < 10) newH = 10;

      onAnnotationResize(selectedId, pageNum, newX, newY, newW, newH);
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    // Read from refs — always current even if React hasn't re-rendered since mousedown
    const currentDraw = drawStateRef.current;
    console.log('[AnnotationLayer] mouseup — tool:', activeTool, 'drawRef:', currentDraw);

    // Reset refs immediately so a rapid second click starts clean
    drawStateRef.current = null;
    dragStateRef.current = null;
    resizeStateRef.current = null;

    if (currentDraw) {
      // Create annotation
      const minPdfX = Math.min(currentDraw.startX, currentDraw.currentX);
      const maxPdfX = Math.max(currentDraw.startX, currentDraw.currentX);
      const minPdfY = Math.min(currentDraw.startY, currentDraw.currentY);
      const maxPdfY = Math.max(currentDraw.startY, currentDraw.currentY);

      let width = maxPdfX - minPdfX;
      let height = maxPdfY - minPdfY;

      // Text tool: allow single click — create a default-sized box
      if (activeTool === 'text') {
        if (width < 20) width = 150;
        if (height < 20) height = 30;
      }

      const isLargeEnough = activeTool === 'line'
        ? Math.hypot(currentDraw.currentX - currentDraw.startX, currentDraw.currentY - currentDraw.startY) > 2
        : width > 1 && height > 1;
      if (isLargeEnough) {
        const newAnn: Annotation = {
          id: crypto.randomUUID(),
          page: pageNum,
          x: activeTool === 'line' ? currentDraw.startX : minPdfX,
          y: activeTool === 'line' ? currentDraw.startY : minPdfY,
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
          ...(activeTool === 'line' && {
            type: 'line',
            x2: currentDraw.currentX,
            y2: currentDraw.currentY,
            strokeColor: '#000000',
            strokeWidth: 2,
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
        onSelect(newAnn.id);

        if (activeTool === 'text' || activeTool === 'watermark') {
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

  const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const annotId = target.getAttribute('data-annotation-id');
    if (!annotId) return;
    const ann = annotations.find((a) => a.id === annotId);
    if (ann && ann.type === 'text') {
      onSelect(annotId);
      onEditing(annotId);
    }
  };

  const svgCursor = (() => {
    if (editingId) return 'default';
    switch (activeTool) {
      case 'select': return 'default';
      case 'text': return 'text';
      case 'eraser': return 'crosshair';
      default: return 'crosshair';
    }
  })();

  return (
    <svg
      ref={svgRef}
      className={styles.overlay}
      style={{ cursor: svgCursor }}
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      data-editing={editingId ? 'true' : undefined}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
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
      {mouseState === 'drawing' && drawState && activeTool === 'line' && (() => {
        const s = pdfToScreen(drawState.startX, drawState.startY, viewport);
        const e = pdfToScreen(drawState.currentX, drawState.currentY, viewport);
        return (
          <line
            x1={s.x} y1={s.y} x2={e.x} y2={e.y}
            stroke="#667eea" strokeWidth={2} strokeDasharray="4 4"
            pointerEvents="none"
          />
        );
      })()}
      {mouseState === 'drawing' && drawState && activeTool !== 'line' && (() => {
        const s = pdfToScreen(drawState.startX, drawState.startY, viewport);
        const e = pdfToScreen(drawState.currentX, drawState.currentY, viewport);
        return (
          <rect
            x={Math.min(s.x, e.x)} y={Math.min(s.y, e.y)}
            width={Math.abs(e.x - s.x)} height={Math.abs(e.y - s.y)}
            fill="none" stroke="#667eea" strokeWidth={2} strokeDasharray="4 4"
            pointerEvents="none"
          />
        );
      })()}
    </svg>
  );
}
