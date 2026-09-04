Status: `done`

## Parent

`.scratch/hp-suite-speed/PRD.md` (US-18 — `BACKLOG.md`, grillée le 2026-08-26/27 conjointement avec
US-20, abandonnée à l'issue du grill). ADR : `docs/adr/0020-the-driver-library-drives-the-scenario-judges.md`.

Implemented on the business-story integration branch `integration/US-18-faster-hp-suite` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

> **Portail, pour toute tranche de cette story** : `npm test` **et** `npm run test:tools`. La
> commande dédiée est une décision du demandeur ; sans cette règle, la bibliothèque redevient du code
> non gardé — comme `theme-audit.js`, aujourd'hui testé nulle part.

## What to build

Le **grand livre d'une passe** : un outil qui reconstruit ce qu'une passe agentique a coûté, **après
coup et sans la rejouer**, en lisant les transcripts de sous-agents (une ligne par message, horodatée
à la milliseconde).

Il vient en premier et ce n'est pas un ordre de confort : **rien d'autre ne peut prouver qu'une
tranche suivante fait gagner du temps.** Il coûte zéro run et il vaut rétroactivement, donc les
portails du 2026-08-24 et du 2026-08-25 sont déjà son « avant ».

Il attribue chaque intervalle à un poste, selon l'enchaînement des messages :

| Poste | Intervalle |
| --- | --- |
| `outils` | appel d'outil → son résultat |
| `composition` | génération d'un message portant un appel d'outil |
| `analyse` | génération d'un message de réflexion suivant un résultat |
| `rapport` | génération d'un message de texte |
| `attente inerte` | intervalle suivant un message de texte — l'agent a rendu la main |

C'est aussi la tranche qui **crée le cycle de test isolé** : une cible `vitest` à la racine couvrant
`docs/test-scenarios/tools/`, exposée par `npm run test:tools`, **hors** de `npm test`.

Il **mesure et ne juge pas** (ADR-0020) : aucun seuil, aucun verdict « lent / rapide ».

## Acceptance criteria

- [ ] L'outil rend, par scénario : le mur, les cinq postes, et le nombre d'appels d'outils
- [ ] Il rend le **mur de la suite** (premier début → dernière fin), distinct de la somme des scénarios
- [ ] Il distingue **le mur vécu du mur travaillé** — les deux sont rapportés, jamais l'un seul
- [ ] Il identifie les scénarios d'une passe HP et **écarte** les autres sous-agents de la session
- [ ] Sa sortie porte ses **deux réserves de méthode** : la latence d'API n'est pas séparable de la composition, et la matière de l'analyse n'est pas persistée
- [ ] Sur une session sans passe HP, il le **dit** au lieu de rendre un tableau vide
- [ ] `npm run test:tools` existe, tourne, et est vert ; `npm test` garde exactement son périmètre
- [ ] La règle de portail (les deux commandes) est écrite dans `.claude/skills/agentic-tests/SKILL.md`
- [ ] Tests unitaires sur les parties pures — découpage en postes, identification des scénarios — contre un **vrai transcript tronqué en fixture** (prior art : `server/test/fixtures/real-reading.ts`)
- [ ] Aucun scénario de `docs/test-scenarios/` n'est modifié

### Feature Path (FP)

1. Je demande le coût du portail du 2026-08-25 → j'obtiens, par scénario, le mur et les cinq postes, plus le mur de la suite.
2. Je demande le même relevé pour le portail du 2026-08-24 → j'obtiens la même forme de tableau, sur une suite de forme différente, sans rejouer quoi que ce soit.
3. Je lis la sortie → elle porte elle-même ses deux réserves de méthode.
4. Je lui donne une session sans passe HP → il le dit, au lieu de rendre un tableau vide qui ressemblerait à une mesure.

Verify: la sortie de l'outil suffit — aucune app à lancer pour cette tranche.

## Blocked by

None - can start immediately
