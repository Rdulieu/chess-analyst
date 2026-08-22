Status: `done` — mergée dans `integration/US-15a-per-game-analysis` le 2026-08-23 : build +
525 tests client / 267 serveur verts, **FP verte sur les six étapes**, aucune constatation
bloquante.

**Mesuré, pas estimé à l'œil** : un même coup tombe au **même pixel** dans les deux dessins
(465,250 px dans chacun, à trois décimales ; les règles de frontière aussi), et le point d'arrivée
du tracé égale **exactement** le total du récapitulatif sur quatre parties (148,1 / 191,2 / 56,5 /
32,0) — le même tableau, sommé une fois.

Trois constatations de la FP corrigées dans la tranche : le ruban dérivait de 3 à 9 px (le padding
d'un item flex est prélevé avant la répartition proportionnelle) ; les marques tombaient à ~2:1
**à l'intérieur** de l'aire du tracé, un troisième fond que personne n'avait mesuré (opacité
ramenée à 0,12, qui tient 3:1 dans les deux thèmes) ; le ruban affichait « Milieu de pa… », voire
« M… ».

**Laissé ouvert, pour le point de contrôle** : l'échelle des y est **par partie**, donc chaque tracé
finit en haut de sa boîte et les hauteurs ne sont **pas comparables** d'une partie à l'autre. Un
Player qui feuillette dix parties verra dix tracés qui touchent le plafond.

**Ce que la FP dit de la probation, honnêtement** : sur une partie à grosse erreur unique (72), la
falaise de la courbe et la marche du tracé sont le **même événement dessiné deux fois** — le tracé
n'apporte rien. Sur une partie grignotée (51), la courbe paraît calme pendant vingt coups pendant
que le tracé grimpe déjà un escalier visible : le Player était à 25 % de perte avant que la courbe
ne montre quoi que ce soit. C'est exactement ce pour quoi la tranche a été écrite. La question des
dix parties est donc : ce partage justifie-t-il le dessin ?

## Parent

`.scratch/per-game-analysis/PRD.md` (US-15a — `BACKLOG.md`).

Implemented on `integration/US-15a-per-game-analysis` — branch from it, merge back into it, **not**
`develop`. Auto-merges on a green local check (build + tests + this FP).

## What to build

Le **tracé du cumul des chances perdues**, à côté de l'`Evaluation curve` : rendre la **`Drift`**
visible **comme une pente**, parce que c'est le chiffre qu'il faut pouvoir regarder avant de croire un
agrégat bâti dessus.

- **Son propre dessin**, **pas** une seconde série sur la courbe existante : ce sont deux grandeurs
  différentes, et les mettre sur un même axe est exactement ce que la condition d'acceptation d'US-14
  interdisait (« aucune divergence entre les vues »).
- **Une seule grandeur** dans ce tracé : le **cumul** de ce que le Player a perdu. La dérive s'y **lit**
  au lieu d'y être dessinée — les Moves signalés sont les **falaises**, la dérive est la **pente entre
  elles**.
- **Il partage l'axe des x** avec la courbe et lui est **aligné** : un même Move est à la même abscisse
  dans les deux, donc on compare **en regardant vers le bas**.
- **Chaque graphique porte une étiquette visible** — la courbe en gagne une, elle n'en avait pas : deux
  dessins qui ne disent pas la même chose ne doivent pas pouvoir être confondus.
- **`aria-hidden`, comme la courbe, et légitimement** : chaque chiffre du dessin existe déjà en texte —
  la dérive et le total des chances perdues sont dans le récapitulatif (tranche 05). C'est l'invariant
  qui autorise ce dessin, pas une dispense.
- **La `Phase` complète son affichage ici**, aux deux distances qui manquaient : des **règles de
  frontière** sur les graphiques (l'idiome de la ligne d'égalité existante — une ligne **par-dessus**
  les aires, pas un fond), et un **ruban étiqueté entre les deux graphiques**, portant « début / milieu
  / finale » en **vrai texte**. Un **seul ruban pour les deux**, puisqu'ils partagent l'axe.
- **Pas de bandes de fond** : les deux aires de la courbe sont **opaques et pleine hauteur**, donc ce
  qui est peint derrière est invisible ; et teinter par-dessus déplacerait le contraste **mesuré** des
  marqueurs et du curseur (ADR-0013 — les valeurs passent 3:1 contre **les deux** aires à la fois).
- **Largeur** : le tracé garde une boîte **paysage**, comme la courbe. Comprimée en colonne étroite,
  une courbe « cesse d'être un axe de temps et se lit comme un écoulement vertical » — et c'est la
  feuille de style qui possède cette boîte, pas le composant.

**Point de contrôle après la sortie, à ne pas oublier** : le demandeur regarde **dix parties réelles**
et décide si ce tracé survit. Sur une partie à une seule grosse erreur sans rétablissement, la falaise
de la courbe et celle du tracé sont **le même événement dessiné deux fois** — le tracé ne gagne sa place
que dans les parties compliquées. **Cette tranche est écrite pour être supprimable** sans toucher au
reste : dérivée côté client, aucun schéma, aucune donnée persistée, aucun temps moteur.

## Acceptance criteria

- [ ] Un second graphique affiche le **cumul** des chances perdues par le Player, monotone croissant.
- [ ] Il partage l'axe des x de la courbe et lui est aligné : un même Move est à la même abscisse.
- [ ] Un Move signalé produit une **marche** visible ; une suite de petites pertes produit une **pente**.
- [ ] Les deux graphiques portent une **étiquette visible** qui les distingue.
- [ ] Le tracé est `aria-hidden`, et les chiffres qu'il porte existent en texte dans le récapitulatif.
- [ ] Les frontières de phase apparaissent **par-dessus** les aires, sans teinter aucun fond.
- [ ] Un **ruban étiqueté** nomme les phases en texte, entre les deux graphiques, aligné sur le même axe.
- [ ] Les deux graphiques restent en format paysage en colonne étroite ; leur géométrie vient de la
      feuille de style.
- [ ] Le contraste des marqueurs et du curseur de la courbe est **inchangé** par cette tranche.

### Feature Path (FP)

1. Le Player ouvre, au niveau détaillé, une partie où il a commis une grosse erreur unique → sous la
   courbe, un second dessin **étiqueté** montre une **marche nette** au moment de cette erreur.
2. Il ouvre une partie où il n'a jamais gaffé mais s'est fait grignoter → le même dessin montre une
   **montée régulière sans marche**, là où la courbe ne montrait qu'un lent glissement.
3. Il compare les deux dessins → un même coup est **à la même position horizontale** dans les deux.
4. Il lit les étiquettes → il peut dire lequel montre l'avantage et lequel montre ce qu'il a perdu.
5. Il regarde le ruban entre les deux → les phases de la partie y sont **nommées**, et les frontières
   apparaissent aussi sur les dessins.
6. Il rétrécit la fenêtre → les deux dessins restent lisibles comme des axes de temps.

Verify: UI first.

## Blocked by

- `05-what-this-game-contributes.md`
