Status: `done`

## Parent

`.scratch/personal-analysis/PRD.md` (US-16a — `BACKLOG.md`, découpée d'US-16 au grilling du
2026-08-24 en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

**HITL** : cette tranche révise un scénario **HP** et ouvre la PR `integration → develop`. Les deux
sont des décisions humaines (voir le `git-flow`).

## What to build

La greffe agentique et la sortie de la story.

- **Greffe sur HP-01, après son étape 9.** C'est le bon hôte, et pas de peu : l'étape 9 asserte déjà
  « the `Review mode` is remembered […] **the app does not start volunteering the engine's verdict** »,
  et l'étape 7 a déjà ouvert `/analyse/:gameId` sur une partie **non analysée** — le contexte exact
  d'US-16a, sans préambule à écrire. Décision prise contre un accueil sur HP-02, qui n'ouvre une partie
  que dans sa passe de thème et aurait dû porter sa propre navigation.
- **Pas de 4ᵉ HP** : le plafond de 3 n'est pas relevé. La greffe couvre : ouvrir la lecture d'une
  partie, poser un verdict et un `Key moment`, sceller, et constater l'étiquette de provenance et le
  marqueur sur la liste des parties.
- Mettre à jour `docs/test-scenarios/HP-01-import-and-explore.md` — dont son `covers:` — et
  `docs/test-scenarios/README.md` si l'inventaire le demande.
- **Faire tourner la suite HP** (`/agentic-tests HP`) : le prérequis (path 0) seul et d'abord, puis un
  sous-agent par scénario — **fan-out plafonné à 2** sur cette machine, et les rapports **réclamés par
  `SendMessage`**, récupérés dans les transcripts à défaut. Ne pas improviser la dispatch : la suite
  est déjà passée verte sans être rapportée.
- **Ouvrir la PR `integration/US-16-my-own-analysis → develop`**, y coller le résultat HP (pass/fail +
  findings) et **lister les issues incluses**. Vérifier la mergeabilité **après** ouverture (`BACKLOG.md`
  collisionne structurellement). **Ne jamais merger** : c'est la décision du demandeur.

**Décidé pour la suite, hors de cette tranche** : à **US-16b**, HP-02 et HP-03 sont fusionnées en un
parcours « lire mes agrégats » (mêmes préambule, snapshot et style d'assertion), et le créneau libéré
accueille une **HP dédiée** « lire une partie à l'aveugle, sceller, confronter » — une HP porte une
valeur cœur, et cette valeur n'est entière qu'avec la confrontation.

## Acceptance criteria

- [ ] HP-01 porte la greffe après son étape 9, avec ses assertions, et son `covers:` nomme les termes neufs
- [ ] Aucun 4ᵉ scénario HP n'est créé ; l'inventaire reste à 3
- [ ] La greffe tourne sur une partie du snapshot de path 0, sans dépendre d'un temps moteur
- [ ] La suite HP complète est passée : prérequis d'abord et seul, puis un sous-agent par scénario, fan-out ≤ 2
- [ ] Chaque rapport de sous-agent est effectivement **collecté** (SendMessage, ou transcript à défaut)
- [ ] Le résultat HP (pass/fail + findings) est collé dans la PR
- [ ] La PR `integration → develop` liste les issues incluses et nomme le reviewer responsable
- [ ] La mergeabilité de la PR est re-vérifiée après ouverture, et les conflits n'opposant aucune décision sont résolus et rapportés
- [ ] Aucun merge n'est fait vers `develop`

### Feature Path (FP)

La suite HP elle-même (`/agentic-tests HP`), greffe incluse.

## Blocked by

- `.scratch/personal-analysis/issues/05-i-see-where-i-stand.md`
