# Lumina Reader

Lumina Reader is a Windows-focused desktop application that blends a distraction-free library experience with quantified reading habits. The app is built with Electron, React, and SQLite to stay local-first while tracking sessions, progress, and ergonomics-friendly themes.

The repository contains:

- `src/` — Electron main process, preload bridge, and React renderer code.
- `docs/lumina-reader-spec.md` — comprehensive product specification and roadmap.

## Features (Current Snapshot)

- Import PDFs, EPUB, Markdown, or text files into a searchable local library.
- Local SQLite database for books, progress, and reading sessions (WAL enabled).
- PDF reader with progress tracking, page slider, and time-on-task logging.
- Session tracking for streaks/analytics foundations.
- Modern glassmorphism-inspired interface optimized for long-form reading.

## Getting Started

> **Prerequisites:** Node.js 18+, npm 9+, and a working native build toolchain (required for `better-sqlite3`).

```bash
npm install
```

### Development

Run the renderer dev server and Electron side-by-side:

```bash
npm run dev
```

The renderer is served from `http://localhost:5173` and loaded inside Electron. Changes in `src/renderer` hot-reload automatically.

### Type Checking & Linting

```bash
npm run typecheck
npm run lint
```

### Production Build

```bash
npm run build
```

The compiled assets land in `dist/`. To generate a Windows installer (NSIS):

```bash
npm run package
```

Output artifacts are written to `release/`.

## Project Structure

```
├── docs/
│   └── lumina-reader-spec.md
├── src/
│   ├── main/        # Electron main process, IPC, SQLite bindings
│   ├── preload/     # Secure bridge exposing Lumina API to renderer
│   └── renderer/    # React UI: library + reader surfaces
├── electron-builder.yml
├── package.json
└── README.md
```

## Roadmap

See the [Lumina Reader Product Spec](docs/lumina-reader-spec.md) for the complete functional breakdown, ergonomics plan, and release milestones.
