# Un échiquier, un auteur

Sur `Analyse`, la case d'arrivée du coup courant porte la teinte de la sévérité **mesurée par le
moteur** (`Board.tsx`, `SEVERITY_SQUARE_TINT`). Sur la route de lecture, cette teinte est absente **par
construction** : `PersonalReading` ne passe ni `annotations`, ni `detailed`, ni `recap` — « toute la
garantie que cet écran peut honnêtement faire ». Le premier usage réel a demandé que le verdict du
joueur se voie aussi sur l'échiquier.

**Décision : chaque échiquier peint un seul auteur — le sien.** La route de lecture peint la case
d'arrivée avec la teinte du `Declared severity` du joueur ; `Analyse` garde celle du moteur. Le glyphe
reste dans la liste des coups (`MoveMarks`), donc la teinte n'est jamais l'unique indice (ADR-0013).
Aucune distinction n'est faite entre un verdict scellé et un verdict postérieur : le panneau nomme déjà
la couche dans sa légende, et faire porter cette différence à une teinte de case serait exactement
l'indice chromatique seul qu'ADR-0013 interdit.

L'alternative était vivante et c'est le demandeur qui l'avait formulée : « harmoniser partout où on voit
un board et une liste de coups ». Elle est écartée dans sa lecture forte — les deux auteurs sur les deux
échiquiers — parce que `CONTEXT.md` tient les lectures « côte à côte et **jamais fondues** », et parce
que `Declared severity` exige déjà qu'une vue montrant les deux auteurs les distingue « par autre chose
que la couleur — une colonne, un titre — jamais par le glyphe seul, qui est par construction
identique ». Une case n'a ni colonne ni titre : elle n'a qu'une couleur. **L'échiquier n'est donc pas la
vue où les deux auteurs se rencontrent**, et le faire devenir cette vue est une story, pas une tranche.

Ce que la consigne d'harmonisation veut dire, une fois cette limite posée : **le même dispositif
partout, chaque écran le remplissant avec ce qu'il a le droit de montrer.** Un repère sans auteur — le
numéro du coup, l'indicateur du coup courant — s'harmonise littéralement, à l'identique. Une
affirmation avec un auteur s'harmonise dans sa **forme** et jamais dans son contenu.

## Conséquences

- **Le dispositif de la case est partagé, la source ne l'est pas.** La teinte se lit d'une table par
  auteur ; les deux tables donnent les mêmes couleurs pour les trois sévérités communes, ce qui est
  voulu — le vocabulaire partagé va « jusqu'au glyphe » (`CONTEXT.md` → `Declared severity`). C'est
  l'écran qui décide quelle table s'applique, jamais la case.
- **`Correct` et `Bon` demandent deux teintes qui n'existaient pas.** La palette n'avait jamais eu à
  peindre un verdict favorable. `Correct` ne se peint pas en vert vif : ce n'est pas un compliment, mais
  « j'ai regardé, je ne trouve rien à reprocher ».
- **Un futur écran de `Confrontation` coup par coup ne peut pas se contenter de cette teinte.** C'est la
  pente naturelle d'US-16b, et c'est précisément le cas que cet ADR refuse de traiter en passant : il
  devra apporter sa colonne ou son titre. Le retour du 25/08 le réclame six fois ; ce n'est pas cette
  story.
- **Le mot « annotation » ne désigne jamais la couche du joueur.** `CONTEXT.md` l'écarte déjà sous
  `Personal analysis` et sous `Note` ; il l'écarte désormais aussi sous `Declared severity`, avec
  `Evaluation`. Confondre les deux mots ici mènerait à mettre le relevé du moteur sur l'échiquier de la
  lecture personnelle — l'inverse exact de la décision.
