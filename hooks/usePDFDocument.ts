/**
 * Hook for loading and managing a PDF document using pdfjs-dist
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// Set up worker from public folder
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

interface UsePDFDocumentState {
  pdfDoc: PDFDocumentProxy | null;
  numPages: number;
  loading: boolean;
  error: Error | null;
}

export function usePDFDocument(file: File): UsePDFDocumentState & {
  getPage: (pageNum: number) => Promise<PDFPageProxy>;
} {
  const [state, setState] = useState<UsePDFDocumentState>({
    pdfDoc: null,
    numPages: 0,
    loading: true,
    error: null,
  });

  const pageCache = useRef<Map<number, PDFPageProxy>>(new Map());

  useEffect(() => {
    if (!file) return;

    setState({ pdfDoc: null, numPages: 0, loading: true, error: null });
    pageCache.current.clear();

    const loadPDF = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setState({
          pdfDoc: pdf,
          numPages: pdf.numPages,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState({
          pdfDoc: null,
          numPages: 0,
          loading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    };

    loadPDF();

    return () => {
      // Clean up cached pages
      pageCache.current.forEach((page) => {
        page.cleanup();
      });
      pageCache.current.clear();
    };
  }, [file]);

  const getPage = useCallback(
    async (pageNum: number): Promise<PDFPageProxy> => {
      if (!state.pdfDoc) throw new Error('PDF document not loaded');
      if (pageNum < 1 || pageNum > state.numPages) {
        throw new Error(`Page ${pageNum} out of range`);
      }

      // Check cache first
      if (pageCache.current.has(pageNum)) {
        return pageCache.current.get(pageNum)!;
      }

      // Load and cache page
      const page = await state.pdfDoc.getPage(pageNum);
      pageCache.current.set(pageNum, page);
      return page;
    },
    [state.pdfDoc, state.numPages]
  );

  return {
    ...state,
    getPage,
  };
}
