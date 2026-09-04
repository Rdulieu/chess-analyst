Status: `done`

## Parent

`.scratch/confrontation/PRD.md` (US-16b — `BACKLOG.md`, découpée d'US-16 au grilling du 2026-08-24
en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

**HITL** : cette tranche **restructure la suite HP** et ouvre la PR `integration → develop`. Les deux
sont des décisions humaines (voir le `git-flow`).

## What to build

La sortie agentique de la story — et la restructuration de la suite HP **déjà décidée en US-16a-06**
et consignée dans `docs/test-scenarios/README.md`. Ne pas la redécouvrir ni la ré-arbitrer.

- **Fusionner HP-02 et HP-03** en un seul parcours « lire mes agrégats ». Ils ouvrent sur la même
  phrase, tournent sur le **même snapshot de path 0**, et assertent tous deux **une forme et une
  cohérence interne, jamais des nombres fixes** — la fusion ne perd donc aucune assertion, elle
  supprime un préambule dupliqué.
- **Le créneau libéré reçoit une HP dédiée** : *lire une partie à l'aveugle, sceller, confronter*.
  Une HP porte une **valeur cœur**, et US-16a n'a été qu'une **greffe** sur HP-01 précisément parce
  que cette valeur n'était **pas entière** sans la `Confrontation`. Elle l'est maintenant.
- **Le plafond de 3 HP n'est pas relevé.** L'inventaire reste à trois après l'opération.
- La nouvelle HP couvre le parcours complet : lire une partie sans jamais voir le moteur, sceller,
  ouvrir la confrontation, y lire **les trois figures séparées** avec leur provenance, puis lire le
  **bilan** depuis la `Nav`. Elle asserte **forme et cohérence interne**, jamais des nombres fixes —
  même discipline que les deux autres.
- Mettre à jour les fichiers de scénarios, leurs `covers:`, et l'inventaire de
  `docs/test-scenarios/README.md` — y compris **retirer la note « Decided for US-16b »**, qui aura
  été exécutée.
- **Faire tourner la suite HP** (`/agentic-tests HP`) : le prérequis (path 0) **seul et d'abord**,
  puis **un sous-agent par scénario** — **fan-out plafonné à 2** sur cette machine — et les rapports
  **réclamés par `SendMessage`**, récupérés dans les transcripts à défaut. Ne pas improviser la
  dispatch : une suite entièrement verte est déjà passée **non rapportée**.
- **Ouvrir la PR `integration/US-16-my-own-analysis → develop`**, y coller le résultat HP (pass/fail
  + findings) et **lister les issues incluses** pour une revue de lot lisible. **Re-vérifier la
  mergeabilité après ouverture** — `BACKLOG.md` collisionne structurellement. **Ne jamais merger** :
  c'est la décision du demandeur.

## Acceptance criteria

- [ ] HP-02 et HP-03 sont fusionnés en un seul parcours, sans perte d'assertion
- [ ] Une HP dédiée « lire à l'aveugle, sceller, confronter » existe et couvre les trois figures et le bilan
- [ ] L'inventaire compte **exactement 3 HP** après l'opération ; path 0 reste hors plafond
- [ ] Les `covers:` de chaque scénario touché nomment les termes neufs (`Confrontation`, `Key moment`, `Declared severity`)
- [ ] `docs/test-scenarios/README.md` est à jour, et la note « Decided for US-16b » est retirée
- [ ] La nouvelle HP tourne sur un snapshot de path 0 et asserte forme et cohérence, **pas** des nombres fixes
- [ ] La suite HP complète est passée : prérequis d'abord et seul, puis un sous-agent par scénario, fan-out ≤ 2
- [ ] Chaque rapport de sous-agent est effectivement **collecté** (SendMessage, ou transcript à défaut)
- [ ] Le résultat HP (pass/fail + findings) est collé dans la PR
- [ ] La PR `integration → develop` liste les issues incluses et nomme le reviewer responsable
- [ ] La mergeabilité est re-vérifiée après ouverture ; les conflits n'opposant aucune décision sont résolus et **rapportés**
- [ ] Aucun merge n'est fait vers `develop`

### Feature Path (FP)

La suite HP elle-même (`/agentic-tests HP`), restructuration incluse.

## Blocked by

- `.scratch/confrontation/issues/05-where-i-read-well.md`
