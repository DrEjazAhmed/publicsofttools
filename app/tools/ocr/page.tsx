import type { Metadata } from 'next';
import OCRTool from '@/components/OCRTool';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'OCR — Image to Text — PublicSoftTools',
  description:
    'Extract text from images using optical character recognition. Supports PNG, JPG, WebP, TIFF and more. Free, runs in your browser.',
};

export default function OCRPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>OCR — Image to Text</h1>
          <p>
            Upload an image and extract the text inside it. Supports printed
            and typed text in 20+ languages. Runs entirely in your browser.
          </p>
        </div>
      </header>
      <section className={styles.content}>
        <OCRTool />
      </section>
    </main>
  );
}
