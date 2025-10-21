import { useMemo } from 'react';
import type { Book, OverviewStats } from '#types';
import { Award, Flame, Loader2, Plus, Sparkles, Target } from 'lucide-react';

interface Props {
  books: Book[];
  continueBook?: Book;
  overview: OverviewStats | null;
  loading: boolean;
  isEmpty: boolean;
  onImport: () => Promise<void>;
  onOpen: (bookId: string) => void;
}

const LibraryView = ({ books, continueBook, overview, loading, isEmpty, onImport, onOpen }: Props) => {
  const minutesToday = Math.round(overview?.todayMinutes ?? 0);
  const completed = overview?.completed ?? 0;
  const totalBooks = overview?.totalBooks ?? 0;
  const streak = overview?.streakDays ?? 0;

  const nextReward = useMemo(() => {
    if (!overview) return 'Earn XP by starting a session';
    if (completed === 0) {
      return 'Finish your first book to unlock the Completion badge';
    }
    if (streak < 3) {
      return 'Read again tomorrow to build your streak';
    }
    return 'Keep logging minutes to reach the 10-hour milestone';
  }, [overview, completed, streak]);

  return (
    <div className="library-shell">
      <header className="library-header">
        <div>
          <div className="library-title">Lumina Library</div>
          <h1>Welcome back</h1>
          <p className="library-subtitle">Track your sessions, chase streaks, and keep your reading momentum strong.</p>
        </div>
        <button className="button" onClick={onImport} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Import books
        </button>
      </header>

      <section className="library-overview">
        <div className="metric-card">
          <div className="metric-icon warm">
            <ClockIcon />
          </div>
          <div className="metric-content">
            <span className="metric-label">Minutes today</span>
            <strong className="metric-value">{minutesToday}</strong>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon aurora">
            <Sparkles size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Books finished</span>
            <strong className="metric-value">{completed}</strong>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon ember">
            <Flame size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Streak days</span>
            <strong className="metric-value">{streak}</strong>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon ocean">
            <Target size={18} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total books</span>
            <strong className="metric-value">{totalBooks}</strong>
          </div>
        </div>
      </section>

      {continueBook && (
        <section className="library-continue">
          <div className="continue-card">
            <div className="continue-header">
              <span className="continue-label">Continue reading</span>
              <button className="button secondary" onClick={() => onOpen(continueBook.id)}>
                Resume session
              </button>
            </div>
            <h2>{continueBook.title}</h2>
            <div className="continue-meta">
              <span>{continueBook.format.toUpperCase()}</span>
              <span>{Math.round(continueBook.percent ?? 0)}% complete</span>
            </div>
          </div>
          <div className="motivation-card">
            <Award size={18} />
            <div>
              <div className="motivation-title">Next milestone</div>
              <p>{nextReward}</p>
            </div>
          </div>
        </section>
      )}

      {loading && (
        <div className="empty-state">
          <Loader2 className="spin" /> Preparing your library...
        </div>
      )}

      {!loading && isEmpty && (
        <div className="empty-state">
          <p>No books yet. Import PDFs, ePub, Markdown, or text files to begin.</p>
        </div>
      )}

      {!loading && !isEmpty && (
        <div className="library-grid">
          {books.map((book) => (
            <article key={book.id} className="card">
              <div className="card-title">{book.title}</div>
              <div className="card-meta">{book.format.toUpperCase()}</div>
              <div className="card-meta subtle">
                {book.percent !== undefined && book.percent !== null && book.percent > 0
                  ? `${Math.round(book.percent)}% complete`
                  : 'Not started'}
              </div>
              <button className="button secondary" onClick={() => onOpen(book.id)}>
                {book.percent && book.percent > 0 ? 'Continue' : 'Start'}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryView;

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
    <path d="M12 7.5V12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
