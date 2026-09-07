# Business User Story — layout

**This is the layout a User Story takes in this repo, and the one `/to-us` writes.** It is the
project copy that wins over the co-located core default (`.claude/skills/to-us/US-FORMAT.md`), and
it **diverges from it completely**: not one of the default's seven body blocks
(`**INTENTION**`, `**CONTEXT**`, `**EXPECTED BEHAVIOR**`, `**BUSINESS RULES**`,
`**ACCEPTANCE CRITERIA**`, `**OUT OF SCOPE**`, `**DEPENDENCIES**`) appears anywhere in
`BACKLOG.md` — **0 occurrences across all 44 entries** — and neither does
*As a … I want … so that …* or *En tant que…*.

**The corpus, named once**, because every count below is against it: `BACKLOG.md` holds **44
list-level entries** — **43** whose reference starts `US-` (the epic `US-15 (EPIC)` among them) plus
**1 unnumbered** drive-by. Counts over the 43 numbered entries say "of 43"; counts over everything
say "of 44". `grep -c '^- \*\*US-'` is the 43; `grep -c '^- \*\*'` is the 44.

**This file describes what is already written, it does not prescribe something new.** It was
inferred from the stories in `BACKLOG.md`, not copied from a template. So the rule of arbitration is
the reverse of the usual one: **if an existing User Story disagrees with this file, this file is
wrong** — fix it here, do not rewrite the story. A story is a dated record (see *The body is
append-only*).

Where the file lives, how a story is read, commented and moved: `business-backlog.md` (the port).
The factory's own words, and the ones retired on 2026-09-04: `vocabulary.md`.

## The entry

One User Story is **one markdown list item** under one of the state headings, with a **two-space
indented blockquote** as its whole body:

```markdown
- **US-<ref>**: <One sentence: what changes — and for whom, and why.>
  > **<Dated bold lead-in>** <the state of the grill, the requester's decisions, the record.>
  >
  > **<Next dated lead-in>** …
```

Nothing else is at list level, and the blockquote never leaves the list item.

**What `/to-us` actually writes is the first paragraph only**, and it is always the same shape: a
brand-new story enters `## To do` as its title plus one paragraph led by ``**Pas encore grillée.**``
— then when it was requested, by whom, and from which document. Everything else in this file
describes what *later* steps append.

**Four entries break the single-blockquote shape**, and they are the corpus, so they are reported
rather than legislated away: `US-37`, `US-33` and `US-13` split their body into **two adjacent
blockquotes** separated by a blank line, and `US-20` has one **orphan line at body level** outside
any blockquote. Read these as accidents of editing rather than as a second form — write one
blockquote — but do not "fix" them on sight.

### The reference

`US-<n>`, integers, allocated once and **never renumbered**. When a story splits, the parts take a
**letter suffix** rather than new numbers, so the parent's identity survives in its children:
`US-10a` / `US-10b`, `US-15a` / `US-15a-bis`, `US-16a` / `US-16b` / `US-16c`. A `-bis` is a second
pass at the *same* subject, not a third sibling.

An **epic** — a story that exists to hold a roadmap of lettered children rather than to be
implemented itself — marks that in the reference: `- **US-15 (EPIC)**: …`. One exists.

The reference is the business reference the rest of the factory hangs off: the
`integration/<business-ref>-<slug>` branch, the spec directory under `.scratch/`, the back-link
written by `/to-tickets`.

### The title

**One sentence at the Player's altitude, saying for whom and why** — never a role-and-capability
formula. The value clause is part of the title, usually after an em dash:

> Le barème d'`Inaccuracy` passe à **5 points** — pour que l'app cesse d'être muette sur les coups
> que le Player voit et qu'elle ne compte pas comme des fautes.

> Confronter ma lecture à celle du moteur, pour savoir où je lis bien et où je lis mal.

What the 41 numbered titles actually do — measured, with the exceptions named rather than smoothed
over:

- **No role formula, ever. That much *is* universal.** There is no `**INTENTION**` block, no *As a
  … I want …*, and no *En tant que…* anywhere: **0 occurrences of each, across all 44 entries.**
- **"For whom" is carried by one of two devices, and the corpus shifted from the first to the
  second.** This is the part a writer most needs, so here is the measurement rather than a rule:
  - **The first-person possessive**, in the title itself: *Importer **mes** parties…*, *Choisir
    **mon** profil…*, *Confronter **ma** lecture…* — **17 of 44**, clustered in the early stories
    (`US-2`..`US-16c`), with `US-27`, `US-32` and `US-38` as later hold-outs.
  - **The actor as subject of a `pour que` clause**: *— **pour que l'app** cesse d'être muette…*,
    *— **pour qu'un** import qui ne peut rien ramener le dise…* — **18 of 44**, clustered from
    `US-18` onward, with `US-13` and the abandoned `US-20` as early adopters.

  One title (`US-32`) does both, and **11 do neither** — those lean entirely on the sentence being
  obviously about the Player (*Squelette de l'application*, `US-1`). So the shift is a **tendency,
  not a cutoff**. Its point is real, though: moving the actor into the why clause lets it be someone
  other than the Player (*l'app*, *un agent*, *la suite HP*), which a possessive cannot express.
  **Write that form** — an infinitive title plus `pour que <actor> <benefit>`. Never a role prefix.
- **Three title shapes, all legitimate; the infinitive dominates.** Most titles are an
  **infinitive phrase** — a capability: *Importer mes parties…*, *Choisir mon profil…*, and its
  negated and copular forms, *Ne plus laisser un import réussir sans rien importer…* (`US-24`),
  *Être rassuré que le pass d'analyse s'est bien terminé…* (`US-8`). A minority are instead a
  **declarative** stating the change (*Le barème d'`Inaccuracy` passe à 5 points*, `US-37`;
  *« Analyser cette partie » ne doit pas être avalé en silence*, `US-35`) or a **noun phrase**
  naming the deliverable (*Squelette de l'application*, `US-1`; *Explorateur visuel de mes coups
  joués*, `US-5`; also `US-34`, `US-39`).

  **No exact count is given here on purpose.** Two independent passes over the corpus disagreed by
  two entries, because the boundary is a judgement — is *Ne plus laisser…* an infinitive phrase
  or a negation, is *Être rassuré…* a capability or a state? Rather than publish a number that does not
  survive a recount, the rule is: **prefer the infinitive** — it keeps the story about a capability
  rather than about a change — and know that the other two shapes are in use and are not errors.
- **"Why" is an explicit clause in the majority, and recommended.** `— pour que <actor> <benefit>`
  or `, pour <infinitive>` — the benefit, not the mechanism. **24 of the 43** numbered entries carry
  it. The other **19** leave the value implicit, and they are **not** just the old ones: `US-10a`,
  `US-10b`, `US-11`, `US-12`, `US-14`, `US-17`, `US-15a-bis`, `US-16c`, `US-27`, `US-33` and `US-34`
  all lack it, while `US-2` and `US-5` — two of the oldest — have it. There is **no clean
  historical cutoff**; the clause is simply the dominant form. So it is **the form to write, not a validity
  test**: a title without a `pour…` clause is thinner, not malformed. Do not go back and bolt it
  onto the 19.
- **Domain terms are backticked** — `` `Inaccuracy` ``, `` `Confrontation` ``, `` `Key moment` `` —
  and they are the terms `CONTEXT.md` publishes. A title is where a drifting word first shows.
- **It ends with a period** — one sentence, not a heading. **43 of 43** numbered entries, and 44 of
  44 counting the drive-by: no exception anywhere. It **wraps** onto continuation lines at the
  two-space indent when long.
- **No `[user|admin|tech]` tag** and no `<Feature> US-<n>` prefix. Measured: 0 occurrences. The
  audience is carried by the sentence itself.

### The unnumbered variant

Work that reached `develop` **without a story** is recorded here anyway, in the same shape, with the
title in place of the reference and the reason stated:

> - **Liste des parties en tableau** (drive-by, sans numéro de story) : …

It is written *after the fact*, on the argument that a delivered story appearing nowhere is a story
that gets redone. One such entry exists; it is a variant, not a shortcut for skipping `/to-us`.

## The body — dated records, in blockquote

The body is a **stack of short bold-led paragraphs**, each separated by a bare `>` line. The bold
lead-in is the paragraph's subject, and when it marks a transition it **carries its date**.

**The order is not fixed, and it is deliberately not fixed** — this is the point on which the first
draft of this file was wrong, and `US-22` caught it. Two arrangements both exist:

- **Oldest first** (28 of the 39 entries that have markers at all) — the record reads as it
  happened: provenance, grill, delivery, merge.
- **Outcome first** (11 entries) — the delivery or merge paragraph is hoisted to the top as a
  headline, and the grilling record follows underneath. `US-22` opens on
  ``**Livrée le 2026-08-31**`` and only then gives its ``**Passée en Doing**`` and ``**Grillée**``
  paragraphs. The full set: `US-9`, `US-10a`, `US-10b`, `US-12`, `US-22`, `US-23`, `US-28`, `US-29`,
  `US-15a-bis`, the *Liste des parties en tableau* drive-by, and the abandoned `US-20`.

**Outcome first has been gaining**, and it reads better for a closed story — a cold reader wants
the outcome before the reasoning. Five of the six deliveries between 2026-08-31 and 2026-09-04 use
it. But it is **not** a settled rule: `US-37`, the most recent delivery of all, is oldest-first.
So: **either arrangement is valid; the dates make the body legible, the position does not.**

There is likewise no fixed section list, because a story accumulates its record as it moves. What
*is* fixed is the **markers**.

### The lead-in markers, as they are actually written

| Marker | What it records |
| --- | --- |
| `**Pas encore grillée.**` | Open, not yet designed. Says when it was requested, by whom, and from which feedback document. The dominant marker in `## To do`: **14 of its 16 entries** (the other two are `US-15 (EPIC)` and `US-16c`). It appears **18** times file-wide — the other four are historical paragraphs inside delivered stories. |
| ``**Placée en tête de `To do` le <date>, sur décision du demandeur**`` | The order of `## To do` is a decision, so it is recorded. |
| ``**Remise à `To do` le <date>**`` | Sent back from a later heading, with the reason. |
| `**Grillée le <date>**`, `**Grillée (léger) le <date>**` | Designed. Names the ADR(s), whether `CONTEXT.md` was amended *or explicitly unchanged*, and the integration branch. |
| `**Passée en Doing le <date>**` | Picked up. Names what unblocked it. |
| `**Livrée le <date>**` | Implemented — slices merged into the integration branch, with the gate result. |
| ``**Fusionnée dans `develop`**``, ``**Mergée dans `develop` le <date>**`` | The human decision `integration → develop`: PR number, merge sha, date. The phrase *décision humaine `integration → develop`* is written out 15 times — it is the audit trail. |
| `**Terminée**` | Closed out, after post-merge verification on `develop`. |
| `**Abandonnée …**` | Withdrawn, with the requester's reason and what the grill established. The title also takes an inline `*(abandonnée le <date>)*`. |

A marker is **added**, never swapped for its successor.

**The earliest form had no markers, and it stays that way.** `US-1`, `US-2`, `US-3`, `US-5` and
`US-6` — **5 of the 27** delivered stories — carry their whole record as **one dense unbroken
paragraph**, with the marker words present but **not bolded**: *« Grillée, découpée, implémentée
sur `integration/US-2-…`, **fusionnée dans `develop`** »*. Separately, `US-4`, `US-5` and `US-6` carry
**no date at all**. Measured, not guessed, and **named rather than repaired**: they are records from
before the convention existed, and backfilling dates into them would write reconstructed dates into
an archive — the same refusal `delivery-state.md` makes about the retroactive `done` gap.

So the markers bind a **new** story's record. Do not read their absence in `US-1`..`US-6` as a
defect, and do not go and add them. A slice list in that era is a bullet list with a `✅` per
delivered slice, which is still perfectly readable.

### What a grilled story's body holds

Not a checklist to fill — the blocks that recur across the grilled stories. Within the **grilling
record** they do come in roughly this order; the **delivery and merge** paragraphs then sit either
after them or hoisted to the top, per the two arrangements above.

1. **Provenance and grill state.** When it was requested, by whom, from which document; whether it
   is grilled, and how heavily.
2. **The requester's decisions, quoted verbatim.** A decision is reported in the requester's own
   words, in italics inside guillemets — *« je fixe le barème à 5 % »* — because a paraphrased
   decision is an agent's decision.
3. **Why it is not part of a sibling story.** A story carved out of another says so, and says which
   promise of the other one it would have broken.
4. **The measurements.** Markdown **tables inside the blockquote** (114 such lines): before → after,
   what changes and, as pointedly, **what does not**. A number in a story is a measured number or it
   is not written.
5. **The work and its traps.** A bullet list of what the implementation will hit — the constant read
   in two places, the comment that becomes false, the migration owed or explicitly not owed
   (ADR-0009 / `CLAUDE.md`).
6. **The grill's output.** ADRs created or amended in place; `CONTEXT.md` amended, or unchanged *and
   why that is itself a finding*; the integration branch; the spec path under `.scratch/<slug>/`;
   and **the slices, listed by ticket file name with their blocking order** —
   `01-…` → `02-…` (bloquée par 01) — the last one usually **HITL** (HP suite + the PR).
7. **Seams, vigilances, out-of-perimeter findings.** The seams confirmed for `/tdd` (ADR-0027), what
   the lower tiers cannot see, and what was noticed nearby and deliberately left.
8. **Delivery.** Slices merged with their PR numbers, the **HP suite result as `n/3`** plus its
   prerequisite, and the gate that was actually run.
9. **What this story does not cover.** An explicit out-of-scope block, naming the sibling story or
   ADR each excluded subject lives under — and, separately, *what the grill removed from its own
   candidate list and why*. **Five headed blocks across four entries** carry it explicitly —
   *« Ce que cette story ne couvre pas »*, *« Ce qui sort des pistes »*, *« Ce que cette story ne
   prend pas, et pourquoi »*, *« Ce qui est explicitement hors périmètre »*, *« Ce qui n'est pas
   à brader »* (`US-39`, `US-23`, `US-22` ×2, `US-18`). The two `### Frontière` blocks are **not**
   counted here: they are block 3 above, a boundary with a sibling story, not an exclusion. This is
   the one block of the core default that survived the divergence, under its own name rather than
   `**OUT OF SCOPE**`.
10. **What stays open.** Product decisions left to the requester, non-blocking findings, and the
   **honesty reserves** — for instance that the local dataset does not carry the story and the
   criteria ran on fabricated fixtures. This block is the one that most often survives the merge.

**Labelled decisions.** A heavily-grilled story labels its decisions `D1`, `D2`, … (or `F1`, `F2`,
… for a front-end series) and cites them by label from anywhere — `US-22` reports that *« ses
décisions **D5**, **D7** et **D8** sont désormais acquises »*, `US-17` carries `D1→D8`, `US-15a`
`F1→F12`, `US-15a-bis` `D1→D18`. The labels are allocated in the grilling record and the decisions
themselves live in the spec; the backlog cites them. This is the one thing the core default's
numbered `**BUSINESS RULES**` became here. Used on the big stories only — it is a convenience, not
a requirement.

Long bodies use `###` (78 occurrences) and `####` (15) headings **inside** the blockquote to break
the stack up. Bullet lists are normal too — **266** first-level bullets inside blockquotes, and only
**12** genuinely nested ones, so the lists stay flat. Links to `.scratch/`, `docs/adr/` and the PRs
are normal as well.

### The body is append-only

A story's body is **a dated record, and records are not rewritten.** `US-13` still carries its
`**Grillée**`, its `**Livrée**` and its `**Terminée**` paragraphs side by side; `US-20` keeps its
original survey verbatim under *« Relevé d'origine (2026-08-24), conservé tel quel »*. An
abandoned story keeps everything its grill established, so it is not repaid if the story returns.

Consequences worth stating:

- **Correct by adding a dated paragraph**, not by editing an older one. If something turned out
  false, say so and date the correction.
- **A story that grew wrong is amended, not silently replaced.** Where a decision reverses an
  earlier one, name the reversal and the entry that made it — the *Liste des parties en tableau*
  drive-by says in so many words that it *« renverse la décision US-13 « what is a list stays a
  list » »*, and retires the code comment that asserted it, with its date.
- **Don't translate old words.** The stories closed before 2026-09-04 use the retired vocabulary;
  `vocabulary.md` says why they keep it.

## The lifecycle — the five headings

`BACKLOG.md` has one `# Backlog` title and five state headings. A transition is a **cut-and-paste of
the whole entry** under the target heading (the gesture in `business-backlog.md`), plus a dated
paragraph appended to the body.

The *Entered when* column below is **`business-backlog.md`'s** — that file owns the transition
conditions and the cut-and-paste gesture; this one only says what the headings mean for a story's
text. If the two ever disagree, `business-backlog.md` wins.

| Heading | Meaning | Entered when (owned by `business-backlog.md`) |
| --- | --- | --- |
| `## To do` | Open, agent-pickable. **Ordered** — the head of the list is where the requester wants work to start. | Written by `/to-us` after the human go-ahead. |
| `## Doing` | Grilled, sliced, being implemented on its `integration/*`. | Grilling done, story selected, technical counterpart created. |
| `## In review` | The `integration → develop` PR is open. | The PR opens; its link is commented on the story. |
| `## Done` | Merged into `develop`. **Broadly newest-delivery-first**, not by reference — and not strictly: `US-13` (2026-08-18) sits below `US-9` (2026-08-12) and `US-14`/`US-10a`/`US-10b` (2026-08-14). Add at the top and do not re-sort the rest. | A human merged `integration → develop`. Never an agent — `git-flow`. |
| `## Abandonnées` | Withdrawn from the queue, **not to be picked**. Kept so the grill is not repaid. | The requester withdraws it; the reason is quoted. |

`## Doing` and `## In review` are **empty whenever nothing is in flight**, which is most of the
time — a story passes through them rather than resting there. An entry that has sat under `## Doing`
for a while is worth a look; it is not, by itself, an error.

There is no `## To do` → `## Done` shortcut and no heading for "delivered but unmerged": a story
sits in `## In review` until a human merges it, because `integration → develop` is the human
decision the whole flow is built around.

> **A story's heading and a ticket's `Status:` are two different axes.** The heading here is where
> the *business* story stands. A ticket under `.scratch/` carries a triage role or the delivery
> state — `triage-labels.md`, `delivery-state.md`. `L3` of `/verify-factory` reads them against each
> other: a `ready-for-agent` ticket whose story sits under `## Done` is a stale word, and a red.

## Quality checks

- **The title carries the why — on a *new* story, and "thin" is the verdict, not "invalid".** If
  the `pour …` clause is **hollow**, the story was born wrong; the core default's warning survives
  the rewrite of everything around it. If it is merely **absent**, the title is thinner than it
  should be — 19 existing entries are in that state and none of them is malformed. Write the clause;
  do not treat its absence as a validity failure, and do not retrofit it (§*The title*).
- **Every number is measured.** A table in a body is a measurement someone ran, with the corpus
  named. "Roughly", "probably" and an unmeasured percentage do not belong.
- **What does not change is stated.** Seven entries carry an explicit *« ce qui ne change pas »* /
  *« inchangé »* clause next to their measurements. It is what makes a story's promise
  falsifiable, and it is worth more than the changed number beside it.
- **The requester's decisions are quoted, not summarised.**
- **Domain terms match `CONTEXT.md`.** A term that only exists in the backlog is either a glossary
  amendment owed, or a drift.
- **Value altitude, with one deliberate exception.** A title and its decisions stay at value level.
  The body, once grilled, is *deliberately* technical — ADRs, branch names, ticket names, seams,
  migrations. That is not drift: the grilling record lives with the story rather than only in the
  spec, so a cold reader gets the decisions without opening `.scratch/`. Keep the technical detail
  in the dated record paragraphs; keep it out of the title.
- **Nothing green goes unreported.** The gate result and the HP tally belong in the delivery
  paragraph; a whole green suite once went unreported (`CLAUDE.md`).
