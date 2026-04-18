'use client';

import React, { useEffect, useCallback } from 'react';
import { usePDFDocument } from '@/hooks/usePDFDocument';
import { useAnnotations } from '@/hooks/useAnnotations';
import { useEditorTool } from '@/hooks/useEditorTool';
import { Annotation } from '@/lib/annotationTypes';
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
  } = useEditorTool();

  // Handle keyboard shortcuts
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

  // Get selected annotation
  const selectedAnnotation = selectedId
    ? getPageAnnotations(currentPage).find((a) => a.id === selectedId) || null
    : null;

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const bytes = await exportPDF(file, pageAnnotations);
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
  }, [file, pageAnnotations]);

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

  if (error) {
    return <div className={styles.error}>Error loading PDF: {error.message}</div>;
  }

  if (!pdfDoc) {
    return <div className={styles.error}>Failed to load PDF</div>;
  }

  return (
    <div className={styles.editorShell}>
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
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
        <div className={styles.canvasArea}>
          {Array.from({ length: numPages }, (_, i) => (
            <PageCanvasWithLoader
              key={i + 1}
              pageNum={i + 1}
              getPage={getPage}
              zoom={zoom}
              activeTool={activeTool}
              annotations={getPageAnnotations(i + 1)}
              selectedId={selectedId}
              editingId={editingId}
              onAnnotationAdd={addAnnotation}
              onAnnotationUpdate={updateAnnotation}
              onAnnotationDelete={deleteAnnotation}
              onAnnotationMove={moveAnnotation}
              onAnnotationResize={resizeAnnotation}
              onSelect={setSelectedId}
              onEditing={setEditingId}
            />
          ))}
        </div>

        <PropertiesPanel
          selectedAnnotation={selectedAnnotation}
          onUpdate={updateAnnotation}
        />
      </div>
    </div>
  );
}

// Wrapper to load pages
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
  return <PageCanvas {...rest} pdfPage={pdfPage} />;
}
