# Lumina Reader — Product Spec, UI Layout Plan, and Whitepaper Outline

## 0) TL;DR

A Windows 11/Ubuntu desktop app that reads PDFs and e-books (ePub/MOBI/AZW3/CBR/CBZ/MD/TXT), tracks progress and time-on-page, gamifies completion with rewards, protects eyes for long sessions, and includes a publishable whitepaper on habit formation + ergonomics. Local-first (SQLite), optional cloud sync, and an AI assistant for summarization, flashcards, and Q&A.

---

## 1) Product Vision

**Goal:** Make deep reading on PC frictionless, measurable, and healthy. Blend a best-in-class reader with a quantified-habit layer and just-enough AI to retain knowledge.

**Value pillars:**

1. **Comfort:** eye-safe themes, typography, and reminders.
2. **Clarity:** clean UI, reflow where possible, distraction-free mode.
3. **Retention:** highlights → notes → flashcards → spaced repetition.
4. **Momentum:** progress tracking, streaks, and rewards.
5. **Control:** offline by default, privacy-first, export everything.

**Personas:**

- **Student/Researcher:** reads PDFs/whitepapers; needs highlights, citations, and export to Obsidian/Notion.
- **Professional:** technical manuals, standards; needs search across library and TOC navigation.
- **Power Reader:** ePub fiction/non-fiction; wants goals, stats, and beautiful typography.

---

## 2) Requirements

### 2.1 Functional

- Import/read: **PDF, ePub (2/3), MOBI, AZW3, CBZ/CBR, MD, TXT**.
- Persist **progress** per file (page, location, percentage), per-session **time tracking**.
- **Gamification:** XP per minute/page, achievements, completion rewards with redeemable badges.
- **Notes & Highlights:** inline, color-coded, tags; export to Markdown/HTML; PDF annotation support.
- **Search:** full-text search within book; cross-book semantic search (optional AI index).
- **Library:** metadata fetch (author, title, cover, ISBN), shelves/tags, sorting and filters.
- **Ergonomics:** themes (Light, Sepia, Dark, AMOLED), blue-light reduction, **20-20-20** reminders, font/spacing/margins, text-to-speech.
- **AI Companion (optional/opt-in):** summarize chapters, generate flashcards, Q&A on selection.
- **Sync (optional):** settings/progress/notes via cloud provider; end-to-end encrypted key option.
- **Whitepaper bundle:** in-app whitepaper viewer and PDF export.

### 2.2 Non-Functional

- **Local-first:** SQLite DB; no internet required.
- **Performance:** open PDF < 1.5s; paginate under 16ms/frame at 60Hz on mid-range PC; memory cap < 600MB for 500-page PDF.
- **Reliability:** crash-safe writes; DB WAL mode; auto backups.
- **Accessibility:** keyboard-first, screen-reader labels, dyslexia-friendly fonts.
- **Privacy:** opt-in telemetry; transparent data model; one-click data export.

---

## 3) Tech Stack & Architecture

### 3.1 Platform

- **Windows 11/Ubuntu** desktop app.
- **Shell:** Electron + React (TypeScript) for fast iteration and cross-platform potential.
- **Rendering engines:**
  - **PDF:** PDF.js (fast path) with optional MuPDF native addon for heavy docs.
  - **ePub/AZW3/MOBI:** epub.js + Calibre-style converter pipeline for MOBI/AZW3 to ePub.
  - **Comics (CBR/CBZ):** image sequence with GPU-accelerated viewer.
  - **Markdown/TXT:** custom renderer (marked + typographic enhancements).
- **Data:** SQLite via better-sqlite3; file-based attachments for highlights/notes exports.
- **Search:**
  - Local: Lunr/Elasticlunr index per book.
  - Optional semantic index: local transformer (onnxruntime) or remote LLM (user key).
- **Sync:** modular provider (OneDrive/Dropbox/GDrive) + E2EE (libsodium).
- **Background workers:** Node worker threads for parsing/indexing; offload heavy PDF ops.

### 3.2 High-Level Modules

- **Library Service** (import, metadata, covers, shelves/tags)
- **Reader Engine** (renderers, pagination/reflow, TOC, bookmarks)
- **Annotations Service** (highlights, notes, comments, tags)
- **Progress Service** (sessions, streaks, goals, rewards)
- **Ergonomics Service** (themes, blue-light filter, break reminders, TTS)
- **Search Service** (per-book + cross-book indices)
- **AI Service** (summaries, flashcards, Q&A) — optional
- **Sync Service** (delta sync, conflict resolver)
- **Export Service** (Markdown/CSV/HTML; Obsidian/Notion integrations)

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
  locator TEXT, -- e.g., page num or CFI for ePub
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
  type TEXT, -- 'complete','streak','speedrun','night_owl'
  xp INT, granted_at DATETIME
);

TABLE settings (
  k TEXT PRIMARY KEY, v TEXT
);
```

---

## 4) UX & UI Layout Plan

### 4.1 Global design language

- **Modern, low-distraction:** edge-to-edge content, subtle glassmorphism for chrome.
- **Typography:** system fonts + Bookerly/Source Serif Pro; Dyslexie/OpenDyslexic option.
- **Color themes:** Light, Sepia, Dark, AMOLED; manual blue-light slider; eye-strain friendly contrast.
- **Animations:** micro-transitions <150ms; no large parallax.

### 4.2 Screens & Wireframe Notes

1. **Library (Home)**
   - Left sidebar: Shelves/Tags/Filters.
   - Main grid/list: Covers, title, author, progress ring (%), last opened.
   - Top bar: Global search, Import, Settings.
   - Quick stats widget: today’s minutes, streak, “Continue Reading” CTA.

2. **Reader View**
   - Header (auto-hide): Title, TOC button, Search, Progress %, Timer.
   - Content pane: paged or scroll modes; single/double page; zoom.
   - Right panel (toggle): Highlights/Notes; AI (Summarize/Ask/Flashcards).
   - Bottom bar: page slider, chapter markers, theme switch, font/spacing controls.
   - **Focus mode:** hides chrome; ambient sound toggle; 20-20-20 hint pill.

3. **Notes/Highlights Hub**
   - Filter by book, color tag, date; inline edit; export selected → MD/HTML/CSV.

4. **Analytics (Insights)**
   - Charts: minutes/day, pages/day, completion curve, streak heatmap.
   - Goals: daily minutes, weekly completions; adherence %.

5. **Rewards**
   - Badge wall with categories (Consistency, Explorer, Marathon, Night Owl, Scholar).
   - XP log; customizable rewards (e.g., unlock themes/ambient packs).

6. **Settings**
   - Appearance, Ergonomics (blue-light, break cadence), Controls (hotkeys), Data (backup/export), AI (keys, privacy), Sync (providers), Accessibility.

### 4.3 Key Flows

- **Import Flow:** Drag-drop → parse metadata → confirm/edit → shelve/tag → background index.
- **Reading Flow:** Open → restore locator → timer starts → periodic autosave → suggest break at N minutes → on exit store session.
- **Completion Flow:** Detect >98% + last chapter read → issue reward → share/export summary.
- **Highlight→Flashcard Flow:** Select text → “Make card” → front/back auto-generated; edit → add to deck → spaced-repetition schedule.

---

## 5) Gamification Design

- **XP model:** 1 XP/min + 5 XP/chapter + 50 XP completion; anti-farm: idle timeout after 2 min inactivity.
- **Streaks:** day has ≥15 min = +1; grace day token every 7 days.
- **Badges:**
  - *First Warp*: first completion
  - *Deep Space*: 1000 pages total
  - *Night Owl*: 120 min after 22:00
  - *Polyglot*: finish books in 3 formats
  - *Scholar*: 100 highlights
- **Rewards store:** unlock app themes, ambient packs, profile frames (cosmetic, privacy-safe, offline).

---

## 6) Ergonomics & Eye Protection

- **Blue-light reduction** slider + time-based scheduling (sunset-aware).
- **Reading cadence:** 20-20-20 rule nudges (20 sec look 20 ft away every 20 min) with subtle notice.
- **Typography controls:** font size, line height, margins, paragraph spacing, hyphenation toggle, ragged-right option.
- **TTS:** natural voice; adjustable WPM; auto-scroll sync.
- **Focus mode:** hides UI, dims notifications; optional ambient noise.

---

## 7) AI Companion (Optional/Offline-first Mindset)

- **On-device** QA/summarization via ONNX models for privacy; fallback to cloud with user API key.
- Features: chapter summaries, section Q&A, flashcard generation, glossary extraction, citation graph for PDFs with references.
- Guardrails: never auto-upload content; chunk locally; user-approved calls only.

---

## 8) Integrations

- **Export:** Markdown/HTML/CSV; Notion/Obsidian; Zotero RIS/BibTeX for citations.
- **Sync:** OneDrive/Dropbox/GDrive (E2EE optional); manual backup/restore ZIP.
- **Calibre bridge:** optional one-way import of metadata/covers.

---

## 9) Security & Privacy

- Local encryption option for DB (SQLCipher).
- Zero-knowledge for cloud sync when E2EE enabled.
- Telemetry is off by default; if enabled, only anonymous performance metrics.
- Data portability: one-click export of DB + attachments.

---

## 10) Performance Targets & QA

- Cold open to Library < 1000ms; open a 300-page PDF < 1500ms.
- Smooth scroll/paginate at 60 FPS on i5/Radeon iGPU.
- QA: unit tests (renderers, DB), snapshot tests for reader, perf budgets, fuzz tests for malformed PDFs/EPUBs.

---

## 11) Roadmap

**MVP (8–10 weeks):**

- Formats: PDF, ePub, MD, TXT.
- Library, progress tracking, session timing, highlights/notes, export MD.
- Themes, blue-light, 20-20-20, basic analytics, badges.
- Local SQLite, backups.

**v1.1:** comics (CBR/CBZ), MOBI/AZW3 via convert pipeline; TOC improvements; TTS.

**v1.2:** semantic search (local), flashcards + spaced repetition, Obsidian/Notion exports.

**v1.3:** sync w/ E2EE; AI summaries/Q&A (opt-in).

**v2.0:** plugin SDK, community themes, reading clubs/challenges.

---

## 12) Whitepaper (Bundled) — Outline

**Title:** *Momentum Reading on Desktop: Ergonomics, Gamification, and AI-Assisted Retention*

**Abstract:** Present a local-first Windows reader that measurably increases reading consistency and recall via ergonomic design, habit mechanics, and optional on-device AI.

**1. Introduction**

- Problem: desktop reading fatigue, context-switching, poor retention.
- Prior work: e-reading ergonomics, habit formation, spaced repetition.

**2. System Design**

- Architecture, data model, privacy model.
- Ergonomic feature set and justifications.

**3. Methods**

- Experimental setup: A/B themes, reminders; with/without gamification.
- Metrics: minutes/day, completion rate, highlight density, recall scores.

**4. Results (planned)**

- Hypotheses: 15–25% increase in daily minutes; higher completion with streaks.

**5. Discussion**

- Trade-offs: motivation vs intrinsic reading; on-device AI constraints.

**6. Limitations & Future Work**

- Diverse formats, DRM boundaries, cross-device sync, accessibility testing.

**7. Ethics & Privacy**

- Local-first stance, consent, data portability.

**Appendix**

- UI screenshots/wireframes; DB schema; API surfaces; perf profiles.

---

## 13) Open Questions & Nice-to-Haves

- DRM-encumbered formats: evaluate Readium LCP (legal/licensing).
- Citation graph for academic PDFs (extract DOIs; build backlink map).
- Reading coach: adaptive goals based on historical adherence.
- “Reading sessions as Pomodoro” modes; presence API to mute distractions.
- Multi-window diff: compare two versions of a paper side-by-side.
- Print-ready PDF export of notes + highlights, grouped by chapter.

---

## 14) Success Criteria

- **Engagement:** +20% weekly active readers after 4 weeks.
- **Completion:** +30% book completion rate vs baseline readers.
- **Comfort:** >80% users report reduced eye strain with ergonomics enabled.
- **Ownership:** 100% of data exportable and readable outside the app.

---

## 15) Risks & Mitigations

- **Heavy PDFs:** add MuPDF path; page-range caching.
- **DB corruption:** WAL + frequent snapshots; journaling; schema migrations.
- **Scope creep:** phase features; plugin architecture to defer non-core ideas.
- **Privacy concerns:** default-off telemetry; documented data flows; E2EE option.

---

## 16) Dev Milestones (MVP detail)

- Week 1–2: project scaffolding, Library, PDF/ePub open, basic renderer.
- Week 3–4: progress DB, sessions, highlights/notes, exports.
- Week 5: ergonomics (themes, blue-light, breaks), focus mode.
- Week 6: analytics and rewards; basic charts.
- Week 7: QA/perf; crash recovery; backups.
- Week 8: polish; whitepaper draft; packaging & installer.

---

## 17) Appendix: Keyboard Shortcuts (draft)

- **Reader**: PgUp/PgDn scroll page; `F` full screen; `H` highlight; `N` note; `T` theme; `G` go to page; `S` search; `Ctrl+K` command palette.
- **Global**: `Ctrl+O` import; `Ctrl+P` print/export; `Ctrl+1/2/3` Library/Reader/Notes.
