/// <reference types="vite/client" />
import type { LuminaAPI } from '#types';

declare global {
  interface Window {
    lumina: LuminaAPI;
  }
}
