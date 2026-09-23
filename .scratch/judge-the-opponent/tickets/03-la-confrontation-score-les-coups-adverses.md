# 03 — La `Confrontation` score enfin les coups adverses

**What to build:** aujourd'hui tout verdict scellé posé sur un pli adverse tombe dans
`unscored: "opponent"`, un gris qui dit « ce n'est pas votre coup ». Sur la base réelle, **38 des 95
marques scellées (40 %) sont dans ce gris**. La tranche les score.

- Quand un pli adverse porte une mesure et que le joueur y a déclaré quelque chose, le verdict est
  confronté avec **la même fonction** que côté joueur et produit un des **trois mêmes**
  `ReadingTerm`s (`Bonne lecture` / `Sous-lecture` / `Sur-lecture`).
- Le résultat est rangé dans la `MoveReading` **dans son propre couple de champs** — jamais dans
  `term`, qui reste la lecture du joueur sur lui-même.
- La `Confrontation` gagne **sa propre paire de figures**, sur le modèle exact du couple
  couverture / justesse existant : combien d'`Opportunity`s ont été **regardées**, et parmi
  celles-là combien sont **bien lues**. **Jamais fondues** avec « Ce que j'ai vu juste » : se juger
  soi-même et repérer ce que l'adversaire offre sont deux aptitudes différentes, et leur désaccord
  est le diagnostic qui vaut le déplacement.
- Le chiffre est **brut avec son dénominateur**, jamais normalisé.
- Une `Opportunity` **jamais regardée** (aucune marque, aucun verdict) est comptée à part : elle est
  invisible à une lecture, et c'est un échec différent d'une mal lue. Sur la base réelle : **8 des
  19 fautes adverses (42 %)**.
- Les figures sont **le pli de la liste des `MoveReading`s** et non un second calcul (ADR-0032).

La fixture scellée (`server/src/personal/fixture.ts`) est étendue avec les cas manquants : un coup
adverse fautif **vu et bien lu**, un **vu et sous-lu**, un **jamais regardé**, un **forcé et
fautif** (qui compte), un **en position déjà décidée** (qui ne compte pas).

Implémenté sur la branche d'intégration `integration/US-30-judge-the-opponent`.

**Blocked by:** 01

**Status:** done
**Delivered:** 2026-09-15 · PR #124, merge `5ddb957` · gate: build vert, `npm run lint` sorti 0,
tests verts (serveur 626 / 46 fichiers, client 982 / 64 fichiers), Feature Path 4/4 verte — la
liste repliée à la main donne `{offered: 7, examined: 3, agreed: 2, unseen: 4}` sur la fixture et
`{11, 6, 1, 5}` sur la partie 715, où **6 marques adverses sont désormais scorées** contre zéro
avant ; aucun finding bloquant (revue indépendante : 8 constats, tous non bloquants, 4 corrigés
dans `d7f7420`)

- [x] Un verdict sur un pli adverse mesuré produit un des trois `ReadingTerm`s
- [x] Ce terme vit dans ses propres champs ; `term` et les quatre compteurs du joueur sont
      **inchangés** sur la même lecture — test de non-régression ancré
- [x] Un pli adverse sans mesure **et** sans verdict reste non scoré
- [x] Les deux figures adverses existent, séparées, avec leur dénominateur
- [x] Le compte des `Opportunity`s **jamais regardées** est rendu à part
- [x] Les figures égalent la somme des `MoveReading`s — vérifié par un test qui replie la liste
      lui-même, pas par recopie
- [x] La fixture porte les cinq nouveaux cas, et un test vérifie qu'ils y sont (sinon un cas
      disparaît en silence et une FP passe au vert sans rien exercer)
- [x] Les tests partent d'une lecture scellée d'entrée et vérifient le terme produit — **jamais**
      en se fournissant eux-mêmes le terme

### Feature Path (FP)

1. Semer / utiliser la fixture, ouvrir sa `Confrontation` → l'écran s'affiche, les figures du joueur
   strictement identiques à avant
2. Sonder l'API de `Confrontation` → les plis adverses portant un verdict ont un terme, plus le gris
   « coup de l'adversaire » pour ceux-là
3. Replier soi-même la liste des `MoveReading`s adverses → les deux figures rendues par l'API
   tombent juste, dénominateur compris
4. Ouvrir la partie 715 de la base réelle → un nombre non nul de marques adverses est désormais
   scoré, et le compte des jamais-regardées est plausible

Verify: étape 3 par recalcul à la main ; étape 4 sur la vraie base, parce que c'est là que les 40 %
se voient.
