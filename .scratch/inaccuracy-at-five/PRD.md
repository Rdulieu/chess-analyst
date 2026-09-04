# PRD — US-37 : le barème d'`Inaccuracy` passe à 5 points

Status: ready-for-agent
Business ref: US-37 (`BACKLOG.md`)
Integration branch: `integration/US-37-inaccuracy-at-five`
Grill: léger, 2026-09-04 — la décision était prise et chiffrée avant d'entrer en session.

## Problem Statement

Le `Player` voit, en relisant une de ses parties, des coups qu'il sait mauvais et que
l'application ne dit pas. Il n'a aucun moyen de savoir si l'app les a jugés acceptables ou
si elle ne les a pas vus : dans les deux cas, elle est muette.

Sur les vingt parties du corpus de référence, l'app signale **85** coups là où lichess en
signale nettement plus ; confrontée coup à coup, elle est d'accord avec lui **53 fois sur
96**. Un outil qui prétend dire au joueur où il se trompe et qui rate une fois sur deux ce
qu'une référence courante signale n'est pas croyable — et ce qu'il rate n'est pas réparti au
hasard : ce sont les fautes moyennes, celles que le joueur voit et que l'app range dans la
`Drift`, un résidu anonyme qui ne nomme aucun coup.

## Solution

La bande `Inaccuracy` descend de **10–20 %** à **5–20 %** de chances de victoire perdues.
Rien d'autre ne bouge : `Mistake` et `Blunder` gardent leurs bornes, et le **plancher du
dénominateur reste à 10 %** — le comportement de fin de partie plaît tel qu'il est, et il est
préservé au dixième près.

Du point de vue du `Player` :

- il voit **1,7× plus de coups signalés** (85 → 143 sur le corpus), tous des `?!` ;
- la `Drift` de ses parties **fond de moitié** (432 → 292 et 505 → 254 points) : ce qui était
  une perte anonyme devient un coup nommé, avec sa `Best line` et sa réfutation, déjà stockées ;
- le total des **chances perdues ne bouge pas** (1273 et 1830, au dixième près) : rien n'est
  inventé, la même perte est simplement mieux attribuée ;
- l'accord avec lichess passe de **53/96 à 79/96**.

## User Stories

1. En tant que `Player`, je veux que l'app signale un coup qui m'a coûté 6 points de chances,
   pour qu'elle cesse d'être muette sur une faute que je vois moi-même.
2. En tant que `Player`, je veux que `Mistake` et `Blunder` gardent exactement leurs bornes,
   pour que ce que j'ai appris à lire ne change pas de sens sous mes pieds.
3. En tant que `Player`, je veux que le nombre de mes coups **comptés** soit identique à
   avant, pour que le dénominateur de tout ce que l'app conclut ne bouge pas quand un barème
   d'affichage change.
4. En tant que `Player`, je veux que le total de mes **chances perdues** soit identique à
   avant, pour vérifier moi-même que le barème réattribue une perte au lieu d'en créer.
5. En tant que `Player`, je veux voir ma `Drift` diminuer d'autant que les erreurs signalées
   augmentent, pour que `flaggedLoss + drift === chancesLost` reste vérifiable à l'œil.
6. En tant que `Player`, je veux que les coups de la zone morte gardent leur exclusion, pour
   qu'une partie perdue au coup 25 ne me reproche pas dix-huit coups sans objet.
7. En tant que `Player`, je veux que le récapitulatif me dise **quel motif** explique l'écart
   entre les coups que la partie montre et les erreurs que l'analyse compte, pour qu'il ne
   m'affirme pas « le coup était forcé » quand la position était déjà décidée.
8. En tant que `Player`, je veux qu'un coup signalé mais non compté porte **son propre motif**
   dans la liste des coups, pour distinguer « c'était forcé » de « c'était déjà plié ».
9. En tant que `Player`, je veux que la case du plateau, le marqueur de la courbe et le glyphe
   de la liste continuent de dire la même chose du même coup, pour n'avoir rien de nouveau à
   apprendre d'un écran à l'autre.
10. En tant que `Player`, je veux que `CONTEXT.md` publie la bande réellement appliquée, pour
    que le glossaire ne mente pas sur la méthode.
11. En tant que `Player`, je veux qu'aucune de mes parties n'ait besoin d'être réanalysée, pour
    que retuner un seuil ne me coûte pas des heures de moteur.
12. En tant que `Player`, je veux qu'aucune migration ne touche ma base, pour que mes
    `Evaluation`s — la seule chose que rien ne reconstruit — ne soient jamais en jeu.
13. En tant que `Player`, je veux que la `Danger position` continue de ne compter que les
    fautes sérieuses (20 %+), pour qu'une page bâtie sur « erreur grave » ne se remplisse pas
    d'imprécisions.
14. En tant que `Player`, je veux que le nombre de coups **forcés** exclus soit inchangé, pour
    que la règle des échecs ne dépende pas d'un réglage de l'app.
15. En tant qu'agent futur lisant le dépôt, je veux trouver **deux constantes nommées** là où
    il y en avait une, pour ne pas croire à un oubli et « corriger » le plancher.
16. En tant qu'agent futur, je veux que le plancher à 10 % porte sa justification **empirique
    chiffrée**, pour ne pas avoir à deviner pourquoi ce n'est pas 8 ni 15.
17. En tant qu'agent futur, je veux qu'ADR-0017 ne pose plus un principe que le dépôt enfreint,
    pour que les seuils à venir aient une règle qui tient.
18. En tant que `Player`, je veux que le cas « montré par la partie, non retenu par l'analyse »
    s'affiche enfin correctement, pour que le mécanisme construit par US-15a serve à quelque
    chose.
19. En tant que `Player`, je veux que ma `Confrontation` continue de se calculer sur mes
    `Counted Move`s, pour que « ai-je bien lu » garde le dénominateur de tout le reste.
20. En tant que `Player`, je veux que les tests disent le comportement en points de chances et
    non en constantes importées, pour qu'un futur retunage casse les tests s'il change le sens.

## Implementation Decisions

### D1 — Deux constantes, deux modules

`INACCURACY_DROP = 10` est aujourd'hui **une** constante exportée par le module des sévérités
et importée par celui du dénominateur, où elle mesure autre chose : une **chute** ici, un
**niveau** là. Elles se séparent.

| Constante | Module | Ce qu'elle mesure | Valeur |
| --- | --- | --- | --- |
| `INACCURACY_DROP` | sévérités (`danger`) | une **chute** — le plus petit écart que l'app appelle une faute | **5** |
| `DECIDED_FLOOR` | dénominateur (`analysis`) | un **niveau** — les chances sous lesquelles une Position ne dit plus rien du joueur | **10** |

`DECIDED_FLOOR` est **défini dans le module du dénominateur**, pas renommé sur place dans
celui des sévérités : l'import inter-modules *est* le lien qu'on défait, le garder tout en
renommant conserverait la dépendance qui a produit la confusion. Les deux sont publiées.

### D2 — Le plancher devient empirique, et le dit

La justification actuelle est un **corollaire** : « signaler exige 10 % de chute, donc 10 % à
perdre ; une Position sous ce plancher ne peut pas produire d'`Inaccuracy` ». Elle tombe. Le
plancher garde sa valeur et reçoit une justification qui tient seule : **81** coups exclus
contre **2** montrés-non-comptés sur le corpus (`587/59`, chute 9,0 à 9,96 % ; `715/106`, 5,5 à
5,8 %). Écrit à trois endroits : glossaire `Counted Move`, commentaire de la constante, PRD.

### D3 — L'écart du récapitulatif est ventilé par motif

Le récapitulatif écrit aujourd'hui en dur, comme explication de l'écart entre coups montrés et
erreurs comptées : *« le coup était forcé »*. C'était vrai tant que `decided` était
inatteignable ; ça devient **faux à l'écran** dès la première partie du corpus concernée.

`GameRecap` gagne donc l'écart **ventilé par `UncountedReason`** — un `Record`, comme
`excluded` juste au-dessus, jamais un scalaire. C'est ce qu'ADR-0017 demandait déjà : un `Game`
porte « *whether it is a `Counted Move` together with which reason excluded it* ». Le
récapitulatif était la dernière surface à fondre les deux motifs, tolérée parce que le second
n'arrivait jamais.

Le fold du rapport rejouable porte une **assertion de réconciliation** entre ses totaux et le
récapitulatif : elle est étendue au nouveau champ, ce qui en fait le garde-fou de D3.

### D4 — Rien à faire côté client hors le récapitulatif

Vérifié : la marque d'un coup signalé-non-compté dans la liste définit **déjà** le libellé
`decided` (« *défini plutôt que supposé inatteignable* »). Le chemin construit par la tranche 04
d'US-15a rendra `déjà décidée` sans qu'on y touche. Seuls les **commentaires** qui affirment
l'inatteignabilité sont à réécrire.

### D5 — Ce qui ne change pas, et doit être verrouillé par des tests

Coups du `Player`, `Counted Move`s, taille de la zone morte, coups forcés, **chances perdues**,
bornes de `Mistake` et `Blunder`, seuil de 20 % de la `Danger position`, plancher du
dénominateur. **Aucune migration** : tout est dérivé (ADR-0009), c'est l'argument porteur.

### D6 — Documentation

`CONTEXT.md` (fait au grill) : bande 5–20, entrée `Counted Move` réécrite, exemple de la
`Drift` corrigé (« 5 % par coup » devenait faux), `Candidate line` renvoyée au plancher plutôt
qu'au nombre. ADR-0017 amendé sur place (décision du demandeur) ; note sur ADR-0023.

### D7 — Constats enregistrés, sans action

- **Densité de glyphes** : 1,7× (85 → 143), tous des `?!`. **Constat, pas problème** — décision
  du demandeur. Aucune tranche n'est autorisée à « adoucir » le rendu ; on regarde après.
- **Rétroactivité sur les lectures scellées** : la `Confrontation` se calcule à la lecture
  contre la méthode **courante** ; les 3 lectures scellées et leurs 97 verdicts déclarés seront
  re-jugés contre un barème qui n'existait pas au scellement, et l'effet est **directionnel**
  (58 coups passent de « rien » à `?!`, donc le biais se déplace). **Constat seul** — décision
  du demandeur : ni amendement de glossaire, ni US ouverte.

## Testing Decisions

Un bon test dit ici le comportement **en points de chances**, jamais en important la constante :
un test qui écrit `INACCURACY_DROP` passe encore après un retunage qui change le sens. Les
seuils s'écrivent en littéraux dans les tests, exprès.

**Toutes les coutures sont existantes** — aucune nouvelle n'est nécessaire, ce qui est le signe
que la story est un retunage et non une fonctionnalité.

| Couture | Niveau | Ce qu'elle tient |
| --- | --- | --- |
| `server/test/move-quality.test.ts` | unitaire pur | les quatre bandes, aux bornes exactes (4,9 / 5,0 / 19,9 / 20,0 / 29,9 / 30,0) |
| `server/test/counted.test.ts` | unitaire pur | le plancher à 10 est indépendant de la bande ; `forced` gagne sur `decided` |
| `server/test/recap.test.ts` | unitaire sur `Evaluation`s | l'invariant `flaggedLoss + drift === chancesLost` ; l'écart ventilé ; le cas signalé-non-compté-`decided` |
| `server/test/report.test.ts` | fold | l'assertion de réconciliation étendue |
| `server/test/danger.test.ts` | unitaire | le parapluie 20 %+ **n'a pas bougé** (test de non-régression) |
| `server/test/confrontation.test.ts` | unitaire | le dénominateur reste les `Counted Move`s |
| `client/test/GameRecap.test.tsx` | composant | le récapitulatif nomme le bon motif dans les deux cas |
| `client/test/severity.test.ts`, `evaluationCurve.test.ts` | composant | glyphe, teinte et marqueur inchangés |

Prior art : `recap.test.ts` et `counted.test.ts` construisent déjà des suites d'`Evaluation`s à
la main pour piloter les chances ply par ply — c'est le moule à réutiliser, pas à réinventer.

**Sommet de la pyramide.** Chaque tranche porte sa **FP** exécutable comme gate d'auto-merge.
La FP la plus importante est celle de la tranche qui livre le barème : conformément à la leçon
enregistrée (`fp-recompute-on-measurement-slices`), elle **recalcule elle-même** les chiffres
attendus sur une partie réelle plutôt que de relire ce que l'app affiche.

**Aucun nouveau HP.** La suite HP est plafonnée à 3 et le barème n'ouvre aucun parcours neuf ;
il modifie des chiffres à l'intérieur de parcours déjà couverts. La suite HP existante tourne
avant la PR `integration → develop` et sert précisément de filet : si un HP se met à échouer,
c'est qu'un chiffre en dur y encodait l'ancien barème.

## Out of Scope

- **Le prédicat d'ADR-0023** (le second axe « montré par la partie »). Explicitement différé :
  le barème modifie son ensemble-cible, livrer les deux ensemble rendrait impossible de dire
  lequel a produit quoi. Son volume résiduel honnête est de 3 coups sur 20 parties.
- **La provenance de méthode sur une lecture scellée** (cf. D7). Constat seul.
- **Tout ajustement de rendu** lié à la densité de glyphes (cf. D7).
- **Le plancher du dénominateur**, qui reste à 10 par décision explicite du demandeur.
- **La provenance du moteur sur une passe** — c'est US-36, une story voisine mais distincte.
- **US-34** (`Coup manqué`), qui ajoute un concept là où celle-ci retune un nombre.

## Further Notes

Toutes les mesures citées sont antérieures à cette story et rejouables :
`.scratch/deepen-per-game-analysis/ARBITRATIONS.md` §B et §C, et `REVIEW.md`. Elles portent sur
deux corpus de dix parties (`DudulSmash`, `Metalyst`) et dix bilans lichess.

Cette story est le premier encaissement de l'argument porteur d'US-15a-bis : **tout est dérivé**
(ADR-0009), donc un changement de méthode coûte un déploiement et zéro seconde de moteur. Si
elle se met à demander une migration, c'est qu'une décision a dérapé — il faut s'arrêter et le
dire, pas migrer.
