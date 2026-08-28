Status: `ready-for-agent`

## Parent

`.scratch/reading-route-density/PRD.md` (US-22 — `BACKLOG.md`, grillée le 2026-08-27).
ADR : `docs/adr/0021-what-the-player-acts-on-never-moves.md`.

Implemented on the business-story integration branch `integration/US-22-reading-route-density` —
branch sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local
check (build + tests + this issue's Feature Path) is green.

## What to build

**« Verdict, coup suivant, verdict » sans quitter les touches.** Le critère 40 d'US-16a voulait « peu
de clics, coup après coup » ; c'est tenu pour le verdict seul, et à la souris. L'app n'a aujourd'hui
**aucun raccourci clavier** — ce serait le premier.

| touche | effet |
| --- | --- |
| `1`…`5` | pose le verdict, **dans l'ordre affiché** — du pire au meilleur, celui que le glossaire fixe |
| `←` `→` | coup précédent / suivant |
| `k` | bascule le `Key moment` |

**Ce sont des commandes globales qui ne déplacent pas le focus**, et c'est ce qui rend la boucle
possible : poser un verdict au clavier n'est pas cliquer une radio, sinon les flèches serviraient
ensuite à parcourir le groupe plutôt qu'à changer de coup.

Deux règles que rien ne doit enfreindre :

- **Les touches sont inertes dès que le focus est dans un champ de saisie.** Écrire une note écrit du
  texte, et rien d'autre.
- **Un groupe de radios qui a le focus garde ses flèches natives.** Les lui retirer casserait une
  convention que les technologies d'assistance tiennent pour acquise — et c'est le genre de
  régression que rien dans la suite ne surveille aujourd'hui, donc que personne ne verrait.

Les raccourcis sont **annoncés à l'écran** : un raccourci qu'on découvre par hasard n'existe pas. À
hauteur constante, sous les contrôles (ADR-0021).

## Acceptance criteria

- [ ] `1`…`5` posent les cinq verdicts, dans l'ordre affiché
- [ ] `←` `→` changent de coup
- [ ] `k` bascule le `Key moment`
- [ ] Poser un verdict au clavier **ne déplace pas le focus**, de sorte que la boucle s'enchaîne
- [ ] Toutes les touches sont **inertes** pendant la saisie d'une note
- [ ] Un groupe de radios qui a le focus garde ses flèches **natives**
- [ ] Les raccourcis sont annoncés à l'écran, à hauteur constante
- [ ] Aucun raccourci ne pose un verdict à la position de départ, où il n'y en a pas
- [ ] Après scellement, les raccourcis écrivent dans la couche postérieure, comme la souris
- [ ] L'assertion 7 reste verte

### Feature Path (FP)

1. Sans toucher la souris, je pose un verdict, j'avance d'un coup, j'en pose un autre → la boucle s'enchaîne.
2. Je marque un moment clé au clavier → il est posé, et se lit dans la liste.
3. Je commence à taper une note → mes touches écrivent du texte, aucune ne commande quoi que ce soit.
4. Je navigue au clavier jusqu'aux verdicts → les flèches y font ce qu'elles ont toujours fait.
5. Sans avoir lu la documentation, l'écran m'a dit que ces raccourcis existaient.

Verify: UI d'abord — ce qui se passe à l'écran quand on tape, et où le focus se trouve.

## Blocked by

- `.scratch/reading-route-density/issues/02-what-the-player-clicks-stops-moving.md` — l'annonce des raccourcis est un bloc de plus dans le panneau, et la garde doit exister avant
