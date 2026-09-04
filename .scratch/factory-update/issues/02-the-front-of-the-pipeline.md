# 02 — Le front de la chaîne : grill, modélisation, spec, tickets

Status: ready-for-agent
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
## What to build

Reprendre **tout le front de la chaîne** depuis l'amont, d'un coup et sans risque — c'est la tranche
qui rend la nouvelle philosophie utilisable tout de suite, à la demande du demandeur.

L'amont a **recomposé** ce front : `grill-with-docs` n'est plus une skill de 97 lignes mais une
**coquille de 20** qui appelle `grilling` (la méthode d'interview) et `domain-modeling` (la discipline
glossaire + ADR). Elle signpost `/to-spec`, qui remplace `/to-prd`, et `/to-tickets`, qui remplace
`/to-issues`. S'ajoute `to-us`, le front PO qu'on n'a jamais eu — il écrit les User Stories métier
sur le backlog, ce qu'on fait à la main depuis huit mois.

**Zéro risque de fusion** : toutes ces skills sont soit neuves, soit **octet pour octet la base
d'installation**. Aucune ne porte de travail local. C'est un remplacement sûr, pas un arbitrage.

Les annexes suivent leurs skills (`domain-modeling` porte les formats `CONTEXT` et ADR, `to-us` porte
son gabarit d'US). `to-prd` et `to-issues` sont retirées : elles n'existent plus en amont, et les
garder ferait deux entrées pour une étape.

**Aucun renommage dans le reste du dépôt ici.** C'est la discipline de la tranche : la passe de
vocabulaire est la 04. Entre les deux, le dépôt parle deux langues — le front dit `ticket`/`spec`,
le reste dit `issue`/`PRD`. C'est temporaire, sur une branche d'intégration, et c'est assumé.

## Acceptance criteria

- [ ] `grilling`, `domain-modeling`, `to-spec`, `to-tickets`, `to-us` sont présentes avec leurs
      annexes, dans leur version amont.
- [ ] `grill-with-docs` est la version recomposée et **appelle effectivement** les deux skills.
- [ ] `to-prd` et `to-issues` sont retirées, et rien ne les invoque plus **dans les skills**.
- [ ] Invoquer chacune des nouvelles skills la charge sans erreur de référence.
- [ ] **Rien d'autre n'est modifié** : les huit autres skills, `CLAUDE.md`, `docs/agents/` et les
      archives sont inchangés.
- [ ] La deuxième langue est **documentée comme transitoire** dans la tranche, pas subie.

### Feature Path (FP)

1. Lancer une session de grill → elle charge la méthode d'interview **et** la discipline glossaire,
   et elle nomme `/to-spec` comme étape suivante.
2. Demander à synthétiser une spec → `/to-spec` répond ; `/to-prd` n'existe plus.
3. Demander à découper en tickets → `/to-tickets` répond ; `/to-issues` n'existe plus.
4. Demander à façonner une idée en User Stories → `/to-us` répond et connaît son gabarit.
5. Ouvrir `agentic-tests` → **inchangée**, ses 833 lignes intactes : la tranche n'a touché que le
   front.

> **Filet de code.** Fin de tranche : si `git diff --name-only` touche quoi que ce soit **hors**
> `.claude/`, `docs/`, `.scratch/` et `BACKLOG.md`, le gate complet (build + tests + lint) tourne.
> Sinon, rien — le filet passe une fois, entier, à la tranche 08 (décision du demandeur, 2026-09-04).

## Blocked by

- `01-the-watch-post` — le ref de reprise doit être enregistré avant qu'on commence à s'en écarter.
