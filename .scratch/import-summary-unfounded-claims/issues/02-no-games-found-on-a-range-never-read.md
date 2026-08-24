# 02 — « No games found » sur une plage qui n'a jamais été lue

Status: `needs-triage`

## Constat

Une plage refusée en `500` par la plateforme affiche, mesuré pendant la FP d'US-17-04 :

> `No games found for 2024-01 to 2024-03 in the selected time control categories.`

Aucun mois n'a été répondu. La phrase affirme quelque chose sur ce que la plage **contenait**, alors
que rien de la plage n'a été lu. Le Player peut en conclure qu'il n'a pas joué sur ces mois — la
seule conclusion fausse disponible ici — au lieu de conclure que la plateforme n'a pas répondu.

Les lignes de mois disent bien `échec : Lichess request failed (500)`, donc l'information est à
l'écran ; c'est la phrase globale qui la contredit.

## Cause

`server/src/import/range.ts`, en fin d'import :

```ts
if (cutIn !== null) total.message = interrupted(...);
else if (total.imported === 0 && total.alreadyPresent === 0) {
  total.message = `No games found for ... in the selected time control categories.`;
}
```

US-17-04 a donné cette protection à la **troncature** : « une plage dont la réponse a été coupée n'a
jamais été lue en entier, dire qu'elle ne contient rien serait sans fondement ». Le raisonnement
vaut mot pour mot pour une plage refusée avant le premier octet — elle n'a pas été lue **du tout**.
La tranche a réduit le cas plutôt qu'elle ne l'a créé : **antérieur**, la branche était un `if`
inconditionnel sur `eb270f6`.

## Piste

Ne dire « aucune partie trouvée » que si **tous** les mois de la plage ont abouti. Sinon, la phrase
globale doit parler de ce qui a échoué, pas de ce qui a été trouvé. La forme d'US-17-04 (où ça
s'arrête, ce qui est conservé, quoi relancer) est probablement la bonne base.

## Pourquoi c'est déposé ici

Le défaut est **assis sur le raisonnement d'US-17-04 lui-même** et mérite sa propre décision : la
tranche 04 avait à traiter la coupure, pas le refus. Déposé sous son propre slug pour ne pas mourir
avec la story.
