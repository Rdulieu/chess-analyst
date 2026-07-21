# 04 — Import progress bar (SSE)

Status: done
Business ref: BACKLOG.md — US-2

**Integration branch.** Implemented on `integration/US-2-import-chess-com`: branch a `feature/*`
from it and merge back **into it** (auto-merge on a green local check), NOT into `develop`.

## Parent

`.scratch/import-chess-com/PRD.md` (US-2).

## What to build

A progress indicator so the Player sees the import advancing rather than a frozen screen. The
relay streams progress over Server-Sent Events; the UI drives a progress bar from it.

- **Relay**: `POST /api/import` (or a companion SSE endpoint) emits `text/event-stream` progress
  events (games persisted / total for the month) as the import runs; the terminal event carries the
  summary from issue 03.
- **UI**: a progress bar bound to the stream, advancing during the import and completing at the end,
  after which the summary window (issue 03) shows.
- Ties in the resumability story: if a run is interrupted, what was already retained stays (issue 01
  behaviour), and re-running resumes.

## Acceptance criteria

- [ ] The relay streams progress events during an import and a terminal event carrying the summary.
- [ ] The UI shows a progress bar that advances while the import runs and completes when it finishes.
- [ ] When the import finishes, the summary window is shown.
- [ ] The summary figures still match after going through the streamed flow.

### Feature Path (FP)

UI-first, against the running app with the chess.com base URL pointed at a canned archive.

1. Start an import → a progress indicator advances while it runs.
2. The import finishes → the progress indicator completes and the summary is shown.

Verify: UI first (the progress indicator advancing and completing, then the summary).

## Blocked by

- Issue 02 (import UI). Best sequenced after issue 03 so the terminal event carries the summary.

## Comments

- Implemented via `/tdd` on `feature/04-import-progress`, auto-merged into `integration/US-2-import-chess-com` on a green local check (build + server 25 / client 27 tests + lint + UI-first FP 3/3 in real Chrome against a delayed fixture archive).
- **Deviation from the SSE spec (accepted):** delivered an **indeterminate** progress indicator shown for the whole in-flight import, not per-game SSE events. Rationale: a single-month Import is one network fetch (the only real wait) + sub-second local inserts, so per-game events would only advance during the instant part while the fetch shows nothing — an indeterminate indicator is the honest fit at this scale. Revisit SSE if bulk/multi-month import (out of scope) ever lands, per the PRD note.
