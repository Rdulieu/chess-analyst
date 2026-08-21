# 04 — Product question: should switching side keep the explored path?

Status: needs-triage

**A question for the requester, not a defect and not a decision an agent should take.** Raised by the
US-13 Happy Path replay (2026-08-17), which tripped over it while driving HP-02, and recorded here
rather than settled.

## What the app does today

The side selector (Blancs / Noirs) **does not reset the explored path**. Switch side two Moves deep
and the breadcrumb keeps its line, so the explorer asks for the *other* side's habits from a Position
reached along the first side's line. That combination usually has no data at all, so the Player sees
an empty level immediately after a click that, from their side of the screen, only changed which
colour they are studying.

It is coherent: the path and the side are two independent pieces of state, and neither is wrong. It is
also the reason HP-02's step 8 now tells the runner to return to `Départ` before switching side — the
assertion about "the candidates from the starting Position" is only meaningful there.

## The question

Which of these is the intended behaviour?

1. **Keep the path** (today). Studying a given line from both sides is a real intent, and the empty
   level is honest: those Moves were never played from that side. The Player is expected to walk back
   up when they want the other side's own habits.
2. **Reset to `Départ` on a side switch.** A side switch is read as "study my Black habits", not "keep
   this line", and landing on an empty level is a dead end the Player did not ask for.
3. **Keep the path, but say why it is empty** — an explicit "no Move played from this Position as
   Noirs" instead of a bare empty level. Cheapest of the three if the current behaviour is intended.

Nothing here needs deciding for US-13 to ship; the HP suite is green either way, and its step 8 is
written so that it stays green under any of the three answers.

## If option 2 or 3 is chosen

It is a small change to the explorer page's state handling, no server change, and it wants a Feature
Path that switches side from a depth ≥ 1 and asserts what the Player then sees.
