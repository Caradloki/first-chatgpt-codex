import DatabaseConstructor from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';
import type {
  Book,
  ProgressRecord,
  SessionRecord,
  OverviewStats,
  RewardRecord,
  SessionSummary,
} from '../types';
import type { BookRecord } from './metadata';

interface ProgressPayload {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percent: number;
}

interface RewardEntry {
  code: string;
  type: string;
  label: string;
  xp: number;
  bookId?: string | null;
  meta?: Record<string, unknown>;
}

function toIsoDay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function previousIsoDay(day: string): string {
  const [year, month, date] = day.split('-').map((segment) => Number.parseInt(segment, 10));
  const value = new Date(Date.UTC(year, (month ?? 1) - 1, date ?? 1));
  value.setUTCDate(value.getUTCDate() - 1);
  return toIsoDay(value);
}

function parseMeta(meta: unknown): Record<string, unknown> | null {
  if (typeof meta !== 'string' || meta.length === 0) {
    return null;
  }

  try {
    return JSON.parse(meta);
  } catch (error) {
    console.warn('Failed to parse reward meta payload', error);
    return null;
  }
}

export class Database {
  private db = new DatabaseConstructor(path.join(app.getPath('userData'), 'lumina.sqlite'));

  constructor() {
    this.bootstrap();
  }

  private bootstrap() {
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        title TEXT,
        author TEXT,
        format TEXT,
        cover_path TEXT,
        last_opened_at TEXT,
        percent REAL DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
        current_page INTEGER,
        total_pages INTEGER,
        percent REAL,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
        started_at TEXT,
        ended_at TEXT,
        minutes REAL
      );

      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        book_id TEXT REFERENCES books(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        meta TEXT,
        granted_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  getBooks(): Book[] {
    const rows = this.db
      .prepare(
        `
      SELECT id, path, title, author, format, cover_path as coverPath, last_opened_at as lastOpenedAt, percent
      FROM books
      ORDER BY datetime(updated_at) DESC
    `,
      )
      .all();
    return rows as Book[];
  }

  getBook(id: string): Book | null {
    const row = this.db
      .prepare(
        `
      SELECT id, path, title, author, format, cover_path as coverPath, last_opened_at as lastOpenedAt, percent
      FROM books WHERE id = ?
    `,
      )
      .get(id);
    return (row as Book) ?? null;
  }

  upsertBook(book: BookRecord): Book {
    const existing = this.getBook(book.id);
    if (existing) {
      this.db
        .prepare(
          `
        UPDATE books
        SET path = @path,
            title = @title,
            author = @author,
            format = @format,
            cover_path = @coverPath,
            last_opened_at = datetime('now'),
            percent = COALESCE(@percent, percent),
            updated_at = datetime('now')
        WHERE id = @id
      `,
        )
        .run(book);
      return this.getBook(book.id)!;
    }

    this.db
      .prepare(
        `
      INSERT INTO books (id, path, title, author, format, cover_path, last_opened_at, percent, created_at, updated_at)
      VALUES (@id, @path, @title, @author, @format, @coverPath, @lastOpenedAt, @percent, @createdAt, @updatedAt)
    `,
      )
      .run(book);

    return this.getBook(book.id)!;
  }

  evaluateLibraryMilestones() {
    const { totalBooks = 0 } = this.db
      .prepare(`SELECT COUNT(*) as totalBooks FROM books`)
      .get() as { totalBooks: number };

    if (totalBooks >= 1) {
      this.grantReward({
        code: 'library:first-import',
        type: 'milestone',
        label: 'First import',
        xp: 25,
      });
    }

    if (totalBooks >= 5) {
      this.grantReward({
        code: 'library:fleet-five',
        type: 'milestone',
        label: 'Shelved five books',
        xp: 40,
      });
    }

    if (totalBooks >= 10) {
      this.grantReward({
        code: 'library:ten-plus',
        type: 'milestone',
        label: 'Built a ten-book collection',
        xp: 60,
      });
    }
  }

  getProgress(bookId: string): ProgressRecord | null {
    const row = this.db
      .prepare(
        `
      SELECT book_id as bookId, current_page as currentPage, total_pages as totalPages, percent, updated_at as updatedAt
      FROM progress WHERE book_id = ?
    `,
      )
      .get(bookId);
    return (row as ProgressRecord) ?? null;
  }

  recordProgress(payload: ProgressPayload & { sessionId?: string | null }): ProgressRecord {
    const updatedAt = new Date().toISOString();

    const changes = { ...payload, updatedAt };
    const existing = this.getProgress(payload.bookId);

    if (existing) {
      this.db
        .prepare(
          `
        UPDATE progress
        SET current_page = @currentPage,
            total_pages = @totalPages,
            percent = @percent,
            updated_at = @updatedAt
        WHERE book_id = @bookId
      `,
        )
        .run(changes);
    } else {
      this.db
        .prepare(
          `
        INSERT INTO progress (id, book_id, current_page, total_pages, percent, updated_at)
        VALUES (lower(hex(randomblob(16))), @bookId, @currentPage, @totalPages, @percent, @updatedAt)
      `,
        )
        .run(changes);
    }

    this.db
      .prepare(
        `
      UPDATE books
      SET percent = @percent,
          last_opened_at = @updatedAt,
          updated_at = @updatedAt
      WHERE id = @bookId
    `,
      )
      .run(changes);

    if (payload.sessionId) {
      this.extendSession(payload.sessionId);
    }

    this.checkBookMilestones(payload.bookId, payload.percent, payload.totalPages);

    return this.getProgress(payload.bookId)!;
  }

  startSession(bookId: string): SessionRecord {
    const startedAt = new Date().toISOString();
    const statement = this.db.prepare(
      `
      INSERT INTO sessions (id, book_id, started_at)
      VALUES (lower(hex(randomblob(16))), @bookId, @startedAt)
      RETURNING id, book_id as bookId, started_at as startedAt, ended_at as endedAt, minutes
    `,
    );
    return statement.get({ bookId, startedAt }) as SessionRecord;
  }

  extendSession(sessionId: string) {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `
      UPDATE sessions
      SET ended_at = @now,
          minutes = MAX((julianday(@now) - julianday(started_at)) * 24 * 60, 0)
      WHERE id = @sessionId
    `,
      )
      .run({ now, sessionId });
  }

  endSession(sessionId: string): SessionRecord | null {
    this.extendSession(sessionId);

    const row = this.db
      .prepare(
        `
      SELECT id, book_id as bookId, started_at as startedAt, ended_at as endedAt, minutes
      FROM sessions
      WHERE id = ?
    `,
      )
      .get(sessionId) as SessionRecord | undefined;

    if (!row) {
      return null;
    }

    const minutes = row.minutes ?? 0;
    if (minutes > 0) {
      this.grantReward({
        code: `session:${row.id}`,
        type: 'session',
        label: `Reading session · ${Math.round(minutes)} min`,
        xp: Math.max(5, Math.round(minutes)),
        bookId: row.bookId,
        meta: {
          minutes,
          startedAt: row.startedAt,
          endedAt: row.endedAt,
        },
      });
    }

    this.checkSessionMilestones();

    return row;
  }

  getOverview(): OverviewStats {
    const totals = this.db
      .prepare(
        `
      SELECT COUNT(*) as totalBooks,
             SUM(CASE WHEN percent >= 98 THEN 1 ELSE 0 END) as completed
      FROM books
    `,
      )
      .get() as { totalBooks?: number; completed?: number | null };

    const totalBooks = totals?.totalBooks ?? 0;
    const completed = totals?.completed ?? 0;
    const inProgress = Math.max(0, totalBooks - completed);

    const totalMinutesRow = this.db
      .prepare(`SELECT IFNULL(SUM(minutes), 0) as totalMinutes FROM sessions WHERE minutes IS NOT NULL`)
      .get() as { totalMinutes?: number | null };
    const totalMinutes = totalMinutesRow?.totalMinutes ?? 0;

    const todayMinutesRow = this.db
      .prepare(
        `
      SELECT IFNULL(SUM(minutes), 0) as minutes
      FROM sessions
      WHERE minutes IS NOT NULL AND date(started_at) = date('now')
    `,
      )
      .get() as { minutes?: number | null };
    const todayMinutes = todayMinutesRow?.minutes ?? 0;

    const distinctDays = this.db
      .prepare(
        `
      SELECT DISTINCT date(started_at) as day
      FROM sessions
      WHERE minutes IS NOT NULL AND minutes > 0
      ORDER BY day DESC
    `,
      )
      .all() as { day: string }[];

    const streakDays = this.calculateStreak(distinctDays.map((row) => row.day));
    const readingDays = distinctDays.length;

    const xpRow = this.db
      .prepare(`SELECT IFNULL(SUM(xp), 0) as totalXp FROM rewards`)
      .get() as { totalXp?: number | null };
    const totalXp = xpRow?.totalXp ?? 0;

    const sessions = this.db
      .prepare(
        `
      SELECT s.id, s.book_id as bookId, s.started_at as startedAt, s.ended_at as endedAt, s.minutes, b.title as bookTitle
      FROM sessions s
      LEFT JOIN books b ON b.id = s.book_id
      WHERE s.ended_at IS NOT NULL
      ORDER BY datetime(s.started_at) DESC
      LIMIT 12
    `,
      )
      .all() as SessionSummary[];

    return {
      totalBooks,
      inProgress,
      completed,
      totalMinutes,
      todayMinutes,
      streakDays,
      readingDays,
      totalXp,
      recentSessions: sessions,
    };
  }

  getRewards(): RewardRecord[] {
    const rows = this.db
      .prepare(
        `
      SELECT id, code, type, label, xp, book_id as bookId, granted_at as grantedAt, meta
      FROM rewards
      ORDER BY datetime(granted_at) DESC
    `,
      )
      .all() as Array<{
        id: string;
        code: string;
        type: string;
        label: string;
        xp: number;
        bookId?: string | null;
        grantedAt: string;
        meta?: unknown;
      }>;

    return rows.map((row) => ({
      ...row,
      meta: parseMeta(row.meta),
    })) as RewardRecord[];
  }

  private checkBookMilestones(bookId: string, percent: number, totalPages?: number | null) {
    const book = this.getBook(bookId);
    if (!book) {
      return;
    }

    const roundedPercent = Math.round(percent);
    const metaBase = {
      percent: roundedPercent,
      totalPages: totalPages ?? null,
      title: book.title,
    };

    if (roundedPercent >= 10) {
      this.grantReward({
        code: `book:${bookId}:ten`,
        type: 'milestone',
        label: `${book.title} · 10% read`,
        xp: 12,
        bookId,
        meta: metaBase,
      });
    }

    if (roundedPercent >= 50) {
      this.grantReward({
        code: `book:${bookId}:half`,
        type: 'milestone',
        label: `${book.title} · Halfway there`,
        xp: 24,
        bookId,
        meta: metaBase,
      });
    }

    if (roundedPercent >= 90) {
      this.grantReward({
        code: `book:${bookId}:almost`,
        type: 'milestone',
        label: `${book.title} · Final stretch`,
        xp: 32,
        bookId,
        meta: metaBase,
      });
    }

    if (roundedPercent >= 98) {
      this.grantReward({
        code: `book:${bookId}:complete`,
        type: 'milestone',
        label: `${book.title} · Completion`,
        xp: 80,
        bookId,
        meta: { ...metaBase, status: 'complete' },
      });
    }
  }

  private grantReward(entry: RewardEntry) {
    if (this.hasReward(entry.code)) {
      return;
    }

    const payload = {
      code: entry.code,
      type: entry.type,
      label: entry.label,
      xp: entry.xp,
      bookId: entry.bookId ?? null,
      meta: entry.meta ? JSON.stringify(entry.meta) : null,
    };

    this.db
      .prepare(
        `
      INSERT INTO rewards (id, code, type, label, xp, book_id, meta, granted_at)
      VALUES (lower(hex(randomblob(16))), @code, @type, @label, @xp, @bookId, @meta, datetime('now'))
    `,
      )
      .run(payload);
  }

  private hasReward(code: string): boolean {
    const existing = this.db.prepare(`SELECT 1 FROM rewards WHERE code = ? LIMIT 1`).get(code);
    return Boolean(existing);
  }

  private checkSessionMilestones() {
    const totals = this.db
      .prepare(`SELECT COUNT(*) as count, IFNULL(SUM(minutes), 0) as minutes FROM sessions WHERE minutes IS NOT NULL`)
      .get() as { count?: number; minutes?: number | null };

    const totalSessions = totals?.count ?? 0;
    const totalMinutes = totals?.minutes ?? 0;

    if (totalSessions >= 1) {
      this.grantReward({
        code: 'session:first-ever',
        type: 'milestone',
        label: 'First reading session',
        xp: 20,
      });
    }

    if (totalMinutes >= 120) {
      this.grantReward({
        code: 'session:two-hours',
        type: 'milestone',
        label: 'Logged two hours of reading',
        xp: 45,
      });
    }

    if (totalMinutes >= 600) {
      this.grantReward({
        code: 'session:ten-hours',
        type: 'milestone',
        label: 'Ten hour scholar',
        xp: 80,
      });
    }

    const focusBlocks = this.db
      .prepare(`SELECT COUNT(*) as count FROM sessions WHERE minutes IS NOT NULL AND minutes >= 60`)
      .get() as { count?: number };
    if ((focusBlocks?.count ?? 0) >= 1) {
      this.grantReward({
        code: 'session:deep-focus',
        type: 'milestone',
        label: '60 minute deep focus',
        xp: 55,
      });
    }

    const nightSessions = this.db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM sessions
      WHERE ended_at IS NOT NULL AND CAST(strftime('%H', ended_at) AS INTEGER) >= 22
    `,
      )
      .get() as { count?: number };
    if ((nightSessions?.count ?? 0) >= 1) {
      this.grantReward({
        code: 'session:night-owl',
        type: 'milestone',
        label: 'Night owl session',
        xp: 35,
      });
    }
  }

  private calculateStreak(days: string[]): number {
    if (days.length === 0) {
      return 0;
    }

    const daySet = new Set(days);
    const today = toIsoDay(new Date());
    let anchor: string | null = null;

    if (daySet.has(today)) {
      anchor = today;
    } else {
      const yesterday = previousIsoDay(today);
      if (daySet.has(yesterday)) {
        anchor = yesterday;
      } else {
        return 0;
      }
    }

    let streak = 0;
    while (anchor && daySet.has(anchor)) {
      streak += 1;
      anchor = previousIsoDay(anchor);
    }

    return streak;
  }
}
