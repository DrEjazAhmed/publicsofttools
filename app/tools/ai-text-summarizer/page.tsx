import type { Metadata } from 'next';
import TextSummarizer from '@/components/TextSummarizer';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'AI Text Summarizer — PublicSoftTools',
  description:
    'Summarize articles, documents, and web pages instantly with AI. Paste text, upload a PDF or Word file, or enter a URL. Free, no signup required.',
};

export default function TextSummarizerPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>AI Text Summarizer</h1>
          <p>
            Paste an article, upload a document, or drop in a URL — get a concise
            AI summary in seconds. Free, no signup, nothing uploaded to third parties.
          </p>
        </div>
      </header>

      <section className={styles.content}>
        <TextSummarizer />
      </section>
    </main>
  );
}
