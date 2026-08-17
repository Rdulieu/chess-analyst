# 06 — Revise the HP suite: a theme pass, and every screen visited

Status: ready-for-agent

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

The Happy Path suite is brought back in line with the restyled app, and gains the coverage the theme
needs. Two distinct jobs, in this order.

**Adapt, because the markup moved.** Slice 01 restructured every screen; the three HP scenarios drive
the real UI and locate what they assert by role and name. Their steps are updated to the new
structure — same journeys, same assertions, same hard figures where they assert them. US-10a set the
precedent: the suite was adapted, then replayed in full.

**Add the theme pass, and close the coverage gap.** Each HP gains a **final step** that walks the
navigation across **all six screens**, first in the light theme and then with the dark system
preference emulated, reusing the state the journey has already built — no re-import, no re-analysis.
The extra cost is rendering, not journey. This is the requester's requirement: today the Stats screen
is visited by no HP and Danger positions only as a drive-by, and a theme pass that never sees a screen
proves nothing about it. The journeys themselves stay journeys of value and do not become coverage
sweeps.

The cap of **at most 3 HP** holds. No fourth scenario. The suite already carries the style-sensitive
assertions that must not regress — the weak-opening highlight, the arrows' opacity and hue, the
evaluation curve and its markers — and those stay where they are.

Then the suite is **replayed in full** against the real chess.com API and the real engine, from an
empty database, and the result is recorded for the `integration → develop` PR.

## Acceptance criteria

- [ ] The three HP scenario documents are updated to the restructured markup, with their journeys,
      their assertions and their hard figures unchanged in substance.
- [ ] Each HP ends with a step walking all six screens in the light theme and then under an emulated
      dark preference.
- [ ] That final step reuses the state the journey built: it triggers no further import and no further
      analysis.
- [ ] The theme step asserts, on each screen: no unresolved token, text contrast at least 4.5:1 (3:1
      for large text), no horizontal overflow, non-chromatic cues present where a tint carries meaning,
      and player colours identical between the two themes.
- [ ] Every screen is visited by at least one HP, the Stats screen included.
- [ ] The suite still contains exactly three Happy Paths.
- [ ] The existing style-sensitive assertions (weak-opening highlight, arrow opacity and hue, the
      curve and its markers) are preserved.
- [ ] The suite is replayed in full against the real chess.com API and the real engine from an empty
      database, and passes 3/3 with no console error.
- [ ] The run's result — pass/fail per scenario, plus any finding — is written up ready to paste into
      the `integration → develop` PR.
- [ ] Build and the full test suite are green.

### Feature Path (FP)

For this slice the Feature Path is the suite's own execution.

1. Run the three Happy Paths in full against the real chess.com API and the real engine, from an empty
   database → all three pass, with the figures they assert matching.
2. Observe each scenario's final step → it walks all six screens in the light theme, then again with
   the dark preference emulated, without importing or analysing anything more.
3. On each screen, in each theme → text stays legible, no colour fails to resolve, nothing overflows
   horizontally, every meaning-bearing tint still has its non-chromatic cue, and White's and Black's
   colours are unchanged between themes.
4. Confirm coverage → the Stats screen and the Danger positions screen are both visited, in both
   themes, by at least one scenario.
5. Confirm the budget → the suite still holds three Happy Paths, not four.
6. Across the whole run → no console error.

Verify: UI first, against the running app; this is the apex tier, so there is no lower seam to fall
back on.

## Blocked by

- `03-semantic-tints-move-to-tokens`
- `04-lists-and-tables`
- `05-dense-screens`
