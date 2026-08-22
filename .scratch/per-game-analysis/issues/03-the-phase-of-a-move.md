Status: ready-for-agent

## Parent

`.scratch/per-game-analysis/PRD.md` (US-15a — `BACKLOG.md`).

Implemented on `integration/US-15a-per-game-analysis` — branch from it, merge back into it, **not**
`develop`. Auto-merges on a green local check (build + tests + this FP).

## What to build

La **`Phase`** (`CONTEXT.md`) : où en est la partie quand un Move est joué — **Early game**,
**Middlegame** ou **Endgame** — dérivée et affichée.

- **Dérivée, jamais stockée** : calculable depuis la Position déjà conservée avec chaque `Evaluation`,
  donc **retunable sans relancer le moteur** — ce qu'on va vouloir faire dès les premières parties
  regardées.
- **Deux frontières, deux règles différentes** — et c'est la part qu'on rate en cherchant un critère
  unique : le matériel ne bouge presque pas avant le coup 15, il ne peut donc rien dire de la première
  frontière.
- **Latching obligatoire** : une partie entrée en Endgame y reste. Une **promotion** est la seule
  chose qui *ajoute* du matériel, et sans latching elle ferait sortir la partie de la finale pour y
  rentrer aussitôt. La Phase est une propriété de **l'avancement de la partie**, pas un verdict
  indépendant sur chaque Position — deux Positions identiques atteintes dans deux parties peuvent donc
  être dans des phases différentes.
- **Affichée à deux distances de lecture** dans cette tranche : une **étiquette dans le panneau de
  détail** (la réponse précise sur le Move qu'on étudie), et un **marqueur de transition textuel dans
  la liste des coups** (la frontière devient une chose qu'on **voit en scannant**, sans couleur et
  lisible à voix haute). Grâce au latching, **deux marqueurs au maximum** par partie — et **zéro** sur
  une partie qui ne quitte jamais le début. Les marques sur les graphiques et le ruban étiqueté
  arrivent en tranche 06, avec le second graphique dont ils partagent l'axe.
- **Les seuils sont des heuristiques, pas des faits** : c'est exactement pourquoi la frontière est
  montrée. Le Player doit pouvoir regarder une partie à lui et dire « non, le coup 22 était encore un
  milieu de partie ».

## Acceptance criteria

- [ ] La Phase d'un Move est dérivée de ce qui est stocké, sans nouvelle colonne et sans appel moteur.
- [ ] **Early game** se termine au plus tôt du développement achevé (les quatre mineures ont quitté
      leur case d'origine et le roi a castlé ou perdu le droit) ou du **coup 15**.
- [ ] **Endgame** commence quand majeures + mineures des deux camps tombent à **six ou moins**.
- [ ] **Middlegame** est le reste, par exclusion.
- [ ] Une **promotion** en finale ne fait pas ressortir la partie de l'Endgame (latching).
- [ ] Le panneau nomme la Phase du Move lu.
- [ ] La liste des coups marque **où chaque Phase commence**, en texte, sans dépendre de la couleur, et
      au plus deux fois par partie.
- [ ] Une partie courte qui ne quitte pas le début n'affiche **aucun** marqueur de transition.

### Feature Path (FP)

1. Le Player ouvre une partie longue, allée jusqu'à une finale, au niveau détaillé → la liste de ses
   coups **montre où le milieu de partie commence, puis où la finale commence**.
2. Il sélectionne un coup avant la première frontière → le relevé le situe en début de partie.
3. Il sélectionne un coup entre les deux frontières → le relevé le situe en milieu de partie.
4. Il sélectionne un coup après la seconde → le relevé le situe en finale.
5. Il ouvre une partie de vingt coups → **aucune** transition n'est annoncée, et ses coups sont situés
   en début / milieu de partie.
6. Il ouvre une partie où un pion est promu en finale → les coups qui suivent la promotion sont
   toujours situés en finale.

Verify: UI first.

## Blocked by

- `02-review-mode.md`
