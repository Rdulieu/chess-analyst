# 04 — L'en-tête du résumé est encore en anglais

Status: `needs-triage`

## Constat

Relevé par la FP des correctifs 01/02 (2026-08-24). Tout ce que le Player lit autour du résumé est
en français — les lignes de mois (`importées`, `déjà présentes`, `échec`), l'énoncé d'interruption,
et depuis le correctif 02 la phrase « aucune partie trouvée ». L'**en-tête** ne l'est pas :

> `4 games fetched — 4 imported, 0 already present.`

Le correctif 02 a traduit le dernier *énoncé* anglais ; il restait celui-là, plus la ventilation par
cadence (`Bullet: 10  Blitz: 72`) et le tally `45 W · 0 D · 37 L`.

## Cause

`client/src/features/import/ImportSummary.tsx` : les chaînes sont écrites en anglais en dur.

Hors périmètre des findings 01/02, qui portaient sur des affirmations **fausses**, pas sur la langue.

## Piste

Traduire l'en-tête, la ventilation et le tally. Les libellés de cadence passent déjà par
`CADENCE_LABEL`, donc seule la phrase englobante est concernée.

**Question de fond, à trancher avant de traduire au coup par coup** : l'app n'a pas de mécanisme
d'internationalisation et mélange les deux langues selon l'âge du code. Soit on pose la règle « tout
ce que le Player lit est en français » et on rattrape les écarts, soit on introduit un vrai
mécanisme. Ce finding est un symptôme de l'absence de règle, pas seulement trois chaînes à traduire.
