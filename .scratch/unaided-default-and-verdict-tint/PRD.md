# PRD — Rouvrir en Sans aide, et reconnaître son verdict dans la liste

Status: ready-for-agent

Business stories: **US-28** (rouvrir une partie en `Sans aide`) et **US-29** (colorer les glyphes de
verdict dans la liste des coups), grillées ensemble le 2026-09-03.
Integration branch: `integration/US-28-29-reading-screen-fixes`.
Grilling output already committed on that branch: `CONTEXT.md` (`Review mode`, `Declared severity`).
**Aucun ADR** — les deux décisions sont des règles métier, et leur domicile est le glossaire.

## Problem Statement

Deux défauts constatés le 2026-09-02 par le demandeur, sur la même surface : la route de lecture.

**US-28 — le niveau de la veille décide, et estampille.** Une partie fraîchement analysée s'ouvre en
`Détaillé` parce que le joueur a choisi ce niveau une fois, un autre jour, sur une autre partie. Ce
n'est pas un bug : `CONTEXT.md` tenait deux phrases contradictoires, le code suivait la seconde, et
un test la couvrait. La conséquence n'est pas cosmétique. Le `Review mode` n'est pas qu'un
affichage : un niveau au-dessus de `Sans aide` sur une partie analysée **inscrit la partie** dans la
provenance (`chess-analyst.engine-seen`), au **montage**, avant toute lecture et sans geste du
joueur. Cette provenance est remise au serveur au scellement et étiquette l'`Analyse personnelle` —
« lue à l'aveugle » ou « lue informée ». Une lecture réellement autonome peut donc être archivée
comme informée, et la `Confrontation` qui en découle ment sur le joueur. C'est exactement le sens
d'erreur contre lequel `engineSeen.ts` prévient dans son propre commentaire : celui « qui discrédite
le travail du joueur ». Et le drapeau n'a pas de contraire : repasser en `Sans aide` dans la seconde
ne l'efface pas.

**US-29 — le verdict du joueur ne se voit pas dans la liste.** Le `Declared severity` a trois
porteurs à l'écran ; deux le colorent, le troisième non. Les boutons de sélection et la case de
l'échiquier portent les cinq couleurs ; le glyphe dans la liste des coups est rendu sans aucun
attribut de couleur et hérite de l'encre de la page. L'asymétrie est double : sur `Analyse`, le
glyphe du **moteur** est teinté dans cette même liste. La liste sait teinter un glyphe ; elle ne le
fait que pour un des deux auteurs. Une lecture ne se reconnaît donc pas d'un coup d'œil là où le
joueur la parcourt.

## Solution

**US-28.** Le `Review mode` redevient le niveau de **cette revue-ci** et de rien d'autre. Chaque
ouverture de partie repart de `Sans aide`, inconditionnellement. La mémorisation entre parties est
retirée. Par construction, le drapeau de provenance ne peut plus se poser au montage : il ne se pose
plus que derrière un geste — le joueur choisit un niveau, ou il demande une passe. Les drapeaux déjà
posés à tort sont remis à « non vu », sur le constat du demandeur que **toutes ses lectures ont été
faites à l'aveugle jusqu'ici**.

**US-29.** Le glyphe du verdict du joueur devient une pastille teintée dans la liste des coups, aux
**couleurs de son auteur** — la famille de l'échiquier, celle que portent déjà les boutons et la
case — avec l'encre constante de la notation. La liste devient homogène entre les deux routes : même
dispositif, chaque écran le remplissant avec l'auteur qu'il a le droit de montrer.

## User Stories

1. En tant que joueur, je veux qu'une partie s'ouvre en `Sans aide`, quel que soit le niveau que
   j'ai choisi hier sur une autre partie, pour que ma lecture commence par la mienne.
2. En tant que joueur, je veux que le niveau que je choisis sur une partie ne suive pas sur la
   suivante, pour qu'un geste ponctuel ne devienne pas un réglage permanent.
3. En tant que joueur, je veux que rien ne soit inscrit sur ma lecture tant que je n'ai rien
   demandé, pour que l'app ne conclue pas sur moi à partir d'un héritage.
4. En tant que joueur, je veux que le drapeau « moteur vu » se pose quand je clique sur un niveau,
   pour que la provenance reste vraie quand elle doit l'être.
5. En tant que joueur, je veux que le drapeau se pose aussi quand une passe que **j'ai demandée**
   se termine et me montre ses résultats, parce que demander une passe est un geste.
6. En tant que joueur, je veux qu'une partie non analysée ne pose jamais le drapeau, quel que soit
   le niveau affiché, parce qu'un niveau sans rien à montrer ne montre rien.
7. En tant que joueur, je veux qu'une passe terminée sur la partie que je lis fasse quand même
   monter cette revue à `Annoté`, pour qu'une passe réussie ne soit pas indiscernable d'une passe
   qui n'a rien fait.
8. En tant que joueur, je veux que ma lecture de la partie 715 cesse d'être étiquetée « informée »
   alors que je l'ai faite à l'aveugle, pour que la `Confrontation` qui en découle dise vrai.
9. En tant que joueur, je veux que cette correction ne touche que les lectures que j'ai désignées,
   pour qu'un rejeu du script n'efface pas plus tard une provenance légitime.
10. En tant que joueur qui veut `Détaillé`, je veux que le geste reste un clic, pour que le prix de
    la règle soit payé par celui qui appelle le moteur et non par celui qui lit à l'aveugle.
11. En tant que développeur, je veux qu'un test épingle « ouvrir n'estampille pas », pour que la
    propriété ne tienne pas par accident et ne se reperde pas en silence.
12. En tant que joueur, je veux reconnaître mes `Bévue` dans la liste des coups sans ouvrir chaque
    coup, pour parcourir ma lecture d'un coup d'œil.
13. En tant que joueur, je veux que les cinq valeurs soient colorées — `Correct` et `Bon` compris —
    parce qu'un coup examiné et trouvé sain n'est pas un coup que personne n'a regardé.
14. En tant que joueur, je veux que la couleur dans la liste soit **la même** que celle du bouton
    que j'ai cliqué et de la case sur l'échiquier, pour que le même verdict ait une seule couleur.
15. En tant que joueur daltonien ou sur lecteur d'écran, je veux que le glyphe et son nom parlé
    continuent de porter le sens seuls, pour que la couleur reste un renfort et jamais l'indice.
16. En tant que joueur, je veux que la pastille soit lisible dans les deux thèmes, pour qu'un
    passage en sombre ne fasse pas disparaître mon verdict.
17. En tant que joueur, je veux que ma note écrite et mon moment clé restent distincts du verdict
    dans la liste, pour que la coloration n'écrase pas les deux autres marques.
18. En tant que développeur, je veux que la règle de style nomme ses jetons en toutes lettres, pour
    que l'audit de cohérence les voie.
19. En tant que développeur, je veux que le glyphe du joueur ne porte jamais `data-severity`, pour
    ne pas repayer la régression de contraste déjà documentée.
20. En tant que futur implémenteur d'US-26, je veux que l'écart de couleur entre les deux auteurs
    soit explicitement déclaré non fiable, pour ne pas bâtir ma distinction dessus.

## Implementation Decisions

### US-28 — la portée du Review mode

- **Le niveau ne se mémorise plus, du tout.** Le module `reviewMode` perd sa persistance : plus de
  lecture ni d'écriture dans le stockage local, plus de clef `chess-analyst.review-mode`. Le niveau
  d'ouverture est la constante `Sans aide`. Les trois niveaux et la promotion de fin de passe
  (`atLeastAnnotated`) sont **inchangés**.
- **Deux alternatives écartées au grill, avec leur raison.** La mémoire de *session* ne corrige pas
  le défaut, elle le raccourcit : le mal est que la mémoire **traverse les parties**, et ouvrir la
  partie B en `Détaillé` parce qu'on a vu le moteur sur A dix minutes plus tôt estampille B de la
  même façon. La mémoire *par partie* ne franchit aucune garantie (le drapeau y est déjà posé) mais
  fige la partie dans l'état où on l'a laissée, ce qui est précisément le cas que le titre de la
  story refuse.
- **Le déclencheur du drapeau ne change pas.** `engineSeen` et l'effet qui l'appelle depuis l'écran
  d'analyse restent intacts. C'est délibéré : sous la nouvelle portée, le niveau vaut toujours
  `Sans aide` au montage, donc la condition « niveau au-dessus de Sans aide **et** partie analysée »
  y est fausse par construction. Déplacer l'appel dans les deux gestionnaires d'événement casserait
  le principe que le drapeau est écrit « depuis l'écran qui a **rendu** les résultats, pas depuis
  celui qui en avait l'intention », raterait le cas où `analyzed` et le niveau basculent **ensemble**
  en fin de passe, et dupliquerait une règle dont le module dit qu'elle doit avoir exactement un
  domicile.
- **Le stockage local orphelin n'est pas nettoyé par du code.** Une clef `chess-analyst.review-mode`
  résiduelle n'est plus lue par personne ; incruster un effacement à usage unique dans le client
  laisserait pour toujours du code dont la raison d'être aura disparu au premier lancement.

### US-28 — la correction des drapeaux déjà posés

- **La correction en base est bornée par identifiant.** Une seule ligne est concernée
  (`personal_analyses` id 4, partie 715, profil 3, scellée le 2026-09-02, provenance à 1). Ni
  `UPDATE` global, ni prédicat de date : un rejeu ultérieur effacerait des provenances légitimes
  posées **après** le correctif. Le script est re-jouable et sans effet au second passage.
- **Ce n'est pas une inférence de l'app.** `CONTEXT.md` interdit de deviner une provenance et le
  repli vaut toujours « non vu ». Ici le joueur **énonce un fait sur ses propres lectures** — toutes
  faites à l'aveugle jusqu'ici — ce qui est une source que la règle n'interdit pas. La distinction
  est à écrire dans le script, parce que c'est elle qui l'autorise.
- **Le sens d'erreur est nommé.** Remettre un drapeau à « non vu » est l'erreur *inverse* de celle
  d'US-28 : elle flatte le joueur et surévalue la `Confrontation`. Elle est ici couverte par le
  constat du demandeur, et par lui seul.
- **Le stockage local du navigateur est un geste manuel documenté**, hors de portée de tout script
  serveur : vider `chess-analyst.engine-seen`. Une seule lecture est encore ouverte (partie 271) et
  le joueur décide pour elle en connaissance de cause avant de sceller.

### US-29 — la couleur du verdict

- **Option retenue : la famille de l'échiquier, dans la liste.** Le glyphe du verdict devient une
  pastille dont le **fond** porte la couleur de la valeur (famille constante entre thèmes) et dont
  l'**encre** est la notation constante. C'est exactement le couple que les boutons de sélection
  portent déjà, donc un contraste **déjà éprouvé sur les cinq valeurs et dans les deux thèmes** :
  zéro jeton à créer, zéro contraste à valider. Les cinq valeurs ont leur jeton, `Correct` et `Bon`
  compris.
- **Les deux autres issues, écartées.** Créer les paires de chrome manquantes livrerait une couleur
  **différente** de celle des boutons et de la case, c'est-à-dire pas ce qui est demandé, au prix de
  deux paires neuves en clair et en sombre. Rapprocher les deux familles rouvre ADR-0013.
- **Ce n'est pas un franchissement neuf de la frontière d'ADR-0013.** Les boutons de sélection sont
  du chrome et portent déjà cette famille. La frontière sépare des **auteurs**, pas des surfaces :
  un élément de chrome qui parle pour l'échiquier porte les jetons de l'échiquier.
- **L'attribut est `data-verdict`, jamais `data-severity`.** Le second est le crochet du glyphe du
  moteur, et la feuille teinte **tout** `[data-severity]` avec la paire de chrome : le poser sur le
  glyphe du joueur ne colorerait que trois valeurs sur cinq et ferait retomber `Bévue` à 2,75:1. Le
  contrôle de sélection a déjà rencontré ce piège et porte le commentaire qui l'explique.
- **Cinq règles écrites en toutes lettres**, jamais engendrées par une boucle : l'audit de cohérence
  lit la feuille comme source et ne voit pas un nom de jeton assemblé par interpolation.
- **La forme suit celle du glyphe du moteur** (mono, gras, rayon, retrait horizontal), pour que la
  liste soit le même dispositif d'une route à l'autre.
- **Le conteneur des marques perd sa couleur unique.** Il pose aujourd'hui une encre atténuée sur
  les trois marques et porte le commentaire « la teinte n'est jamais l'indice, donc aucune n'est
  posée ici », qui devient faux. La note écrite et le moment clé gardent l'encre atténuée ; seul le
  verdict prend la pastille.
- **US-29 ne bloque pas sur US-26, et ne lui prend rien.** La règle du `Declared severity` exige
  déjà qu'une vue montrant les deux auteurs les distingue « par autre chose que la couleur » : la
  couleur n'était donc pas disponible pour porter cette distinction, et la teinter ici ne consomme
  aucun canal. Si un jour une liste montre les deux, leurs couleurs différeront — c'est une
  distinction **accidentelle**, déclarée non fiable dans `CONTEXT.md`.

## Testing Decisions

Un bon test ici affirme un **comportement observable** — ce qui s'ouvre, ce qui s'inscrit, ce que la
feuille déclare — jamais la forme interne d'un module. Les quatre seams nécessaires **existent
déjà** ; aucun n'est créé.

- **Le module du `Review mode`** (test unitaire existant). Le test qui affirme *« remembers the
  chosen level »* est **inversé, pas supprimé** : c'est lui qui documentait la règle retirée, et sa
  réécriture est la trace de l'amendement. Nouvelle affirmation : le niveau d'ouverture est
  `Sans aide` **quoi que contienne le stockage local**. La promotion de fin de passe garde ses
  assertions telles quelles.
- **L'écran d'analyse** (test de composant existant, section « recording that the engine was
  shown »). C'est le seam de l'invariant, et le plus important de la tranche : monter une partie
  **analysée** avec un stockage local pollué par un ancien niveau `Détaillé` n'inscrit **rien**. Les
  trois cas déjà couverts (le clic inscrit, `Sans aide` n'inscrit pas, une partie non analysée
  n'inscrit jamais) restent verts sans modification — un signal utile : si l'un d'eux casse, la
  portée a été changée plus loin que prévu.
- **La correction en base** n'a pas de test automatisé et n'en mérite pas : c'est un acte de donnée
  sur une ligne nommée. Elle est vérifiée par une requête avant/après citée dans la tranche, et sa
  ré-exécution doit être observée sans effet.
- **L'audit de la feuille de style** (tests unitaires existants qui compilent la feuille et lisent
  les déclarations d'un sélecteur — prior art : les tests des écrans denses, des listes et tableaux,
  du marqueur d'action). Affirmer : les cinq règles du verdict existent dans la liste, chacune avec
  le fond de sa valeur et l'encre de notation ; aucun jeton inconnu (l'audit de cohérence le donne
  gratuitement).
- **Le rendu des marques** (test de composant existant, via le composant d'échiquier qui rend la
  liste). Affirmer : le verdict porte `data-verdict` à sa valeur, ne porte **pas** `data-severity`,
  et son nom accessible est inchangé — la couleur est additive.

**Sommet de la pyramide.** Chaque tranche porte sa **Feature Path** exécutable comme portail
d'auto-merge. La FP d'US-29 porte en plus la **passe de thème** sur la surface changée : la famille
retenue est constante entre thèmes, donc le risque exact est une pastille correcte en clair et
fautive en sombre, et l'émulation de thème est un piège connu du projet — la vérifier là où on vient
de changer vaut mieux qu'en fin de parcours.

**Avant la PR `integration → develop` : HP-03 seul**, pas la suite complète. Décision du demandeur,
arbitrée au grill. HP-02 ne touche pas cette surface ; HP-01 la traverse par le panneau de lecture
mais pas par le niveau d'ouverture. HP-03 déclare `Review mode`, `Declared severity`,
`Personal analysis` et `Confrontation` dans son périmètre : il lit à l'aveugle **puis** confronte,
donc c'est par lui que sortirait une régression sur l'aval qu'US-28 touche — et par nulle part
ailleurs. Coût réel : le prérequis d'amorçage plus un scénario, un seul sous-agent.

## Out of Scope

- **Toute mémoire du niveau, sous quelque portée que ce soit** — session ou partie. Écartées au
  grill avec leurs raisons ; les rouvrir demande de rouvrir la règle du glossaire.
- **Une UI de correction de la provenance** (« cette lecture était en fait autonome »). Le
  scellement « fixe ce qui est confronté » ; un écran pour rééditer la provenance après coup est un
  écran pour la blanchir, pour une population d'une ligne.
- **Vider le stockage de provenance par du code.** Geste manuel, une fois, documenté.
- **L'écran qui montre les deux auteurs à la fois** — c'est US-26, qui apportera sa colonne ou son
  titre, et sa propre solution.
- **Les paires de jetons de chrome pour `Correct` et `Bon`.** L'option qui les demandait est
  écartée ; elles n'ont aucun autre consommateur.
- **Toute modification du modèle, des `Evaluation`s ou de la `Confrontation`.** Rien ici ne touche à
  ce qui est calculé ou stocké, hors la correction bornée d'une ligne de provenance.
- **Le libellé du compteur de positions et les autres retouches de la route de lecture** — ce sont
  d'autres stories du backlog.

## Further Notes

- Le grill a produit **deux amendements de `CONTEXT.md`, déjà commités** sur la branche
  d'intégration : la portée du `Review mode` (avec son coût nommé) et la règle « la couleur d'un
  verdict appartient à son auteur et le suit partout ». **Aucun ADR** : décision explicite du
  demandeur, ce sont des règles métier et leur domicile est le glossaire.
- Le coût d'US-28 est assumé et écrit : un joueur qui veut `Détaillé` sur chaque partie le demande
  sur chaque partie. C'est ce que la phrase retirée achetait.
- Les deux stories partagent une branche d'intégration parce qu'elles touchent la même surface et
  que le demandeur veut une seule séquence de merge. La PR vers `develop` listera les issues des
  deux.
