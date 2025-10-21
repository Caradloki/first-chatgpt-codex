import type { OverviewStats } from '#types';
import { RefreshCw, TrendingUp, Clock, BookOpen, BarChart2 } from 'lucide-react';

interface Props {
  overview: OverviewStats | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
}

const InsightsView = ({ overview, loading, onRefresh }: Props) => {
  const sessions = overview?.recentSessions ?? [];

  return (
    <div className="insights-shell">
      <header className="insights-header">
        <div>
          <div className="library-title">Insights</div>
          <h1>Reading analytics</h1>
          <p className="library-subtitle">Understand when you read, how long you focus, and how your streak is trending.</p>
        </div>
        <button className="button secondary" onClick={onRefresh} disabled={loading}>
          {loading ? <RefreshCw className="spin" size={16} /> : <RefreshCw size={16} />} Refresh stats
        </button>
      </header>

      <section className="insights-grid">
        <div className="insight-card">
          <div className="insight-icon primary">
            <Clock size={18} />
          </div>
          <div>
            <span className="insight-label">Total minutes logged</span>
            <strong>{Math.round(overview?.totalMinutes ?? 0)}</strong>
          </div>
        </div>
        <div className="insight-card">
          <div className="insight-icon emerald">
            <BookOpen size={18} />
          </div>
          <div>
            <span className="insight-label">Completed books</span>
            <strong>{overview?.completed ?? 0}</strong>
          </div>
        </div>
        <div className="insight-card">
          <div className="insight-icon sky">
            <TrendingUp size={18} />
          </div>
          <div>
            <span className="insight-label">Active streak</span>
            <strong>{overview?.streakDays ?? 0} days</strong>
          </div>
        </div>
        <div className="insight-card">
          <div className="insight-icon amber">
            <BarChart2 size={18} />
          </div>
          <div>
            <span className="insight-label">Reading days logged</span>
            <strong>{overview?.readingDays ?? 0}</strong>
          </div>
        </div>
      </section>

      <section className="sessions-panel">
        <header>
          <h2>Recent sessions</h2>
          <span>{sessions.length} entries</span>
        </header>

        {sessions.length === 0 && (
          <div className="empty-state">
            <p>No reading sessions recorded yet. Start a session from any book to populate insights.</p>
          </div>
        )}

        {sessions.length > 0 && (
          <ul className="session-list">
            {sessions.map((session) => {
              const started = session.startedAt ? new Date(session.startedAt) : null;
              const ended = session.endedAt ? new Date(session.endedAt) : null;
              const formatter = new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              });
              const duration = Math.max(0, Math.round(session.minutes ?? 0));
              return (
                <li key={session.id}>
                  <div>
                    <strong>{session.bookTitle ?? 'Session'}</strong>
                    <span className="session-meta">
                      {started ? formatter.format(started) : 'Unknown start'}
                      {ended ? ` · ${formatter.format(ended)}` : ''}
                    </span>
                  </div>
                  <div className="session-duration">{duration} min</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default InsightsView;
