'use client';

import { useState } from 'react';
import PDFEditor from '@/components/PDFEditor';
import styles from './page.module.css';

export default function PDFEditorPage() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1>PDF Editor</h1>
        <p>View, edit, and manipulate your PDF files directly in your browser</p>
      </header>

      {!file ? (
        <section className={styles.uploadSection}>
          <div className={styles.uploadBox}>
            <div className={styles.uploadIcon}>📄</div>
            <h2>Upload a PDF file</h2>
            <p>Drag and drop your PDF here or click to browse</p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className={styles.fileInput}
            />
            <button
              className={styles.uploadButton}
              onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
            >
              Choose File
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.editorSection}>
          <PDFEditor file={file} onClear={() => setFile(null)} />
        </section>
      )}
    </main>
  );
}
