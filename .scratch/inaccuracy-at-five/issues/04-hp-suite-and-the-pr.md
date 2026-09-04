# 04 — Suite HP et PR vers `develop`

Status: ready-for-human

## Parent

`.scratch/inaccuracy-at-five/PRD.md` — US-37 (`BACKLOG.md`).

## What to build

Dernière tranche, **HITL** : c'est la seule décision humaine de la story.

- Faire tourner la **suite HP complète** (`/agentic-tests HP`) sur la branche d'intégration.
  Elle sert ici de filet précis : le barème change des chiffres à l'intérieur de parcours déjà
  couverts, donc **un HP qui échoue signale un chiffre en dur qui encodait l'ancien barème** —
  ce qui est une information, pas seulement une panne.
- **Aucun nouveau HP n'est proposé.** La suite est plafonnée à 3 et cette story n'ouvre aucun
  parcours neuf ; elle retune un nombre dans des parcours existants.
- Ouvrir la PR `integration/US-37-inaccuracy-at-five → develop`, y coller le résultat HP
  (pass/fail + constats), lister les sous-issues incluses, et **ne pas merger**.
- Reporter dans la PR les deux **constats sans action** du PRD, pour que le relecteur les voie
  au lieu de les découvrir : la densité de glyphes (×1,7) et la rétroactivité sur les lectures
  déjà scellées.
- Basculer US-37 en « In review » dans `BACKLOG.md` et y commenter le lien de la PR.

## Acceptance criteria

- [ ] Suite HP passée sur la branche d'intégration, résultat collé dans la PR.
- [ ] Tout HP en échec est analysé : chiffre en dur obsolète (à corriger) ou régression réelle
      (bloquante). Ne jamais assouplir un HP pour le faire passer.
- [ ] La PR liste les sous-issues 01 à 03 et porte les deux constats sans action.
- [ ] `BACKLOG.md` : US-37 en « In review », lien de la PR.
- [ ] Mergeabilité de la PR revérifiée juste avant la remise au relecteur — `BACKLOG.md` est le
      point de collision structurel connu.
- [ ] **L'agent ne merge pas.**

### Feature Path (FP)

Sans objet : cette tranche **est** l'exécution de la suite HP, elle ne se gate pas elle-même.

## Blocked by

- `03-the-band-drops-to-five.md`
