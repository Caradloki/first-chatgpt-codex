import type { Book } from '#types';
import { Loader2, Plus } from 'lucide-react';

interface Props {
  books: Book[];
  loading: boolean;
  isEmpty: boolean;
  onImport: () => Promise<void>;
  onOpen: (bookId: string) => void;
}

const LibraryView = ({ books, loading, isEmpty, onImport, onOpen }: Props) => {
  return (
    <div className="library-shell">
      <header className="library-header">
        <div>
          <div className="library-title">Lumina Library</div>
          <h1>Welcome back</h1>
        </div>
        <button className="button" onClick={onImport} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Import books
        </button>
      </header>

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
              <div className="card-meta">Format · {book.format.toUpperCase()}</div>
              <div className="card-meta">
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
