Status: `ready-for-agent`

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`.

Implémentée sur la branche d'intégration `integration/US-23-review-route-consistency` — brancher **depuis
elle** et remerger **dans elle** par PR, **pas** `develop`. Auto-merge dès que `npm run build`,
`npm test`, `npm run lint` **et la Feature Path** sont verts.

> **Aucun travail serveur** dans toute cette story, donc **aucune migration**.

## What to build

**La porte vers la `Confrontation`, là où le scellement la rend possible** (D7).

Le relevé du grill a changé la nature de la demande. Deux manques distincts, et **un seul oppose une
décision** :

- **Après le scellement, aucune porte sur l'écran de lecture.** Vérifié : la `Confrontation` n'est
  mentionnée nulle part sur cette route, l'unique porte étant sur `Analyse`. Le joueur scelle — l'acte
  dont la confirmation dit *« c'est exactement cela qui sera confronté »* — et l'écran le laisse là.
  **Personne ne l'avait décidé.**
- **Avant le scellement, aucune porte nulle part.** Délibéré : rien n'est figé à confronter.

Donc : **après le sceau**, l'écran de lecture offre l'entrée dans la `Confrontation`, en action primaire.
**Avant le sceau**, une **phrase** près de « Sceller ma lecture » dit que la confrontation vient ensuite —
c'est l'idiome du projet, déjà écrit à côté du refus d'une lecture vide : *« "désactivé" tout seul dit
seulement que quelque chose ne va pas, jamais quoi »*. Une phrase, **pas** un bouton grisé.

Ce qui a manqué au demandeur avant le sceau n'était probablement pas de pouvoir confronter une lecture
inachevée, mais de **savoir que ça existe et quand**.

Écarté au grill : ouvrir la `Confrontation` sur une lecture non scellée, ce que la note demande à la
lettre. `CONTEXT.md` définit la `Confrontation` comme tenant **trois lectures côte à côte** dont une
figée : sans le sceau, la lecture bouge pendant qu'on la compare. Si la gêne réelle est « comparer
*pendant* que j'écris », c'est une story de fond et pas un bouton.

L'entrée doit être passée par le même canal que le retour vers `Analyse` — un emplacement que l'écran
n'occupe **pas** quand la partie n'appartient pas au profil courant : un écran qui vient de refuser une
partie ne doit pas, dans la même phrase, offrir une porte vers elle.

## Acceptance criteria

- [ ] Sur une lecture **non scellée**, une phrase près de l'action de sceller annonce que la
      confrontation vient après le scellement.
- [ ] Sur une lecture non scellée, **aucune** porte vers la `Confrontation` n'est offerte.
- [ ] Le scellement fait apparaître l'entrée dans la `Confrontation` **sur cet écran**, en action
      primaire, sans rechargement manuel.
- [ ] L'entrée mène à la `Confrontation` de **cette** partie.
- [ ] Sur une partie qui n'appartient pas au profil courant, ni la phrase ni la porte n'apparaissent.
- [ ] La porte existante sur `Analyse` est inchangée, et les deux ne se contredisent jamais sur l'état de
      la lecture.
- [ ] Le refus d'une lecture vide et le texte de la confirmation de scellement sont inchangés.

### Feature Path (FP)

1. Sur une lecture non scellée portant au moins un verdict, l'écran annonce que la confrontation vient
   après le scellement, et n'offre aucun chemin vers elle.
2. Sceller la lecture → l'entrée dans la `Confrontation` apparaît sur ce même écran, sans y retourner.
3. La suivre → la `Confrontation` de cette partie s'affiche.
4. Revenir à la lecture → l'entrée est toujours là.

Verify: UI d'abord.

## Blocked by

None - can start immediately.
