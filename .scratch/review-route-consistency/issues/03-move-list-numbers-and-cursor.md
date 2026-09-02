Status: `done` — mergée sur `integration/US-23-review-route-consistency` le 2026-09-01 (FP verte 4/4 : 76 puces numérotées sans écart, 14,4:1 en achromatopsie, 0,00 px de déplacement sur dix pas mesuré sur les 76 puces ; aucun finding bloquant)

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`. ADR : `docs/adr/0022-one-board-one-author.md`.

Implémentée sur la branche d'intégration `integration/US-23-review-route-consistency` — brancher **depuis
elle** et remerger **dans elle** par PR, **pas** `develop`. Auto-merge dès que `npm run build`,
`npm test`, `npm run lint` **et la Feature Path** sont verts.

> **Aucun travail serveur** dans toute cette story, donc **aucune migration**.

## What to build

**Rendre la liste des coups repérable : chaque coup porte son numéro, et le coup regardé se voit** (D4, D5).

**Le numéro (D4).** La liste est une suite plate de **demi-coups**. Y écrire le numéro du coup entier sur
chacun donnerait « 12. Nf3 » puis « 12. Nc6 », ce qui est **faux** : le second est `12…Nc6`. Donc `12.`
sur le demi-coup blanc, `12…` sur le noir, **dans le contrôle du coup** — le nom accessible devient
« 12… Nc6 », donc un joueur au lecteur d'écran entend quel coup il atteint et un joueur qui dicte peut
prononcer ce qu'il lit.

Écarté au grill : le numéro sur le blanc seulement (la notation imprimée) — la liste deviendrait
asymétrique selon la couleur que le joueur joue, un fait étranger à la numérotation. Écarté : grouper par
coup entier — `aria-current` est posé **par demi-coup** et la frontière de `Phase` s'insère **entre** deux
demi-coups en prenant toute la rangée ; un groupe de deux ne se coupe pas en son milieu.

**Le coup courant (D5).** `aria-current="true"` est déjà posé sur la bonne puce et **aucune règle de style
ne le lit** : le joueur au lecteur d'écran sait où il est, celui qui regarde ne le sait pas.

Le motif du projet pour l'écran courant — *« le poids et une bordure, pas la couleur seule »* — **ne se
transpose pas** : la navigation porte huit onglets sur une ligne, la liste en porte quatre-vingts en flex
qui passe à la ligne. Le gras élargit les glyphes, une bordure ajoutée ajoute deux pixels à la boîte ;
dans les deux cas tout ce qui suit se décale et **les rangées se recomposent à chaque flèche** — le défaut
qu'ADR-0021 vient de fermer.

Donc : **la puce courante s'inverse** (encre et fond échangés), et la bordure est présente sur **toutes**
les puces, transparente sauf la courante. La boîte ne change jamais de taille, aucun caractère n'est
ajouté. L'indice n'est pas chromatique au sens d'ADR-0013 — c'est un **négatif**, pas une teinte, et il
reste perceptible sans perception des couleurs. Le nom accessible ne change pas.

**Pas de défilement automatique** vers le coup courant — décision du demandeur, retenue comme garde-fou :
*l'échiquier est l'élément majeur, la liste est un repère*.

La liste vit dans le composant d'échiquier, qui a **deux appelants** (`Analyse` et la route de lecture) :
les deux écrans en héritent **par construction**, il n'y a pas de seconde liste à synchroniser.

## Acceptance criteria

- [x] Chaque demi-coup blanc porte `N.` et chaque demi-coup noir `N…`, le numéro étant celui du coup
      entier auquel il appartient.
- [x] Le numéro est **dans** le contrôle du coup : le nom accessible contient le numéro et le SAN.
- [x] Une partie commençant par un coup noir (position de départ autre) reste correctement numérotée.
- [x] Le coup affiché se distingue visuellement par un renversement encre/fond, et **jamais** par la
      couleur seule.
- [x] La bordure est déclarée sur toutes les puces et transparente hors du coup courant : la boîte d'une
      puce est identique qu'elle soit courante ou non.
- [x] Aucune règle n'introduit de graisse ni de caractère supplémentaire sur la puce courante.
- [x] Les marques existantes de la liste — glyphe de sévérité, marques du joueur, mention « ne compte
      pas », `Evaluation`, frontière de `Phase` — sont inchangées et restent attachées à leur coup.
- [x] Aucun défilement automatique n'est ajouté.
- [x] Les deux écrans qui rendent un échiquier héritent des deux changements sans code propre.

### Feature Path (FP)

1. Sur `Analyse` d'une partie analysée, la liste montre `1.` `1…` `2.` `2…` … jusqu'au dernier coup.
2. Le coup affiché se distingue nettement des autres, et le distinguer ne demande pas de percevoir une
   couleur (le vérifier en niveaux de gris).
3. Avancer de dix coups un à un → à chaque pas, la marque se déplace d'une puce et **aucune puce déjà
   lue n'a changé de position** dans la liste.
4. Ouvrir la route de lecture de la même partie → mêmes numéros, même marque, sans que rien n'y ait été
   ajouté.

Verify: UI d'abord. La stabilité des positions se constate en comparant deux relevés de la liste à deux
plys différents.

## Blocked by

None - can start immediately.
