Status: `done` — mergée sur `integration/US-23-review-route-consistency` le 2026-09-01. Check local vert (build, 411 + 843 + 105 tests, lint 0). **FP non jouée séparément** : couverte par la suite HP lancée pour la PR — F1 par HP-01, F2 et F3 par HP-03.

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`.

Implémentée sur la branche d'intégration `integration/US-23-review-route-consistency` — brancher **depuis
elle** et remerger **dans elle**. Auto-merge dès que `npm run build`, `npm test`, `npm run lint` **et la
Feature Path** sont verts.

> **Aucun travail serveur**, donc **aucune migration**. Les données sont saines : vérifié le 2026-09-01,
> l'API sert bien les deux couches de la lecture 166 (7 marques scellées, 2 postérieures).

## What to build

**Trois retours de la première passe du demandeur sur l'app livrée** (2026-09-01), tous sur la route de
revue et donc dans le sujet de cette story.

### F1 — « Importer » et « Analyser » sur une seule rangée

Sur « Mes parties », la porte d'import et « Analyser la sélection » sont deux blocs **frères empilés** :
un `<p data-part="actions">` puis un `<button>` nu. Ils occupent deux rangées pour deux actions courtes.
La règle d'écart existe depuis la tranche 05 (`[data-part="actions"]` est un flex qui passe à la ligne) —
il suffit que les deux actions soient **dans la même rangée**, ce qui rend aussi la page cohérente avec
l'en-tête de `/profiles`, où les deux portes partagent déjà une rangée.

### F2 — Le verdict scellé n'est pas visible là où on le cherche

Le demandeur : *« je ne vois pas les anciens verdicts dans la section "Mon verdict, après le scellement",
seuls les nouveaux sont visibles. »*

Ce n'est **pas** un défaut de données : l'API sert les deux couches, et `SealedMarkReadout` affiche bien
le verdict scellé. Le défaut est de **placement**. Le commentaire du code affirme *« beside — never
replaced by — what has been written since »* ; à l'écran ce rappel est quatre blocs plus bas, après
l'éditeur de note, l'action de sceller et la notice clavier. L'intention est écrite et la mise en page ne
la tient pas.

**Le rappel du verdict scellé rejoint le contrôle**, sous ses cinq rangées, sur **une seule ligne et
toujours rendue** — y compris quand rien n'avait été écrit sur ce coup avant le sceau. Toujours rendue,
parce qu'un bloc conditionnel ferait varier la hauteur du fieldset d'un ply à l'autre : exactement ce que
l'assertion 7 mesure à zéro pixel.

`SealedMarkReadout` **ne bouge pas** et garde la note et le moment clé : c'est le bloc dont la hauteur
varie pour de bon, et il est en bas *par décision mesurée* (ADR-0021). Ce qui rejoint le contrôle est la
ligne de **comparaison**, pas le rappel complet.

### F3 — Le rappel du coup courant porte son numéro

Le demandeur : *« j'aimerais que le numéro du coup s'affiche devant le rappel, ex : 23.Bxh5 au lieu de
juste Bxh5. »*

Le relevé sous les contrôles de pas (`aria-label="current move"`) rend le SAN **seul**. La tranche 03 a
numéroté la liste et a laissé ce relevé — or c'est le même besoin et la même règle (D4) : « le coup 23 »
doit être trouvable sans compter. Il reste **une ligne dans tous les états** (ADR-0021), et il vit dans le
composant d'échiquier, donc les **deux écrans** en héritent.

La position de départ reste ce qu'elle est : elle n'est le coup de personne, donc elle ne porte pas de
numéro.

## Acceptance criteria

- [x] Sur « Mes parties », la porte d'import et « Analyser la sélection » sont sur **une seule rangée**,
      et passent à la ligne plutôt que de déborder sur un écran étroit.
- [x] L'état désactivé de « Analyser la sélection » est inchangé, et la porte d'import garde son
      marqueur d'action et son nom accessible.
- [x] Après le sceau, le contrôle de verdict porte, sous ses rangées, le verdict **scellé** de ce coup.
- [x] Cette ligne est rendue **dans tous les états**, y compris quand rien n'avait été écrit avant le
      sceau, et la hauteur du fieldset ne varie donc pas d'un ply à l'autre.
- [x] Avant le sceau, cette ligne n'existe pas : il n'y a pas de couche scellée à rappeler.
- [x] `SealedMarkReadout` reste où il est et garde la note et le moment clé.
- [x] Le relevé du coup courant affiche `N.` ou `N…` devant le SAN, sur les deux écrans.
- [x] Le relevé reste **une seule ligne dans tous les états**, et la position de départ ne porte pas de
      numéro.
- [x] L'assertion de déplacement nul reste verte : parcourir les plys ne déplace ni les contrôles de pas
      ni le contrôle de verdict.

### Feature Path (FP)

1. Sur « Mes parties » d'un profil ayant des parties, les deux actions sont côte à côte sur une rangée ;
   à 380 px elles passent à la ligne sans rien faire déborder.
2. Sur une lecture **scellée** portant un verdict sur un coup, ce verdict est lisible **dans** la section
   « Mon verdict, après le scellement », et un verdict postérieur posé sur le même coup ne le remplace pas.
3. Sur un coup de cette même lecture où rien n'avait été écrit avant le sceau, la ligne le dit — et la
   hauteur du contrôle est la même que sur le coup précédent.
4. Sur une lecture **non scellée**, aucune ligne de rappel n'apparaît.
5. Le relevé sous les contrôles de pas lit `23.Bxh5` (numéro puis SAN) sur la route de lecture **et** sur
   `Analyse`, et `Start` à la position de départ.
6. Parcourir dix plys ne déplace ni les contrôles de pas ni le contrôle de verdict.

Verify: UI d'abord, dans les deux thèmes.

## Blocked by

None — les sept tranches précédentes sont mergées.
