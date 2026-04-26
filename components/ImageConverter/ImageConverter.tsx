'use client';

import { useImageConverter } from '@/hooks/useImageConverter';
import ConversionControls from './ConversionControls';
import Dropzone from './Dropzone';
import ImageQueue from './ImageQueue';
import styles from './ImageConverter.module.css';

export default function ImageConverter() {
  const {
    items,
    settings,
    batchConverting,
    addFiles,
    removeItem,
    clearAll,
    updateSettings,
    convertOne,
    convertAll,
    downloadOne,
    downloadAll,
  } = useImageConverter();

  const doneCount = items.filter(i => i.status === 'done').length;
  const convertibleCount = items.filter(i => i.status !== 'processing').length;
  const hasItems = items.length > 0;

  if (!hasItems) {
    return (
      <div className={styles.empty}>
        <Dropzone onFiles={files => addFiles(files)} />
      </div>
    );
  }

  return (
    <div className={styles.workspace}>

      {/* Main two-column layout */}
      <div className={styles.layout}>

        {/* Left: image queue */}
        <div className={styles.queueColumn}>
          <ImageQueue
            items={items}
            outputFormat={settings.outputFormat}
            onAddFiles={files => addFiles(files)}
            onConvert={convertOne}
            onDownload={downloadOne}
            onRemove={removeItem}
          />
        </div>

        {/* Right: controls (sticky) */}
        <div className={styles.controlsColumn}>
          <ConversionControls settings={settings} onUpdate={updateSettings} />
        </div>

      </div>

      {/* Action bar */}
      <div className={styles.actionBar}>
        <div className={styles.summary}>
          {doneCount > 0
            ? `${doneCount} of ${items.length} converted`
            : `${items.length} image${items.length !== 1 ? 's' : ''} queued`}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.btnSecondary}
            onClick={clearAll}
            disabled={batchConverting}
          >
            Clear All
          </button>

          <button
            className={styles.btnSecondary}
            onClick={downloadAll}
            disabled={doneCount === 0}
          >
            ↓ Download All ({doneCount})
          </button>

          <button
            className={styles.btnPrimary}
            onClick={convertAll}
            disabled={convertibleCount === 0 || batchConverting}
          >
            {batchConverting ? (
              <>
                <span className={styles.spinner} />
                Converting…
              </>
            ) : (
              `Convert All (${convertibleCount})`
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
