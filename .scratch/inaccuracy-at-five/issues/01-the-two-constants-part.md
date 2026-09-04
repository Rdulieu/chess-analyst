# 01 — Les deux constantes se séparent, à barème inchangé

Status: ready-for-agent

## Parent

`.scratch/inaccuracy-at-five/PRD.md` — US-37 (`BACKLOG.md`).

**Branche.** Cette sous-issue s'implémente sur la branche d'intégration de la story métier,
`integration/US-37-inaccuracy-at-five` : on en part et on y retourne, **jamais `develop`**.

## What to build

Aujourd'hui **une** constante — le seuil d'`Inaccuracy`, à 10 — est exportée par le module des
sévérités et **importée** par celui du dénominateur, où elle ne mesure pas la même chose : une
**chute** d'un côté, un **niveau** de l'autre. Cet import est le lien qu'on défait.

Cette tranche sépare les deux **sans changer aucun chiffre** : le seuil de signalement reste à
10, le plancher reste à 10, l'écran est identique au pixel. C'est un balisage, et c'est
délibérément son seul contenu — la tranche 03 doit ensuite se réduire au changement d'**un**
littéral.

- Le module du dénominateur définit et publie **sa propre** constante de plancher
  (`DECIDED_FLOOR`), avec son commentaire ; il n'importe plus rien du module des sévérités
  pour cet usage.
- Le module des sévérités garde `INACCURACY_DROP`, dont le commentaire cesse de prétendre
  qu'il gouverne aussi le dénominateur.
- Les deux commentaires écrivent ce que la constante mesure — un niveau, une chute — et le fait
  qu'elles coïncident **aujourd'hui** sans se déduire l'une de l'autre.
- Les tests qui importaient la constante pour exprimer un seuil écrivent désormais le **nombre**
  (`10`), pas le symbole : un test qui importe la constante passe encore après un retunage qui
  change le sens, ce qui est exactement le piège que cette story doit fermer.

## Acceptance criteria

- [ ] Le module du dénominateur ne dépend plus du module des sévérités pour son plancher.
- [ ] Les deux constantes sont exportées, nommées d'après ce qu'elles mesurent, commentées.
- [ ] Aucun chiffre affiché ne change : coups signalés, coups comptés, exclusions par motif,
      chances perdues, dérive — tous identiques à `develop` sur une même partie.
- [ ] Aucun test existant n'est modifié **dans son attente** ; seuls les imports de seuils
      deviennent des littéraux.
- [ ] Aucune migration, aucun appel moteur, aucun schéma touché.
- [ ] build + tests + lint verts.

### Feature Path (FP)

1. Ouvrir une partie déjà analysée et relever, sur la page d'analyse, les chiffres du
   récapitulatif : coups comptés / coups du joueur, exclusions par motif, erreurs comptées,
   coups montrés, chances perdues, dérive → tous relevés.
2. Relever le nombre de glyphes de chaque sévérité dans la liste des coups → relevé.
3. Appliquer la tranche, relancer l'app, rouvrir **la même** partie → **tous** les chiffres et
   tous les glyphes de 1 et 2 sont identiques, sans exception.
4. Ouvrir une seconde partie dont la fin est déjà décidée → la ligne « Exclus : … parce que la
   position était déjà décidée » affiche le même compte qu'avant.

Verify: UI d'abord. Aucun sondage de la base n'est nécessaire — rien n'est persisté.

## Blocked by

None - can start immediately.
