import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
import { ArrowLeft, BookOpen, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import workerSrc from 'pdfjs-dist/build/pdf.worker?url';
import type { ReaderState } from '#types';

import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface Props {
  state: ReaderState;
  onClose: () => void;
}

const ReaderView = ({ state, onClose }: Props) => {
  const { book, progress } = state;
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState<number | null>(progress?.totalPages ?? null);
  const [pageNumber, setPageNumber] = useState(progress?.currentPage ?? 1);
  const sessionRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const percent = useMemo(() => {
    if (!numPages) return 0;
    return Math.min(100, Math.round((pageNumber / numPages) * 100));
  }, [pageNumber, numPages]);

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
        setFileData(new Uint8Array(payload.data));
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
  }, [book.id]);

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
    if (numPages) {
      recordProgress(pageNumber, numPages);
    }
  }, [pageNumber, numPages, recordProgress]);

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

  const renderContent = () => {
    if (book.format !== 'pdf') {
      return (
        <div className="empty-state" style={{ margin: 'auto', maxWidth: 420 }}>
          <p>
            {book.format.toUpperCase()} rendering is coming soon. You can still track progress and sessions
            today by importing PDF files.
          </p>
        </div>
      );
    }

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

    if (!fileData) {
      return null;
    }

    return (
      <Document file={{ data: fileData }} onLoadSuccess={handleDocumentLoad} loading={<Loader2 className="spin" />}> 
        <Page pageNumber={pageNumber} renderTextLayer renderAnnotationLayer width={820} />
      </Document>
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
            <BookOpen size={16} /> Page {pageNumber}
            {numPages ? ` of ${numPages}` : ''}
          </div>
          <div className="reader-progress">
            <span style={{ width: `${percent}%` }} />
          </div>
          <div className="page-counter">{percent}% complete</div>
        </div>

        {numPages && (
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
