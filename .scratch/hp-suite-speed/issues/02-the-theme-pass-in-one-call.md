Status: `ready-for-agent`

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

La **passe de thème** derrière un appel par écran, pour les trois scénarios. C'est le plus gros bloc
répété de la suite — **18 audits par scénario, 54 pour la suite** — aux mécaniques identiques et sans
aucun jugement dedans : gros gain, risque minimal.

`theme-audit.js` existe déjà et **reste la moitié page** : il est browser-side, sans dépendance,
driver-agnostic, il rend un objet brut et il refuse explicitement d'émuler le thème. On ne le
réécrit pas ; on lui ajoute la moitié hôte qui l'injecte une fois, émule le thème, traverse les neuf
écrans et collecte les relevés bruts.

**Le point qui ne se négocie pas** : l'assertion `matchMedia` **dans** le script audité. L'émulation
de `prefers-color-scheme` a échoué **dans les deux sens** sur quatre runs — une passe claire mesurée
sombre, et une émulation qui survit à un détachement. Cette assertion est la seule chose qui ait
jamais attrapé ces cas ; le helper **jette** quand le thème mesuré n'est pas le thème demandé.

## Acceptance criteria

- [ ] Un appel par écran rend le relevé brut de `theme-audit.js`, sans comparaison à un attendu
- [ ] La passe couvre les **neuf** écrans, dans les deux thèmes — soit 18 audits
- [ ] Les deux écrans hors navigation (une partie, un profil) sont atteints
- [ ] Une seule session de pilotage est tenue pour toute la passe (un détachement fait reverter l'émulation)
- [ ] Le helper **jette** quand le thème mesuré diffère du thème demandé
- [ ] Aucun `expect`, aucun seuil, aucune comparaison à un attendu dans le helper (ADR-0020)
- [ ] `theme-pass.md` reste **le seul endroit** où l'inventaire des écrans est édité
- [ ] `README.md` est corrigé : il dit encore « eight » à deux endroits alors que `theme-pass.md` fait foi avec **neuf** — un écart qui a déjà laissé un écran **un run entier non audité**
- [ ] `SKILL.md` nomme le helper ; **aucun scénario ne le nomme** (ADR-0020)
- [ ] Le grand livre montre le coût de la passe avant / après sur une FP comparable

### Feature Path (FP)

1. L'app tourne sur l'état d'un scénario → je joue la passe de thème complète : neuf écrans, thème clair puis préférence sombre émulée.
2. Chaque écran rend son relevé brut (fonds, encres, contrastes, débordement latéral, indices non chromatiques) → aucune comparaison à un attendu n'est faite par l'outil.
3. Je fausse volontairement l'émulation → **ça jette**, bruyamment, au lieu de rendre un relevé plausible.
4. Je compte les audits → 18, et les deux écrans hors navigation sont bien atteints.

Verify: UI d'abord — les neuf écrans réellement rendus dans les deux thèmes.

## Blocked by

- `.scratch/hp-suite-speed/issues/01-the-ledger-of-a-run.md` — sans le grand livre, cette tranche ne peut pas prouver son gain
