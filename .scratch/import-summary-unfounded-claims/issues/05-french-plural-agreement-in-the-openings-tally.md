# 05 — Accord du pluriel dans le tally d'`/openings`

Status: `needs-triage`

## Constat

Relevé par HP-03 pendant la suite du 2026-08-24. Les noms accessibles du tally de la page
`/openings` accordent au pluriel quel que soit le compte :

> `aria-label="1 victoires, 0 nulles, 1 défaites"`

Faux sur les trois postes pour un compte de 1, et sur les trois pour un compte de 0. Texte destiné
aux lecteurs d'écran uniquement — c'est-à-dire la seule version du tally que certains Players
entendront.

## Cause

Même erreur que celle corrigée sur la ligne de mois de l'import (`339e9b5`) : le test d'accord est
`=== 1` au lieu de `<= 1`. **En français, zéro prend le singulier.** La correction côté import a
extrait un `plural()` local ; ici la règle est réécrite en place.

## Piste

Le correctif est mécanique. La vraie question est **où vit cette règle** : elle est désormais écrite
deux fois, correctement à un endroit, incorrectement à l'autre, et rien n'empêche la troisième copie.
Un helper partagé — même minuscule — la rendrait vraie une fois pour toutes.

À trancher en même temps que [04](./04-the-summary-headline-is-still-english.md) : les deux sont des
symptômes de l'absence de règle sur les textes destinés au Player (langue d'un côté, accord de
l'autre). Les corriger un par un les fera réapparaître ailleurs.
