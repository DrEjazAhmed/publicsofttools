'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { usePDFDocument } from '@/hooks/usePDFDocument';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useEditorTool } from '@/hooks/useEditorTool';
import { usePDFTextItems } from '@/hooks/usePDFTextItems';
import { Annotation, PDFTextItem, WatermarkAnnotation } from '@/lib/annotationTypes';
import { exportPDF } from '@/lib/pdfExport';
import Toolbar from './Toolbar/Toolbar';
import PageCanvas from './Canvas/PageCanvas';
import PropertiesPanel from './PropertiesPanel/PropertiesPanel';
import styles from './PDFEditor.module.css';

interface PDFEditorProps {
  file: File;
  onClear: () => void;
}

export default function PDFEditor({ file, onClear }: PDFEditorProps) {
  const { pdfDoc, numPages, loading, error, getPage } = usePDFDocument(file);
  const {
    pageAnnotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    moveAnnotation,
    resizeAnnotation,
    getPageAnnotations,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAnnotations();
  const {
    activeTool,
    setActiveTool,
    zoom,
    setZoom,
    currentPage,
    setCurrentPage,
    selectedId,
    setSelectedId,
    editingId,
    setEditingId,
    editingTextItemId,
    setEditingTextItemId,
  } = useEditorTool();
  const { textReplacements, pageTextItems, setPageItems, getPageItems, replaceText } = usePDFTextItems();
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(`pdf-page-${currentPage}`);
    const container = canvasAreaRef.current;
    if (!el || !container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    container.scrollTo({ top: container.scrollTop + elRect.top - containerRect.top, behavior: 'smooth' });
  }, [currentPage]);

  // Auto-switch to select when annotation editing starts
  useEffect(() => {
    if (editingId) setActiveTool('select');
  }, [editingId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  // Returns page annotations plus any all-pages watermarks stored on other pages
  const getPageAnnotationsWithWatermarks = useCallback((page: number): Annotation[] => {
    const own = getPageAnnotations(page);
    const extra: Annotation[] = [];
    for (const [storedPage, anns] of pageAnnotations) {
      if (storedPage === page) continue;
      for (const ann of anns) {
        if (ann.type === 'watermark' && (ann as WatermarkAnnotation).displayOnAllPages) {
          extra.push(ann);
        }
      }
    }
    return extra.length > 0 ? [...own, ...extra] : own;
  }, [getPageAnnotations, pageAnnotations]);

  const handleAnnotationAdd = useCallback((ann: Annotation) => {
    addAnnotation(ann);
    // Auto-switch to select so the drawn annotation can be immediately moved/resized
    if (ann.type !== 'text') {
      setActiveTool('select');
    }
  }, [addAnnotation, setActiveTool]);

  const handleAnnotationDelete = useCallback((id: string, page: number) => {
    deleteAnnotation(id, page);
    if (selectedId === id) setSelectedId(null);
  }, [deleteAnnotation, selectedId, setSelectedId]);

  const selectedAnnotation = selectedId
    ? Array.from(pageAnnotations.values()).flat().find((a) => a.id === selectedId) ?? null
    : null;

  const handleExport = useCallback(async () => {
    try {
      const bytes = await exportPDF(file, pageAnnotations, textReplacements, pageTextItems);
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name.replace('.pdf', '-edited.pdf');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF. Please try again.');
    }
  }, [file, pageAnnotations, textReplacements, pageTextItems]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div>Loading PDF...</div>
        <p style={{ fontSize: '0.9rem', color: '#999', margin: '0 20px', textAlign: 'center' }}>
          This may take a moment for large files
        </p>
      </div>
    );
  }
  if (error) return <div className={styles.error}>Error loading PDF: {error.message}</div>;
  if (!pdfDoc) return <div className={styles.error}>Failed to load PDF</div>;

  return (
    <div className={styles.editorShell}>
      <Toolbar
        activeTool={activeTool}
        onToolChange={(tool) => {
          setActiveTool(tool);
          setEditingId(null);
          setEditingTextItemId(null);
        }}
        currentPage={currentPage}
        numPages={numPages}
        onPageChange={setCurrentPage}
        zoom={zoom}
        onZoomChange={setZoom}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onClear={onClear}
      />

      <div className={styles.workArea}>
        <div className={styles.canvasArea} ref={canvasAreaRef}>
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i + 1} id={`pdf-page-${i + 1}`}>
              <PageCanvasWithLoader
                pageNum={i + 1}
                getPage={getPage}
                zoom={zoom}
                activeTool={activeTool}
                annotations={getPageAnnotationsWithWatermarks(i + 1)}
                selectedId={selectedId}
                editingId={editingId}
                editingTextItemId={editingTextItemId}
                textItems={getPageItems(i + 1)}
                textReplacements={textReplacements}
                onAnnotationAdd={handleAnnotationAdd}
                onAnnotationUpdate={updateAnnotation}
                onAnnotationDelete={handleAnnotationDelete}
                onAnnotationMove={moveAnnotation}
                onAnnotationResize={resizeAnnotation}
                onSelect={setSelectedId}
                onEditing={setEditingId}
                onTextItemsLoaded={setPageItems}
                onTextReplace={replaceText}
                onTextItemEdit={setEditingTextItemId}
                onTextItemEditDone={() => setEditingTextItemId(null)}
              />
            </div>
          ))}
        </div>

        <PropertiesPanel
          selectedAnnotation={selectedAnnotation}
          onUpdate={updateAnnotation}
          onDelete={handleAnnotationDelete}
        />
      </div>
    </div>
  );
}

function PageCanvasWithLoader(props: any & { pageNum: number; getPage: Function }) {
  const { pageNum, getPage, ...rest } = props;
  const [pdfPage, setPdfPage] = React.useState(null);

  React.useEffect(() => {
    const loadPage = async () => {
      try {
        const page = await getPage(pageNum);
        setPdfPage(page);
      } catch (err) {
        console.error(`Failed to load page ${pageNum}:`, err);
      }
    };
    loadPage();
  }, [pageNum, getPage]);

  if (!pdfPage) return <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Loading page...</div>;
  return <PageCanvas {...rest} pdfPage={pdfPage} pageNum={pageNum} />;
}
