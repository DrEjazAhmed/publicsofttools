/**
 * Hook for managing annotation state with undo/redo support
 */

import { useCallback, useRef, useState } from 'react';
import {
  Annotation,
  PageAnnotations,
  HistoryEntry,
  TextAnnotation,
} from '@/lib/annotationTypes';

const MAX_HISTORY = 50;

export function useAnnotations() {
  const [pageAnnotations, setPageAnnotations] = useState<PageAnnotations>(
    new Map()
  );
  const [history, setHistory] = useState<HistoryEntry[]>([
    { pageAnnotations: new Map() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Always-current ref so callbacks don't capture stale state
  const pageAnnotationsRef = useRef(pageAnnotations);
  pageAnnotationsRef.current = pageAnnotations;

  /**
   * Push current state to history
   */
  const pushHistory = useCallback((annotations: PageAnnotations) => {
    setHistory((prev) => {
      // Truncate redo stack
      const newHistory = prev.slice(0, historyIndex + 1);

      // Create snapshot
      const snapshot: HistoryEntry = {
        pageAnnotations: new Map(annotations),
      };

      // Add to history and limit size
      newHistory.push(snapshot);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return newHistory;
    });

    setHistoryIndex((prev) =>
      Math.min(prev + 1, MAX_HISTORY - 1)
    );
  }, [historyIndex]);

  /**
   * Add a new annotation
   */
  const addAnnotation = useCallback(
    (annotation: Annotation) => {
      const prev = pageAnnotationsRef.current;
      const newMap = new Map(prev);
      const pageAnnots = newMap.get(annotation.page) || [];
      newMap.set(annotation.page, [...pageAnnots, annotation]);
      setPageAnnotations(newMap);
      pushHistory(newMap);
    },
    [pushHistory]
  );

  /**
   * Update an existing annotation
   */
  const updateAnnotation = useCallback(
    (id: string, page: number, changes: Partial<Annotation>) => {
      setPageAnnotations((prev) => {
        const newMap = new Map(prev);
        const pageAnnots = newMap.get(page) || [];
        const idx = pageAnnots.findIndex((a) => a.id === id);
        if (idx === -1) return prev;

        const updated = [...pageAnnots];
        updated[idx] = { ...updated[idx], ...changes } as Annotation;
        newMap.set(page, updated);
        return newMap;
      });
    },
    []
  );

  /**
   * Delete an annotation
   */
  const deleteAnnotation = useCallback((id: string, page: number) => {
    const prev = pageAnnotationsRef.current;
    const newMap = new Map(prev);
    const pageAnnots = newMap.get(page) || [];
    newMap.set(page, pageAnnots.filter((a) => a.id !== id));
    setPageAnnotations(newMap);
    pushHistory(newMap);
  }, [pushHistory]);

  /**
   * Move an annotation by delta in PDF space
   */
  const moveAnnotation = useCallback(
    (id: string, page: number, dx: number, dy: number) => {
      setPageAnnotations((prev) => {
        const newMap = new Map(prev);
        const pageAnnots = newMap.get(page) || [];
        const idx = pageAnnots.findIndex((a) => a.id === id);
        if (idx === -1) return prev;

        const ann = pageAnnots[idx];
        const updated = [...pageAnnots];
        updated[idx] = {
          ...ann,
          x: ann.x + dx,
          y: ann.y + dy,
          ...(ann.type === 'line' && {
            x2: (ann as any).x2 + dx,
            y2: (ann as any).y2 + dy,
          }),
        };
        newMap.set(page, updated);
        return newMap;
      });
    },
    []
  );

  /**
   * Resize an annotation (for box types)
   */
  const resizeAnnotation = useCallback(
    (
      id: string,
      page: number,
      newX: number,
      newY: number,
      newWidth: number,
      newHeight: number
    ) => {
      setPageAnnotations((prev) => {
        const newMap = new Map(prev);
        const pageAnnots = newMap.get(page) || [];
        const idx = pageAnnots.findIndex((a) => a.id === id);
        if (idx === -1) return prev;

        const updated = [...pageAnnots];
        updated[idx] = {
          ...updated[idx],
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        };
        newMap.set(page, updated);
        return newMap;
      });
    },
    []
  );

  /**
   * Get annotations for a specific page
   */
  const getPageAnnotations = useCallback(
    (page: number): Annotation[] => {
      return pageAnnotations.get(page) || [];
    },
    [pageAnnotations]
  );

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    setHistoryIndex((prev) => prev - 1);
    setPageAnnotations(new Map(history[historyIndex - 1].pageAnnotations));
  }, [history, historyIndex]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    setHistoryIndex((prev) => prev + 1);
    setPageAnnotations(new Map(history[historyIndex + 1].pageAnnotations));
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
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
  };
}
