### Preuve : rien de local n'a été perdu (tranche 03)

Base prouvée `ea7e4afe` → amont `dcad289e`. Nos deux seuls fichiers porteurs de travail local
sont fusionnés à la main. La preuve n'est pas une affirmation : on liste **toutes** les lignes
supprimées, puis on vérifie positivement que chaque acquis local répond encore.

#### `.claude/skills/agentic-tests/SKILL.md`

- lignes : 833 → 860 ; supprimées : 18 ; ajoutées : 

Lignes supprimées, exhaustivement :

```diff
-app** and validates a journey, **UI-first**. In HP mode an orchestrator fans the suite out over
-**one subagent per scenario** (§5). The *concept* (the two levels, the gates) is in
-`CLAUDE.md`; the *format* of journeys is in [SCENARIO-FORMAT.md](./SCENARIO-FORMAT.md), and the
-HP inventory lives under `docs/test-scenarios/` (created at the first HP curation). This skill
-only **executes**.
-> Tech-agnostic: pick your driver (browser or other) based on the current stack. Assume no
-> framework, no ports, no seeding tool.
-- The **app runs locally** (start it the way the project expects; if you don't know how,
-  ask). No running stack = no execution.
-- You know how to drive the app (driver of your choice).
-3. Run the journey against the app, UI-first (probe the backing store only if one exists and
-   the UI is not enough).
-- **Raise all findings**, blocking or not (console warning, surprising behavior, side effect,
-  real breakage). You **qualify the severity**; a blocking finding fails the gate.
-- **UI-first.** A backing-store probe only complements what the UI doesn't show, and only if a
-  store exists.
-- **Data selection by characteristics** (filters, badges…), not hard-coded IDs (HP mode): if
-  no data satisfies the conditions, that's a legitimate signal, not an excuse to bypass the UI.
```

#### `.claude/skills/git-flow/SKILL.md`

- lignes : 82 → 111 ; supprimées : 3 ; ajoutées : 

Lignes supprimées, exhaustivement :

```diff
-- `integration/<business-ref>-<slug>`: integration branch for **one business user story**, from up-to-date `develop`. **Named after the business user story** (its reference + a slug), because `grill-with-docs` creates it during grilling — *before* `/to-prd` generates the PRD on the technical backlog (so NOT the PRD number). The session writes its grilling output (`CONTEXT.md`, ADRs) here; the integration branch then accumulates the sub-issues. `ready-for-agent` sub-issues **auto-merge** into it after a green local check (build + tests + lint + **green Feature Path (FP)**); `integration -> develop` stays a **human decision** (where the **HP** suite is run).
-- **Business story (integration branch)**: `grill-with-docs` creates `integration/<business-ref>-<slug>` from up-to-date `develop` (named after the business story, *before* `/to-prd`) and writes its grilling output there. `/to-prd` then creates the PRD, then `/to-issues` pushes the integration branch and creates the sub-issues **based on it**. `ready-for-agent` sub-issues PR -> `integration/*` and **auto-merge** once the **local check is green** (project build + tests + lint + the **FP** green via `/agentic-tests`, no blocking finding). Keep the integration branch in sync with `develop` (it is long-lived).
-- **`integration/*` -> `develop`**: human decision. Before the PR, the agent **runs the HP suite** (`/agentic-tests HP`) and **pastes the result** into the PR (pass/fail + findings); if the feature warrants it, it **proposes co-creating an HP** — **at most 3 HP** (otherwise: merge two journeys, drop a non-critical one, or graft drive-by). The PR **lists the included issues** for a readable batch review. The agent opens the PR and gives the link; never merges.
```


### Vérification positive — chaque acquis local répond encore

`.claude/skills/agentic-tests/SKILL.md` :
- ✓ plafond de fan-out `min(3, floor(nproc / 4))`
- ✓ §5 orchestrateur — un sous-agent par scénario
- ✓ §5.1 collecte des rapports (le run du 2026-08-25)
- ✓ §5.2 récupération d’un rapport jamais arrivé
- ✓ §5.3 lire l’état d’un sous-agent sans deviner
- ✓ §5.4 kit d’isolation
- ✓ §5.5 ce qu’on dit à chaque sous-agent
- ✓ §5.6 mécanisme d’auto-audit — INTACT
- ✓ §5.7 coût d’un agent et combien tiennent
- ✓ §5.8 la bibliothèque de driver
- ✓ la règle « tests = deux commandes » (US-18, test:tools)
- ✓ checklist de dispatch en huit points
- ✓ consolidation HP + findings sur le run

`.claude/skills/git-flow/SKILL.md` :
- ✓ encadré « A check that cannot run has not passed »
- ✓ les 1 349 erreurs de parsing du lint
- ✓ section « After opening a PR — check it is still mergeable »
- ✓ qui résout quoi dans un conflit `BACKLOG.md`
- ✓ `lint` dans le gate d’auto-fusion
- ✓ section « Before coding — check your position »
- ✓ la section `Cleanup` reprise de l’amont (nouveau)

Les 18 + 3 lignes supprimées ci-dessus sont **toutes** dans les zones remplacées par leur
version enrichie (en-tête, prérequis, règles d’exécution, les trois puces de `git-flow` qui
gagnent le renvoi vers `Cleanup`). Aucune ligne de §5, aucun encadré local, aucune leçon payée
sur le terrain n’a disparu.
