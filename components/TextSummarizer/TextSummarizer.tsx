'use client';

import { useTextSummarizer } from '@/hooks/useTextSummarizer';
import InputPanel from './InputPanel';
import SummaryOutput from './SummaryOutput';
import styles from './TextSummarizer.module.css';

export default function TextSummarizer() {
  const {
    activeTab, setActiveTab,
    text, setText,
    url, setUrl,
    file, setFile,
    summaryLength, setSummaryLength,
    summary, isLoading, loadingStep, error,
    summarize, clear,
  } = useTextSummarizer();

  return (
    <div className={styles.layout}>
      <InputPanel
        activeTab={activeTab}
        onTabChange={setActiveTab}
        text={text}
        onTextChange={setText}
        url={url}
        onUrlChange={setUrl}
        file={file}
        onFileChange={setFile}
        summaryLength={summaryLength}
        onLengthChange={setSummaryLength}
        isLoading={isLoading}
        loadingStep={loadingStep}
        onSubmit={summarize}
        onClear={clear}
      />
      <SummaryOutput summary={summary} error={error} />
    </div>
  );
}
