# 02 — Le rapport re-jouable, une ligne par coup du Player

Status: `done`
Type: AFK
Branche : depuis `integration/US-15a-bis-deepen-per-game-analysis`, PR **vers elle**.

## Parent

[`PRD.md`](../PRD.md) — US-15a-bis. Décisions **D7**, **D11**, **D12**, **D14**.

## What to build

L'appareil de mesure de toute la story. Un outil sous `server/`, **avec ses tests**, qui rend une
**ligne par coup du Player** et dont le récapitulatif par partie est l'agrégat — déjà la forme du
*fold* qu'US-15c devra plier.

Chaque ligne porte : la sévérité, le motif d'exclusion, les **cinq signaux**, la `Phase` sous ses
**deux** lectures du cap, et la sévérité de l'adversaire.

Les cinq signaux se lisent tous dans des colonnes **déjà stockées** — aucun temps moteur :

| Signal | D'où il sort |
| --- | --- |
| Variation de **matériel** | comptage sur les `fen` de deux demi-coups consécutifs |
| **Distance au mat** | la colonne `mate` |
| Chute en **centipions** | la colonne `cp` |
| Séquence **forcée** | `pv`, et « un seul coup légal » depuis la `fen` |
| **Écart à la deuxième ligne** | `cp2` / `mate2` — « il n'y avait qu'un coup » |

Ils sont calculés sur **tous** les coups du Player, y compris ceux qui ne posent aucun problème : un
signal vrai sur six coups manqués mais aussi sur cent coups corrects ne sert à rien, et sans le
dénominateur complet on ne peut pas le voir.

Les sévérités de l'**adversaire** se dérivent des mêmes lignes — `evaluations` porte une ligne par
demi-coup, les deux couleurs, donc le moteur a déjà cherché ces positions. Elles sont restreintes aux
coups joués dans la **partie encore disputée** : un adversaire qui ne fait aucune faute dans une
position gagnée depuis le coup 12 n'a rien prouvé. Elles entrent dans le rapport et **rien n'est
affiché dans l'app**.

**Contrainte dure** : le rapport appelle `gameRecap`, `moveSeverities`, `countedMoves` — **jamais une
copie**. Une seconde implémentation de la méthode n'agréerait que par chance et divergerait en
silence, ce qu'ADR-0017 refuse. Le rapport ne calcule rien de la méthode ; il met en forme et ajoute
les signaux.

Il **désigne lui-même** les coups où la mécanique se trompe — ceux qu'un signal désigne et que
personne ne signale, et ceux que lichess signale qu'aucun signal ne rattrape. Le contrôle humain se
**lit**, il ne se cherche pas.

Enfin, il doit être **re-jouable à coût nul** : changer un seuil et relancer, sans jamais ré-analyser
(ADR-0024). C'est ce qui permet d'essayer quinze réglages au lieu de trois.

L'outil est une **fonction exportée** qui rend des lignes ; toute CLI ou sortie fichier n'en est
qu'une enveloppe mince.

## Acceptance criteria

- [ ] Le rapport rend une ligne par coup du Player, pour une partie analysée.
- [ ] Chaque ligne porte la sévérité, le motif d'exclusion, les cinq signaux, la `Phase` sous ses deux
      lectures, et la sévérité adverse.
- [ ] Les signaux sont calculés sur **tous** les coups du Player, pas seulement les signalés.
- [ ] La sévérité adverse est restreinte aux coups joués dans la partie encore disputée.
- [ ] Aucune sévérité adverse n'est exposée par l'app ni persistée.
- [ ] Les totaux des lignes **égalent** le récapitulatif rendu par l'app pour la même partie.
- [ ] Le rapport appelle les fonctions existantes de dérivation ; aucune règle de la méthode n'y est
      réimplémentée.
- [ ] Changer un seuil et relancer produit des lignes différentes **sans** ré-analyse ni appel moteur.
- [ ] Le rapport liste les coups où la mécanique se trompe, dans les deux sens.
- [ ] Aucun changement de schéma, aucune migration.
- [ ] Le comportement est testé sur fixtures, sans base et sans moteur.

### Feature Path (FP)

1. Lancer le rapport sur une partie analysée → il rend **une ligne par coup du Player**, portant
   sévérité, motif d'exclusion, les cinq signaux, la `Phase` sous ses deux lectures, la sévérité
   adverse.
2. Comparer les totaux de ces lignes au récapitulatif que l'app affiche pour la même partie → ils
   sont **identiques**.
3. Vérifier qu'aucune sévérité adverse n'apparaît dans l'app pour cette partie.
4. Changer un seuil, relancer le rapport → les lignes changent, et **aucune ré-analyse** n'a eu lieu
   (aucune passe nouvelle, aucun temps moteur consommé).
5. Lire la liste des coups « où la mécanique se trompe » → elle est produite par le rapport, pas
   cherchée à la main.

Verify: la sortie du rapport d'abord ; sonder la base seulement pour confirmer qu'aucune passe
d'analyse nouvelle n'a été créée.

## Blocked by

None - can start immediately.
