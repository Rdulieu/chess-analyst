Status: ready-for-agent

## Parent

PRD: `.scratch/unaided-default-and-verdict-tint/PRD.md` — business story **US-28**.

**Branche.** Cette sous-issue s'implémente sur la branche d'intégration de la story métier,
`integration/US-28-29-reading-screen-fixes` : brancher **depuis elle** et remerger **dans elle**,
jamais dans `develop`. Auto-merge après contrôle local vert (build + tests + lint + FP verte, aucune
observation bloquante). Le merge `integration -> develop` reste humain.

## What to build

Le `Review mode` redevient le niveau de **cette revue-ci** et de rien d'autre. Une partie s'ouvre en
`Sans aide` à chaque fois, quel que soit le niveau choisi hier, sur cette partie ou sur une autre, et
quoi que contienne encore le stockage local du navigateur.

Concrètement : le module du `Review mode` perd sa persistance — plus de lecture ni d'écriture de la
clef `chess-analyst.review-mode`, le niveau d'ouverture est la constante `Sans aide`. Les trois
niveaux et la promotion de fin de passe (`atLeastAnnotated`) ne bougent pas : une passe que le joueur
a demandée fait toujours monter **cette** revue à `Annoté`.

**Ne touchez ni au module de provenance, ni à l'effet qui l'appelle.** C'est le cœur de la tranche et
c'est contre-intuitif : sous la nouvelle portée, le niveau vaut toujours `Sans aide` au montage, donc
la condition « niveau au-dessus de `Sans aide` **et** partie analysée » y est fausse **par
construction**, et le drapeau ne peut plus se poser à l'ouverture. Il ne se pose plus que derrière un
geste — le joueur clique un niveau, ou il demande une passe. Déplacer l'appel dans les gestionnaires
d'événement casserait le principe que le drapeau est écrit depuis l'écran qui a **rendu** les
résultats, raterait le cas où l'état « analysée » et le niveau basculent **ensemble** en fin de
passe, et dupliquerait une règle qui doit avoir exactement un domicile.

La clef `chess-analyst.review-mode` résiduelle n'est plus lue par personne : ne pas écrire de code
d'effacement à usage unique, il resterait pour toujours.

## Acceptance criteria

- [ ] Une partie s'ouvre en `Sans aide`, même quand le stockage local contient `detailed`.
- [ ] Choisir un niveau sur une partie n'a **aucun** effet sur le niveau d'ouverture de la suivante.
- [ ] Plus aucune écriture de la clef `chess-analyst.review-mode` nulle part dans le client.
- [ ] Les trois niveaux restent offerts, dans le même ordre, avec les mêmes libellés.
- [ ] Une passe terminée sur la partie lue fait toujours monter cette revue à `Annoté` ; une revue
      déjà en `Détaillé` n'est jamais rétrogradée.
- [ ] **Invariant épinglé par un test** : monter l'écran d'analyse sur une partie **analysée**, avec
      un stockage local pollué par un ancien `detailed`, n'inscrit **rien** dans la provenance.
- [ ] Le test qui affirmait « remembers the chosen level » est **inversé, pas supprimé** — il
      documentait la règle retirée, sa réécriture est la trace de l'amendement.
- [ ] Les trois cas de provenance déjà couverts restent verts **sans être modifiés** (le clic
      inscrit ; `Sans aide` n'inscrit pas ; une partie non analysée n'inscrit jamais). Si l'un casse,
      la portée a été changée plus loin que prévu.
- [ ] Le module de provenance et l'effet qui l'appelle sont inchangés.
- [ ] Aucun code d'effacement de la clef résiduelle.

### Feature Path (FP)

Prérequis : au moins deux parties **analysées** sur un même profil, dont une sans lecture scellée.

1. Ouvrir une partie analysée → la revue est en **Sans aide** ; rien du moteur n'est montré.
2. Choisir **Détaillé** → les relevés du moteur apparaissent pour le coup courant.
3. Revenir à la liste, ouvrir une **autre** partie analysée → elle s'ouvre en **Sans aide**, pas en
   Détaillé. C'est le défaut que la tranche corrige.
4. Rouvrir la **première** partie, celle où Détaillé avait été choisi → elle s'ouvre elle aussi en
   **Sans aide**.
5. Recharger complètement l'application et rouvrir une partie analysée → toujours **Sans aide**.
6. Sur une partie analysée **jamais ouverte auparavant**, l'ouvrir puis en ressortir sans rien
   cliquer → la provenance de cette partie n'a **pas** été inscrite. Vérifiable dans le stockage
   local du navigateur (`chess-analyst.engine-seen`), la UI n'exposant pas le drapeau.
7. Rouvrir cette même partie, choisir **Annoté**, ressortir → la provenance est **maintenant**
   inscrite : un clic est un geste, et le drapeau reste vrai quand il doit l'être.
8. Sur une partie **non analysée**, choisir **Détaillé** → rien du moteur n'est montré et la
   provenance n'est pas inscrite.
9. Lancer une passe d'analyse sur une partie non encore analysée, depuis l'écran d'analyse, et
   attendre sa fin → la revue passe d'elle-même à **Annoté** et montre les résultats.

Vérifier par la UI d'abord ; ne sonder le stockage local que pour les étapes 6 à 8, où le drapeau
n'a pas de rendu.

## Blocked by

None - can start immediately.
