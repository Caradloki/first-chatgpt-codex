import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent, UIEvent } from 'react';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import type { ReaderState } from '#types';
import { marked } from 'marked';

import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
marked.setOptions({ gfm: true, breaks: true });

interface Props {
  state: ReaderState;
  onClose: () => void;
}

const ReaderView = ({ state, onClose }: Props) => {
  const { book, progress } = state;
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(progress?.totalPages ?? null);
  const [pageNumber, setPageNumber] = useState(progress?.currentPage ?? 1);
  const sessionRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textPercent, setTextPercent] = useState(() => Math.round(progress?.percent ?? 0));
  const textContainerRef = useRef<HTMLDivElement | null>(null);
  const lastRecordedRef = useRef<number | null>(null);

  const percent = useMemo(() => {
    if (book.format === 'pdf') {
      if (!numPages) return 0;
      return Math.min(100, Math.round((pageNumber / numPages) * 100));
    }
    return Math.min(100, Math.max(0, Math.round(textPercent)));
  }, [book.format, pageNumber, numPages, textPercent]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    window.lumina
      .loadBookFile(book.id)
      .then((payload) => {
        if (!mounted) return;
        if (!payload) {
          setError('Unable to load book contents');
          return;
        }
        const binary = new Uint8Array(payload.data);
        setFileData(binary);
        if (book.format === 'md' || book.format === 'txt') {
          const decoder = new TextDecoder('utf-8');
          setTextContent(decoder.decode(binary));
        } else {
          setTextContent(null);
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) {
          setError('Failed to load file');
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [book.id, book.format]);

  useEffect(() => {
    setTextPercent(Math.round(progress?.percent ?? 0));
    if (progress?.currentPage && book.format === 'pdf') {
      setPageNumber(progress.currentPage);
    }
    lastRecordedRef.current = null;
  }, [book.format, book.id, progress]);

  useEffect(() => {
    let disposed = false;
    window.lumina.startSession(book.id).then((session) => {
      if (!disposed) {
        sessionRef.current = session.id;
      }
    });

    return () => {
      disposed = true;
      const id = sessionRef.current;
      sessionRef.current = null;
      if (id) {
        window.lumina.endSession(id);
      }
    };
  }, [book.id]);

  const handleDocumentLoad = useCallback(
    ({ numPages: loadedPages }: { numPages: number }) => {
      setNumPages(loadedPages);
      if (!progress?.currentPage) {
        setPageNumber(1);
      } else if (progress.currentPage > loadedPages) {
        setPageNumber(loadedPages);
      }
    },
    [progress]
  );

  const recordProgress = useCallback(
    (nextPage: number, totalPages: number) => {
      const percentComplete = Math.min(100, (nextPage / totalPages) * 100);
      window.lumina.recordProgress({
        bookId: book.id,
        currentPage: nextPage,
        totalPages,
        percent: percentComplete,
        sessionId: sessionRef.current,
      });
    },
    [book.id]
  );

  useEffect(() => {
    if (book.format !== 'pdf') {
      return;
    }
    if (numPages) {
      recordProgress(pageNumber, numPages);
    }
  }, [book.format, pageNumber, numPages, recordProgress]);

  useEffect(() => {
    if (book.format === 'pdf') {
      return;
    }
    if (textPercent < 0 || textPercent > 100) {
      return;
    }
    if (lastRecordedRef.current === textPercent) {
      return;
    }
    lastRecordedRef.current = textPercent;
    recordProgress(textPercent, 100);
  }, [book.format, textPercent, recordProgress]);

  useEffect(() => {
    if (book.format === 'pdf') {
      return;
    }
    if (!textContainerRef.current) {
      return;
    }
    const container = textContainerRef.current;
    const percentValue = (progress?.percent ?? 0) / 100;
    requestAnimationFrame(() => {
      const total = container.scrollHeight - container.clientHeight;
      if (total > 0) {
        container.scrollTop = total * percentValue;
      }
    });
  }, [book.format, progress, textContent]);

  const handlePrev = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const handleNext = () => {
    if (!numPages) return;
    setPageNumber((prev) => Math.min(numPages, prev + 1));
  };

  const handleSlider = (event: ChangeEvent<HTMLInputElement>) => {
    setPageNumber(Number(event.target.value));
  };

  const handleTextScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const total = target.scrollHeight - target.clientHeight;
    const ratio = total > 0 ? target.scrollTop / total : 1;
    const nextPercent = Math.round(Math.min(100, Math.max(0, ratio * 100)));
    setTextPercent(nextPercent);
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="empty-state" style={{ margin: 'auto' }}>
          <Loader2 className="spin" /> Loading book...
        </div>
      );
    }

    if (error) {
      return (
        <div className="empty-state" style={{ margin: 'auto', maxWidth: 360 }}>
          <p>{error}</p>
        </div>
      );
    }

    if (book.format === 'pdf') {
      if (!fileData) {
        return null;
      }

      return (
        <Document file={{ data: fileData }} onLoadSuccess={handleDocumentLoad} loading={<Loader2 className="spin" />}>
          <Page pageNumber={pageNumber} renderTextLayer renderAnnotationLayer width={820} />
        </Document>
      );
    }

    if (!textContent) {
      return null;
    }

    return (
      <div className="reader-text" ref={textContainerRef} onScroll={handleTextScroll}>
        {book.format === 'md' ? (
          <article className="markdown-body" dangerouslySetInnerHTML={{ __html: marked.parse(textContent) }} />
        ) : (
          <pre>{textContent}</pre>
        )}
      </div>
    );
  };

  return (
    <div className="reader-shell">
      <main className="reader-content">{renderContent()}</main>
      <aside className="reader-sidebar">
        <div className="reader-toolbar">
          <button className="button secondary" onClick={onClose}>
            <ArrowLeft size={16} /> Back
          </button>
          <h2>{book.title}</h2>
        </div>

        <div className="reader-stats">
          <div className="page-counter">
            <BookOpen size={16} />
            {book.format === 'pdf'
              ? `Page ${pageNumber}${numPages ? ` of ${numPages}` : ''}`
              : `Position ${percent}%`}
          </div>
          <div className="reader-progress">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="page-counter">{percent}% complete</div>
        </div>

        {book.format === 'pdf' && numPages && (
          <div className="page-controls">
            <button className="button secondary" onClick={handlePrev} disabled={pageNumber <= 1}>
              Previous
            </button>
            <input type="range" min={1} max={numPages} value={pageNumber} onChange={handleSlider} />
            <button className="button secondary" onClick={handleNext} disabled={pageNumber >= numPages}>
              Next
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default ReaderView;
