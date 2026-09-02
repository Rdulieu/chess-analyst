Status: `done` — mergée sur `integration/US-23-review-route-consistency` le 2026-09-01 (FP verte 5/5 aux vraies frappes CDP : carte des 64 cases distincte à chaque pas, 13 plys pour 13 événements en auto-répétition, notices à hauteur constante ; aucun finding bloquant)

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`.

Implémentée sur la branche d'intégration `integration/US-23-review-route-consistency` — brancher **depuis
elle** et remerger **dans elle** par PR, **pas** `develop`. Auto-merge dès que `npm run build`,
`npm test`, `npm run lint` **et la Feature Path** sont verts.

> **Aucun travail serveur** dans toute cette story, donc **aucune migration**.

## What to build

**Les flèches du clavier sur `Analyse` — et l'invariant qui les rend impossibles à activer en silence**
(D6).

Techniquement, activer les flèches sur `Analyse` est **une prop à passer** : le composant d'échiquier la
porte déjà, et le module clavier est déjà neutre (il connaît le focus et les conventions du navigateur,
rien des verdicts). Mais cette prop **viole une règle écrite en commentaire** tant que rien n'est annoncé
sur `Analyse` : *« un raccourci que rien à l'écran ne mentionne n'existe pas, et un raccourci qui marche
là où il n'est jamais mentionné est pire »*. Et la notice de la route de lecture ne se reprend pas telle
quelle : elle annonce le verdict et le moment clé, qui **ne font rien** sur `Analyse` — une notice
promettant trois commandes dont une seule marche est pire que l'absence.

Donc **le composant d'échiquier annonce lui-même les flèches quand elles sont actives**. L'invariant « les
flèches marchent ⟺ elles sont annoncées » devient **structurel** : on ne peut plus activer l'une sans
l'autre, et un troisième appelant en hériterait sans rien savoir.

Conséquence assumée : la notice de la route de lecture **perd la mention des flèches** et se réduit au
verdict et au moment clé — des commandes de *lecture*, non de *navigation*. Le joueur voit toujours les
trois, venues de deux endroits, chacun annonçant ce qu'il possède.

Placement : **sous** les contrôles de pas, jamais au-dessus (ADR-0021), à hauteur constante.

Sur `Analyse`, les flèches restent **inertes tant que le focus est dans le groupe de radios du
`Review mode`** — le groupe garde ses flèches natives, et le contrôle ne rend pas le focus après un choix.
Comportement confirmé par le demandeur : ce n'est pas un défaut à corriger.

La table des commandes de la route de lecture **ne change pas** : cette tranche déplace une annonce, pas
un comportement.

## Acceptance criteria

- [x] Sur `Analyse`, les flèches gauche/droite reculent et avancent d'un demi-coup, aux bornes de la
      partie.
- [x] `Analyse` annonce les flèches, et **n'annonce aucune** commande de verdict ou de moment clé.
- [x] L'annonce des flèches est portée par le composant d'échiquier, de sorte qu'activer le pas au clavier
      sans l'annoncer soit impossible.
- [x] La notice de la route de lecture ne mentionne plus les flèches et mentionne toujours le verdict et
      le moment clé ; l'écran de lecture annonce donc toujours les trois.
- [x] Les annonces sont sous les contrôles de pas et de hauteur constante d'un ply à l'autre.
- [x] Les gardes partagés sont inchangés : un raccourci-clavier du navigateur reste au navigateur, rien
      n'est une commande pendant la saisie d'un texte, un groupe de radios focalisé garde ses flèches.
- [x] Maintenir une flèche continue de parcourir la partie (aucune garde de répétition sur la navigation).
- [x] La table des commandes de la route de lecture est inchangée.

### Feature Path (FP)

1. Sur `Analyse` d'une partie, l'écran annonce les flèches, et n'annonce aucune commande de verdict.
2. Presser la flèche droite trois fois → l'échiquier a avancé de trois demi-coups et la liste suit ;
   flèche gauche → il recule.
3. Choisir un niveau de revue dans le groupe de radios, puis presser une flèche → **le coup ne change
   pas** ; sortir le focus du groupe, presser à nouveau → il change.
4. Commencer à écrire dans un champ de texte de l'application et presser une flèche → le curseur se
   déplace dans le texte, le coup ne change pas.
5. Sur la route de lecture, les trois commandes sont toujours annoncées et fonctionnent.

Verify: UI d'abord, au clavier uniquement.

## Blocked by

- `03-move-list-numbers-and-cursor` — même composant ; séquencées pour ne pas faire collisionner deux
  auto-merges.
