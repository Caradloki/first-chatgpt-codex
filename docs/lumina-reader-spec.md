# Lumina Reader

## 0. TL;DR

Lumina Reader is a Windows 11 desktop application that focuses on deep reading comfort, retention, and measurable progress. It supports PDFs and popular e-book formats, tracks progress and time-on-page, gamifies completion, protects eyes during long sessions, and bundles an in-app whitepaper on habit formation and ergonomics. The product is local-first with SQLite storage, offers optional encrypted cloud sync, and includes an AI assistant for summarization, flashcards, and Q&A.

## 1. Product Vision

### Goal

Deliver a frictionless, measurable, and healthy deep-reading experience on desktop by combining a best-in-class reader with quantified habits and optional AI assistance.

### Value Pillars

1. **Comfort** — eye-safe themes, typography controls, break reminders.
2. **Clarity** — clean UI with distraction-free modes and reflow support.
3. **Retention** — highlight-to-flashcard pipelines and spaced repetition.
4. **Momentum** — progress tracking, streaks, achievements, rewards.
5. **Control** — offline-first, privacy forward, with full data export.

### Personas

- **Student/Researcher:** heavy PDF usage, needs highlights, citations, and Obsidian/Notion exports.
- **Professional:** consumes technical manuals and standards, relies on search and navigation.
- **Power Reader:** fiction/non-fiction ePub reader focused on goals, stats, and typography.

## 2. Requirements

### 2.1 Functional

- Import and read: PDF, ePub (2/3), MOBI, AZW3, CBZ/CBR, MD, TXT.
- Persist progress per file (page, location, percentage) and track per-session time.
- Gamification: XP per minute/page, achievements, completion rewards, redeemable badges.
- Notes and highlights: inline, color-coded, tagged; export to Markdown/HTML; PDF annotation support.
- Search: full-text search within a book and cross-book semantic search (optional AI index).
- Library: fetch metadata (author, title, cover, ISBN), manage shelves/tags, sorting, and filters.
- Ergonomics: themes (Light, Sepia, Dark, AMOLED), blue-light reduction, 20-20-20 reminders, typography controls, text-to-speech.
- AI companion (opt-in): summarize chapters, generate flashcards, and answer questions from selections.
- Sync (optional): sync settings, progress, and notes via cloud providers with end-to-end encrypted keys.
- Whitepaper bundle: in-app viewer and PDF export of the whitepaper.

### 2.2 Non-Functional

- Local-first with SQLite; no internet required.
- Performance: open PDFs in under 1.5s; paginate within 16ms at 60Hz; memory usage < 600MB for large PDFs.
- Reliability: crash-safe writes, WAL mode, automatic backups.
- Accessibility: keyboard-first workflows, screen-reader labels, dyslexia-friendly fonts.
- Privacy: telemetry is opt-in, transparent data model, one-click data export.

## 3. Tech Stack & Architecture

### 3.1 Platform

- Windows 11 desktop application built with Electron and React (TypeScript).
- Rendering engines:
  - PDF: PDF.js with optional MuPDF native add-on for heavy documents.
  - ePub/AZW3/MOBI: epub.js with Calibre-like conversion to ePub for MOBI/AZW3.
  - Comics (CBR/CBZ): GPU-accelerated image sequence viewer.
  - Markdown/TXT: custom renderer using marked with typographic enhancements.
- Data: SQLite via better-sqlite3; file-based attachments for exported notes.
- Search:
  - Local: Lunr/Elasticlunr per-book index.
  - Optional semantic index: local ONNX transformer or remote LLM via user key.
- Sync: modular OneDrive/Dropbox/GDrive integrations with libsodium-based E2EE.
- Background workers: Node worker threads for parsing, indexing, and heavy PDF operations.

### 3.2 High-Level Modules

- Library Service
- Reader Engine
- Annotations Service
- Progress Service
- Ergonomics Service
- Search Service
- AI Service (optional)
- Sync Service
- Export Service

### 3.3 Data Model (SQLite)

```sql
TABLE books (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  title TEXT, author TEXT, series TEXT, series_index REAL,
  format TEXT, pages INT, words INT, isbn TEXT,
  added_at DATETIME, updated_at DATETIME, cover_path TEXT,
  tags TEXT -- JSON array
);

TABLE progress (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
  locator TEXT,
  percent REAL, current_page INT, total_pages INT,
  last_opened_at DATETIME,
  streak_days INT DEFAULT 0
);

TABLE sessions (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
  started_at DATETIME, ended_at DATETIME,
  minutes INT, device TEXT DEFAULT 'win11'
);

TABLE highlights (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
  locator TEXT, text TEXT, color TEXT, note TEXT,
  tags TEXT, created_at DATETIME
);

TABLE rewards (
  id TEXT PRIMARY KEY,
  book_id TEXT REFERENCES books(id),
  type TEXT,
  xp INT, granted_at DATETIME
);

TABLE settings (
  k TEXT PRIMARY KEY, v TEXT
);
```

## 4. UX & UI Layout Plan

### 4.1 Global Design Language

- Modern, low-distraction aesthetic with subtle glassmorphism.
- Typography: system fonts with Bookerly/Source Serif Pro and dyslexia-friendly options.
- Color themes: Light, Sepia, Dark, AMOLED plus manual blue-light controls.
- Animations: micro-transitions <150ms without heavy parallax.

### 4.2 Key Screens

1. **Library (Home):** Sidebar for shelves/tags/filters, main grid/list with progress rings, top bar for search/import/settings, quick stats widget.
2. **Reader View:** Auto-hiding header with controls, main content pane (paged or scroll), toggleable right panel for notes and AI, bottom bar for navigation and appearance controls, focus mode.
3. **Notes/Highlights Hub:** Filterable list with inline editing and export options.
4. **Analytics:** Charts for minutes per day, pages per day, completion curves, streak heatmap, goals tracking.
5. **Rewards:** Badge wall with categories, XP log, cosmetic unlocks.
6. **Settings:** Appearance, ergonomics, controls, data, AI, sync, accessibility.

### 4.3 Key Flows

- Import flow: drag-and-drop, metadata parsing, confirmation, shelving, background indexing.
- Reading flow: resume locator, session timer, autosave, break nudges, exit persistence.
- Completion flow: detect >98% completion, issue rewards, allow export/share.
- Highlight-to-flashcard flow: convert selection into editable card scheduled for spaced repetition.

## 5. Gamification Design

- XP model: 1 XP per minute, 5 XP per chapter, 50 XP for completion with idle timeout safeguards.
- Streaks: +1 day for 15+ minutes reading with periodic grace day tokens.
- Badges: First Warp, Deep Space, Night Owl, Polyglot, Scholar.
- Rewards store: unlockable themes, ambient packs, and profile frames.

## 6. Ergonomics & Eye Protection

- Blue-light reduction slider with time-based scheduling.
- 20-20-20 rule reminders every 20 minutes.
- Typography controls for font size, line height, margins, spacing, hyphenation, ragged-right option.
- Text-to-speech with adjustable WPM and auto-scroll sync.
- Focus mode with UI dimming and optional ambient noise.

## 7. AI Companion (Optional)

- On-device ONNX models for summaries, Q&A, flashcards, glossary extraction, and citation graphs.
- Fallback to user-provided cloud API keys when needed.
- Guardrails prevent automatic content uploads; user-approved calls only.

## 8. Integrations

- Export to Markdown, HTML, CSV; Notion and Obsidian; Zotero-compatible RIS/BibTeX.
- Sync via OneDrive/Dropbox/GDrive with optional end-to-end encryption.
- Calibre bridge for metadata and cover import.

## 9. Security & Privacy

- Optional SQLCipher encryption for the SQLite database.
- Zero-knowledge cloud sync when encryption is enabled.
- Telemetry disabled by default; only anonymous metrics when enabled.
- Full data portability with one-click export.

## 10. Performance Targets & QA

- Library cold open <1s; 300-page PDF open <1.5s.
- Maintain 60 FPS pagination on mid-range hardware.
- QA plan includes unit tests, snapshot tests, performance budgets, and fuzzing malformed files.

## 11. Roadmap

- **MVP (8–10 weeks):** PDF/ePub/MD/TXT support, library, progress tracking, highlights/notes, Markdown export, themes, blue-light tools, analytics, badges, SQLite backups.
- **v1.1:** Comic support, MOBI/AZW3 conversion, TOC improvements, text-to-speech.
- **v1.2:** Local semantic search, flashcards with spaced repetition, Obsidian/Notion exports.
- **v1.3:** Encrypted sync and AI summaries/Q&A.
- **v2.0:** Plugin SDK, community themes, reading clubs/challenges.

## 12. Whitepaper Outline

**Title:** Momentum Reading on Desktop: Ergonomics, Gamification, and AI-Assisted Retention

1. **Abstract** — Overview of the local-first reader and its impact.
2. **Introduction** — Desktop reading challenges, related research.
3. **System Design** — Architecture, data model, ergonomic rationale.
4. **Methods** — Experimental design, metrics for evaluation.
5. **Results (Planned)** — Expected improvements in reading time and completion.
6. **Discussion** — Trade-offs, on-device AI considerations.
7. **Limitations & Future Work** — Format diversity, DRM, sync, accessibility.
8. **Ethics & Privacy** — Local-first stance, consent, data portability.
9. **Appendix** — UI assets, database schema, API surfaces, performance profiles.

## 13. Open Questions & Nice-to-Haves

- DRM strategies, citation graph for academic PDFs, adaptive reading coach, Pomodoro-like sessions, side-by-side diffing, print-ready notes exports.

## 14. Success Criteria

- +20% weekly active readers after four weeks.
- +30% completion rate vs. baseline.
- >80% of users report reduced eye strain when ergonomics features are enabled.
- 100% of data exportable and accessible outside the app.

## 15. Risks & Mitigations

- Heavy PDFs — use MuPDF path and page-range caching.
- DB corruption — enable WAL mode, snapshots, journaling, migrations.
- Scope creep — phased features and plugin architecture.
- Privacy concerns — default-off telemetry, documented data flows, E2EE options.

## 16. Development Milestones (MVP)

1. Week 1–2: project scaffolding, library, PDF/ePub rendering.
2. Week 3–4: progress database, session tracking, highlights/notes, exports.
3. Week 5: ergonomics suite and focus mode.
4. Week 6: analytics dashboards and rewards systems.
5. Week 7: QA, performance tuning, backups.
6. Week 8: polish, whitepaper draft, installer packaging.

## 17. Keyboard Shortcuts (Draft)

- **Reader:** PgUp/PgDn to navigate, `F` for fullscreen, `H` highlight, `N` note, `T` theme, `G` go to page, `S` search, `Ctrl+K` command palette.
- **Global:** `Ctrl+O` import, `Ctrl+P` export, `Ctrl+1/2/3` to switch between Library, Reader, Notes views.

