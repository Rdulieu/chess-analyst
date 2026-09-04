Status: `done`

## Parent

`.scratch/personal-analysis/PRD.md` (US-16a — `BACKLOG.md`, découpée d'US-16 au grilling du
2026-08-24 en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

Le **`Key moment`** (`CONTEXT.md`) : le Player déclare qu'un coup est **là où la partie a tourné**.

- **Attaché à un coup**, pas flottant entre deux — c'est ce qui permettra de mettre deux lectures de la
  même partie côte à côte.
- **Plusieurs par partie, et non classés** : le Player n'est pas obligé de choisir quand la partie a
  basculé deux fois. Aucun n'est « le » moment clé.
- Posable et retirable.
- **Pas de plafond** sur leur nombre, mais **le compte est affiché** — l'habitude constante du projet
  (le compte à côté du taux). Marquer douze coups sur trente n'est pas interdit ; c'est visible.
- Ce n'est **ni** un bon coup **ni** une faute : un pivot. À dire dans l'écran, sinon le Player le
  confondra avec la `Declared severity` posée juste à côté.
- Rien ici ne compare quoi que ce soit : le score de « part des dégâts trouvée » est **US-16b**.

## Acceptance criteria

- [ ] Un coup se désigne comme `Key moment`, et se dé-désigne
- [ ] **Plusieurs** `Key moment`s coexistent sur une partie, sans ordre ni hiérarchie
- [ ] Le **nombre** de `Key moment`s posés est affiché
- [ ] Un `Key moment` coexiste avec un verdict et une `Note` sur le même coup, indépendamment
- [ ] L'écran distingue clairement un `Key moment` d'un jugement de qualité
- [ ] Aucun plafond n'est imposé
- [ ] L'état survit au rechargement
- [ ] Lisible en thème clair et sombre, aucun indice purement chromatique

### Feature Path (FP)

1. Sur la lecture d'une partie, je désigne un coup comme moment clé → il est marqué comme tel, et distinct d'un jugement de qualité.
2. J'en désigne un deuxième → les deux tiennent, aucun n'est présenté comme « le » moment clé, et le compte affiché dit deux.
3. Je retire le premier → il ne reste que le second, et le compte dit un.
4. Je recharge → l'état est inchangé.

Verify: UI first.

## Blocked by

- `.scratch/personal-analysis/issues/01-a-reading-exists-and-judges-a-move.md`
