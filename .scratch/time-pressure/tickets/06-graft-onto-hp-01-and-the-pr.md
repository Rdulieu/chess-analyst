# 06 — La greffe sur HP-01 et la PR

**Implémenté sur la branche d'intégration** `integration/US-15b-time-pressure`. Spec :
`.scratch/time-pressure/SPEC.md`.

**What to build:** la suite des **Happy Paths** couvre la donnée de temps, et la PR
`integration → develop` est ouverte avec le résultat de la suite collé dedans.

**Greffe sur l'étape 9 de HP-01**, qui traverse déjà la page Analyse — **pas de 4ᵉ HP** : la règle
est **au plus 3**, et c'est le même arbitrage qu'US-14 et US-15a. La FP de chaque tranche a déjà
porté les assertions dures ; le HP n'a qu'à constater que la colonne temps et la lecture sont là et
lisibles sur une **vraie** partie.

**Blocked by:** 01, 02, 03, 04, 05 — c'est la tranche de clôture.

**Status:** ready-for-agent

- [ ] L'étape 9 de `HP-01` couvre la cadence exacte, le temps par coup et la lecture par partie, sur
      une vraie partie du corpus de référence.
- [ ] Aucun 4ᵉ scénario HP n'est créé.
- [ ] La suite HP tourne **en entier** (`/agentic-tests HP`) et son résultat — passages, échecs,
      findings — est **collé dans la PR**.
- [ ] La PR **liste les tickets inclus** (01 à 06), pour une revue de lot lisible.
- [ ] La PR énonce, en clair, que **l'axe `rapid` sort avec de la donnée de temps et zéro
      `Evaluation`** en face, et qu'une passe sur ses 231 parties coûterait ~2 h au tarif mesuré
      (0,56 s/position) — sans cette phrase, quelqu'un ouvrira US-15c en croyant `rapid` prêt.
- [ ] La PR est ouverte avec `--repo Rdulieu/chess-analyst` : le remote `upstream` déroute `gh`.
- [ ] La PR est **vérifiée mergeable** avant la remise à l'humain ; `BACKLOG.md` est le point de
      conflit habituel, et un conflit qui n'oppose aucune décision se résout en autonomie.
- [ ] **L'agent n'effectue pas le merge** : `integration → develop` est une décision humaine.
- [ ] Le gate : build + `npm test` verts, `npm run lint` a **tourné et rendu 0**, suite HP passée,
      aucun finding bloquant.

### Feature Path (FP)

Cette tranche n'a pas de FP propre : sa vérification **est** la suite HP.

Verify: par la suite HP dans le navigateur, et par la PR ouverte (lien remis à l'humain, jamais
mergée par l'agent).
