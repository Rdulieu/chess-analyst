# US-15a-bis — coutures de test

Principe repris d'US-15a : **toutes les coutures sauf une sont existantes**, et chacune est prise au
point le plus haut possible.

| # | Couture | Art antérieur | Ce qu'elle couvre |
|---|---|---|---|
| 1 | **Fonctions pures de signal** sur des lignes `Evaluation` stockées | `server/test/derivation.test.ts`, `counted.test.ts`, `winning-chances.test.ts` | Les **cinq signaux** de D11, par coup du Player : variation de matériel (deux `fen` consécutives), distance au mat (`mate`), chute en centipions (`cp`), séquence forcée (`pv` / coup légal unique), écart à la deuxième ligne (`cp2`). Sur **tous** les coups, y compris non problématiques (garde-fou n° 1 de D11). |
| 2 | **`gameRecap` inchangé — couture de non-régression** | `server/test/recap.test.ts` | La promesse centrale d'ADR-0023 : le **dénominateur ne bouge pas**. `countedMoves`, `excluded`, `chancesLost`, `flaggedLoss + drift === chancesLost` sont identiques avant et après la story. L'assertion la plus importante du lot. |
| 3 | **Sévérités de l'adversaire** — la même dérivation, l'autre couleur | `server/test/derivation.test.ts` | D12 : dérivées sans temps moteur, **restreintes à la partie encore disputée** (la réserve du demandeur), et **jamais** exposées par l'app. |
| 4 | **Sensibilité de la `Phase`** — les deux lectures du cap côte à côte | `server/test/phase.test.ts` | D14 : combien de coups changent de `Phase` selon la lecture, et l'écart au découpage lichess. Un **compte**, pas un jugement. |
| 5 | **Le rapport re-jouable** — sa fonction, pas son enrobage | `server/test/stats.test.ts`, `confrontation-fold.test.ts` | D7 : une **ligne par coup du Player**, le récapitulatif par partie en étant l'agrégat. Assertion de forme et de cohérence : le rapport appelle `gameRecap` / `moveSeverities` / `countedMoves`, **jamais une copie**. |
| 6 | **Le tracé de dérive** — logique pure et rendu | `client/test/driftTrace.test.ts`, `Board.test.tsx` | D8 : `ceiling = max(total, 100)`, la ligne des 100 % **toujours** dans le cadre, l'échelle graduée, et le cas > 100 % où le trait tombe à `100/total` de la hauteur. |
| 7 | **FP agentique par tranche** | `docs/test-scenarios/`, HP-01 traverse déjà la page Analyse | L'app réelle, UI-first. |

**Une seule couture nouvelle**, et elle est proposée au point le plus haut : le **rapport** (5) est une
fonction exportée qui rend des lignes ; toute forme de CLI ou de sortie fichier n'en est qu'une
enveloppe mince et n'est pas testée séparément. C'est ce qui permet de la tester sans base et sans
moteur, sur les fixtures de `derivation.test.ts`.

## Explicitement hors des tests

- **Les conclusions de la revue ne sont pas des assertions.** Quel signal discrimine, quelle part de
  coups tombe sous le plancher, quelle part de dérive : ce sont des **mesures rendues au demandeur**,
  pas des tests. Les figer en assertions ferait échouer la suite au premier retunage — l'exact
  contraire de la discipline de D2, qui veut qu'un réglage se change à coût nul. Même règle qu'US-15a
  avait appliquée à la mesure MultiPV.
- **Les bilans lichess** sont des données saisies à la main : ils entrent en fixtures, ils ne
  s'assertent pas.
- **Le temps moteur** (~33 min sur vingt parties) est une mesure rapportée, jamais un test.

## La question HP

HP-01 traverse déjà la page Analyse. La tranche 01 (le tracé) s'y **greffe** plutôt que d'ajouter un
quatrième HP — même choix qu'US-14 et US-15a, et la limite de trois HP tient. Les tranches 02 à 05 ne
livrent rien à l'écran et n'ont pas de HP à porter ; la 06, si elle livre un prédicat, se greffe au
même endroit.
