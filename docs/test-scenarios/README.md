# Happy Path inventory

Curated, permanent agentic-test suite (apex of the pyramid). Run at the
`integration → develop` MR (human decision) via `/agentic-tests HP`. Format:
`.claude/skills/agentic-tests/SCENARIO-FORMAT.md`. Journeys use the domain terms
from `CONTEXT.md`.

**At most 3 HP.** To add a 4th: merge two, drop a non-critical one, or graft a
drive-by onto an existing HP.

| ID | Title | Covers | Status |
|---|---|---|---|
| HP-01 | Import and explore my chess.com history | Import, Game, Move, Position | active |
| HP-02 | Explore my move habits | Move habit, Position, Move, Import | active |
| HP-03 | Spot my weak openings | Weak opening, Opening, Win rate, Import | active |
