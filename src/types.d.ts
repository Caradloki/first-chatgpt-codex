export type BookFormat = 'pdf' | 'epub' | 'md' | 'txt';

export interface Book {
  id: string;
  path: string;
  title: string;
  author?: string | null;
  format: BookFormat;
  coverPath?: string | null;
  lastOpenedAt?: string | null;
  percent?: number | null;
}

export interface ProgressRecord {
  bookId: string;
  currentPage: number;
  totalPages: number;
  percent: number;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt?: string;
  minutes?: number;
}

export interface LibraryImportResult {
  added: Book[];
  skipped: string[];
}

export interface ReaderState {
  book: Book;
  progress?: ProgressRecord;
}

export interface LuminaAPI {
  importBooks(): Promise<LibraryImportResult>;
  getLibrary(): Promise<Book[]>;
  openBook(bookId: string): Promise<{ book: Book; progress?: ProgressRecord } | null>;
  loadBookFile(bookId: string): Promise<{ data: ArrayBuffer; mime: string } | null>;
  recordProgress(data: {
    bookId: string;
    currentPage: number;
    totalPages: number;
    percent: number;
    sessionId?: string | null;
  }): Promise<ProgressRecord>;
  startSession(bookId: string): Promise<SessionRecord>;
  endSession(sessionId: string): Promise<SessionRecord | null>;
}

declare global {
  interface Window {
    lumina: LuminaAPI;
  }
}
