import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Book, OverviewStats, ReaderState, RewardRecord } from '#types';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import Navigation from './components/Navigation';
import InsightsView from './components/InsightsView';
import RewardsView from './components/RewardsView';
import SettingsView from './components/SettingsView';
import './styles/app.css';

type View = 'library' | 'insights' | 'rewards' | 'settings';

const App = () => {
  const [library, setLibrary] = useState<Book[]>([]);
  const [active, setActive] = useState<ReaderState | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('library');
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);

  const refresh = useCallback(async () => {
    const [books, stats, rewardList] = await Promise.all([
      window.lumina.getLibrary(),
      window.lumina.getOverview(),
      window.lumina.getRewards(),
    ]);
    setLibrary(books);
    setOverview(stats);
    setRewards(rewardList);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    refresh()
      .catch((error) => {
        console.error('Failed to load library', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const isEmpty = useMemo(() => !loading && library.length === 0, [loading, library]);

  const continueBook = useMemo(() => {
    const sorted = [...library]
      .filter((book) => (book.percent ?? 0) > 0)
      .sort((a, b) => {
        const aDate = a.lastOpenedAt ?? '';
        const bDate = b.lastOpenedAt ?? '';
        return bDate.localeCompare(aDate);
      });
    return sorted[0];
  }, [library]);

  const handleImport = async () => {
    setLoading(true);
    try {
      await window.lumina.importBooks();
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await refresh();
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const handleOpen = async (bookId: string) => {
    setView('library');
    const payload = await window.lumina.openBook(bookId);
    if (!payload) {
      return;
    }
    setActive(payload);
  };

  const handleCloseReader = () => {
    setActive(null);
    setLoading(true);
    refresh().finally(() => {
      setLoading(false);
    });
  };

  if (active) {
    return <ReaderView state={active} onClose={handleCloseReader} />;
  }

  return (
    <div className="app-shell">
      <Navigation active={view} onSelect={setView} overview={overview} />
      <main className="app-main">
        {view === 'library' && (
          <LibraryView
            books={library}
            continueBook={continueBook}
            overview={overview}
            isEmpty={isEmpty}
            loading={loading}
            onImport={handleImport}
            onOpen={handleOpen}
          />
        )}

        {view === 'insights' && <InsightsView overview={overview} loading={loading} onRefresh={handleRefresh} />}

        {view === 'rewards' && <RewardsView rewards={rewards} totalXp={overview?.totalXp ?? 0} loading={loading} />}

        {view === 'settings' && <SettingsView onImport={handleImport} loading={loading} />}
      </main>
    </div>
  );
};

export default App;
