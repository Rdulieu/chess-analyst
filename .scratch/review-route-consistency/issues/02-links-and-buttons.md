Status: `ready-for-agent`

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`. ADR : `docs/adr/0022-one-board-one-author.md`.

Implémentée sur la branche d'intégration de la story métier `integration/US-23-review-route-consistency` —
brancher **depuis elle** et remerger **dans elle** par PR, **pas** `develop`. Auto-merge dès que le check
local est vert : `npm run build`, `npm test`, `npm run lint`, **et la Feature Path de cette issue**.

> **Aucun travail serveur dans toute cette story** : ni route, ni contrat, ni dérivation, ni schéma —
> **donc aucune migration**.

## What to build

**Généraliser une règle que le projet a déjà écrite et n'applique qu'à un seul élément** (D2).

`_controls.scss` porte la règle : *« un lien qui porte `data-action` est une **action** que le joueur
prend, et doit se lire comme telle — même si naviguer est ce qu'il fait, donc une ancre est ce qu'il reste
(clic-milieu, "ouvrir dans un nouvel onglet" et la barre d'état continuent de marcher) »*. Elle ne sert
que « Importer mes parties ». Ce qui manquait n'est donc pas une règle mais **sa généralisation** : c'est
un changement d'**apparence**, jamais de type d'élément — sauf pour le seul élément dont le type est faux.

**Reçoivent le marqueur d'action** (des actes qui se lisaient comme du texte) : l'entrée dans la lecture
personnelle et l'entrée dans la `Confrontation` depuis `Analyse`, la reprise de lecture pour sceller, et
les deux retours vers l'analyse de la partie.

**Change de type** : la ligne de partie, seul contrôle qui navigue par programme. Elle devient un lien
**nu**, sans marqueur d'action — il navigue, et le styler en contrôle mettrait un pavé dans chacune des
lignes d'un tableau dense. La cible reste **le nom de l'adversaire**, ce qui est déjà le cas.

**Ne bougent pas** : les liens en pleine phrase (« …importez son historique ») et le bandeau de profil. Un
lien dans une phrase est un lien.

Écarté au grill : transformer les actes en boutons + navigation par programme, ce que la note du demandeur
dit à la lettre. Cela contredirait la règle, perdrait les gestes du navigateur, et ferait de la seule
vraie anomalie la norme.

## Acceptance criteria

- [ ] Les cinq actes listés portent le marqueur d'action et **restent des ancres**.
- [ ] Le nom de l'adversaire, dans la liste des parties, est une ancre vers l'analyse de la partie — plus
      aucune navigation par programme depuis un contrôle.
- [ ] Ce lien-là est **nu** : il ne porte pas le marqueur d'action, et la ligne du tableau ne gagne pas de
      contrôle en hauteur.
- [ ] Le reste de la ligne (date, résultat, cadence, états) n'est pas cliquable, et la case à cocher de
      sélection fonctionne sans déclencher la navigation.
- [ ] Les liens en pleine phrase et le bandeau de profil sont inchangés.
- [ ] Aucun libellé ne change : cette tranche ne touche qu'apparence et type d'élément.
- [ ] La feuille de style compilée montre que le marqueur d'action donne l'apparence d'un contrôle, et le
      test n'épingle aucune couleur.

### Feature Path (FP)

1. Sur `Analyse` d'une partie sans lecture, l'entrée dans la lecture se lit comme un contrôle et non comme
   du texte ; l'ouvrir dans un nouvel onglet fonctionne.
2. Sur `Analyse` d'une partie à lecture scellée, l'entrée dans la `Confrontation` se lit de même et
   s'ouvre aussi dans un nouvel onglet.
3. Dans la liste des parties, ouvrir le nom de l'adversaire dans un nouvel onglet → l'analyse de **cette**
   partie s'y ouvre, et l'onglet d'origine n'a pas navigué.
4. Cocher la case de sélection d'une ligne → la sélection se fait et **aucune** navigation n'a lieu.
5. Sur un profil sans partie, la phrase « …importez son historique » est toujours un lien de texte dans sa
   phrase.

Verify: UI d'abord ; l'ouverture dans un nouvel onglet est l'observation qui distingue une ancre d'un
contrôle, et c'est le cœur de cette tranche.

## Blocked by

None - can start immediately.
