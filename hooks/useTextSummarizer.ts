'use client';

import { useState, useCallback } from 'react';
import { extractTextFromFile } from '@/lib/extractText';

export type InputTab = 'text' | 'file' | 'url';
export type SummaryLength = 'short' | 'medium' | 'long';

export function useTextSummarizer() {
  const [activeTab, setActiveTab] = useState<InputTab>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [summaryLength, setSummaryLength] = useState<SummaryLength>('medium');
  const [summary, setSummary] = useState('');
  const [summaryMode, setSummaryMode] = useState<'openai' | 'extractive' | null>(null);
  const [isExtractive, setIsExtractive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const summarize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSummary('');

    try {
      let inputText = '';

      if (activeTab === 'text') {
        inputText = text.trim();
        if (!inputText) throw new Error('Please paste some text to summarize');
      } else if (activeTab === 'url') {
        if (!url.trim()) throw new Error('Please enter a URL');
        setLoadingStep('Fetching article…');
        const res = await fetch('/api/fetch-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch URL');
        inputText = data.text;
      } else {
        if (!file) throw new Error('Please select a file');
        setLoadingStep('Extracting text…');
        inputText = await extractTextFromFile(file);
      }

      if (inputText.length < 50) throw new Error('Text is too short to summarize');

      setLoadingStep('Summarizing…');
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, length: summaryLength }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Summarization failed');

      setSummary(data.summary);
      setSummaryMode(data.mode ?? null);
      setIsExtractive(!!data.extractive);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  }, [activeTab, text, url, file, summaryLength]);

  const clear = useCallback(() => {
    setText('');
    setUrl('');
    setFile(null);
    setSummary('');
    setSummaryMode(null);
    setIsExtractive(false);
    setError(null);
  }, []);

  return {
    activeTab, setActiveTab,
    text, setText,
    url, setUrl,
    file, setFile,
    summaryLength, setSummaryLength,
    summary, summaryMode, isExtractive, isLoading, loadingStep, error,
    summarize, clear,
  };
}
