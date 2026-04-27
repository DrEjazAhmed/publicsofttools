import type { Metadata } from 'next';
import DevTools from '@/components/DevTools';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Developer Tools — PublicSoftTools',
  description:
    'Free browser-based developer utilities: JWT decoder, regex tester, and JSON/CSV/XML converter. No signup, no install.',
};

export default function DeveloperToolsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1>Developer Tools</h1>
          <p>
            JWT decoder, regex tester, and data format converter — all in one place.
            Free, no signup, everything runs in your browser.
          </p>
        </div>
      </header>

      <section className={styles.content}>
        <DevTools />
      </section>
    </main>
  );
}
