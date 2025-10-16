import { useEffect, useMemo, useState } from 'react';
import type { Book, ReaderState } from '#types';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import './styles/app.css';

const App = () => {
  const [library, setLibrary] = useState<Book[]>([]);
  const [active, setActive] = useState<ReaderState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    window.lumina
      .getLibrary()
      .then((books) => {
        if (mounted) {
          setLibrary(books);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const isEmpty = useMemo(() => !loading && library.length === 0, [loading, library]);

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await window.lumina.importBooks();
      if (result.added.length > 0) {
        const refreshed = await window.lumina.getLibrary();
        setLibrary(refreshed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (bookId: string) => {
    const payload = await window.lumina.openBook(bookId);
    if (!payload) {
      return;
    }
    setActive(payload);
  };

  const handleCloseReader = async () => {
    setLoading(true);
    const refreshed = await window.lumina.getLibrary();
    setLibrary(refreshed);
    setLoading(false);
    setActive(null);
  };

  if (active) {
    return <ReaderView state={active} onClose={handleCloseReader} />;
  }

  return (
    <LibraryView
      books={library}
      isEmpty={isEmpty}
      loading={loading}
      onImport={handleImport}
      onOpen={handleOpen}
    />
  );
};

export default App;
