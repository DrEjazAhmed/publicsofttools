'use client';

import { ToolType } from '@/lib/annotationTypes';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onClear: () => void;
}

const tools: { id: ToolType; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '➜' },
  { id: 'text', label: 'Text', icon: '📝' },
  { id: 'highlight', label: 'Highlight', icon: '🖍️' },
  { id: 'rectangle', label: 'Rectangle', icon: '◻️' },
  { id: 'circle', label: 'Circle', icon: '◯' },
  { id: 'line', label: 'Line', icon: '|' },
  { id: 'watermark', label: 'Watermark', icon: '💧' },
  { id: 'eraser', label: 'Eraser', icon: '🗑️' },
];

export default function Toolbar({
  activeTool,
  onToolChange,
  currentPage,
  numPages,
  onPageChange,
  zoom,
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  onClear,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {/* Tools Section */}
      <div className={styles.toolGroup}>
        <span className={styles.groupLabel}>Tools:</span>
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`${styles.toolButton} ${activeTool === tool.id ? styles.active : ''}`}
            onClick={() => onToolChange(tool.id)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Page Navigation */}
      <div className={styles.toolGroup}>
        <span className={styles.groupLabel}>Page:</span>
        <button
          className={styles.toolButton}
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          ⏮️
        </button>
        <button
          className={styles.toolButton}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          title="Previous page"
        >
          ◀
        </button>
        <input
          type="number"
          className={styles.pageInput}
          value={currentPage}
          onChange={(e) => {
            const page = Math.max(1, Math.min(numPages, parseInt(e.target.value) || 1));
            onPageChange(page);
          }}
          min={1}
          max={numPages}
        />
        <span className={styles.pageInfo}>/ {numPages}</span>
        <button
          className={styles.toolButton}
          onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
          disabled={currentPage === numPages}
          title="Next page"
        >
          ▶
        </button>
        <button
          className={styles.toolButton}
          onClick={() => onPageChange(numPages)}
          disabled={currentPage === numPages}
          title="Last page"
        >
          ⏭️
        </button>
      </div>

      {/* Zoom Controls */}
      <div className={styles.toolGroup}>
        <span className={styles.groupLabel}>Zoom:</span>
        <button
          className={styles.toolButton}
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
          title="Zoom out"
        >
          🔍−
        </button>
        <select
          className={styles.zoomSelect}
          value={Math.round(zoom * 100)}
          onChange={(e) => onZoomChange(parseInt(e.target.value) / 100)}
        >
          <option value={50}>50%</option>
          <option value={75}>75%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
          <option value={150}>150%</option>
          <option value={200}>200%</option>
        </select>
        <button
          className={styles.toolButton}
          onClick={() => onZoomChange(Math.min(2.0, zoom + 0.25))}
          title="Zoom in"
        >
          🔍+
        </button>
      </div>

      {/* Undo/Redo */}
      <div className={styles.toolGroup}>
        <button
          className={styles.toolButton}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className={styles.toolButton}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>

      {/* Export and Close */}
      <div className={styles.toolGroup}>
        <button className={styles.exportButton} onClick={onExport} title="Export as PDF">
          💾 Export PDF
        </button>
        <button className={styles.closeButton} onClick={onClear} title="Close editor">
          ✕
        </button>
      </div>
    </div>
  );
}
