'use client';

import { ConversionSettings, FORMAT_LABELS, LOSSY_FORMATS, OUTPUT_FORMATS, Rotation } from '@/lib/imageTypes';
import styles from './ConversionControls.module.css';

interface ConversionControlsProps {
  settings: ConversionSettings;
  onUpdate: (patch: Partial<ConversionSettings>) => void;
}

const ROTATIONS: Rotation[] = [0, 90, 180, 270];

export default function ConversionControls({ settings, onUpdate }: ConversionControlsProps) {
  const isLossy = LOSSY_FORMATS.has(settings.outputFormat);

  const cycleRotation = (dir: 'cw' | 'ccw') => {
    const idx = ROTATIONS.indexOf(settings.rotation);
    const next = dir === 'cw'
      ? ROTATIONS[(idx + 1) % 4]
      : ROTATIONS[(idx + 3) % 4];
    onUpdate({ rotation: next });
  };

  return (
    <div className={styles.panel}>

      {/* Output Format */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Output Format</h3>
        <div className={styles.formatGrid}>
          {OUTPUT_FORMATS.map(fmt => (
            <button
              key={fmt}
              className={`${styles.formatBtn} ${settings.outputFormat === fmt ? styles.formatActive : ''}`}
              onClick={() => onUpdate({ outputFormat: fmt })}
            >
              {FORMAT_LABELS[fmt]}
            </button>
          ))}
        </div>
      </section>

      {/* Quality */}
      {isLossy && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Quality
            <span className={styles.sectionValue}>{Math.round(settings.quality * 100)}%</span>
          </h3>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(settings.quality * 100)}
            onChange={e => onUpdate({ quality: parseInt(e.target.value) / 100 })}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>Smaller file</span>
            <span>Best quality</span>
          </div>
        </section>
      )}

      {/* Resize */}
      <section className={styles.section}>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={settings.resizeEnabled}
            onChange={e => onUpdate({ resizeEnabled: e.target.checked })}
            className={styles.checkbox}
          />
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Resize</h3>
        </label>

        {settings.resizeEnabled && (
          <div className={styles.resizeFields}>
            <div className={styles.dimensionRow}>
              <label className={styles.dimLabel}>
                W
                <input
                  type="number"
                  min={1}
                  max={16000}
                  value={settings.targetWidth}
                  onChange={e => onUpdate({ targetWidth: Math.max(1, parseInt(e.target.value) || 1) })}
                  className={styles.dimInput}
                />
              </label>
              <span className={styles.dimSeparator}>×</span>
              <label className={styles.dimLabel}>
                H
                <input
                  type="number"
                  min={1}
                  max={16000}
                  value={settings.targetHeight}
                  onChange={e => onUpdate({ targetHeight: Math.max(1, parseInt(e.target.value) || 1) })}
                  className={styles.dimInput}
                />
              </label>
              <button
                className={`${styles.lockBtn} ${settings.maintainAspectRatio ? styles.lockActive : ''}`}
                onClick={() => onUpdate({ maintainAspectRatio: !settings.maintainAspectRatio })}
                title={settings.maintainAspectRatio ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
              >
                {settings.maintainAspectRatio ? '🔒' : '🔓'}
              </button>
            </div>
            <p className={styles.hint}>
              {settings.maintainAspectRatio
                ? 'Aspect ratio is preserved per image'
                : 'Images will be stretched to exact dimensions'}
            </p>
          </div>
        )}
      </section>

      {/* Transform */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Transform</h3>

        <div className={styles.transformRow}>
          <span className={styles.transformLabel}>Rotation</span>
          <div className={styles.rotationGroup}>
            <button
              className={styles.transformBtn}
              onClick={() => cycleRotation('ccw')}
              title="Rotate 90° counter-clockwise"
            >
              ↺
            </button>
            <span className={styles.rotationBadge}>{settings.rotation}°</span>
            <button
              className={styles.transformBtn}
              onClick={() => cycleRotation('cw')}
              title="Rotate 90° clockwise"
            >
              ↻
            </button>
          </div>
        </div>

        <div className={styles.transformRow}>
          <span className={styles.transformLabel}>Flip</span>
          <div className={styles.flipGroup}>
            <button
              className={`${styles.transformBtn} ${settings.flipHorizontal ? styles.transformActive : ''}`}
              onClick={() => onUpdate({ flipHorizontal: !settings.flipHorizontal })}
              title="Flip horizontal"
            >
              ↔
            </button>
            <button
              className={`${styles.transformBtn} ${settings.flipVertical ? styles.transformActive : ''}`}
              onClick={() => onUpdate({ flipVertical: !settings.flipVertical })}
              title="Flip vertical"
            >
              ↕
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Filters</h3>
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={settings.grayscale}
            onChange={e => onUpdate({ grayscale: e.target.checked })}
            className={styles.checkbox}
          />
          <span className={styles.toggleLabel}>Grayscale</span>
        </label>
      </section>

    </div>
  );
}
