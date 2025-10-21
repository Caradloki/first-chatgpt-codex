import { contextBridge, ipcRenderer } from 'electron';
import type { LuminaAPI } from '../types';

const api: LuminaAPI = {
  importBooks: () => ipcRenderer.invoke('books:import'),
  getLibrary: () => ipcRenderer.invoke('books:get'),
  openBook: (bookId) => ipcRenderer.invoke('books:open', bookId),
  loadBookFile: (bookId) => ipcRenderer.invoke('books:file', bookId),
  recordProgress: (data) => ipcRenderer.invoke('progress:record', data),
  startSession: (bookId) => ipcRenderer.invoke('sessions:start', bookId),
  endSession: (sessionId) => ipcRenderer.invoke('sessions:end', sessionId),
  getOverview: () => ipcRenderer.invoke('stats:overview'),
  getRewards: () => ipcRenderer.invoke('rewards:list'),
};

contextBridge.exposeInMainWorld('lumina', api);
