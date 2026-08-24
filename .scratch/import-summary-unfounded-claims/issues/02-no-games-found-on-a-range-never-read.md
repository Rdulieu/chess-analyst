# 02 — « No games found » sur une plage qui n'a jamais été lue

Status: done

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

## Comments

**2026-08-24 — corrigé, sur demande du demandeur avant le merge d'US-17 (PR #62).**

« Aucune partie trouvée » exige désormais que **tous** les mois de la plage aient abouti. Sinon le
Player reçoit les trois mêmes faits que pour une interruption : ce qui a échoué, que les parties déjà
récupérées sont conservées, et la plage exacte à retaper. Elle part du **premier** mois non répondu et
va jusqu'au bout de la plage — re-récupérer un mois déjà abouti est gratuit (dedup par URL), en
omettre un risque un trou définitif.

**Une décision existante a été rencontrée et n'a pas été rouverte.** Le premier jet énonçait les mois
en échec *même quand l'import avait partiellement réussi*. Un test l'a arrêté : « a partly successful
Import is not a failed one » (`import-range.test.ts`, « consolidates only the months it actually
covered »). C'est une décision, pas un détail, et elle ne fait partie d'aucun des deux findings — le
correctif ne remplace donc la phrase que **quand rien n'est entré**, le cas où elle était fausse.

**Question laissée ouverte au demandeur**, consignée en commentaire dans `range.ts` : une plage à
moitié réussie mérite-t-elle aussi une ligne globale disant quels mois relancer ? Aujourd'hui ses
échecs ne vivent que sur leurs lignes de mois. C'est la même famille de silence que ce finding, un
cas plus loin.

Le message a été **traduit en français** au passage : il était le seul texte anglais que le Player
pouvait lire, alors que celui de la tranche 04 est en français.
