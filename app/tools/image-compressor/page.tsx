import type { Metadata } from 'next';
import ImageCompressor from '@/components/ImageCompressor';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Image Compressor — PublicSoftTools',
  description:
    'Reduce image file size by adjusting quality and dimensions. Supports JPEG, PNG, and WebP. Free, runs entirely in your browser.',
};

export default function ImageCompressorPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>Image Compressor</h1>
          <p>
            Reduce image file size with quality and resize controls. See the
            size difference before you download. No files leave your device.
          </p>
        </div>
      </header>
      <section className={styles.content}>
        <ImageCompressor />
      </section>
    </main>
  );
}
