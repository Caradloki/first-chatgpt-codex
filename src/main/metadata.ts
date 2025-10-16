import path from 'node:path';
import crypto from 'node:crypto';
import type { Book, BookFormat } from '../types';

export interface BookRecord extends Book {
  createdAt: string;
  updatedAt: string;
}

export function determineFormat(filePath: string): BookFormat | null {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  if (ext === 'pdf' || ext === 'epub' || ext === 'md' || ext === 'txt') {
    return ext as BookFormat;
  }
  return null;
}

export function createBookFromPath(filePath: string, format: BookFormat): BookRecord {
  const id = crypto.createHash('sha1').update(filePath).digest('hex');
  const title = deriveTitle(filePath);
  const isoDate = new Date().toISOString();

  return {
    id,
    path: filePath,
    title,
    format,
    createdAt: isoDate,
    updatedAt: isoDate,
    author: null,
    coverPath: null,
    lastOpenedAt: null,
    percent: 0,
  };
}

function deriveTitle(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}

export function getMimeType(format: BookFormat) {
  switch (format) {
    case 'pdf':
      return 'application/pdf';
    case 'epub':
      return 'application/epub+zip';
    case 'md':
      return 'text/markdown';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}
