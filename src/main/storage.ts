import DatabaseConstructor from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';
import type { Book, ProgressRecord, SessionRecord } from '../types';
import type { BookRecord } from './metadata';

interface ProgressPayload {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percent: number;
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
    `);
  }

  getBooks(): Book[] {
    const rows = this.db.prepare(`
      SELECT id, path, title, author, format, cover_path as coverPath, last_opened_at as lastOpenedAt, percent
      FROM books
      ORDER BY datetime(updated_at) DESC
    `).all();
    return rows as Book[];
  }

  getBook(id: string): Book | null {
    const row = this.db.prepare(`
      SELECT id, path, title, author, format, cover_path as coverPath, last_opened_at as lastOpenedAt, percent
      FROM books WHERE id = ?
    `).get(id);
    return (row as Book) ?? null;
  }

  upsertBook(book: BookRecord): Book {
    const existing = this.getBook(book.id);
    if (existing) {
      this.db.prepare(`
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
      `).run(book);
      return this.getBook(book.id)!;
    }

    this.db.prepare(`
      INSERT INTO books (id, path, title, author, format, cover_path, last_opened_at, percent, created_at, updated_at)
      VALUES (@id, @path, @title, @author, @format, @coverPath, @lastOpenedAt, @percent, @createdAt, @updatedAt)
    `).run(book);

    return this.getBook(book.id)!;
  }

  getProgress(bookId: string): ProgressRecord | null {
    const row = this.db.prepare(`
      SELECT book_id as bookId, current_page as currentPage, total_pages as totalPages, percent, updated_at as updatedAt
      FROM progress WHERE book_id = ?
    `).get(bookId);
    return (row as ProgressRecord) ?? null;
  }

  recordProgress(payload: ProgressPayload & { sessionId?: string | null }): ProgressRecord {
    const updatedAt = new Date().toISOString();

    const changes = { ...payload, updatedAt };
    const existing = this.getProgress(payload.bookId);

    if (existing) {
      this.db.prepare(`
        UPDATE progress
        SET current_page = @currentPage,
            total_pages = @totalPages,
            percent = @percent,
            updated_at = @updatedAt
        WHERE book_id = @bookId
      `).run(changes);
    } else {
      this.db.prepare(`
        INSERT INTO progress (id, book_id, current_page, total_pages, percent, updated_at)
        VALUES (lower(hex(randomblob(16))), @bookId, @currentPage, @totalPages, @percent, @updatedAt)
      `).run(changes);
    }

    this.db.prepare(`
      UPDATE books
      SET percent = @percent,
          last_opened_at = @updatedAt,
          updated_at = @updatedAt
      WHERE id = @bookId
    `).run(changes);

    if (payload.sessionId) {
      this.extendSession(payload.sessionId);
    }

    return this.getProgress(payload.bookId)!;
  }

  startSession(bookId: string): SessionRecord {
    const startedAt = new Date().toISOString();
    const statement = this.db.prepare(`
      INSERT INTO sessions (id, book_id, started_at)
      VALUES (lower(hex(randomblob(16))), @bookId, @startedAt)
      RETURNING id, book_id as bookId, started_at as startedAt, ended_at as endedAt, minutes
    `);
    return statement.get({ bookId, startedAt }) as SessionRecord;
  }

  extendSession(sessionId: string) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE sessions
      SET ended_at = @now,
          minutes = (julianday(@now) - julianday(started_at)) * 24 * 60
      WHERE id = @sessionId
    `).run({ now, sessionId });
  }

  endSession(sessionId: string): SessionRecord | null {
    this.extendSession(sessionId);

    const row = this.db.prepare(`
      SELECT id, book_id as bookId, started_at as startedAt, ended_at as endedAt, minutes
      FROM sessions
      WHERE id = ?
    `).get(sessionId);

    return (row as SessionRecord) ?? null;
  }
}
