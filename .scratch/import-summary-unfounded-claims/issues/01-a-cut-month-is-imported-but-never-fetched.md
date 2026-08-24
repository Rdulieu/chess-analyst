# 01 — Un mois coupé est importé sans avoir été « récupéré »

Status: `needs-triage`

## Constat

Sur un import dont le flux est coupé en vol, la ligne d'en-tête du résumé peut annoncer **moins de
parties récupérées qu'importées** — mesuré pendant la FP d'US-17-04 :

> `4 games fetched — 5 imported, 0 already present.`

Pour un Player, c'est une contradiction : on ne peut pas garder plus que ce qu'on a reçu.

## Cause

`server/src/import/range.ts` n'additionne `totalFetched` que sur l'événement `month-done` :

```ts
if (event.kind === "month-done") total.totalFetched += event.totalFetched;
```

Le mois dans lequel le flux est mort ne reçoit jamais de `month-done` — il reçoit un
`month-failed`, par construction (on sur-déclare l'incomplétude, US-17-04). Ses parties, elles, sont
bien arrivées, bien insérées et bien comptées dans `imported`. Elles sont donc **importées sans
jamais avoir été récupérées**.

**Antérieur à US-17**, vérifié plutôt que déduit : la ligne est identique au bit près sur
`eb270f6`, et `git log -L` la fait remonter à US-9 (`e09ca0c`) dans cette forme. Ce n'est ni la
tranche 03 ni la 04 qui l'introduit ; elles la rendent seulement visible, en rendant la coupure
détectable et son résumé lisible.

## Piste

`totalFetched` veut dire « ce que la plateforme AVAIT », out-of-scope compris — c'est ce qui empêche
un mois plein de variantes de se lire comme un mois vide. Un mois coupé a eu, au minimum, ce qui est
arrivé. Deux options, à trancher :

- l'adaptateur porte le compte partiel sur `month-failed` aussi (le port dirait alors ce qu'il a vu
  passer même quand le mois échoue) ;
- ou l'Import compte les parties qu'il voit défiler, et `month-done` ne sert plus qu'à corriger vers
  le haut pour l'out-of-scope.

La première garde le sens actuel de `totalFetched` intact et laisse le choix à l'adaptateur, qui est
le seul à savoir combien de lignes il a lues.

## Ne pas confondre avec

Un mois dont **toutes** les parties sont hors périmètre se lit `0 importées` avec un `totalFetched`
global non nul : c'est **voulu** (le résumé montre fetched > imported pour le dire), et c'est un
autre sujet.
