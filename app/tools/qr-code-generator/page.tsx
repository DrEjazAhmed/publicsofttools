import type { Metadata } from 'next';
import QRCodeGenerator from '@/components/QRCodeGenerator';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'QR Code Generator — PublicSoftTools',
  description:
    'Generate QR codes instantly from any text or URL. Customize size, colors, and error correction. Free, no signup, download as PNG.',
};

export default function QRCodeGeneratorPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>QR Code Generator</h1>
          <p>
            Turn any text or URL into a QR code instantly. Customize colors and size,
            then download as PNG. Free, no signup, nothing sent to any server.
          </p>
        </div>
      </header>

      <section className={styles.content}>
        <QRCodeGenerator />
      </section>
    </main>
  );
}
