# 03 — Le reste de la structure, dont la seule vraie fusion

Status: ready-for-agent
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
## What to build

Terminer la **passe structure** : tout ce qui reste de l'amont entre, y compris — et c'est le cœur de
la tranche — les **deux seules skills qui portent du travail local**.

- **Fusion à la main de `agentic-tests`** (78 → **833** ici, 78 → 92 en amont) et de **`git-flow`**
  (43 → 82 ici, 43 → 66 en amont). L'apport amont est petit mais réel : pour `agentic-tests`, la
  notion de **surface primaire** et sa table de drivers, plus la phrase qui situe enfin le tier
  (« au-dessus des tests end-to-end : la passe de QA, faite par un agent ») ; pour `git-flow`, la
  section **`Cleanup`** (supprimer une branche d'intégration mergée). Le reste de leur diff est
  lexical et **n'est pas traité ici**.
- **La règle de fusion, non négociable** : l'amont **enrichit** le nôtre, jamais l'inverse. Rien de
  local ne disparaît, et la tranche doit pouvoir le **montrer** ligne à ligne — c'est la contrainte
  posée par le demandeur, et la base prouvée (`ea7e4afe`) est ce qui la rend vérifiable.
- **La table de drivers de l'amont est conservée comme table générique, puis instanciée** pour ce
  dépôt : surface primaire = l'UI dans un navigateur, driver = la bibliothèque CDP d'ADR-0020. On
  prend le concept, **pas** la recommandation Playwright (note du 2026-09-04 sur ADR-0020 ; US-38
  mesurera).
- Entrent aussi, sans arbitrage : `tdd` et `triage` dans leur version amont avec leurs annexes, et
  les cinq skills neuves restantes — **`implement`**, **`verify-factory`**, **`code-review`**,
  `codebase-design`, `clean-context`.
- **`code-review` ombrage la skill intégrée de Claude Code du même nom.** C'est voulu : celle de
  l'amont est adossée aux standards documentés du dépôt et à la spec du ticket, et c'est elle
  qu'`implement` appelle. L'ombrage est **documenté** dans la tranche.

Toujours **aucun renommage** hors des fichiers repris eux-mêmes.

## Acceptance criteria

- [ ] `agentic-tests` porte la notion de **surface primaire**, la table de drivers **et** son
      instanciation locale, **sans avoir perdu une seule** de ses sections locales.
- [ ] `git-flow` porte la section `Cleanup` **et** tous nos ajouts locaux, dont l'encadré « A check
      that cannot run has not passed ».
- [ ] La preuve que rien de local n'est perdu est **produite et lisible** dans la PR de la tranche,
      pas affirmée.
- [ ] `tdd`, `triage`, `build-factory` sont à la version amont, avec leurs annexes.
- [ ] `implement`, `verify-factory`, `code-review`, `codebase-design`, `clean-context` sont
      présentes et se chargent.
- [ ] L'ombrage de `code-review` est documenté à l'endroit où un agent le rencontre.
- [ ] La recommandation Playwright **n'est pas suivie**, et le refus renvoie à ADR-0020 et US-38.

### Feature Path (FP)

1. Lire le runner agentique → il parle de **surface primaire**, donne la table générique, **et** dit
   que la nôtre est l'UI pilotée par la bibliothèque CDP.
2. Y chercher le mécanisme d'auto-audit de l'orchestration → **intact**.
3. Y chercher le plafond de fan-out et la récupération des rapports perdus → intacts.
4. Lire `git-flow` → la section `Cleanup` **et** l'encadré sur les contrôles qui ne peuvent pas
   tourner.
5. Invoquer `/implement` → elle décrit la boucle des trois rôles et nomme `code-review`.
6. Invoquer `/verify-factory` → elle tourne et rapporte, même si tout n'est pas encore vert.

> **Filet de code.** Fin de tranche : si `git diff --name-only` touche quoi que ce soit **hors**
> `.claude/`, `docs/`, `.scratch/` et `BACKLOG.md`, le gate complet (build + tests + lint) tourne.
> Sinon, rien — le filet passe une fois, entier, à la tranche 08 (décision du demandeur, 2026-09-04).

## Blocked by

- `01-the-watch-post`.
