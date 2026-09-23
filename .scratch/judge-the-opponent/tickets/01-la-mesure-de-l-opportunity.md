# 01 — La mesure : une `Opportunity` à côté de la sévérité, jamais dedans

**What to build:** la dérivation mesure les fautes de l'adversaire, avec **la même bande** que
celles du joueur (`classifyMove`, seuils 5 / 20 / 30, une seule fonction), dans **la même passe**,
et les range dans un **champ à part** de l'annotation de coup. `severity` garde son contrat exact —
`null` hors des coups du joueur — et aucun de ses consommateurs ne change de sujet.

C'est le cœur d'ADR-0034 : le geste le moins cher serait de remplir `severity` côté adverse, et ni
le compilateur, ni les tests, ni une lecture du code ne l'arrêteraient. `Danger position`, le compte
d'erreurs « vos erreurs », les ouvertures faibles et le récap se mettraient tous, en silence, à
parler de l'adversaire.

**Les deux exclusions du `Counted Move` ne sont mirées qu'à moitié, et c'est le point** :
- une position **déjà décidée** ne produit **pas** d'`Opportunity` (il n'y avait rien à prendre) ;
- un coup **forcé en produit une** (`forced` existe pour ne blâmer personne, et ici personne n'est
  blâmé). Documenter cette asymétrie **au site du code** : c'est exactement ce qu'un relecteur
  « corrigerait ».

La gravité est une **propriété** de l'`Opportunity`, pas un vocabulaire concurrent : on réutilise
les trois bandes telles quelles.

Rien n'est persisté, rien n'est migré (ADR-0009) : tout se dérive des `Evaluation`s stockées.

Implémenté sur la branche d'intégration `integration/US-30-judge-the-opponent` : brancher depuis
elle et y merger, **pas** vers `develop`.

**Blocked by:** None — can start immediately.

**Status:** done
**Delivered:** 2026-09-15 · PR #122, merge `7cb1593` · gate: build vert, tests verts (serveur 45
fichiers / 591 tests, client 64 fichiers / 982 tests, 0 échec), `npm run lint` exécuté et sorti 0,
Feature Path verte 3/3, no blocking finding — un finding bloquant trouvé par la revue indépendante
(l'exclusion « déjà décidée » lisait le verdict de `countedMoves` au lieu du niveau, donc un coup
adverse forcé **et** en position décidée gardait son `Opportunity`) corrigé en `8ce48c5` avant le
merge.

- [x] L'annotation de coup porte l'`Opportunity` dans un champ **distinct** de `severity`
- [x] `severity` reste `null` sur tout pli adverse — un test l'ancre explicitement
- [x] La mesure passe par **la même** fonction de classement que côté joueur (aucun second seuil)
- [x] Le retournement de perspective est correct : un test part d'`Evaluation`s connues et vérifie
      la bande attendue, sans se fournir la réponse
- [x] Un coup adverse **forcé** et fautif porte bien une `Opportunity`
- [x] Un coup adverse en position **déjà décidée** n'en porte **aucune**
- [x] Les deux côtés de chaque frontière de bande sont testés (juste en dessous / juste au-dessus)
- [x] `Danger position`, le compte d'erreurs du joueur et les ouvertures faibles rendent **exactement**
      les mêmes valeurs qu'avant sur la même entrée — test de non-régression ancré
- [x] Aucun changement de schéma, aucune migration
- [x] L'asymétrie `forced` / `decided` est commentée au site du code

### Feature Path (FP)

1. Ouvrir une partie analysée de la base réelle sur `/analyse/:id` → l'écran s'affiche comme avant,
   aucune régression visible : les sévérités du joueur, la courbe et le récap sont inchangés
2. Ouvrir `/danger` → la liste et les comptes sont **identiques** à avant la tranche
3. Sonder l'API d'annotations de cette partie → les plis adverses fautifs portent désormais une
   `Opportunity`, et leur `severity` est toujours `null`

Verify: par l'interface pour la non-régression (c'est elle qui compte), par l'API pour la présence
de la nouvelle mesure.
