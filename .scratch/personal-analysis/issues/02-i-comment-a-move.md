Status: `ready-for-agent`

## Parent

`.scratch/personal-analysis/PRD.md` (US-16a — `BACKLOG.md`, découpée d'US-16 au grilling du
2026-08-24 en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

La **`Note`** (`CONTEXT.md`) : du texte libre du Player attaché à un coup — là où il dit *pourquoi*.

- Sur **n'importe quel ply**, coups adverses compris.
- **Et sur la position de départ** (`ply = 0`), pour commenter la partie d'ensemble ou son ouverture.
  Même convention que côté `Evaluation`, où la position initiale compte.
- Modifiable, supprimable.
- **Rien ne note jamais une `Note`** : c'est la partie délibérément non comparable de l'Analyse
  personnelle, et c'est sa valeur — c'est là que le joueur pense, pas là où il est scoré. À écrire dans
  l'écran, pas seulement dans le glossaire.
- Une `Note` et une `Declared severity` sont **indépendantes** sur un même coup : l'une sans l'autre
  est un état normal.

## Acceptance criteria

- [ ] Une `Note` s'écrit sur n'importe quel coup, y compris un coup adverse
- [ ] Une `Note` s'écrit sur la **position de départ** et se lit comme note d'ensemble
- [ ] Une `Note` se modifie et se supprime
- [ ] Une `Note` coexiste avec un verdict sur le même coup, et chacune est indépendante de l'autre
- [ ] Supprimer la `Note` d'un coup ne touche pas son verdict, et réciproquement
- [ ] Une `Note` vide (ou blanche) n'est pas stockée comme une `Note`
- [ ] L'écran indique que les `Note`s ne seront jamais notées
- [ ] Le texte est rendu tel qu'écrit (les retours à la ligne survivent) et ne casse pas la mise en page
- [ ] Lisible en thème clair et sombre

### Feature Path (FP)

1. Sur la lecture d'une partie, j'écris une note sur un coup → elle s'affiche avec ce coup.
2. J'écris une note sur la position de départ → elle s'affiche comme note d'ensemble de la partie.
3. Je pose aussi un verdict sur le coup déjà noté → les deux coexistent.
4. Je modifie la première note, je supprime celle de la position de départ → après rechargement, l'état reflète les deux gestes, et le verdict du coup est intact.

Verify: UI first.

## Blocked by

- `.scratch/personal-analysis/issues/01-a-reading-exists-and-judges-a-move.md`
