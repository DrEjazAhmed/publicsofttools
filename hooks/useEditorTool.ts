/**
 * Hook for managing editor tool state and navigation
 */

import { useState } from 'react';
import { ToolType } from '@/lib/annotationTypes';

export function useEditorTool() {
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState<number>(1.0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const setZoomPercent = (percent: number) => {
    setZoom(percent / 100);
  };

  return {
    activeTool,
    setActiveTool,
    zoom,
    setZoom,
    setZoomPercent,
    currentPage,
    setCurrentPage,
    selectedId,
    setSelectedId,
    editingId,
    setEditingId,
  };
}
