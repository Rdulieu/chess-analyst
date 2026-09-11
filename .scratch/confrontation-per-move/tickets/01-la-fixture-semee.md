# 01 — La fixture semée : une lecture scellée qui contient les cas rares

**What to build:** un semis reproductible qui met dans la base une partie **analysée** et une
`Personal analysis` **scellée** sur elle, taillée pour porter les cas que le moteur ne produit pas
sur commande. Sans lui, chaque tranche suivante inventerait sa propre donnée et aucune FP ne
pourrait exercer les libellés rares.

La fixture doit contenir, au minimum : un coup **forcé** que le moteur mesure `Bévue` et que le
joueur a déclaré `Sound` ; un coup en **position déjà décidée** portant un verdict ; un écart de
degré **vers le bas** (`Erreur` déclarée, `Bévue` mesurée) ; un écart de degré **vers le haut** ;
une **fausse alerte** (bande déclarée, rien signalé) ; un verdict **`Good`** ; un verdict sur un
coup de **l'adversaire** ; un coup **sans verdict** ; un `Key moment` sur une vraie perte, un
`Key moment` **à côté**, et une perte **non marquée**.

Les `Evaluation`s sont **fabriquées**, choisies pour produire ces cas. À dire dans tout scénario qui
s'en sert : la fixture prouve que l'écran rend ces cas, **pas** que le moteur les produit. Le témoin
réel reste la partie 715 de la base, ouverte à la main en HP.

Implémenté sur la branche d'intégration `integration/US-26-confrontation-per-move` : brancher
depuis elle et y merger, **pas** vers `develop`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Le semis est **re-jouable** : le relancer ne duplique rien et ne casse rien
- [ ] Il ne touche **aucune** donnée existante — ni les 4 `Personal analysis` de la base, ni les
      passes d'analyse déjà payées (ADR-0015 : rien ne reconstruit une `Evaluation`)
- [ ] La partie semée est cloisonnée sous son propre `Profile` (ADR-0014)
- [ ] La lecture semée est **scellée**, et sa provenance est explicite
- [ ] Les onze cas listés ci-dessus sont présents et repérables par leur ply
- [ ] Aucun changement de schéma, aucune migration
- [ ] Un test unitaire vérifie que la fixture contient bien chacun des cas — sinon un cas
      disparaîtra silencieusement et une FP passera au vert sans rien avoir exercé

### Feature Path (FP)

1. Semer la fixture → la partie apparaît dans « Mes parties » sous son profil, marquée analysée
2. Ouvrir la confrontation de cette partie → l'écran actuel s'affiche avec ses taux, sans erreur
3. Relancer le semis, puis rouvrir la confrontation → les mêmes chiffres, rien n'a doublé

Verify: par l'interface (liste des parties, écran de confrontation). Sonder la base seulement pour
confirmer qu'aucune donnée préexistante n'a bougé.
