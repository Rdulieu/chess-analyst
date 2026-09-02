Status: `done` — mergée sur `integration/US-23-review-route-consistency` le 2026-09-01 (FP verte 4/4 ; un finding de la FP corrigé dans la tranche : le helper `selectProfile` de la bibliothèque encodait l'ancien comportement)

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`. ADR : `docs/adr/0022-one-board-one-author.md`.

Implémentée sur la branche d'intégration de la story métier `integration/US-23-review-route-consistency` —
brancher **depuis elle** et remerger **dans elle** par PR, **pas** `develop`. Auto-merge dès que le check
local est vert : `npm run build`, `npm test`, `npm run lint`, **et la Feature Path de cette issue**.

> **Aucun travail serveur dans toute cette story** : ni route, ni contrat, ni dérivation, ni schéma —
> **donc aucune migration**. Une tranche qui se retrouve à toucher `server/` est une tranche qui a dérivé.

## What to build

**Fermer la boucle de navigation entre un profil, ses parties et son import** (D1, D3).

Cliquer le nom d'un profil ne fait pas ce que le joueur croit : il navigue vers la page du profil, et
*sélectionner* est un second geste ailleurs sur la ligne. Et il n'existe aucune route « liste des parties
d'un profil donné » — « Mes parties » est la racine, rendue pour le profil **courant** (ADR-0014).

Trois portes, chacune du bon type :

- **« Sélectionner » devient un acte composé** : il enregistre le profil courant, **puis** mène à « Mes
  parties ». Une mutation suivie d'une navigation est un acte, donc un bouton — **nommé**, au lieu d'être
  caché sous un nom propre.
- **Le nom du profil reste un lien** vers la page du profil : il navigue, il est un lien. Sa page garde
  l'import et les compteurs.
- **« Voir mes parties »** rejoint « Importer mes parties » dans l'en-tête : le profil courant n'a pas de
  bouton « Sélectionner » (sa ligne dit « Profil actuel »), donc c'est là qu'est sa porte.
- **« Mes parties » gagne une porte vers l'import** : un lien-action vers la page du profil courant avec
  le fragment `#import`. L'import est une opération **sur** un profil (ADR-0014) et son formulaire ne se
  déplace pas ; c'est la porte qui navigue, et l'existant donne déjà le focus au formulaire quand le
  fragment est présent.

Écarté au grill : servir la liste des parties sous la route du profil — cela contesterait ADR-0014 (« la
seule route portant un id, délibérément ») et dédoublerait « Mes parties » à deux adresses.

## Acceptance criteria

- [x] « Sélectionner » enregistre le profil comme courant **et** mène à « Mes parties » ; le libellé dit
      les deux moitiés du geste.
- [x] Le nom du profil reste un lien vers la page du profil, sans marqueur d'action.
- [x] L'en-tête de la liste des profils porte « Voir mes parties » à côté de « Importer mes parties », et
      n'apparaît, comme elle, que lorsqu'un profil est courant.
- [x] Le nom accessible des deux boutons d'en-tête **contient** leur libellé visible et nomme le profil
      (WCAG 2.5.3), comme le fait déjà celui de l'import.
- [x] « Mes parties » porte une porte vers l'import du profil courant, qui atteint le formulaire et lui
      donne le focus.
- [x] Cette porte est offerte **aussi** quand le profil a déjà des parties — la phrase de l'état vide
      reste ce qu'elle est et n'est pas dédoublée.
- [x] Supprimer le profil courant continue de ne laisser **rien** de sélectionné, et les portes d'en-tête
      disparaissent avec lui.
- [x] Aucune route nouvelle ; la liste des parties reste rendue pour le profil courant.

### Feature Path (FP)

1. Avec deux profils dont un courant, sélectionner l'autre → on est sur « Mes parties », et le bandeau
   nomme le profil qu'on vient de choisir.
2. Revenir à la liste des profils, suivre le nom du profil courant → on est sur **sa page**, avec ses
   compteurs et son import.
3. Depuis la liste des profils, suivre « Voir mes parties » → « Mes parties » du profil courant.
4. Depuis « Mes parties », suivre la porte d'import → le formulaire d'import de **ce** profil, prêt à la
   saisie sans avoir à le chercher.

Verify: UI d'abord. La sélection est aussi observable au rechargement (le profil choisi est toujours le
courant).

## Blocked by

None - can start immediately.
