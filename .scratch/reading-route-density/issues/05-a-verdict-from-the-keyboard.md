Status: `done` — mergée sur `integration/US-22-reading-route-density` le 2026-08-31 (FP verte ; cinq findings de la FP corrigés dans la tranche, dont une régression que le correctif lui-même avait introduite)

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

- [x] `1`…`5` posent les cinq verdicts, dans l'ordre affiché
- [x] `←` `→` changent de coup
- [x] `k` bascule le `Key moment`
- [x] Poser un verdict au clavier **ne déplace pas le focus**, de sorte que la boucle s'enchaîne
- [x] Toutes les touches sont **inertes** pendant la saisie d'une note
- [x] Un groupe de radios qui a le focus garde ses flèches **natives**
- [x] Les raccourcis sont annoncés à l'écran, à hauteur constante
- [x] Aucun raccourci ne pose un verdict à la position de départ, où il n'y en a pas
- [x] Après scellement, les raccourcis écrivent dans la couche postérieure, comme la souris
- [x] L'assertion 7 reste verte

### Feature Path (FP)

1. Sans toucher la souris, je pose un verdict, j'avance d'un coup, j'en pose un autre → la boucle s'enchaîne.
2. Je marque un moment clé au clavier → il est posé, et se lit dans la liste.
3. Je commence à taper une note → mes touches écrivent du texte, aucune ne commande quoi que ce soit.
4. Je navigue au clavier jusqu'aux verdicts → les flèches y font ce qu'elles ont toujours fait.
5. Sans avoir lu la documentation, l'écran m'a dit que ces raccourcis existaient.

Verify: UI d'abord — ce qui se passe à l'écran quand on tape, et où le focus se trouve.

## Blocked by

- `.scratch/reading-route-density/issues/02-what-the-player-clicks-stops-moving.md` — l'annonce des raccourcis est un bloc de plus dans le panneau, et la garde doit exister avant

## Trois questions laissées au demandeur

Aucune n'est un défaut ; toutes les trois sont des arbitrages que la dernière tranche d'une story
n'a pas à trancher seule.

1. **À 380 px la notice des raccourcis est sous la ligne de flottaison** — `top` 980 px pour une
   fenêtre de 900. Le critère « annoncés à l'écran, à hauteur constante » est tenu, et à 1280 px la
   notice est bien visible. Mais sur la largeur étroite le joueur doit faire défiler tout
   l'échiquier et tout le panneau pour apprendre que les raccourcis existent — c'est-à-dire
   exactement l'échec « découvert par hasard » contre lequel la notice est écrite. La remonter
   au-dessus des contrôles est possible (elle est à hauteur constante, donc elle ne déplacerait
   rien), au prix de la lettre d'ADR-0021 : les contrôles d'abord, la prose ensuite.

2. **La notice est rendue au ply 0**, où deux de ses trois commandes sont inertes — les raccourcis
   de verdict et de moment clé ne sont délibérément pas installés à la position de départ. Rien à
   l'écran ne la contredit (les contrôles correspondants sont absents eux aussi), et faire varier la
   phrase casserait sa hauteur constante, qui est ce que la tranche 02 a payé cher. Elle est donc,
   à ce seul ply, vraie au tiers.

3. **Les flèches ne fonctionnent pas sur la page `Analyse`**, parce que cette page ne les annonce
   pas. Le jugement de la FP, cité : « c'est le bon arbitrage et c'est la moitié faible du design —
   un joueur qui vient d'apprendre `→` sur la route de lecture ouvre l'`Analyse` du même jeu, à un
   clic, même échiquier, même stepper, appuie sur `→`, et rien ne se passe. L'absence de notice
   n'est pas un message. Le correctif bon marché est de les annoncer aussi sur `Analyse`, pas de les
   retirer. »
