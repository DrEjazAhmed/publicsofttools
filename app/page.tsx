import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const tools = [
    {
      id: 'pdf-editor',
      name: 'PDF Editor',
      description: 'View, edit, and manipulate PDF files directly in your browser',
      icon: '📄',
    },
    {
      id: 'pdf-merge',
      name: 'PDF Merge & Split',
      description: 'Combine multiple PDFs into one, or split a PDF into separate files by page range',
      icon: '📑',
    },
    {
      id: 'image-converter',
      name: 'Image Converter',
      description: 'Convert images between PNG, JPG, WebP, and other formats',
      icon: '🖼️',
    },
    {
      id: 'image-compressor',
      name: 'Image Compressor',
      description: 'Reduce image file size with quality and resize controls. See savings before downloading',
      icon: '📦',
    },
    {
      id: 'ocr',
      name: 'OCR — Image to Text',
      description: 'Extract text from images using optical character recognition. Supports 15+ languages',
      icon: '🔍',
    },
    {
      id: 'qr-code-generator',
      name: 'QR Code Generator',
      description: 'Generate QR codes from any text or URL. Customize colors and download as PNG',
      icon: '◼',
    },
    {
      id: 'text-tools',
      name: 'Text Tools',
      description: 'Word counter, case converter, and URL/Base64 encoder — all in one place',
      icon: '✏️',
    },
    {
      id: 'developer-tools',
      name: 'Developer Tools',
      description: 'JWT decoder, regex tester, and JSON/CSV/XML converter — all browser-based',
      icon: '⚙️',
    },
  ];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className="container">
          <h1>PublicSoftTools</h1>
          <p>Free online tools for everyone — No signup, no install, 100% browser-based.</p>
        </div>
      </header>

      <section className={styles.tools}>
        <div className="container">
          <h2>Available Tools</h2>
          <div className={styles.toolsGrid}>
            {tools.map((tool) => (
              <Link href={`/tools/${tool.id}`} key={tool.id} className={styles.toolCard}>
                <div className={styles.icon}>{tool.icon}</div>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className="container">
          <p>&copy; 2024 PublicSoftTools. All rights reserved.</p>
          <p>Open source and free to use for everyone.</p>
        </div>
      </footer>
    </main>
  );
}
