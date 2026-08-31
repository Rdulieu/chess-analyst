---
id: HP-03
covers: [Personal analysis, Declared severity, Key moment, Note, Confrontation, Counted Move, Drift, Review mode, Analysis pass, Search regime, Profile, Theme]
---

# HP-03 — Read a Game blind, seal it, confront it

## Goal
The Player analyses a Game **themselves** before seeing what the engine found, seals that reading,
and only then sets it against the engine's — reading three figures side by side and never a single
score. Then they read the same three figures folded over every reading they have sealed. This is
US-16's core value, and it is the one journey in the suite where the app's product is not an
aggregate of the Player's *play* but a measure of their **analysis**.

> **Created at US-16b**, in the slot freed by merging the former HP-02 and HP-03 into
> [HP-02](./HP-02-read-my-aggregates.md). The cap stays at three. US-16a was a **graft** onto
> HP-01 (step 9b) precisely because the value was not whole without the `Confrontation`; it is whole
> now, and this scenario is where it lives.

> Runs on **real chess.com data** restored from [path 0](./path-0-bootstrap.md), and on a **real
> analysis pass** this scenario runs itself. The engine's verdicts are therefore whatever the real
> Games produce: assert **shape and internal consistency**, never fixed severities, counts or rates.

## Why this scenario runs its own analysis pass

Because the thing it has to prove is only provable against an analysed Game. HP-01's step 9b already
writes and seals a reading, and it does so on a Game that has **not** been analysed — deliberately,
so that "Lue à l'aveugle" is earned rather than reported. But an unanalysed Game has nothing of the
engine to hide, so that step cannot show that the reading route **stays** blind when there *is*
something to show. Here there is: the route must render nothing of the engine on a Game the engine
has fully evaluated, with a remembered `Review mode` of `Détaillé` — which is the promise US-16a
actually made, and the one only this state can test. That check sits **after** the seal (step 11),
and deliberately: sealing freezes the provenance, so the engine may then be shown without relabelling
a reading that was genuinely blind. Placed before it, the same check would record "engine seen" and
turn « Lue à l'aveugle » into « Lue informée » — the app behaving correctly and the scenario
contradicting itself. It did, on this scenario's first run.

It also buys the `Confrontation` its two sides. One Game read blind and one read informed give the
summary two readings to fold, which is the only way "the aggregate is the sum" is an observation
rather than a tautology.

The cost is **two Games at depth 16** — of the order of 85 Positions, against HP-01's 29 for its own
step 10. See step 2 for which two, and why they are deliberately **not** the shortest available.

## Drive-by
- `Analysis pass` (US-4/US-8): a pass runs to completion on selected Games and the Game list reflects it.
- `Review mode` (US-15a): the level is remembered, and the reading route ignores it **by design**.
- `Board orientation` (US-10a): the reading route presents the board from the side the Player played.
- `Counted Move` and `Drift` (US-15a, ADR-0017): the Confrontation is read in the vocabulary the
  per-Game analysis already publishes, and the excluded Moves are shown **with their reason**.
- `Profile` scoping (US-11, ADR-0014): a reading and its Confrontation belong to the Profile that
  owns the Game, and are unreachable under another.
- The stylesheet and the dark theme (US-13): the final step walks all nine screens in both themes.
  This scenario is the only pass whose state holds **analysed** Games, so it is where `/danger`,
  the `Evaluation curve` and the advantage bar are audited **populated** rather than empty.

## Preconditions
- App started locally, on this scenario's own port and its own database file.
- **Clean data state, restored not imported**: [path 0](./path-0-bootstrap.md)'s **imported
  snapshot** copied into this scenario's database file, with the server stopped. It holds the
  `DudulSmash` `Profile` and its whole reference range — **82** Games, none analysed — a second
  `Profile` owning nothing, and a third on lichess.org. The copy is a pristine state.
- **Nothing is selected on arrival**: the current `Profile` lives client-side (ADR-0014), so step 1
  selects it.
- **The engine is the real one.** No fixture engine, no shortened depth: a `Confrontation` compared
  against a fake verdict would assert nothing about the method.

## Journey
1. Open the app with the restored history and select `DudulSmash` as the current `Profile` → the banner names it from then on.
2. From "Mes parties", pick **two Games the Player lost**, each running to **at least 30 half-moves** — the result is a column of the list, and the length is readable on the Analyse page's move list **before** any engine time is spent. Take **one played as White and one as Black** if the list allows it. Start the analysis pass on them (real Stockfish, depth 16 — allow it real time to finish) → a count of Positions evaluated advances, and when it ends both Games read as analysed in the list. Call them **Game A** and **Game B**.

    > **Not the shortest Games, and that is the point.** This scenario asked for the two shortest
    > until 2026-08-25, to spend as little engine time as possible — and it spent the assertion along
    > with it. Measured on the reference range: the two shortest are a **6-half-move** Game, where the
    > Player moved **three times**, and a 21-half-move one. Both runs of this scenario on that rule
    > produced **one** flagged Move between them and **no** excluded Move at all, so the matrix had
    > almost nothing in it, the partial credit of the `Key moment` reading could not appear, and
    > « Montré, jamais noté » was empty by accident rather than by fact.
    >
    > A **loss of ordinary length** is where the faults are. Measured on two such Games of the
    > reference range: one gave **three** flagged Moves of clearly different sizes (14, 48 and 17
    > points — partial credit becomes observable), the other gave **both** exclusion reasons at once,
    > a `forced` Move included. That last one matters most: a forced catastrophe is the case the whole
    > denominator exists for, and no run had ever seen one on real data.
    >
    > The cost is honest: roughly **three times** the engine time of the old rule (about 85 Positions
    > against 29). That is what the assertion costs, and the previous rule was not cheaper — it was
    > emptier.
3. Open **Game B**'s Analyse page → the `Niveau de revue` has never been touched, so it opens **`Sans aide`** and volunteers nothing of the engine even though the Game is now analysed.
4. Follow the way into the reading route → the board is oriented on the side the Player played, the Moves and their notation are there, and **nothing of the engine is**: no `Evaluation`, no advantage bar, no `Evaluation curve`, no severity glyph, no `Best line`, and no `Niveau de revue` control.
5. Write a reading of Game B: declare a `Declared severity` on several of the Player's **own** Moves (use `Correct` on Moves the Player believes sound — it is a verdict, not a silence), write a `Note` saying why on at least one, declare a severity on one **opponent** Move, and mark at least one **`Key moment`** → the move list flags those Moves, the three kinds of mark told apart, and « Où j'en suis » states the progress as a count beside its share.
6. **Seal** Game B's reading → the confirmation names what it commits, and after confirming the reading carries the instant of its sealing and the label **« Lue à l'aveugle »**.
7. Return to Game B's Analyse page → the way into the **`Confrontation`** is now offered, and it was not before the seal.
8. Open Game B's `Confrontation` → **three figures side by side and no composite**: what was examined, what was seen rightly, and where the Player looked. The provenance reads **« Lue à l'aveugle »**, and the `Search regime` behind the engine's side is stated. **Write these three figures down**: step 11 compares against them literally.
9. Read the **confusion matrix** → five declared bands against four measured ones (the fourth being "nothing flagged"), every cell carrying a count; the cells outside the `Bon` row **sum to the accuracy denominator printed beside them**. Read what the screen says about the direction of the bias — or that there is not enough to say.
10. Read **« Montré, jamais noté »** → whatever the Game holds of it is there **with its reason**: the verdict on the opponent's Move, any `Bon`, and any Move the analysis does not count, `forcé` and `déjà décidée` told apart.
11. **Now let the engine be seen, and come back.** Open Game B's Analyse page and set the `Niveau de revue` to **`Détaillé`** → the engine's record is shown: advantage bar, `Evaluation curve`, per-Move severities. Then **return to Game B's reading route** → with `Détaillé` **remembered**, on a Game the engine has **fully evaluated**, whose record was on screen a moment ago, the route still renders **nothing** of it. Write one more mark here → it is accepted, shown as **posterior**, and reopening the `Confrontation` shows **the same three figures as step 8**, unchanged.

    > **This is the step the scenario exists to protect**, and it sits here for a reason discovered on
    > its first run: sealing **freezes the provenance**, so showing the engine now cannot retroactively
    > relabel a reading. Done *before* the seal, this same check would have recorded "engine seen" and
    > turned « Lue à l'aveugle » into « Lue informée » — the app being right and the scenario
    > contradicting itself. HP-01's step 9b asserts the blind route on a Game that is **not** analysed,
    > where there is nothing to hide; only here is there something.

12. Open **Game A** from "Mes parties" → it opens on **`Détaillé`** without being asked (the level is remembered **across Games**), so the engine's record is shown for it too. Read Game A — declare at least one severity and a `Key moment` — and seal it → its provenance reads **« Lue informée »**. Open its `Confrontation` → three figures again, labelled informed.
13. Open **« Mes lectures »** from the navigation → the summary rests on **2 sealed readings**, says **1 lue à l'aveugle, 1 lue informée**, and shows the same three figures, separated. Check the fold **by hand**: each numerator and each denominator is the sum of the two Confrontations just read, the matrix included, cell by cell. Look for an axis — by opening, phase or cadence — and for a single score: there is neither.
14. Switch the current `Profile` to `Nonomoho` → « Mes lectures » says that Profile has **no sealed reading**, rather than showing a summary of zeros, and Game B's `Confrontation` is unreachable under it. Switch back → both readings are there, unchanged.
15. **Theme pass (US-13)** — walk the navigation across **all nine screens** (Mes parties,
    Explorateur, Ouvertures, Positions dangereuses, Stats, **Mes lectures**, Analyse by opening a
    Game, Profils, and the Profile's own page), plus the **reading route** and the **`Confrontation`**, first in the
    light theme, then again with the system's **dark preference emulated** → every screen is painted
    in the theme the system asks for, and everything the Player must be able to read stays readable
    in both.

    > The rules asserted here, the nine screens, the audit tooling and the known-open findings are
    > written once in [`theme-pass.md`](./theme-pass.md) — the same step closes HP-01 and HP-02.
    > This scenario audits the `Evaluation curve` and the advantage bar **populated** (open Game B in
    > `Détaillé`), and it is the only one that audits the reading route and the `Confrontation` at
    > all. It is **not** where `/danger` is audited populated, and the claim that it was is
    > **withdrawn** (2026-08-31): HP-01 analyses two Games as well, and it picks *the two shortest
    > Games sharing a first Move* — so a Position recurs by construction and its card is there. This
    > scenario picks two **long lost Games**, one as White and one as Black, and on those nothing
    > recurred: `/danger` rendered « Vos parties analysées ne repassent pas encore par une même
    > position. » and was audited in that state. That is not fixable here — the pass triggers no
    > further analysis, by its own rule — and it does not need fixing: the empty state is a rendered
    > screen too, and the populated one belongs to HP-01.

16. **Assertion 7 — what the Player acts on never moves** (ADR-0021). Back on **Game B**'s reading
    route, walk its plies at **both widths** and require **zero pixels** of displacement of the step
    controls and of the verdict fieldset. Cross the transitions that matter and say which: the
    Player's Move to the opponent's, the starting Position to the first Move and back, and — on this
    scenario's **sealed** reading — a ply carrying a sealed mark and a ply carrying none.

    > **It belongs to this scenario and to no other.** Assertion 7 is the one assertion of
    > `theme-pass.md` that is not about a screen of the inventory: the reading route is not in the
    > nine, and HP-03 is the only scenario that reaches it at all. An assertion listed among the
    > rules but called by nobody is exactly what US-14's principle was for eighteen months — stated,
    > and guarded by no one — which is how every ply transition came to move something. The pilot is
    > `walkPlyStability` (`agentic-tests` skill, §5.8); it measures, this step passes the sentence.

## Checks
### UI
- Step 2: the pass reports progress in Positions evaluated (it does not sit at zero), ends with an explicit confirmation, and both Games read as analysed in the list afterwards. *(Start the polling **before** clicking: the in-flight readout is short, and a driver that clicks first has already missed it.)*
- Step 3: the `Niveau de revue` reads `Sans aide` without having been set — the app does not start volunteering the engine's verdict — and nothing of the engine renders even though the Game is analysed.
- Step 4: **nothing** of the engine renders on the reading route. Assert the *absence* of the advantage bar, the curve, severity glyphs and the `Best line`, and the absence of the `Niveau de revue` control.
- Step 5: each mark is persisted as it is made; a Move carrying no verdict stays silent (no sentinel value on screen); the app says that a verdict on an opponent's Move will not be scored.
- Step 6: the seal is **explicit** and **irreversible**, and the confirmation says so. After it, the reading carries its sealing instant and the label « Lue à l'aveugle ». Nothing of the engine has been shown for this Game at any point before now.
- Step 7: the way into the `Confrontation` is **absent before** the seal and **present after** it. Sealing has to lead somewhere; that is what it is for.
- Step 8: three figures, each in its own group with its own question named, each carrying **its count beside its rate** — never a rate alone. **No composite**: count the percentages **inside the figures**, and expect one per figure that has a denominator and none besides. *(Do not count percentages in the surrounding prose: the `Drift` explanation contains the phrase "placerait 100 % hors d'atteinte", and a naive scan of the page reads it as a fourth figure.)* A figure whose denominator is zero reads **« Pas de chiffre »** or **« Pas de score »**, never `0 %`. The provenance label is present. The `Search regime` is stated. The `Drift` is reported beside the Key moment figure and said to be outside its division — **when it amounts to at least a point**: under that it is not shown at all, which is deliberate and not a miss.
- Step 9: the matrix has five declared rows and four measured columns; every cell carries a number, zeros included; the diagonal is marked **without relying on colour alone**; the `Bon` row is present and said to be unscored; the sum of the cells outside it **equals** the accuracy denominator shown beside the matrix. The bias sentence is either derivable from the cells on screen, or replaced by a statement that there is not enough to conclude — never a confident claim the cells do not support.
- Step 10: whichever of the categories the Game holds are shown **with their reason in words** and their own count; `forcé` and `déjà décidée` are **never merged**. If the Game holds none of them, the section is **absent entirely** rather than rendered empty — an empty section headed "not scored" sends the Player hunting for what is not there. *(On real data these categories are often empty: **their absence is not a failure**, and the check is that the screen is honest either way.)*
- Step 11: with `Détaillé` remembered and the Game fully evaluated, the reading route still renders **nothing** of the engine and offers **no** `Niveau de revue` control. A stronger check, if the driver allows it: the route does not even **request** the Game's engine record — the Analyse page calls the per-Move endpoint and the reading route never does. The posterior mark is visible, **marked as posterior**, and the three figures are **identical** to what step 8 recorded — compare them literally. The provenance still reads « Lue à l'aveugle »: the seal froze it, and showing the engine afterwards cannot relabel what was already committed.
- Step 12: Game A opens on `Détaillé` **without being asked**, which is the level being remembered across Games. Its provenance after sealing reads « Lue informée ». The two labels differ, and they differ because the runs differed — this is what shows the flag is recorded rather than defaulted.
- Step 13: the summary says how many readings it rests on and how many of each provenance; its figures are the **sum** of the two per-Game Confrontations, numerator by numerator and denominator by denominator, checked by hand. The **matrix folds too**, cell by cell. There is **no axis** — no control, and no mention of opening, phase or cadence — and no single score anywhere. *(Displayed point values are rounded, and the screen says so: a total may differ by a point from the sum of the rounded parts. That is the rounding, not a reconciliation failure.)*
- Step 14: under `Nonomoho`, « Mes lectures » shows its own screen saying there is no sealed reading — **not** a summary of zeros, which would read as "you read badly" where the truth is "you have not read". Game B's `Confrontation` is refused under that Profile, and the refusal is about the Game not being that Profile's, not about the reading.
- Step 15: on each screen, in **both** themes — every colour resolves, text contrast holds at 4.5:1
  (3:1 for large text) against the ground actually painted behind it, nothing scrolls sideways, every
  meaning-bearing tint still carries its non-chromatic cue, and `--white-share`, `--black-share` and
  the board's square tokens are **identical** between the two themes. Full rule list, tooling and
  known-open exceptions: [`theme-pass.md`](./theme-pass.md). Specific to this scenario: `/danger`,
  the `Evaluation curve` and the advantage bar are audited **populated**; on the `Confrontation`, the
  **matrix** is the table to watch — its diagonal must stay marked by its glyph and not by its tint,
  and it must scroll **inside its own box** in a narrow window while the page body does not scroll
  sideways. A contrast failure outside the known-open list is **blocking**.

### Backing store (optional)
- The reading is stored relationally, keyed by (Game, ply) — the same key the engine's per-Move
  record uses (ADR-0019) — and carries its sealing instant and its provenance flag. A Move the Player
  said nothing about has **no row**, never a sentinel.
- The marks written after the seal are stored in their own layer and the sealed ones are untouched.
- Nothing of the `Confrontation` itself is persisted: it is derived on read (ADR-0009), so no table
  holds a score.

## Cleanup (best-effort)
- The scenario writes to its own database file, restored from path 0's snapshot. Discard that file.
- The `Review mode` and the current `Profile` live in the browser: clearing the browser state resets
  both. So does the record of which Games had the engine shown — which is why the provenance flag is
  a **label and not a lock**, and why nothing here asserts that the Player did not look.

## Notes
- **This scenario costs real engine time** — two short Games at depth 16. It is the only HP that
  does besides HP-01, and the cost is deliberate: a `Confrontation` against a fixture verdict would
  assert nothing about the method.
- **Stop the server before restoring.** SQLite keeps serving a replaced inode.
- **The seal is irreversible**, and no route undoes it. Plan the reading before sealing: there is no
  second attempt on the same Game within a run.
- **The `Drift` is shown beside "Pas de score" only when it amounts to at least a point.** Under
  that it is omitted, which is deliberate: a sub-point residual is noise, not a lesson. A Game with
  no fault *and* a negligible Drift therefore shows "Pas de score" alone, and that is correct.
- **Assert shape, never values — even now that the Games are richer.** Step 2's selection makes
  flagged Moves and exclusions *likely*, not certain: one of the two Games measured for that rule had
  three faults and **no** excluded Move at all, the other had one fault and both exclusion reasons. So
  a section may still be **absent**, and an absent section is **honest**, not a miss. A Game with
  nothing flagged should produce **« Pas de score »** on the Key moment figure — with the `Drift`
  beside it when there is a point of it to report, and alone when there is not — and that is a
  **pass**, not a failure. What the checks assert is that the figures agree with the cells and with
  each other, never that a particular number appears.
- **What this scenario does not claim.** It checks that the reading route **renders** nothing of the
  engine and that the provenance is **recorded**; it cannot check that the Player did not look.
  Nothing can — the app labels a reading, it does not certify one, which is exactly what the glossary
  refused to promise when it rejected the name *Blind mode*.
