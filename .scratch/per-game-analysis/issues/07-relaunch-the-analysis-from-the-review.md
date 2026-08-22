Status: ready-for-agent

## Parent

`.scratch/per-game-analysis/PRD.md` (US-15a — `BACKLOG.md`).

Implemented on `integration/US-15a-per-game-analysis` — branch from it, merge back into it, **not**
`develop`. Auto-merges on a green local check (build + tests + this FP).

## What to build

Lancer — et **relancer** — l'`Analysis pass` **depuis la page Analyse**, avec un avertissement avant
d'écraser une analyse existante.

- Aujourd'hui l'écran n'offre d'analyser que si la partie **ne l'est pas** ; une fois analysée, il n'y
  a plus aucun moyen de relancer depuis là où on la regarde.
- **Une analyse existante est du temps moteur**, pas une donnée qu'on refetch : l'écraser doit être un
  acte **délibéré**. La confirmation **nomme la partie**, dit **ce qui est perdu** et **ce que coûte sa
  reconstruction** (un ordre de grandeur en minutes), avec **Annuler en action primaire**.
- **Motif à suivre, il existe déjà** : la suppression d'un `Profile` se confirme par une carte
  `role="alertdialog"` **en page**, qui **nomme** ce qu'elle détruit. Même classe d'acte, même motif.
  **Pas** de boîte de dialogue natrive du navigateur : celle utilisée ailleurs avertit d'une **durée**,
  celle-ci avertit d'une **destruction**, et une carte peut nommer le coût.
- Annuler **ne touche à rien** : ni pass ouvert, ni `Evaluation` perdue.
- Confirmer relance le pass sur cette partie, et l'écran rend compte de son avancement et de sa fin
  comme il le fait déjà.
- Une fois le pass terminé, la revue montre le résultat **de la nouvelle** analyse.
- **Un run moteur reste toujours déclenché par le Player** : rien ici ne relance quoi que ce soit tout
  seul.

## Acceptance criteria

- [ ] L'action est disponible sur la page Analyse pour une partie **déjà analysée** comme pour une
      partie qui ne l'est pas.
- [ ] Sur une partie déjà analysée, une confirmation apparaît **avant** toute destruction ; elle nomme
      la partie, ce qui est perdu et l'ordre de grandeur du coût de reconstruction.
- [ ] **Annuler** est l'action primaire, et ne modifie ni les `Evaluation`s ni l'état d'analyse.
- [ ] Sur une partie **non analysée**, aucune confirmation n'est demandée : il n'y a rien à écraser.
- [ ] Confirmer ouvre un pass sur cette partie, dont l'avancement puis la fin sont rapportés.
- [ ] Après le pass, le relevé et le récapitulatif reflètent la **nouvelle** analyse.
- [ ] La confirmation est atteignable et utilisable au clavier, et porte un nom accessible.
- [ ] Aucun chemin ne relance une analyse sans action explicite du Player.

### Feature Path (FP)

1. Le Player ouvre une partie **déjà analysée** → depuis cet écran, il peut demander de la réanalyser.
2. Il le demande → un avertissement **nomme la partie**, dit que son analyse actuelle sera écrasée et ce
   que coûte de la refaire.
3. Il annule → l'avertissement disparaît, et la partie a **toujours** son analyse : relevé et
   récapitulatif inchangés.
4. Il redemande et confirme → le pass démarre, son avancement est visible, sa fin est annoncée.
5. À la fin, la revue de la partie montre le résultat de cette nouvelle analyse.
6. Il ouvre une partie **non analysée** et demande son analyse → **aucun** avertissement, le pass part
   directement.

Verify: UI first.

## Blocked by

- `01-the-best-line-end-to-end.md`
