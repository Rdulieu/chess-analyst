Status: done — auto-merged into `integration/US-8-analysis-pass-completion` (PR #21).
Green local check: build + lint + 214 tests (110 server, 104 client). Feature Path 3/3 green, no
console error. Step 2 was the telling one: during a pass both figures move simultaneously and
differently (history 2 → 3, pass 0/3 → done) — outright misleading under the old wording. Step 3
inspected the page's accessibility roles: none of our live regions remain on Analyse.
Non-blocking findings raised: the running readout does not name itself ("0/3 positions évaluées"
bare) — the collision is gone since the shapes no longer match, but the labelling stops at the
finished pass; and react-chessboard's remaining live region is `aria-live="assertive"` and
unlabelled (third-party, empty outside drag-and-drop).

## Parent

`.scratch/analysis-pass-completion/PRD.md` (US-8 — BACKLOG.md). Decisions: **ADR-0011**.

Implemented on the business-story integration branch
`integration/US-8-analysis-pass-completion` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

**Finishing slice**: closes the two contained findings the agentic runs raised across slices 02
and 04, before the HP suite is replayed — so the HP validates the final wording rather than one
we are about to change. The third finding (an unacknowledged summary superseded by a newer pass)
is **not** in scope: it was deliberately accepted and is now recorded in ADR-0011's Consequences.

## What to build

### 1. Two figures that no longer read as one correcting the other

"Mes parties" shows, a few pixels apart, two numbers built on the same visual pattern:

- `6 parties · 3 analysées` — how much of the imported history has been analyzed, true whenever
  the page is open;
- `1 partie · 3 positions évaluées ✓` — what the **last pass** did.

Same shape, different nature, adjacent: the second reads as a correction of the first. Neither
slice could see this alone — it emerges from their juxtaposition.

Make each one say what it is. The fix is **presentation, not data**: no contract change, no new
request, no stored value. Whatever form is chosen (labelling each figure with what it describes,
separating them, or moving the pass readout next to the action that starts it), the Player must
be able to tell, without thinking, which number describes the history and which describes the
last pass.

### 2. One live region speaking at a time on the Analyse page

The Analyse page currently carries **two** of our own `role="status"` live regions — the pass
progress and `Board`'s "current move" — plus a third, unlabelled and empty, emitted by
**`react-chessboard`** for its drag-and-drop announcements. The third is third-party: it cannot
be removed, only accommodated.

Keep the pass progress as the page's live region — it reports something the Player cannot
otherwise observe, over minutes — and **demote "current move"**: stepping through moves is a
direct response to the Player's own action, already evident, so announcing it competes for
speech with the pass. It keeps its accessible name and its text; it stops being a live region.

Note the real scope: **11 call sites** across `Board.test.tsx`, `App.test.tsx` and
`GameViewer.test.tsx` select that element by `getByRole("status", { name: "current move" })` and
must move to an accessible-name query. Mechanical, but not two lines.

## Acceptance criteria

- [ ] The history figure and the last-pass figure are each identifiable as such, without relying
      on their position on the page.
- [ ] No server contract, endpoint or stored value changes.
- [ ] The count is still derived from the already-loaded Games, with no extra request.
- [ ] "Mes parties" shows no misleading figure on an empty history.
- [ ] The Analyse page exposes exactly **one** live region of ours; `react-chessboard`'s own is
      left untouched.
- [ ] "current move" keeps its accessible name and its content, and remains queryable by that
      name.
- [ ] The pass progress and its outcome messages stay announced, and the dismiss control stays
      outside the live region (slice 03).
- [ ] Every test selecting "current move" by role is migrated; none is deleted to make the change
      pass.

### Feature Path (FP)

1. Open "Mes parties" on a partly analyzed history, right after a pass → both figures are on
   screen, and each states which one it is.
2. Start a pass on a Game still unanalyzed, then let it finish → the running readout and, at the
   end, the confirmation remain unambiguous next to the history figure.
3. Open a Game's review page and step through its moves while no pass is running → the move
   readout is present and correct, and the page carries only one live region of ours.

Verify: UI first; inspect the accessibility roles on the page for step 3, which is not visible.

## Blocked by

None — slices 01 to 04 are merged.
