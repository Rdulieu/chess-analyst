# 03 — La lecture du temps sur la partie

**Implémenté sur la branche d'intégration** `integration/US-15b-time-pressure` : brancher depuis
elle et fusionner dans elle, **pas** dans `develop`. Spec : `.scratch/time-pressure/SPEC.md`.
ADR-0017.

**What to build:** le panneau du **récapitulatif** de la page Analyse gagne une **lecture du temps
sur la partie entière** — combien des coups du `Player` ont été joués sous une horloge basse,
combien de temps il a passé en tout, où sont ses coups les plus longs. Le `Player` obtient un
verdict lisible sans compter trente lignes lui-même.

**La lecture est la somme de ce que les coups portent**, jamais un calcul parallèle : c'est la
discipline d'ADR-0017, et deux implémentations d'une méthode ne s'accordent que par chance. Le
`Player` doit pouvoir recouper la lecture avec la colonne **à la main** — c'est l'exigence
d'auditabilité de l'EPIC.

**À l'écran** la lecture rejoint le panneau du récapitulatif ; **dans la donnée** elle reste dans le
bloc temps de la tranche 02, donc disponible sur une partie **non analysée**, où `GameRecap` est
`null`.

**Aucun seuil n'est inventé ici.** « Taux marginaux ou conditionnels » est US-15c, et US-15a s'était
interdit d'ajouter un seuil — voir ADR-0023 sur ce que coûte d'en choisir un sur le papier. Ce que
cette tranche doit à 15c est **un nombre par `Move` et sa règle de dénominateur**.

**Blocked by:** 02 — le temps par coup (la lecture en est la somme).

**Status:** ready-for-agent

- [ ] La lecture donne au moins : le nombre de coups du `Player` joués sous une horloge basse, son
      temps total passé, et ses coups les plus longs.
- [ ] Chaque chiffre de la lecture est **exactement** la somme (ou l'extremum) des chiffres de la
      colonne — recoupable à la main sur une vraie partie.
- [ ] La lecture ne compte que les coups **du `Player`**, comme tout le reste du récapitulatif.
- [ ] La lecture se lit **à l'intérieur d'une `Time control category`** et ne compare jamais deux
      cadences : une seconde en bullet et une seconde en classique ne sont pas la même seconde.
- [ ] Une partie **en correspondance** donne une lecture **« sans objet »**, pas une lecture à zéro.
- [ ] Une partie **non analysée** donne sa lecture du temps, alors que le récapitulatif d'analyse
      est absent.
- [ ] Le récapitulatif d'analyse existant (ADR-0017) est **inchangé** : aucun de ses chiffres ne
      bouge, et le temps ne rentre pas dans `GameRecap`.
- [ ] Aucun seuil de sévérité, aucun classement, aucun verdict « sur quoi travailler ».
- [ ] Aucun indice **uniquement chromatique**.
- [ ] Le gate : build + `npm test` verts, `npm run lint` a **tourné et rendu 0**, FP verte, aucun
      finding bloquant.

### Feature Path (FP)

1. Ouvrir une partie **chess.com de blitz** → le panneau du récapitulatif énonce la lecture du temps
   à côté de ce qu'il disait déjà.
2. Recouper **à la main** : additionner les temps passés de la colonne pour les coups du `Player` →
   le total annoncé par la lecture.
3. Compter à la main les coups sous l'horloge basse annoncée → le compte de la lecture.
4. Ouvrir une partie **en correspondance** → la lecture dit **« sans objet »**.
5. Ouvrir une partie **non analysée** → la lecture du temps est là, le récapitulatif d'analyse non.

Verify: par la page Analyse dans le navigateur, en recoupant la lecture contre la colonne.
