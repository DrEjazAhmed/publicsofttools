import type { Metadata } from 'next';
import Link from 'next/link';
import BMICalculator from '@/components/BMICalculator';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'BMI Calculator — Free Body Mass Index Tool | PublicSoftTools',
  description:
    'Free online BMI calculator. Calculate your Body Mass Index instantly in metric or imperial units and see what your result means.',
};

export default function BMICalculatorPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.backLink}>← All Tools</Link>
          <h1>BMI Calculator</h1>
          <p>
            Calculate your Body Mass Index (BMI) and understand what it means.
            Free, no signup, everything runs in your browser.
          </p>
        </div>
      </header>

      <section className={styles.content}>
        <BMICalculator />
      </section>
    </main>
  );
}
