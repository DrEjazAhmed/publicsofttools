import type { Metadata } from 'next';
import ImageConverter from '@/components/ImageConverter';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Image Converter — PublicSoftTools',
  description:
    'Convert images between JPEG, PNG, WebP, and AVIF. Resize, rotate, flip, and apply filters — free, browser-based, no upload needed.',
};

export default function ImageConverterPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>Image Converter</h1>
          <p>
            Convert, resize, and transform images — entirely in your browser.
            No uploads, no accounts, no limits.
          </p>
        </div>
      </header>

      <section className={styles.content}>
        <ImageConverter />
      </section>
    </main>
  );
}
