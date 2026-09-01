Status: `ready-for-agent`

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`.
**ADR : `docs/adr/0022-one-board-one-author.md`** — cette tranche l'implémente.

Implémentée sur la branche d'intégration `integration/US-23-review-route-consistency` — brancher **depuis
elle** et remerger **dans elle** par PR, **pas** `develop`. Auto-merge dès que `npm run build`,
`npm test`, `npm run lint` **et la Feature Path** sont verts.

> **Aucun travail serveur** dans toute cette story, donc **aucune migration**.

## What to build

**Le verdict du joueur sur l'échiquier de sa lecture — et le principe qui interdit d'y mettre celui du
moteur** (D9, ADR-0022).

L'échiquier peint **déjà** la case d'arrivée du coup courant avec la teinte de la sévérité **du moteur**,
sur `Analyse`. Sur la route de lecture cette teinte est absente **par construction** : cet écran ne reçoit
aucune donnée du moteur, et c'est *« toute la garantie qu'il peut honnêtement faire »*. La demande est
donc : le même dispositif, la même case, **avec l'autre auteur**.

**La route de lecture peint la case avec le `Declared severity` du joueur ; `Analyse` garde le moteur.**
Le glyphe reste dans la liste des coups, donc la teinte n'est **jamais** l'unique indice (ADR-0013). Le
dispositif est partagé, la **source** ne l'est pas : la teinte se lit d'une table **par auteur**, et c'est
l'écran qui décide laquelle s'applique — jamais la case.

**Aucune distinction entre un verdict scellé et un verdict postérieur** sur la case : le panneau nomme
déjà la couche dans sa légende, et faire porter cette différence à une teinte serait exactement l'indice
chromatique seul qu'ADR-0013 interdit.

**Cette tranche apporte les deux tokens de couleur qui manquaient.** Les trois sévérités du moteur en ont
un chacune ; `Sound` et `Good` n'en ont **aucun** — la palette n'a jamais eu à peindre un verdict
favorable. Et **`Sound` ne se peint pas en vert vif** : ce n'est pas un compliment, c'est *« j'ai regardé,
je ne trouve rien à reprocher »*. Teinte neutre-froide pour `Sound`, teinte franche pour `Good`. La
tranche 07 les réutilise.

Écarté au grill : un glyphe dessiné sur la case en plus de la teinte — la bibliothèque d'échiquier ne
prend qu'un objet de style par case, et cela poserait une **seconde copie** du glyphe à trois centimètres
de celle de la liste. Écarté : **les deux auteurs sur les deux échiquiers**, l'harmonisation littérale —
`CONTEXT.md` tient les lectures « côte à côte et jamais fondues », et `Declared severity` exige déjà
qu'une vue montrant les deux auteurs les distingue « par une colonne, un titre — jamais par le glyphe
seul ». **Une case n'a ni colonne ni titre : elle n'a qu'une couleur.**

## Acceptance criteria

- [ ] Sur la route de lecture, la case d'arrivée du coup courant est marquée dès qu'un verdict est posé
      sur ce coup, pour **chacune** des cinq valeurs.
- [ ] Les cinq teintes viennent de tokens ; deux tokens sont ajoutés pour `Sound` et `Good`, et `Sound`
      n'est pas peint comme une récompense.
- [ ] Les tokens résolvent dans les deux thèmes, et la pièce posée sur la case garde son encre lisible
      dans les deux — même contrainte que la teinte du moteur.
- [ ] Retirer le verdict retire la marque de la case.
- [ ] Un verdict **postérieur** marque la case exactement comme un verdict scellé.
- [ ] Un verdict posé sur un coup de l'adversaire marque la case comme les autres (le modèle ne distingue
      pas le côté ; c'est l'écran qui dit qu'il ne sera pas compté).
- [ ] Sur `Analyse`, la case continue de porter la teinte **du moteur**, et **aucune** marque du joueur
      n'apparaît sur cet échiquier.
- [ ] Sur la route de lecture, **aucune** donnée du moteur n'atteint l'échiquier.
- [ ] Aucune couleur n'est écrite en dur : l'audit des tokens reste vert.

### Feature Path (FP)

1. Sur une lecture non scellée, poser `Bévue` sur un coup → la case d'arrivée de **ce** coup est marquée
   sur l'échiquier, et le glyphe correspondant est dans la liste.
2. Changer ce verdict pour `Correct` → la case est toujours marquée, **distinctement** de la bévue, et
   sans que la marque ressemble à une récompense.
3. Retirer le verdict → la case n'est plus marquée.
4. Ouvrir `Analyse` de la même partie → l'échiquier montre les marques du moteur et **aucune** du joueur.
5. Sceller la lecture, poser un verdict postérieur sur un autre coup → sa case est marquée comme les
   autres.

Verify: UI d'abord, dans les deux thèmes.

## Blocked by

None - can start immediately.
