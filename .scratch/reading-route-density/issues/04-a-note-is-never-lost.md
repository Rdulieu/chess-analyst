Status: `ready-for-agent`

## Parent

`.scratch/reading-route-density/PRD.md` (US-22 — `BACKLOG.md`, grillée le 2026-08-27).
ADR : `docs/adr/0021-what-the-player-acts-on-never-moves.md`.

Implemented on the business-story integration branch `integration/US-22-reading-route-density` —
branch sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local
check (build + tests + this issue's Feature Path) is green.

## What to build

**Une `Note` tapée ne se perd plus.**

Aujourd'hui le brouillon est un état local, remis à la valeur stockée dès que le ply change : **taper
une note puis cliquer « coup suivant » la perd, en silence**. Rien n'avertit, rien ne retient. C'est
une perte de données, sur la seule partie de l'écran où le joueur *pense* — et c'est le vrai grief,
pas le clic de trop.

La `Note` **se valide en quittant le champ ou en changeant de coup**. Cela rouvre le critère 20
d'US-16a, qui demandait déjà « enregistrée au fil de l'eau » et que le bouton explicite lisait
strictement. On ne stocke pas chaque frappe : « une phrase en cours de composition » reste vraie
pendant qu'on l'écrit, et fausse dès qu'on la quitte.

Ce qui ne change pas : l'écriture passe par le chemin existant, l'**effacement reste explicite**, et
un texte vide reste une effacement — *le silence n'est pas une valeur*.

L'écran **dit** que la note est enregistrée, et le dit **à hauteur constante** : une confirmation qui
apparaît puis disparaît recréerait exactement le défaut que la tranche 02 vient de fermer (ADR-0021).

## Acceptance criteria

- [ ] Une note tapée puis suivie d'un changement de coup est **conservée**, sans aucun clic
- [ ] Une note tapée puis suivie d'une sortie du champ est conservée
- [ ] L'écran dit que la note est enregistrée
- [ ] Cette confirmation **ne déplace rien** — hauteur constante, sous les contrôles
- [ ] Un texte vidé efface la note, comme aujourd'hui
- [ ] L'effacement explicite reste possible et ne touche pas le verdict posé à côté
- [ ] Après scellement, une note écrite va bien dans la couche postérieure, comme aujourd'hui
- [ ] La note d'un coup ne suit pas le joueur sur le coup suivant
- [ ] L'assertion 7 reste verte

### Feature Path (FP)

1. J'écris une note puis je passe au coup suivant sans rien cliquer → je reviens, elle est là.
2. J'écris une note puis je clique ailleurs sur l'écran → elle est enregistrée, et l'écran me le dit.
3. Pendant qu'il me le dit, rien n'a bougé sur l'écran.
4. J'efface une note → elle disparaît, et le verdict posé à côté reste intact.

Verify: UI d'abord — ce que l'écran montre au retour sur le coup.

## Blocked by

- `.scratch/reading-route-density/issues/02-what-the-player-clicks-stops-moving.md` — la confirmation d'enregistrement est précisément le genre de bloc que la garde doit surveiller
