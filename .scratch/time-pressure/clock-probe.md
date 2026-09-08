# Sonde d'horloge — huit parties lichess, 2026-09-08

Relevé brut derrière le tableau des *Faits mesurés* (sept parties en temps réel, plus une en
correspondance qui sert de contre-épreuve) de [`GRILL-NOTES.md`](./GRILL-NOTES.md). Pris
via `https://lichess.org/game/export/<id>?clocks=true&pgnInJson=true&evals=false` — l'endpoint
**par partie**, qui répondait `200` pendant que `/api/games/user` renvoyait dix `429` d'affilée.

`clk_pgn` = nombre de `[%clk]` dans le champ `pgn` ; `clocks` = longueur du tableau JSON ;
`extra` = `clocks - demi-coups`.

| id | cadence | `status` | vainqueur | demi-coups | `clk_pgn` | `clocks` | extra | 3 dernières valeurs du tableau (centisec) |
|---|---|---|---|---|---|---|---|---|
| `00SC2UTQ` | correspondence | `resign` | black | 71 | 0 | **absent** | — | — |
| `4Dkw8g7t` | blitz | `resign` | white | 115 | 115 | 116 | +1 | 6675, 2044, 6289 |
| `022E2AE8` | blitz | `draw` | — | 64 | 64 | 65 | +1 | 1019, 1731, 1019 |
| `0NgTJrIv` | blitz | `timeout` | white | 43 | 43 | 44 | +1 | 10539, 2887, 4653 |
| `0UasbW1C` | blitz | `resign` | black | 64 | 64 | 65 | +1 | 782, 2176, 445 |
| `0dREou8n` | rapid | `mate` | black | 34 | 34 | 34 | +0 | 49259, 29015, 47687 |
| `0eVz9oed` | rapid | `resign` | black | 118 | 118 | 119 | +1 | 35691, 53160, 34850 |
| `16lFtUFO` | rapid | `resign` | white | 55 | 55 | 56 | +1 | 26555, 29959, 25951 |

## Ce que le relevé établit

- **`clk_pgn` == demi-coups dans les sept cas.** La valeur surnuméraire du tableau n'est **jamais**
  dans le PGN.
- **`extra` valait `+1` partout sauf sur le mat**, où il vaut `0`. L'entrée en trop est l'horloge du
  camp au trait quand la partie s'est finie **sans qu'il joue** (abandon, nulle acceptée, départ) ;
  sur un mat, le dernier coup termine la partie et il n'y a personne à relever.
- **La correspondance n'a ni `clock` ni `clocks`** — seulement `daysPerTurn`. Le tableau est
  `absent`, pas vide : la plateforme dit « sans objet ».
- **`status=timeout` n'est pas la chute du drapeau** (ce serait `outoftime`) : c'est le camp qui a
  quitté la partie. Sur `0NgTJrIv` la surnuméraire vaut 46,53 s, cohérent avec un départ et non avec
  un drapeau tombé.

## L'arrondi du PGN, sur `4Dkw8g7t` (blitz 3+2, une des 10 parties lichess analysées)

| tableau `clocks` | 18003 | 18003 | 17971 | 18115 | 6675 |
|---|---|---|---|---|---|
| = secondes | 180,03 | 180,03 | 179,71 | 181,15 | 66,75 |
| `[%clk]` du PGN | 0:03:00 | 0:03:00 | 0:03:0**0** | 0:03:01 | 0:01:0**7** |

Le PGN **arrondit à la seconde la plus proche** (179,71 → 180 ; 66,75 → 67). Une lecture perd
jusqu'à 0,5 s, un temps passé jusqu'à 1 s. Côté chess.com le PGN donne des **dixièmes**
(`0:01:00.8`), donc la dérivation depuis le PGN est **moins précise sur lichess que sur chess.com** —
coût accepté par la décision Q3.

Et le commentaire porte **plusieurs jetons** quand lichess a une analyse : `cm-chess` rend
`commentAfter === "[%eval 0.18] [%clk 0:03:00]"`. Extraire l'horloge est une extraction de jeton.
