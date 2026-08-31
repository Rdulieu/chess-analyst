Status: `done` — mergée sur `integration/US-22-reading-route-density` le 2026-08-28 (FP verte ; un vrai bug d'adressage trouvé par la FP et corrigé dans la tranche)

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

- [x] Une note tapée puis suivie d'un changement de coup est **conservée**, sans aucun clic
- [x] Une note tapée puis suivie d'une sortie du champ est conservée
- [x] L'écran dit que la note est enregistrée
- [x] Cette confirmation **ne déplace rien** — hauteur constante, sous les contrôles
- [x] Un texte vidé efface la note, comme aujourd'hui — **lu au sens de « comme aujourd'hui »**, qui
  est la moitié du critère qui décide : aujourd'hui le bouton `Enregistrer` est *désactivé* sur une
  boîte vide, donc vider ne supprime rien et la suppression passe par son propre bouton. C'est ce qui
  a été livré. La lecture littérale — vider puis quitter efface — a été **écartée**, et pas par
  confort : elle transformerait un select-tout-supprime suivi d'un clic ailleurs en effacement
  silencieux, c'est-à-dire exactement la perte de données que la tranche ferme, en sens inverse. Le
  PRD tient les deux bouts (« l'effacement reste explicite » **et** « un texte vide reste un
  effacement ») ; le second décrit la règle du *chemin d'écriture*, inchangée côté serveur, pas ce
  que déclenche une boîte vidée. À trancher par le demandeur s'il voulait la lecture littérale.
- [x] L'effacement explicite reste possible et ne touche pas le verdict posé à côté
- [x] Après scellement, une note écrite va bien dans la couche postérieure, comme aujourd'hui
- [x] La note d'un coup ne suit pas le joueur sur le coup suivant
- [x] L'assertion 7 reste verte

### Feature Path (FP)

1. J'écris une note puis je passe au coup suivant sans rien cliquer → je reviens, elle est là.
2. J'écris une note puis je clique ailleurs sur l'écran → elle est enregistrée, et l'écran me le dit.
3. Pendant qu'il me le dit, rien n'a bougé sur l'écran.
4. J'efface une note → elle disparaît, et le verdict posé à côté reste intact.

Verify: UI d'abord — ce que l'écran montre au retour sur le coup.

## Blocked by

- `.scratch/reading-route-density/issues/02-what-the-player-clicks-stops-moving.md` — la confirmation d'enregistrement est précisément le genre de bloc que la garde doit surveiller

## Ce qui reste ouvert à la livraison

**Un rechargement de page, ou la fermeture de l'onglet, le curseur encore dans le champ, perd la
note en silence.** Mesuré par la FP du 2026-08-28 : rien n'est écrit, la boîte est vide au retour.
C'est le **seul** chemin de sortie qui ne valide pas — la FP a essayé le flou, `Previous`, `Next`,
un clic dans la liste des coups, et la navigation hors de l'écran, qui valident tous.

Il n'est **pas** corrigé ici, et pour une raison de périmètre plutôt que de coût : le fermer demande
`sendBeacon`, qui ne sait faire que du POST, donc une route serveur — et le PRD écrit noir sur blanc
qu'US-22 est **entièrement front, aucun changement serveur**. La formulation à l'écran est honnête
sur ce qu'elle promet (« Enregistrée **en quittant le champ** »). Porté à la PR d'intégration comme
manque nommé, au demandeur d'en décider.
