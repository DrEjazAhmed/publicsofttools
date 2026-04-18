'use client';

import { Annotation } from '@/lib/annotationTypes';
import styles from './PropertiesPanel.module.css';

interface PropertiesPanelProps {
  selectedAnnotation: Annotation | null;
  onUpdate: (id: string, page: number, changes: Partial<Annotation>) => void;
}

export default function PropertiesPanel({ selectedAnnotation, onUpdate }: PropertiesPanelProps) {
  if (!selectedAnnotation) {
    return (
      <div className={styles.panel}>
        <p className={styles.noSelection}>No object selected</p>
      </div>
    );
  }

  const handlePropertyChange = (key: string, value: any) => {
    onUpdate(selectedAnnotation.id, selectedAnnotation.page, { [key]: value });
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Properties</h3>

      {/* Opacity - for all types */}
      <div className={styles.property}>
        <label>Opacity:</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={selectedAnnotation.opacity || 1}
          onChange={(e) => handlePropertyChange('opacity', parseFloat(e.target.value))}
          className={styles.slider}
        />
        <span className={styles.value}>{Math.round((selectedAnnotation.opacity || 1) * 100)}%</span>
      </div>

      {/* Text-specific properties */}
      {selectedAnnotation.type === 'text' && (
        <>
          <div className={styles.property}>
            <label>Font Family:</label>
            <select
              value={(selectedAnnotation as any).fontFamily}
              onChange={(e) => handlePropertyChange('fontFamily', e.target.value)}
              className={styles.select}
            >
              <option value="Helvetica">Helvetica</option>
              <option value="Times-Roman">Times Roman</option>
              <option value="Courier">Courier</option>
            </select>
          </div>

          <div className={styles.property}>
            <label>Font Size:</label>
            <input
              type="number"
              min="6"
              max="72"
              value={(selectedAnnotation as any).fontSize}
              onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
              className={styles.input}
            />
          </div>

          <div className={styles.property}>
            <label>Color:</label>
            <input
              type="color"
              value={(selectedAnnotation as any).fontColor}
              onChange={(e) => handlePropertyChange('fontColor', e.target.value)}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.property}>
            <label>
              <input
                type="checkbox"
                checked={(selectedAnnotation as any).bold}
                onChange={(e) => handlePropertyChange('bold', e.target.checked)}
              />
              Bold
            </label>
          </div>

          <div className={styles.property}>
            <label>
              <input
                type="checkbox"
                checked={(selectedAnnotation as any).italic}
                onChange={(e) => handlePropertyChange('italic', e.target.checked)}
              />
              Italic
            </label>
          </div>
        </>
      )}

      {/* Highlight-specific properties */}
      {selectedAnnotation.type === 'highlight' && (
        <div className={styles.property}>
          <label>Color:</label>
          <input
            type="color"
            value={(selectedAnnotation as any).color}
            onChange={(e) => handlePropertyChange('color', e.target.value)}
            className={styles.colorInput}
          />
        </div>
      )}

      {/* Rectangle-specific properties */}
      {selectedAnnotation.type === 'rectangle' && (
        <>
          <div className={styles.property}>
            <label>Fill Color:</label>
            <input
              type="color"
              value={(selectedAnnotation as any).fillColor || '#ffffff'}
              onChange={(e) =>
                handlePropertyChange('fillColor', e.target.value || null)
              }
              className={styles.colorInput}
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={!(selectedAnnotation as any).fillColor}
                onChange={(e) =>
                  handlePropertyChange('fillColor', e.target.checked ? null : '#ffffff')
                }
              />
              None
            </label>
          </div>

          <div className={styles.property}>
            <label>Stroke Color:</label>
            <input
              type="color"
              value={(selectedAnnotation as any).strokeColor}
              onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.property}>
            <label>Stroke Width:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={(selectedAnnotation as any).strokeWidth}
              onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
              className={styles.input}
            />
          </div>
        </>
      )}

      {/* Circle-specific properties (same as rectangle) */}
      {selectedAnnotation.type === 'circle' && (
        <>
          <div className={styles.property}>
            <label>Fill Color:</label>
            <input
              type="color"
              value={(selectedAnnotation as any).fillColor || '#ffffff'}
              onChange={(e) =>
                handlePropertyChange('fillColor', e.target.value || null)
              }
              className={styles.colorInput}
            />
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={!(selectedAnnotation as any).fillColor}
                onChange={(e) =>
                  handlePropertyChange('fillColor', e.target.checked ? null : '#ffffff')
                }
              />
              None
            </label>
          </div>

          <div className={styles.property}>
            <label>Stroke Color:</label>
            <input
              type="color"
              value={(selectedAnnotation as any).strokeColor}
              onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.property}>
            <label>Stroke Width:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={(selectedAnnotation as any).strokeWidth}
              onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
              className={styles.input}
            />
          </div>
        </>
      )}

      {/* Line-specific properties */}
      {selectedAnnotation.type === 'line' && (
        <>
          <div className={styles.property}>
            <label>Color:</label>
            <input
              type="color"
              value={(selectedAnnotation as any).strokeColor}
              onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.property}>
            <label>Width:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={(selectedAnnotation as any).strokeWidth}
              onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
              className={styles.input}
            />
          </div>
        </>
      )}

      {/* Watermark-specific properties */}
      {selectedAnnotation.type === 'watermark' && (
        <>
          <div className={styles.property}>
            <label>Text:</label>
            <input
              type="text"
              value={(selectedAnnotation as any).text}
              onChange={(e) => handlePropertyChange('text', e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.property}>
            <label>Font Size:</label>
            <input
              type="number"
              min="6"
              max="120"
              value={(selectedAnnotation as any).fontSize}
              onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
              className={styles.input}
            />
          </div>

          <div className={styles.property}>
            <label>Color:</label>
            <input
              type="color"
              value={(selectedAnnotation as any).color}
              onChange={(e) => handlePropertyChange('color', e.target.value)}
              className={styles.colorInput}
            />
          </div>

          <div className={styles.property}>
            <label>Angle:</label>
            <input
              type="number"
              min="-90"
              max="90"
              value={(selectedAnnotation as any).angle}
              onChange={(e) => handlePropertyChange('angle', parseInt(e.target.value))}
              className={styles.input}
            />
            <span className={styles.value}>°</span>
          </div>

          <div className={styles.property}>
            <label>
              <input
                type="checkbox"
                checked={(selectedAnnotation as any).displayOnAllPages}
                onChange={(e) => handlePropertyChange('displayOnAllPages', e.target.checked)}
              />
              Apply to all pages
            </label>
          </div>
        </>
      )}
    </div>
  );
}
