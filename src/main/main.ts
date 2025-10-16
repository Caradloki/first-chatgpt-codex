import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { Database } from './storage';
import { createBookFromPath, determineFormat, getMimeType } from './metadata';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let database: Database | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Lumina Reader',
    show: false,
    backgroundColor: '#111315',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererPath = path.join(__dirname, '../../dist/renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.on('ready', () => {
  database = new Database();
  defineIpcHandlers(database);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function defineIpcHandlers(db: Database) {
  ipcMain.handle('books:get', async () => {
    return db.getBooks();
  });

  ipcMain.handle('books:open', async (_event, bookId: string) => {
    const book = db.getBook(bookId);
    if (!book) {
      return null;
    }
    const progress = db.getProgress(bookId);
    return { book, progress };
  });

  ipcMain.handle('books:file', async (_event, bookId: string) => {
    const book = db.getBook(bookId);
    if (!book) {
      return null;
    }
    const buffer = await fs.readFile(book.path);
    const mime = getMimeType(book.format);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return { data: arrayBuffer, mime };
  });

  ipcMain.handle('books:import', async () => {
    if (!mainWindow) {
      throw new Error('Main window not ready');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import files',
      buttonLabel: 'Import',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Supported books',
          extensions: ['pdf', 'epub', 'md', 'txt'],
        },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { added: [], skipped: [] };
    }

    const added = [];
    const skipped: string[] = [];

    for (const filePath of result.filePaths) {
      const format = determineFormat(filePath);
      if (!format) {
        skipped.push(filePath);
        continue;
      }

      const bookRecord = createBookFromPath(filePath, format);

      try {
        const book = db.upsertBook(bookRecord);
        added.push(book);
      } catch (error) {
        console.error('Failed to import book', error);
        skipped.push(filePath);
      }
    }

    return { added, skipped };
  });

  ipcMain.handle('progress:record', async (_event, payload: {
    bookId: string;
    currentPage: number;
    totalPages: number;
    percent: number;
    sessionId?: string | null;
  }) => {
    const progress = db.recordProgress(payload);
    if (payload.sessionId) {
      db.extendSession(payload.sessionId);
    }
    return progress;
  });

  ipcMain.handle('sessions:start', async (_event, bookId: string) => {
    return db.startSession(bookId);
  });

  ipcMain.handle('sessions:end', async (_event, sessionId: string) => {
    return db.endSession(sessionId);
  });
}
