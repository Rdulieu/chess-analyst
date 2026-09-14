# 05 — Sur la page `Analyse`, aux niveaux moteur seulement

**What to build:** la même information sur `/analyse/:id`, pour que le joueur voie ce qui lui a été
offert **sans avoir à sceller une lecture** — 77 parties analysées contre 3 lectures scellées.

- Visible à partir du niveau **`annotated`**, et à `detailed`. **Jamais en `unaided`** : ce mode est
  aveugle par décision, et faire fuiter une mesure côté adverse le viderait de son sens.
- **Minimal** : l'information se pose là où la page dit déjà ce que le moteur pense, sans nouveau
  panneau, sans nouvelle colonne si une existante suffit.
- La **légende de la route de lecture** est neutralisée : elle ne doit rien laisser fuiter sur la
  partie en cours. La route est aveugle par nature ; sa légende ne peut pas être ce qui la trahit.
- Mêmes règles qu'à la tranche 04 : mots importés et non retapés, la couleur jamais seule, aucun
  glyphe ajouté à la courbe.

Implémenté sur la branche d'intégration `integration/US-30-judge-the-opponent`.

**Blocked by:** 04

**Status:** ready-for-agent, done

- [x] En `unaided`, **rien** de la mesure adverse n'est rendu — ni texte, ni glyphe, ni attribut, ni
      classe, ni donnée dans le DOM. Test ancré : c'est la fuite qu'on empêche, pas l'affichage
- [x] En `annotated` et `detailed`, l'`Opportunity` est visible sur les plis adverses
- [x] L'ajout est minimal : aucun nouveau panneau, aucune nouvelle colonne si une suffit
- [x] La légende de la route de lecture ne mentionne rien qui fuite, et un test le vérifie
- [x] La couleur n'est jamais le seul indice ; mots et glyphes importés des modules qui les possèdent
- [x] Aucune régression sur la page `Analyse` : sévérités du joueur, courbe, récap, ruban de `Phase`s

### Feature Path (FP)

1. Ouvrir `/analyse/:id` sur une partie analysée réelle en `unaided` → rien de la mesure adverse
   n'apparaît ; inspecter le DOM autour d'un pli adverse fautif : **rien** n'y est non plus
2. Passer en `annotated` → l'`Opportunity` apparaît sur ce pli, avec son mot
3. Passer en `detailed` → toujours présente, et le récap montre son bloc
4. Ouvrir la route de lecture sur une partie non lue → la légende ne dit rien de la partie en cours
5. Revenir en `unaided` → l'information disparaît à nouveau

Verify: l'étape 1 se vérifie **dans le DOM**, pas à l'œil — une information rendue invisible en CSS
reste une fuite.

---

**done** — 2026-09-15, mergée dans `integration/US-30-judge-the-opponent` (PR #127, `MERGE_REF`).

Porte : build **0**, suite **verte** (serveur 626/626, client 1021/1021), `npm run lint` sorti
**0**, FP **verte 5/5**, aucun finding bloquant ouvert.

Seams déclarés (ADR-0027) — **aucun seam neuf** :
- le rendu de `GameViewer` sur une réponse d'annotations fabriquée (l'interdit `unaided` et les
  deux niveaux moteur), le seam où vivent déjà les tests du `Review mode` ;
- `GameRecapReadout` rendu sur un `GameRecap` fabriqué, le seam des tests de récap, pour l'opt-in
  et le bloc nommé ;
- le rendu de `PersonalReading` sur une lecture fabriquée, pour la légende neutralisée et
  l'absence de fuite sur toute la route.

Ce que la tranche a trouvé et que la 04 ne pouvait pas voir : la liste des coups a **deux** mises
en page — flux de puces (`Analyse`, route de lecture) et grille à deux auteurs
(`Confrontation`) — écrites deux fois. La 04 n'a donc atteint que la grille, et l'écran pour
lequel la mesure existe était le seul à ne pas pouvoir la montrer. Les marques du moteur sont
désormais un composant unique (`EngineMarks`) rendu par les deux cadres.

La légende de la route est **neutralisée** plutôt que corrigée : « coups adverses non notés » est
devenu faux à la tranche 03, et dire la nouvelle vérité ferait fuiter l'existence de la mesure sur
une route aveugle par nature. Elle dit « Mon verdict — coup adverse » : le seul fait déjà à
l'écran, et aucune prétention sur ce qu'on en fera.

FP, mesures au navigateur (partie 710, pli adverse 53 = `27.Ba1`, `Opportunity` de la taille d'une
bévue) : en `unaided` le `<li>` ne porte **que** son bouton, le balayage de tous les noms
d'attributs de `body` sur `/opportun/i` rend `[]` ; en `Annoté` la puce est
`?? Opportunity` / `aria-label="Opportunity de la taille d'une bévue"`, fond **transparent** et
graisse 400 contre la pastille pleine `rgb(90,32,28)` / graisse 700 du glyphe de faute du joueur —
le finding bloquant de la 04 n'est pas rejoué ; contrastes 7,49:1 (sombre) et 6,27:1 (clair),
thème **asserté dans le script**. Récap en `Détaillé` : « 10 Opportunity — 8 … imprécision,
1 … erreur, 1 … bévue » à côté d'« Erreurs comptées : 5 », sur une ligne
(`getClientRects().length === 1`, tous les runs au même `y`). Teinte de case : `g4` teintée sur la
bévue **du joueur**, rien sur les deux fautes adverses. Aucun glyphe de courbe ajouté.

Deux constats **antérieurs** laissés ouverts, tous deux hors des critères de ce ticket :
- `KeyMomentReadout` écrit « une bévue de l'adversaire » et « manquer un cadeau » — deux
  formulations que la SPEC réserve. Décision due au demandeur avant le MR
  `integration → develop`.
- Le débordement horizontal de la liste des coups entre 700 et 768 px. Non reproduit sur la partie
  de cette FP (`scrollWidth === clientWidth` à 1280, 768 et 700 px), donc ni aggravé ni refermé.
