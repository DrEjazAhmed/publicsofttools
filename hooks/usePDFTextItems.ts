import { useCallback, useState } from 'react';
import { PDFTextItem, TextReplacements } from '@/lib/annotationTypes';

export function usePDFTextItems() {
  const [pageTextItems, setPageTextItems] = useState<Map<number, PDFTextItem[]>>(new Map());
  const [textReplacements, setTextReplacements] = useState<TextReplacements>(new Map());

  const setPageItems = useCallback((pageNum: number, items: PDFTextItem[]) => {
    setPageTextItems((prev) => {
      const next = new Map(prev);
      next.set(pageNum, items);
      return next;
    });
  }, []);

  const replaceText = useCallback((itemId: string, newText: string) => {
    setTextReplacements((prev) => new Map(prev).set(itemId, newText));
  }, []);

  const getPageItems = useCallback(
    (pageNum: number): PDFTextItem[] => pageTextItems.get(pageNum) || [],
    [pageTextItems]
  );

  return { textReplacements, pageTextItems, setPageItems, getPageItems, replaceText };
}
