import type { Metadata } from 'next';
import PDFMerge from '@/components/PDFMerge';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'PDF Merge & Split — PublicSoftTools',
  description:
    'Merge multiple PDFs into one or split a PDF into separate files. Free, no upload, runs entirely in your browser.',
};

export default function PDFMergePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>PDF Merge &amp; Split</h1>
          <p>
            Combine multiple PDFs into one, or split a PDF by page range.
            Everything runs in your browser — no files leave your device.
          </p>
        </div>
      </header>
      <section className={styles.content}>
        <PDFMerge />
      </section>
    </main>
  );
}
