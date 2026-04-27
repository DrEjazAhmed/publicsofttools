import type { Metadata } from 'next';
import TextTools from '@/components/TextTools';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Text Tools — PublicSoftTools',
  description:
    'Free text utilities: word and character counter, case converter, URL and Base64 encoder/decoder. No signup, works in your browser.',
};

export default function TextToolsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>Text Tools</h1>
          <p>
            Word counter, case converter, and URL/Base64 encoder — all in one place.
            Free, no signup, everything runs in your browser.
          </p>
        </div>
      </header>

      <section className={styles.content}>
        <TextTools />
      </section>
    </main>
  );
}
