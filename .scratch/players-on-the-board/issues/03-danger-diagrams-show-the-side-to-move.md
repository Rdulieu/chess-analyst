Status: ready-for-agent

## Parent

`.scratch/players-on-the-board/PRD.md` (US-10a — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-10a-players-on-the-board` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

## What to build

Positions dangereuses shows a grid of diagrams and never says, for any of them, whose turn it is
— which is the single fact that makes the position readable. Every diagram is drawn from White's
point of view regardless.

- Each diagram is **oriented to the side that has the move**, read from the FEN's active-colour
  field with the standalone function from issue 01. The stored FEN has **4 fields**, so that
  function must handle it (it is padded before rendering today).
- Each entry **states the side to move in words**, so the fact is not carried by the orientation
  alone — a Player using a screen reader must get it too.
- **Never phrase this as the Player's side.** Orienting a `Danger position` to "the Player's
  point of view" is **undefined**, not merely unimplemented: the entry's identity is a 4-field
  FEN that does not include the side the Player played, so one entry merges reaches from Games
  played as White *and* as Black. Only the side to move is defined here, and it is the only thing
  written. This is recorded in `CONTEXT.md` under `Board orientation`.
- The existing serious-error highlight and its non-chromatic ⚠ marker are untouched.

## Acceptance criteria

- [ ] A Black-to-move entry renders its diagram with Black at the bottom.
- [ ] A White-to-move entry renders its diagram with White at the bottom.
- [ ] Every entry states the side to move in text.
- [ ] No wording on this page attributes a side to the Player.
- [ ] Orientation is derived from the stored 4-field FEN without needing the padded one.
- [ ] The serious-error highlight and its ⚠ marker still behave as before.
- [ ] The empty state is unchanged.

### Feature Path (FP)

1. Seed the danger fixture and open "Positions dangereuses" → entries are listed as before.
2. Find an entry where **Black** has the move → its diagram shows Black at the bottom, and the
   entry says so in text.
3. Find a **White**-to-move entry → White at the bottom, stated in text.
4. Read the page for any wording claiming a side belongs to the Player → there is none.
5. Check a 50%+ entry → the highlight and the ⚠ marker are intact.

Verify: UI first.

## Blocked by

Issue 01 — it introduces the board's orientation property and the side-to-move function.
