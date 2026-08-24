# 03 — Un mois en échec cache les parties qu'il a quand même importées

Status: done

## Constat

Relevé par la FP des correctifs 01/02 (2026-08-24). Un mois qui porte un `failure` affiche
**uniquement** l'échec, jamais les parties qu'il a malgré tout importées :

> `2026-02 — échec : lichess.org a interrompu sa réponse avant la fin…`

alors que ce mois-là **avait importé une partie**, comptée dans l'en-tête (`2 games fetched — 2
imported`). La ligne du mois sous-déclare donc ce qui est entré, et l'en-tête et les lignes ne se
réconcilient plus : le Player qui additionne les lignes n'arrive pas au total.

## Cause

`client/src/features/import/ImportSummary.tsx`, `MonthLine` : le ternaire est exclusif.

```tsx
{failed ? `échec : ${line.failure}` : `${line.imported} importée…, ${line.alreadyPresent} déjà présente…`}
```

**Antérieur** aux correctifs 01/02, qui n'ont pas touché ce composant. Devenu observable parce que
la tranche 03 d'US-17 rend une coupure de flux détectable : avant, un mois partiellement importé se
rapportait à zéro sans échec.

## Piste

Dire les deux : ce qui est entré **et** que le mois est incomplet. Le mot `échec` doit rester (c'est
le repère non chromatique), mais il n'a pas à effacer le chiffre. Quelque chose comme
`2026-02 — 1 importée, 0 déjà présente · échec : …`.

À trancher : est-ce qu'un mois qui a partiellement réussi est encore « en échec » pour le Player, ou
« incomplet » ? Le vocabulaire suit la réponse. Voir aussi la question ouverte de
[02](./02-no-games-found-on-a-range-never-read.md) — une plage à moitié réussie mérite-t-elle un
énoncé global ? — dont celle-ci est la version « par mois ».

## Comments

**2026-08-24 — corrigé, sur demande du demandeur avant le merge d'US-17 (PR #62).**

Un mois en échec **qui a reçu quelque chose** dit désormais les deux faits :

> `2024-04 — 3 importées, 1 déjà présente · échec : lichess.org a interrompu sa réponse avant la fin`

**Le chiffre n'apparaît que si quelque chose est arrivé**, et c'est la vraie décision de ce
correctif. Écrire `0 importées` à côté de `échec` rendrait exactement l'ambiguïté que le repère
d'échec supprime : un zéro veut dire « tu n'as pas joué », un échec veut dire « on ne sait pas », et
les deux ne doivent pas se ressembler. Un mois en échec qui n'a rien reçu se lit donc comme avant.

**La question de vocabulaire a été tranchée par le demandeur le 2026-08-24 : « incomplet ».** Un mois
partiellement rempli se lit désormais `2024-03 — 2 importées, 0 déjà présente · incomplet : …`, et
`échec` est réservé au mois qui n'a **rien** reçu. Deux mots pour deux états, et la différence est ce
que le Player a déjà en main : `incomplet` = il en a une partie, `échec` = il n'en a rien. Les
confondre jetterait une information sur laquelle il peut agir, et les deux restent distincts du zéro
franc d'un mois sans partie.

**Le contrecoup n'était pas dans le code mais dans l'outil d'audit.** La règle de repère non
chromatique de `theme-audit.js` était calée sur `/échec/` seul : sur un résumé dont les mois en
défaut sont tous partiels, elle n'aurait trouvé **aucun sujet** et se serait lue comme un succès.
Elle accepte les deux mots depuis, et les trois scénarios qui citaient « échec » sont corrigés avec
elle.

La version « globale » de la même question est tranchée aussi, dans
[02](./02-no-games-found-on-a-range-never-read.md) : oui, une plage à moitié réussie nomme la période
à relancer.
