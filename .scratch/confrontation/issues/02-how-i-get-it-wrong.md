Status: `ready-for-agent`

## Parent

`.scratch/confrontation/PRD.md` (US-16b — `BACKLOG.md`, découpée d'US-16 au grilling du 2026-08-24
en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

**Comment** le joueur se trompe, et pas seulement combien : la **matrice de confusion** de ses
verdicts contre ceux du moteur, et **le sens de son biais**.

- **La matrice** : en lignes les cinq `Declared severity`, en colonnes ce que le moteur a mesuré —
  `Blunder` / `Mistake` / `Inaccuracy` / **rien de flagué**. Cette dernière colonne est un **fait**,
  pas une absence, et c'est elle qui rend `Sound` notable.
- **Le sens du biais, gratuit** : l'asymétrie de la matrice se lit en une phrase — « ce que vous
  appelez `Blunder`, le moteur l'appelle `Mistake`, sept fois sur dix ». **Sur-lire** et **sous-lire**
  le danger sont deux défauts opposés qu'**aucune des trois figures ne distingue seule**, et c'est
  précisément pourquoi la phrase vaut d'être écrite : elle ne coûte rien, la matrice la porte déjà.
- La phrase est **dérivée de la matrice affichée**, jamais calculée à côté : le joueur doit pouvoir
  la vérifier sur les cases qu'il a sous les yeux. La clarté du calcul pour le joueur est ici une
  exigence en soi.
- **Pas de phrase quand il n'y a rien à dire** : sur un échantillon trop maigre ou une matrice
  symétrique, l'absence de biais est dite, et aucune tendance n'est inventée. Une phrase affirmative
  tirée de deux cases serait pire que le silence.
- **La matrice ne produit toujours aucun score.** Elle éclaire la justesse de la tranche 01, elle ne
  la remplace pas et ne s'ajoute pas à elle comme un troisième chiffre.
- **Divergence, pas erreur** : une case hors diagonale est un endroit **où regarder**. Le
  vocabulaire de la tranche 01 tient ici aussi.
- Lisible sans couleur seule (ADR-0013) : une matrice est exactement le genre de tableau où le
  dégradé chromatique remplace en douce l'information.

## Acceptance criteria

- [ ] La matrice affiche les cinq `Declared severity` en lignes et les trois sévérités mesurées **plus « rien de flagué »** en colonnes
- [ ] Chaque case porte un **compte**, pas seulement une intensité
- [ ] La diagonale (accord) est lisible comme telle, et pas uniquement par la couleur
- [ ] La somme des cases notables égale le dénominateur de la justesse affiché en tranche 01
- [ ] La phrase de biais est **dérivée des cases affichées** et vérifiable dessus
- [ ] Aucune phrase de biais n'est produite quand la matrice ne la soutient pas ; l'absence est dite
- [ ] Aucun score nouveau n'apparaît, et aucun chiffre unique ne résume la matrice
- [ ] Une case hors diagonale n'est jamais nommée « erreur »
- [ ] Lisible en thème clair et sombre, aucun indice purement chromatique
- [ ] Aucun token SCSS nouveau sans nécessité démontrée

### Feature Path (FP)

1. Sur une partie analysée, je déclare plusieurs verdicts dont au moins deux plus sévères que ce que le moteur mesure, puis je scelle.
2. J'ouvre la confrontation → la matrice est là, avec ses lignes déclarées et ses colonnes mesurées, chaque case portant un compte.
3. Je repère mes deux verdicts trop sévères → ils sont dans les cases hors diagonale que j'attends.
4. Je lis la phrase de biais → elle dit que je sur-lis le danger, et je peux la retrouver sur les cases affichées.
5. J'additionne les cases notables → j'obtiens le dénominateur de la justesse affiché juste à côté.
6. J'ouvre la confrontation d'une partie où j'ai posé un seul verdict → aucune tendance n'est affirmée.

Verify: UI first.

## Blocked by

- `.scratch/confrontation/issues/01-a-confrontation-exists.md`
