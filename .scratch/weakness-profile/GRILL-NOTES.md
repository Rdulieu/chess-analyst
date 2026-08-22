# US-15 (EPIC) — Identifier les points faibles du joueur — notes de grilling

**Statut : grilling INTERROMPU** (2026-08-19), à reprendre. Branche
`integration/US-15-weakness-profile` (depuis `develop` @ 7cb477f).

Rien n'est encore écrit dans `CONTEXT.md` ni dans `docs/adr/` : la terminologie n'est pas tranchée
et les décisions restantes sont trop ouvertes. Ce fichier est le seul état.

> ⚠️ Ce n'est **pas** une US mais une **EPIC** : elle se découpera en plusieurs US, chacune grillée
> puis passée par `/to-prd` + `/to-issues`. La roadmap n'est pas encore établie — c'est l'objet de
> la reprise.

---

## L'objectif final (recadrage du demandeur)

> « Je veux que l'application permette d'identifier les points faibles du joueur pour mettre en
> avant des points sur lesquels travailler. »

Les briques existantes (`/openings`, `/danger`, annotations `?!`/`?`/`??`) ont été construites
**parce qu'elles étaient plus simples**, pas parce qu'elles étaient le but. Le but réel est de
nommer des **thèmes** de faiblesse — « je m'effondre en finale de pions », « je rate les fourchettes
de cavalier », « je dérive après le coup 20 » — et pas seulement de lister des ouvertures ou des
positions.

État constaté : l'app **détecte** déjà des faiblesses, trois fois, sous trois formes différentes
(une `Opening`, une `Position` récurrente, un `Move` isolé), mais elle ne rend **aucun verdict** :
trois listes, trois métriques, aucune façon de savoir laquelle compte le plus. Le manque n'est pas
la détection, c'est la **synthèse** — et surtout la **cause**.

---

## Décisions prises

### D1 — L'objectif est bien (B) : des **thèmes**, pas un simple classement des briques existantes

Deux lectures avaient été proposées :

- **(A)** un « point faible » = une des choses déjà calculées (cette ouverture, cette position, ce
  coup) ; l'US n'ajoute alors qu'un **classement inter-dimensions** et une page d'entrée unique.
- **(B)** un « point faible » = un **thème** ou une **compétence** (motif tactique, phase de jeu,
  gestion du temps, dérive positionnelle), ce qui demande une classification qui **n'existe pas**
  aujourd'hui.

**Retenu : (B)**, assumé comme l'objectif final de l'EPIC. (A) n'est pas rejeté en soi mais n'est
pas le but ; il pourra ressortir comme sous-produit d'une étape.

### D2 — Comment un thème est **établi** : (ii) en dorsale, (i) greffé thème par thème, (iii) exclu

Trois familles de méthodes avaient été posées :

- **(i) Détection par règles** dans notre code : prédicats d'échecs sur (position avant, coup joué,
  meilleur coup, PV) — « une pièce est attaquée et non défendue », « le meilleur coup adverse
  fourche deux pièces ». Déterministe, testable, gratuit, hors-ligne — mais chaque motif est un
  vrai chantier, la couverture croît un motif à la fois, et la version naïve se trompe souvent (une
  pièce « en l'air » qui est en fait un sacrifice sain).
- **(ii) Thèmes dérivés du moteur, sans nommer de motif** : classer les erreurs sur des axes que le
  moteur et le FEN donnent déjà — phase de jeu, équilibre matériel, « tactique manquée » (le
  meilleur coup était une prise/un échec et pas le vôtre) vs **dérive positionnelle**, pression du
  temps, position calme ou tranchante (dispersion des meilleurs coups → demande MultiPV). Honnête et
  bon marché, mais plus grossier : « tu rates des tactiques dans les milieux de partie tranchants
  sous pression du temps » plutôt que « tu rates les fourchettes de cavalier ».
- **(iii) Un LLM explique chaque erreur** et nomme le motif. Couverture immédiate, aucune logique
  d'échecs à écrire — mais non déterministe, invérifiable, inventif, et un appel distant casserait
  ADR-0002 (app locale).

**Retenu : (ii) en dorsale**, puis **(i) greffé un thème après l'autre**. **(iii) écarté pour
l'instant** (décision explicite du demandeur : « avoid llm for now »).

Raison de l'ordre : (ii) donne une image complète et fiable du **quand/comment** dès la première
étape, à partir de données obtenables en une seule ré-analyse ; (i) ajoute ensuite le **quoi**
incrémentalement, chaque motif étant validable à l'œil sur ses propres parties. Commencer par (i)
c'est un long chantier avant le premier verdict ; commencer par (iii) c'est une démo rapide et
non fiable — et un conseil d'entraînement faux est pire que pas de conseil (même argument que celui
qui a fait refuser de figer les seuils en base, ADR-0009).

---

## Analyse d'écart — ce que (B) exige et que nous n'avons pas

Vérifié dans le code, pas supposé.

### Acquis, réutilisable tel quel

- `Evaluation` **et FEN par ply** pour chaque partie analysée (`evaluations`, ADR-0012) : pour tout
  coup fautif on connaît la position exacte avant et après. C'est la matière première du classement.
- Le cadrage systématiquement relatif au joueur (`player_color`, `result`).
- La méthode de sévérité par **winning chances** déjà implémentée
  (`server/src/analysis/derivation.ts`).
- Le **PGN complet** conservé par partie.

### Manques, par coût croissant de réparation

| # | Manque | Coût de réparation |
|---|---|---|
| G1 | **Le meilleur coup du moteur est calculé puis jeté.** `server/src/engine/uci-driver.ts:68` le renvoie, `engine/types.ts:22` le déclare — `evaluations` n'a **pas de colonne**. | **Ré-analyse complète** (minutes/lot). Contrairement au FEN, **non rejouable depuis le PGN**. |
| G2 | **Aucune variante principale (PV).** Recherche mono-PV à profondeur 16, `MultiPV` inutilisé. Or « tu as raté une fourchette » demande souvent 2 à 4 plys de réfutation pour être **montré**, pas seulement affirmé. | Ré-analyse (idem G1 — à faire **en même temps**). |
| G3 | **Aucune notion de phase de jeu** (ouverture / milieu / finale). | Dérivable des FEN stockés (matériel + numéro de coup). Bon marché, rien à persister. |
| G4 | **Aucune donnée d'horloge.** | Les PGN chess.com portent des commentaires `[%clk ...]` → temps par coup **récupérable du PGN déjà stocké**, sans ré-import ni ré-analyse. **À VÉRIFIER** : confirmer que les `[%clk]` sont bien dans nos PGN en base avant de s'appuyer dessus dans la roadmap. |
| G5 | **Aucun vocabulaire de motifs** : rien ne nomme une fourchette, un clouage, une pièce en l'air, une faiblesse de dernière rangée. C'est le contenu même de (B) et il n'existe sous aucune forme. | Le chantier (i), thème par thème. |
| G6 | **Aucune notion de durée de vie d'un constat.** La sortie de (B) est un **conseil**, et un conseil doit être re-vérifiable plus tard : est-ce que ça s'est amélioré ? Rien ne modélise aujourd'hui une faiblesse **suivie dans le temps**. | Modélisation à faire ; dépend de tout le reste. |

**Conséquence d'ordonnancement déjà claire** : **G1 + G2 d'abord**, car c'est le seul manque dont la
réparation est réellement coûteuse (ré-analyse moteur) et dont **tout le reste dépend**. Tout motif
est en réalité une affirmation sur **l'écart entre le coup joué et le meilleur coup** : pas de
meilleur coup, pas de motif.

---

## Question EN COURS (non tranchée) — Q3 : qu'est-ce qui fait d'un « bucket » une faiblesse ?

C'est là que la session s'est arrêtée. Le fil complet, pour ne pas le refaire.

### Le problème du dénominateur

« 63 % de tes erreurs graves sont en milieu de partie » est probablement **vrai et sans valeur** :
la plupart de tes coups *sont* des coups de milieu de partie. Une distribution brute d'erreurs par
bucket reproduit surtout la distribution des **coups** par bucket — on « découvrirait » qu'on est
faible là où on joue le plus.

Options posées :

- **(a) Compte d'erreurs** — rejeté (le piège ci-dessus).
- **(b) Taux d'erreur dans le bucket** : `erreurs graves du bucket / tes Moves du bucket`. Les
  buckets redeviennent comparables ; une finale courte n'est plus mécaniquement gonflée ou
  dégonflée.
- **(c) Taux comparé à une référence** :
  - **ta propre moyenne globale** (« tu te trompes 1,8× plus souvent en finale qu'en moyenne ») —
    autonome, et répond directement à « où suis-je *relativement* le plus mauvais » ;
  - **une référence externe** (joueurs de ton Elo) — bien plus parlant comme coaching, mais donnée
    inaccessible en local. **Hors de portée**, noté et écarté.
- **(d) Winning chances perdues par Move dans le bucket** (au lieu de compter des erreurs
  seuillées). Capte la **dérive positionnelle** — mourir de mille coupures sans jamais gaffer — à
  laquelle un comptage seuillé à 20 % est **structurellement aveugle**, alors que la dérive est
  justement un des thèmes qu'on veut le plus voir sortir.

### Recommandation initiale (puis critiquée, voir ci-dessous)

**(b) + (c-moyenne-propre)**, avec **(d) comme seconde métrique co-égale** et non comme
remplacement : une faiblesse = un bucket où **soit** le taux d'erreur grave seuillé, **soit** les
winning chances perdues par Move sont nettement pires que ta propre moyenne. Deux métriques parce
qu'elles attrapent des échecs différents et qu'aucune n'absorbe l'autre (une gaffe catastrophique
par partie sort dans la première et à peine dans la seconde ; une dérive lente sort dans la seconde
et pas du tout dans la première) ; les fusionner en un seul nombre cacherait **laquelle des deux**
se produit — or c'est ça qui change ce qu'on va travailler.

Conséquence assumée : cela **casse une règle explicite de `CONTEXT.md`**, énoncée deux fois
(`Danger position`, `Win rate`) : *« aucune taille d'échantillon minimale n'est jamais imposée — le
compte est affiché à côté du taux, le joueur juge la significativité »*. Cette règle tient quand on
**lit une liste**. Elle casse dès qu'on **classe des buckets entre eux** : le haut du classement
serait systématiquement occupé par les tout petits buckets (6 coups de finale, une gaffe → 17 %,
premier du classement). Classer, contrairement à lister, **oblige l'outil à prendre position sur le
bruit**.

### Les problèmes trouvés dans cette recommandation (demande du demandeur : « est-ce que tu vois des problèmes ? »)

1. **Les buckets sont confondus, donc un classement invente des causes.** *Le plus grave.* Phase,
   pression du temps et caractère tranchant ne sont pas des axes indépendants : en blitz, les coups
   de finale **sont** les coups à faible horloge, presque par construction. Les mêmes 40 erreurs
   sont attribuées simultanément à « finales », « pression du temps » et « positions tranchantes »,
   chaque bucket affichant un taux élevé, et **rien dans la méthode ne dit lequel est le moteur**.
   L'outil dirait « travaille tes finales » alors que la vérité est « arrête de brûler ton horloge
   avant le coup 20 » — soit exactement l'échec que cette EPIC existe pour éviter. Des **taux
   marginaux par axe** sont structurellement incapables de séparer des causes corrélées.
2. **Les winning chances saturent, et les buckets diffèrent systématiquement en « à quel point la
   partie est déjà jouée ».** `CONTEXT.md` invoque la saturation *en faveur* de la méthode (un
   mauvais coup en position déjà gagnée/perdue n'est pas signalé) — correct pour juger **un coup**,
   mais cela veut dire que la sensibilité de la métrique dépend de la proximité de l'équilibre. Les
   finales sont atteintes de façon disproportionnée quand la partie est déjà décidée : le bucket
   « finale » affichera un taux **mécaniquement déprimé**, non parce qu'on y joue bien mais parce
   qu'il y avait moins à perdre. Le biais va dans le même sens pour **les deux** métriques — en
   avoir deux n'aide donc pas.
3. **La référence à sa propre moyenne garantit toujours un verdict.** Quelque chose est toujours
   « le pire » par rapport à sa moyenne. L'outil ne peut **jamais** dire « ton jeu est assez
   homogène, rien ne ressort » — alors qu'il doit pouvoir le dire, sinon toute lecture est un faux
   positif. Pire : il ne distingue pas « je suis mauvais en finale » de « je suis exceptionnellement
   bon en milieu de partie » — sortie identique, actions opposées. Et il **ne converge pas** :
   corrige ton pire bucket, un autre prend la tête, donc le progrès ressemble à une absence de
   progrès.
4. **Le lissage (shrinkage) rend le classement non reproductible depuis l'écran.** Si la page
   affiche « finale : 17 % sur 6 coups » **sous** « milieu : 4 % sur 900 coups », le joueur voit un
   bug. Dans un outil dont le seul produit est un conseil qu'on **décide de croire**, un ordre qu'on
   ne peut pas retrouver depuis les chiffres affichés ronge exactement ce qui est vendu. Les stats
   sont justes et la présentation est une **faute de confiance** — la plus chère des deux ici.
5. **Le bruit de la profondeur 16 se charge sur la métrique de dérive, et inégalement selon les
   buckets.** Sommer des milliers de petits deltas **accumule** le bruit au lieu de le moyenner, et
   la profondeur 16 est relativement la plus faible là où les horizons sont les plus longs — les
   **finales**. La métrique de dérive tendra donc à **inventer** de la dérive en finale. Là encore
   le biais tombe sur un axe de bucket, le seul endroit où on ne peut pas se le permettre.
6. **(mineur, mais mine le dénominateur)** « tes Moves du bucket » compte les coups où tu n'avais
   **aucun choix réel** (reprises forcées, coup unique). Leur part varie selon le bucket (positions
   tranchantes et finales en ont beaucoup), donc les dénominateurs ne sont pas comparables. MultiPV
   permettrait d'exclure les positions quasi forcées ; le mono-PV ne les voit pas.

### Recommandation révisée (posée, PAS validée)

Garder **(b) + (c)** comme arithmétique — cette partie survit — mais avec trois contraintes sans
lesquelles la sortie n'est pas fiable :

- **Restreindre toute comparaison inter-buckets aux positions encore compétitives** (bande de
  winning chances autour de l'équilibre, p. ex. aucun camp au-delà de ~85/15 avant le coup) → règle
  le problème 2, et c'est de toute façon ce que « un coup qui comptait » veut dire.
- **Rendre un verdict de dispersion AVANT tout classement** : si aucun bucket ne se détache de la
  moyenne au-delà du bruit, la page le dit et **ne classe rien** → règle le problème 3 et rend
  l'outil **falsifiable**.
- **Abandonner le lissage au profit d'un intervalle affiché**, et classer sur sa **borne
  conservatrice**, intervalle visible : « finale 17 % (6 coups, 3–48 %) » chevauche visiblement tout
  le reste, donc son classement bas devient **évident** au lieu d'être mystérieux → règle le
  problème 4.

Le **problème 1 n'est pas réparable à l'intérieur de (ii) seul** : séparer des causes corrélées
demande soit une **tabulation croisée** (qui multiplie les buckets et détruit la taille
d'échantillon à l'échelle de l'historique du joueur), soit une méthode différente — **fixer un axe
et comparer à l'intérieur** (« parmi tes seuls coups de milieu de partie, la pression du temps
change-t-elle ton taux d'erreur ? »). C'est un vrai problème de conception : il mérite **sa propre
étape dans la roadmap** plutôt que d'être glissé sous le tapis de la première.

---

## Questions ENCORE OUVERTES, pour la reprise

**Q3-bis (bloquante, la question posée au moment de l'arrêt).** Pour la **première US** de l'EPIC :

- **(α)** livrer des **taux marginaux mono-axe**, avec un cadrage explicite « ces axes se
  recouvrent, c'est descriptif et non causal », et traiter la confusion (problème 1) dans une US
  ultérieure ; **ou**
- **(β)** faire dès le départ la **comparaison conditionnelle intra-axe**, en acceptant un jeu
  d'axes plus restreint parce que la taille d'échantillon ne suivra pas.

> Le demandeur n'a pas pu trancher et a explicitement demandé à reprendre plus tard.

**Q4 — Terminologie.** Collision déjà repérée, à régler avant toute écriture dans `CONTEXT.md` :
l'entrée `Weak opening` liste explicitement `Weakness` et `Weak spot` sous *_Avoid_* — le langage
avait été **volontairement gardé étroit** pour que « weak X » veuille dire exactement « ouverture à
mauvais taux de victoire ». Si cette EPIC introduit une notion générale de point faible, il faut
**lever cette réservation** ou trouver un autre terme. Termes à définir : le **thème/axe**, le
**bucket**, le **constat** (le point faible lui-même, avec ses preuves), et le rapport de tout ça
avec `Mistake`/`Danger position`/`Weak opening` existants.

**Q5 — Les axes de la dorsale (ii), lesquels exactement ?** Candidats posés : phase de jeu (G3),
équilibre matériel, tactique manquée vs dérive positionnelle, pression du temps (G4), position calme
vs tranchante (demande MultiPV, G2). Lesquels retenus dans la première US, dans quel ordre, et
lesquels l'historique du joueur peut-il alimenter ?

**Q6 — Où ça se voit.** Une nouvelle page ? Une page d'entrée unique qui devient l'accueil (le
« recentrage » suggère que oui) ? Que deviennent alors `/openings` et `/danger` — preuves vers
lesquelles on descend, ou vues autonomes conservées ? Rappel : ADR-0006 (routage client, une page
par parcours).

**Q7 — Coût et déclenchement de la ré-analyse (G1+G2).** Stocker `bestmove` + PV impose une
ré-analyse. Interaction avec les règles de phase dev (schéma libre, ré-import bon marché) : on repart
d'une base neuve, ou on ajoute une colonne et on relance un `Analysis pass` ? Le passage en MultiPV
**augmente le coût moteur par position** — de combien, et est-ce que la profondeur 16 (fixée pour la
reproductibilité, ADR-0009) tient encore ? À **mesurer**, comme US-10b l'avait fait pour `/danger`.

**Q8 — La progression dans le temps (G6).** Un point faible se suit-il d'une ré-analyse à l'autre ?
Sur quel découpage (par mois, par lot de parties) ? Cela conditionne s'il faut **persister des
constats** — donc un arbitrage contre l'esprit d'ADR-0009 (ne persister que le brut, tout dériver).

**Q9 — La roadmap elle-même.** Non établie. Seul point acquis : **G1+G2 en premier** (coût de
réparation le plus élevé, tout en dépend). Reste à découper (ii) en US, puis à décider si le premier
motif (i) entre dans cette EPIC ou en sort.

**Q10 — Dépendance à US-11 (Profils).** US-11 est en cours (tranches 01-05 livrées, 06 HITL
bloquante) et fait des agrégats des choses **cloisonnées par profil**. Tous les buckets et constats
de cette EPIC sont des agrégats : ils devront naître **déjà cloisonnés par profil**, sinon on refait
le travail. À confirmer au moment de l'ordonnancement.

---

## Rappels d'exploration (vérifiés dans le code, 2026-08-19)

- `evaluations(game_id, ply, fen, cp, mate)` — pas de `bestmove`, pas de PV.
- `engine/uci-driver.ts` : `go depth ${depth}`, lit le dernier `score cp`/`score mate` **et**
  `bestmove` (ligne 68) ; `MultiPV` n'apparaît nulle part.
- Sévérités et `Danger position` dérivées à la lecture depuis `analysis/derivation.ts`
  (`gamePlies()` est le point d'entrée partagé).
- Pages clientes existantes : `Analyse`, `Danger`, `Explorer`, `Games`, `Openings`, `Stats`.

---

# Reprise du grilling (2026-08-21)

Branche resynchronisée sur `develop` (US-11 Profils incluse, merge 31abdf6). Conflit `BACKLOG.md`
résolu en autonomie : `develop` avait déplacé US-11 en `Done`, notre côté ajoutait US-15 en `To do`
— les deux intentions **composent**, aucune décision opposée (cf. skill `git-flow`).

## Faits vérifiés à la reprise (ne pas re-mesurer)

- **`[%clk]` est bien présent** dans les PGN stockés, à chaque demi-coup
  (`1. e4 {[%clk 0:04:58.7]}`). G4 (pression du temps) est donc récupérable **sans ré-import ni
  ré-analyse**. Loose end fermé.
- **US-11 est mergée** : `games` et `analysis_passes` portent `profile_id` (ADR-0014). **Q10 est
  répondue par les faits** : tout agrégat de cette EPIC est cloisonné par profil par construction.
- **Coût moteur mesuré** (dernier `Analysis pass` en base) : **1199 positions en 11 min 06 s, soit
  ~0,56 s/position** à profondeur 16. **271 parties importées, 20 analysées.** Analyser l'existant
  ≈ 16 000 positions ≈ **2 h 30** ; une année (~650 parties) ≈ **6 h**. Le pass moteur est déjà, et
  de loin, le coût dominant de l'app.
- **G1 et G2 sont quasi gratuits** — correction de l'analyse d'écart du 2026-08-19, qui était trop
  pessimiste. `uci-driver.ts` collecte **toutes** les lignes `info` de la recherche et
  `parseEvaluation` lit `score` + `bestmove` puis **jette le reste**, dont ` pv e2e4 e7e5 …` : la
  variante principale est déjà là. Stocker le meilleur coup **et** la PV en MultiPV=1 coûte donc
  **zéro temps moteur supplémentaire** (un changement de parsing et deux colonnes). Le seul coût est
  la ré-analyse des 20 parties déjà faites (~11 min) ; les parties futures ne paient rien.

## Décisions prises à la reprise

### D3 — La méthode révisée de Q3 est **validée** par le demandeur

Donc : taux dans le bucket comparé à sa propre moyenne, **deux métriques co-égales** (erreurs
graves seuillées **et** winning chances perdues par Move), plus les trois garde-fous —
**restriction aux positions encore compétitives**, **verdict de dispersion avant tout classement**,
**intervalle affiché et classement sur sa borne conservatrice** (pas de lissage caché).

### D4 — Exigence de **méthodologie auditable** (ajout du demandeur, structurante)

> « Je veux être capable de comprendre et évaluer la méthodologie d'analyse. Le joueur doit pouvoir
> visualiser les analyses sur chaque partie pour comprendre comment l'analyse globale est calculée. »

Conséquences :

- **La première US de l'EPIC porte sur UNE partie**, pas sur l'agrégat : stocker meilleur coup + PV,
  classer chaque Move du joueur, et **rendre ce classement visible** sur la page Analyse. **Aucune
  page d'agrégat à l'étape 1.**
- Précédent invoqué : US-14 n'avait été acceptée qu'à la condition que la courbe porte *exactement*
  la même information que la barre et les valeurs par coup, « aucune divergence possible entre les
  trois vues ». D4 est la même discipline **un niveau plus haut** : le verdict global et la vue par
  partie doivent être **le même calcul**, pas deux implémentations qui s'accordent par chance.
- **Bénéfice d'ordonnancement** : Q3-bis (taux marginaux vs conditionnels) est **repoussée** jusqu'à
  ce qu'on ait de vraies données par coup sous les yeux — bien meilleure position pour trancher que
  celle où on était bloqué.

### D5 — Réconciliation exacte : option **(c)** retenue

Une partie doit porter **tout** ce que l'agrégat consomme :

- par Move du joueur : delta de winning chances, sévérité, **meilleur coup + PV**, les étiquettes
  d'axes, et — décisif — **si ce Move compte, et sinon pourquoi pas** (« position déjà décidée »,
  « coup forcé ») ;
- un **récapitulatif par partie** : combien de Moves comptés, combien d'erreurs comptées, quel
  pourcentage de chances perdues. Sommer ce récapitulatif sur les parties **donne** l'agrégat, par
  construction ;
- une **représentation de la dérive** : le tracé cumulé des chances perdues, sur le même axe que
  l'`Evaluation curve` d'US-14, pour qu'un saignement lent soit **visible comme une pente** plutôt
  que déduit d'une colonne de petits nombres.

Pourquoi la dérive n'est pas optionnelle : c'est la seule chose que cette EPIC peut révéler qu'aucune
vue existante ne montre, c'est la métrique la plus vulnérable au bruit de profondeur 16 (problème 5),
et c'est celle qu'il faut pouvoir **vérifier à l'œil sur une partie réelle** avant de croire un
agrégat bâti dessus. Sans ça, aucune base pour croire une page qui annonce « ta faiblesse est la
dérive » — soit exactement la confiance que D4 demande de pouvoir évaluer.

Sans D5, le scénario qui casse tout : une partie où le joueur a joué quatre `??` peut contribuer
**zéro** erreur au profil, parce que les quatre sont arrivés après que la partie était perdue. La
page afficherait « 4 gaffes » et l'agrégat n'en compterait aucune — l'écart est précisément ce qu'il
faut expliquer.

### D6 — **La donnée et sa présentation sont deux contraintes distinctes** (cadrage du demandeur)

> « Une partie doit porter toutes ces informations. Cependant l'UI ne doit pas forcément tout
> rassembler en une seule page. Je ne veux pas que l'UI décide de ma représentation des données. »

**Contrainte permanente de l'EPIC** : le modèle (ce qu'une partie porte) est décidé **sans égard**
pour la mise en page. Le découpage UI (une page, un panneau, une seconde route) est une question
**aval, décidable séparément** — la densité de la page Analyse (plateau + liste de coups + barre +
courbe) est un vrai problème de mise en page, mais elle **n'a pas le droit d'amputer le modèle**.

### D7 — Moteur : **MultiPV=2 voulu**, sous condition de mesure

Deux des garde-fous de D3 dépendent du **deuxième meilleur** coup, pas seulement du meilleur, et les
deux découlent du même nombre `eval(best) − eval(2e best)` :

- **coups quasi forcés exclus du dénominateur** (problème 6) — « un seul coup légal » est gratuit
  (`chess.js` compte les coups légaux, aucun moteur), mais le cas qui compte vraiment est « un seul
  coup **raisonnable** » : on a joué le seul coup non perdant, ni mérite ni faute ;
- **caractère tranchant** (calme vs tranchant), axe candidat.

MultiPV=2 suffit (pas besoin d'un top-5). Attente honnête de surcoût : **1,3–1,8×** (l'arbre est
partagé, mais des élagages deviennent interdits).

**Décision du demandeur** : MultiPV=2 est **l'intention**, mais on **mesure** sur ~50 parties, comme
US-10b avait mesuré `/danger` avant de décider :

- **< 1,5×** → gardé sans discussion ;
- **1,5× – 2×** → on **revient au demandeur** (« question it »), ce n'est pas un arbitrage d'agent ;
- **> 2×** → ce n'est plus un réglage mais une refonte de la méthode.

**La profondeur n'est pas la variable d'ajustement** : passer de 16 à 14 halverait le coût et
paierait MultiPV=2, mais ADR-0009 a fixé 16 pour la **reproductibilité**, et baisser la profondeur
aggrave le bruit (problème 5) **exactement** sur la métrique de dérive que D5 impose de pouvoir
regarder. Une analyse moins chère d'un signal plus bruité est un mauvais échange pour un outil dont
le produit est la confiance.

### D8 — Contexte oui, **nature de l'erreur pas encore**, dérive comme **résidu**

Première proposition (contexte × nature, nature à trois valeurs, dérive comme **span**) : **corrigée
après critique**, elle avait cinq défauts dont deux rédhibitoires.

- **Double comptage** : un span de dérive qui somme les pertes sur cinq coups dont un `?` à −25 %
  compte ces 25 % **deux fois** (numérateur d'erreurs *et* total de dérive). Les deux métriques de D3
  cessent d'être complémentaires, et surtout **D5 casse** : le récapitulatif par partie ne se
  décompose plus, donc sommer les parties ne redonne plus l'agrégat.
- **Un « span » n'a pas de frontière non arbitraire** : toute définition (« ≥3 coups consécutifs à
  moins de 10 % chacun, total > 20 % ») introduit deux nouveaux réglages, et deux segmentations
  différentes donnent deux totaux de dérive pour la même partie. La forme regardée dépendrait donc de
  paramètres invisibles — **D4 violé par l'objet même censé le satisfaire**.
- **Le critère « tactique » proposé était mauvais** (« le meilleur coup était une prise ou un échec et
  pas le tien ») : beaucoup de tactiques commencent par un coup calme, beaucoup de prises sont
  positionnelles. Étiquette souvent fausse avec assurance — exactement le mode d'échec pour lequel le
  LLM avait été écarté (D2). Rejeter le non-déterminisme pour livrer un classifieur déterministe et
  faux n'est pas un progrès.
- **Contradiction interne sur la taille d'échantillon** : contexte × nature **est** une tabulation
  croisée, celle-là même écartée pour le problème 1. « 70 % de tes pertes en finale sont de la
  dérive » demande assez d'erreurs de finale pour les diviser en trois ; sur 271 parties on en aura
  peut-être 30, soit ~10 par case.
- « 70 % de ce que tu perds » **mélange les deux métriques** (70 % des erreurs signalées, ou 70 % des
  chances perdues ? deux nombres, deux sens).

**Modèle retenu, plus simple :**

1. **Les axes de contexte** (phase, matériel, horloge, caractère tranchant) sont des faits sur la
   **position**, vrais avant de jouer et indépendants de ce qu'on joue : ils partitionnent le
   **dénominateur**. Ils restent.
2. **La dérive est un résidu, par construction.** Pour une partie, le total de winning chances
   perdues par le joueur se partitionne **exactement** en deux : la part imputable aux **Moves
   signalés** (`?!`/`?`/`??`, ceux qu'on peut montrer du doigt) et **tout le reste** — la somme des
   pertes sur les Moves qui n'ont individuellement franchi aucun seuil. **Ce reste EST la dérive.**
   Pas de span, pas de segmentation, aucun nouveau réglage, aucun double comptage : les deux parts
   font le total par définition. Directement lisible sur le tracé cumulé de D5 — **les pertes
   signalées sont les falaises, la dérive est la pente entre elles** — et l'arithmétique est
   vérifiable à la main sur une partie, ce que D4 exige. Le seuil qui définit « signalé » est déjà
   public (10 %, `CONTEXT.md`) : rien de caché ne gouverne le partage.
3. **Aucune étiquette de nature d'erreur à l'étape 1.** À la place : **montrer les variantes**. Le
   pass évaluant **toutes** les positions, deux PV sortent gratuitement autour de chaque Move joué —
   celle de la position **avant** (commence par le meilleur coup : *ce qu'il fallait jouer et la
   suite*) et celle de la position **après** (commence par la meilleure réponse adverse : *pourquoi
   le coup est mauvais*, la réfutation). La seconde est en général la plus parlante. Les deux sont
   déjà calculées aujourd'hui et jetées.

Forme d'une entrée, sans étiquette :

> **17. Nf3?** −28 % (72 % → 44 %)
> Meilleur : **Bxh7+** — `Bxh7+ Kxh7 Ng5+ Kg8 Qh5 Re8 Qxf7+` → +1.9
> Après Nf3, les Noirs jouent **Qd4+** — `Qd4+ Kh1 Qxa1` → −1.4

Cela en dit **plus** qu'une étiquette « erreur tactique », et chaque caractère est de la sortie
moteur plutôt que de l'interprétation maison. Ce que « pas d'étiquette » coûte est réel et assumé :
**on ne peut pas dire « 38 % de tes erreurs sont tactiques »** sans classifieur, donc cette phrase-là
n'existe pas à l'étape 1. Les axes de **contexte** restent comptables, eux, parce que ce sont des
faits sur la position et non des interprétations de l'erreur.

Les étiquettes arrivent **plus tard**, avec le chantier (i), un motif à la fois, chacune étant un
prédicat nommé et vérifiable sur les parties qu'on a justement passé du temps à lire.

### D9 — Provenance **portée par le pass**, et la relation manquante est réparée

Ce qu'un `evaluations` row portera en plus (décidé) :

- **`pv`** — la variante principale **entière**, en **UCI**, telle que le moteur la sort. **Une seule
  colonne, pas de `bestmove` séparé** : le meilleur coup est la tête de la PV, deux colonnes
  pourraient diverger pour rien. *(Nuance assumée : la ligne UCI `bestmove` peut, rarement, différer de
  la tête de la dernière `info … pv` ; on adopte la tête de la PV.)* Entière et non tronquée, parce
  que tronquer « à ce qu'on affiche » ferait entrer une décision de présentation dans la donnée —
  l'erreur qu'ADR-0009 existe pour empêcher, et que D6 interdit. UCI et non SAN : c'est l'artefact
  brut, la conversion pour l'affichage est un rejeu de plateau, bon marché pour **une** partie à la
  demande (la leçon d'ADR-0012 portait sur le rejeu de **toutes** les parties à **chaque** requête).
  Coût : ~120 o/ligne, ~5 Mo pour une année — même ordre que les 3 Mo acceptés par ADR-0012.
- **`cp2` / `mate2`** — le score de la **deuxième** ligne seulement, **pas** sa PV : l'écart
  `eval(best) − eval(2e)` est tout ce dont les deux usages de D7 ont besoin.

**Provenance : sur le pass** (choix du demandeur), donc :

- **`evaluations.pass_id`** — la relation qui **manque aujourd'hui** : `analysis_passes.gameIds` est
  un tableau JSON, il n'existe **aucune** jointure d'une évaluation vers le pass qui l'a écrite. Les
  réglages (`depth`, `multipv`) vivent sur `analysis_passes`, une ligne par pass, au lieu d'être
  répétés 40 000 fois.
- **Le point à vérifier l'a été, et le piège est réel mais contourné.** `analyzeGame`
  (`server/src/analysis/service.ts`) **reprend volontairement en milieu de partie** : il compte les
  lignes déjà stockées et redémarre au premier ply manquant, pour ne jamais dépenser deux fois du
  temps moteur. Donc **les lignes d'une même partie peuvent venir de deux passes différentes** — par
  conception. La provenance **par pass** n'est donc pas bien définie *par partie*, mais elle l'est
  parfaitement **par ligne** : la jointure est `row → pass`, pas `game → pass`.

**Pourquoi la provenance est nécessaire** (par force décroissante) :

1. **Elle rend la méthodologie auto-descriptive — l'exigence même de D4.** « Meilleur : Bxh7+, ligne
   …, +1.9 » est une **affirmation** ; « à profondeur 16, deux lignes explorées » en est la
   **justification**. Profondeur 16 dans un milieu de partie tranchant et profondeur 16 dans une
   finale de tours ne méritent pas la même confiance. Aujourd'hui la profondeur vit dans une
   constante de code et n'apparaît **nulle part** dans la donnée : rien d'affiché ne peut l'énoncer
   sans l'affirmer hors-bande.
2. **L'ambiguïté de `cp2` null produit des agrégats silencieusement faux.** Pendant la mesure de D7,
   deux régimes cohabiteront **volontairement** (~50 parties avec deuxième ligne, ~221 sans).
   L'exclusion des coups forcés lit « pas de deuxième ligne » comme « position forcée » et sort le
   coup du **dénominateur** — donc 221 parties de coups exclus à tort, exactement là où vivent les
   taux de D3. Chiffres faux, aucune exception, invisible à l'œil.
3. **La promesse centrale d'ADR-0009 n'est vraie que si les lignes disent ce qu'elles sont.** « Retuner
   sans relancer le moteur » et « profondeur 16 fixée pour la reproductibilité » ne sont tenus
   aujourd'hui que par une constante. Le jour où elle change — et le problème 5 (bruit de profondeur
   sur la dérive) peut l'imposer — la table devient hétérogène sans moyen de le détecter *après coup*.
   Aggravant pour cette EPIC : la **dérive est une somme de petits deltas**, la grandeur la plus
   sensible à la profondeur. Mélanger 14 et 16 et « ma dérive s'améliore » devient un artefact de la
   **date d'analyse**. Q8 (suivi dans le temps) est bâtie juste au-dessus de ce piège.
4. **« Quelles lignes refaire » devient une requête au lieu d'une heuristique.** ADR-0012 a eu besoin
   de `repairMissingFens`, qui devait *détecter* les lignes périmées par leur sentinelle, faute de
   pouvoir les interroger. Coût déjà payé une fois.

*(Honnêteté : 2 est évitable par discipline — ne jamais mélanger les régimes — et 4 est du confort.
**1 et 3 sont les raisons durables** : l'homogénéité est une propriété qu'il faut **penser** à
maintenir, la provenance une propriété qu'on peut **lire**.)*

**Deux conséquences, dont une vraie modification de comportement :**

1. `pass_id` répare plus que la provenance : la sémantique interrompu/échoué d'ADR-0011 ne sait pas
   aujourd'hui distinguer les lignes d'un pass partiel de celles d'un pass complet, et
   `evaluatedPositions` compte **toutes** les lignes des parties visées — y compris celles écrites
   par un pass interrompu antérieur — donc **un pass repris affiche du travail hérité comme sa propre
   progression**. Les deux deviennent répondables.
2. **La reprise doit désormais vérifier la provenance.** Si une partie porte des lignes
   profondeur-16/MultiPV-1 et que le pass courant tourne en MultiPV-2, reprendre au ply *n*
   laisserait cette partie avec des lignes de **régimes mélangés** — et la dérive, somme sur tous les
   plys d'une partie, mélangerait silencieusement deux profondeurs **à l'intérieur d'un seul
   nombre**. Donc : **reprendre seulement si le régime correspond, sinon jeter les lignes et
   réévaluer la partie entière.** C'est plus strict que le « les Evaluations sont conservées et jamais
   recalculées » de `CONTEXT.md` : un **rétrécissement délibéré** d'une règle du glossaire, à assumer
   explicitement et non à glisser en silence.

### D10 — Terminologie écrite dans `CONTEXT.md`, et les seuils de **Phase**

Cinq termes ajoutés au glossaire : **Best line**, **Phase**, **Counted Move**, **Drift**,
**Search regime**. Délibérément **pas** de terme pour l'agrégat ni pour la « faiblesse » elle-même :
l'étape 1 ne les construit pas, et un glossaire ne porte pas le vocabulaire de ce qui n'existe pas.
La réservation de `Weak opening` sur *Weakness / Weak spot* (Q4) reste donc **intacte pour
l'instant** — elle ne se pose qu'à l'US de l'agrégat.

**Collision réglée : `Opening` était déjà pris** (la ligne classée ECO de chess.com, ADR-0007). Un
axe dont une valeur s'appellerait « opening » rendrait « tes erreurs sont dans l'ouverture » ambigu
entre *la phase* et *la ligne jouée* — deux affirmations différentes que cette EPIC fera côte à côte,
et qui peuvent se contredire (une partie quitte son `Opening` au coup 6 et est encore en début de
partie au coup 12). Option retenue : **(a) renommer les valeurs de phase** — *Early game /
Middlegame / Endgame* — ce qui rend l'ambiguïté **structurellement impossible** au lieu de
simplement déconseillée. (b) « phase d'ouverture » comptait sur un qualificatif qui saute dès que la
place manque, exactement là où la discipline échoue. (c) renommer le terme existant était le plus
propre sémantiquement mais payait du churn (`CONTEXT.md`, ADR-0007, une page, une route, deux
colonnes) pour un terme qui n'est pas faux, juste populaire.

**Seuils de Phase — point de départ assumé, à ajuster en regardant de vraies parties** (décision du
demandeur). Il n'y a **pas de fait** en la matière : c'est une heuristique, et c'est précisément
pourquoi D4 exige de l'afficher.

- La **phase est dérivée, jamais stockée** (esprit d'ADR-0009) : calculable depuis le FEN déjà
  stocké par ply (ADR-0012), donc gratuite et **retunable sans relancer le moteur** — ce qu'on va
  vouloir faire dès les premières parties regardées.
- **Le matériel ne peut pas décider la frontière du début de partie** (il ne bouge presque pas avant
  le coup 15) : les deux frontières demandent **des règles différentes**. C'est la part qu'on rate en
  cherchant un critère unique et élégant.
- **Early game** finit au plus tôt de : **développement terminé** (les quatre pièces mineures ont
  quitté leur case d'origine et le roi a castlé ou perdu le droit) ou **plafond dur au coup 15**.
- **Endgame** commence quand les pièces majeures et mineures sur l'échiquier, **les deux camps
  confondus**, tombent à **six ou moins**.
- **Middlegame** = le reste, par exclusion (même discipline que `Drift`).
- **Latching obligatoire** : le matériel est monotone **sauf promotion** — une dame promue peut
  repasser au-dessus du seuil et faire *sortir* la partie de la finale puis y rentrer. Donc une fois
  en Endgame, on y reste. La phase est une propriété de **l'avancement de la partie**, pas un verdict
  indépendant sur chaque position (d'où : deux FEN identiques atteints dans deux parties peuvent en
  principe être dans des phases différentes — énoncé dans le glossaire pour que ce ne soit pas lu
  comme une fonction pure du FEN).
- Familles écartées : **numéro de coup seul** (une position à quatre pièces au coup 14 est une finale
  pour n'importe quel lecteur raisonnable) ; **prédicats structurels complets** (les plus proches du
  jugement humain, les plus laborieux — gardés en réserve pour l'ajustement).

**Conséquence sur un terme existant** : `Analysis pass` disait « les Evaluations ne sont jamais
recalculées ». Avec D9 (conséquence 2), c'est faux dans un cas. L'entrée du glossaire a été
**amendée** plutôt que laissée en contradiction : exception explicite pour un changement de
`Search regime`.

### D11 — Les deux seuils d'exclusion de `Counted Move`

**(a) « Déjà décidée » est ASYMÉTRIQUE — la bande 85/15 de Q3 était fausse.** Une bande symétrique
exclurait un Move joué à 88 % aussi bien qu'à 12 %, alors que les deux cas n'ont rien en commun :

- à **12 %**, il n'y a **plus rien à perdre** : le maximum qu'un Move peut coûter est 12 points de
  winning chances, à peine au-dessus du plancher `Inaccuracy` — la métrique **ne peut
  structurellement pas** enregistrer une vraie erreur. Ces Moves ne font que **gonfler le
  dénominateur**.
- à **88 %**, il y a **énormément** à perdre : une gaffe peut faire passer de 88 % à 30 %, soit une
  chute de 58 points, largement un `Blunder` — et c'est **l'incapacité à convertir une position
  gagnante**, une des faiblesses les plus réelles et les plus répandues. Une bande symétrique
  **supprimerait purement et simplement ce constat** de l'outil. Pour un produit dont le but est de
  dire sur quoi travailler, cacher « tu laisses filer tes parties gagnées » est un très mauvais
  échange.

**Règle retenue** : ce n'est pas une bande autour de l'équilibre, mais « **une erreur signalable
pourrait-elle même se produire ici ?** ». Un Move est exclu quand les winning chances du joueur
**avant** ce Move sont **sous le plancher `Inaccuracy` (10 %)**, puisque la chute maximale possible
est alors plus petite que la plus petite chose qu'on signale. **Aucun nouveau réglage** : on réutilise
un seuil déjà publié dans `CONTEXT.md`. Et **toute position gagnante reste comptée**, donc le défaut
de conversion reste visible.

**(b) L'exclusion des coups forcés est juste, mais sa justification MultiPV de D7 était fausse — et
un peu dangereuse.** « Un seul coup *raisonnable* », détecté par l'écart meilleur/deuxième : en
déroulant, une position où le deuxième coup est 20 points moins bon est une position où **un seul coup
évite une erreur grave**. Or ce ne sont pas des coups peu instructifs : ce sont **les décisions les
plus tranchantes et les plus instructives de la partie**. Les exclure retirerait les coups les plus
difficiles du dénominateur — et, quand on s'est trompé, l'erreur du numérateur — donc on
supprimerait systématiquement les coups les plus informatifs de l'historique, **dans les deux sens**,
sans signe net.

La motivation d'origine (problème 6) était plus étroite et reste valable : **un coup forcé ne peut
jamais être une erreur, c'est donc du pur remplissage de dénominateur**, et sa part varie selon le
bucket. Elle est satisfaite par la définition **gratuite** : **un seul coup légal**, compté par
`chess.js`, sans moteur.

**Conséquence sur D7, signalée au demandeur** : MultiPV=2 **perd une de ses deux justifications** et
ne repose plus que sur l'axe « tranchant » — par notre propre évaluation de Q5 le plus faible du lot
(le plus confondu, puisque les positions tranchantes sont celles où l'on brûle l'horloge → problème
1 ; et le moins actionnable).

**Décision du demandeur, réaffirmée après ce signalement : on garde MultiPV=2.** L'argument qui la
soutient : la ré-analyse est le coût cher et **une fois par partie** — si MultiPV=2 est un jour
voulu, le payer *pendant* la ré-analyse qu'on fait de toute façon est bien moins cher qu'un troisième
pass plus tard. La mesure de D7 (garder < 1,5×, revenir au demandeur entre 1,5× et 2×, refonte
au-delà de 2×) **reste due**.

### D12 — La roadmap de l'EPIC (validée)

Nommage suivant le précédent `US-10a`/`US-10b` du backlog : l'EPIC est US-15, ses stories sont
lettrées.

- **US-15a — Comprendre l'analyse sur une partie.** Tout D4/D5, **une** partie, **aucun agrégat**.
  Porte le travail cher et irréversible, puisque tout l'aval le lit : `evaluations` gagne `pv`,
  `cp2`/`mate2`, `pass_id` ; `analysis_passes` gagne le `Search regime` ; MultiPV=2 dans le driver UCI
  **avec la mesure de D7 rendue dans la story** ; ré-analyse de la bibliothèque et reprise restreinte
  au même régime ; dérivation de `Phase`, `Counted Move` + motif, `Drift` en résidu, et le
  récapitulatif par partie qui somme vers le futur agrégat ; sur la page Analyse (mise en page libre,
  D6) le relevé par Move avec `Best line` + réfutation, et le tracé cumulé de la dérive.
- **US-15b — La pression du temps.** Parser `[%clk]`, ajouter le temps par Move au relevé. Bon marché
  (ni ré-analyse ni ré-import), et c'est l'axe le plus susceptible d'**expliquer** ce qu'on impute à
  la phase — l'assaut direct sur le problème 1. **Story séparée (choix du demandeur)** pour que 15a
  puisse sortir.
- **US-15c — L'agrégat sur tout l'historique.** Taux par bucket, intervalles, verdict de dispersion
  capable de dire « rien ne ressort ». **C'est là que Q3-bis est enfin tranchée** — marginal vs
  conditionnel — avec de vraies données par Move sous les yeux plutôt que dans l'abstrait. La
  réconciliation avec le récapitulatif de 15a est un **critère d'acceptation**.
- **US-15d — Le verdict : sur quoi travailler.** La sortie classée et la page d'entrée. C'est là que
  la réservation sur `Weakness` est levée, et que se règle le sort de `/openings` et `/danger`
  (preuves vers lesquelles on descend, ou vues autonomes).
- **US-15e+ — Les motifs, un par un.** Le chantier (i) : chaque motif un prédicat nommé, validé sur
  ses propres parties — qu'on aura alors passé des mois à lire via les `Best line`.
- **Plus tard, non planifié — le suivi dans le temps** (G6/Q8) : est-ce que ça s'améliore ? Laissé
  non planifié exprès : demande la comparabilité par `Search regime` pour avoir un sens, et c'est la
  pièce que 15c et 15d ont le plus de chances de remodeler.

**Deux avertissements assumés :**

- **15a est grosse pour une story** (migration de schéma + changement moteur + une mesure +
  ré-analyse + nouvelle dérivation + nouvelle visualisation). Elle voudra des tranches internes
  (`/to-issues`) ; balle traçante probable : schéma + régime + PV stockée → le relevé par Move à
  l'écran pour une partie → le tracé de dérive → le récapitulatif.
- **15a ne prouve rien de la thèse de l'EPIC**, puisqu'elle n'a pas d'agrégat. C'est un **coût
  délibéré** de l'exigence de méthodologie : après 15a on aura une vue par partie belle et auditable
  et **toujours aucune idée** de ses faiblesses. Le gain, c'est qu'à l'arrivée de 15c on pourra la
  **croire**. La valeur de 15a se juge donc à « je peux évaluer la méthode », pas à « je sais sur quoi
  travailler ».

### D13 — ADR-0016 et ADR-0017 écrites — et **correction de D9** par ADR-0015

**ADR-0015 (« the local database now holds irreplaceable data »), prise entre les deux sessions de
grilling, invalide une recommandation de D9.** Elle retire explicitement la licence « wipe and
re-import », qu'elle **nomme perte de données** : rien ne reconstruit une `Evaluation` sinon du temps
moteur, il n'y a pas d'amont où la refetcher. La liberté conservée est celle de **changer le modèle**,
pas celle de **perdre la donnée** — donc tout changement de schéma **doit** embarquer sa migration.

Conséquences sur ce qui avait été décidé :

- **« Wipe et ré-analyse pour la transition » (D9) est retiré.** À la place, la migration crée un
  **pass synthétique** portant le régime réellement utilisé (profondeur 16, une ligne) et y rattache
  les 1199 `Evaluation`s existantes. Elles gardent un `pv` null, ce qui est **honnête** : la ligne n'a
  jamais été stockée et **aucun rejeu ne peut la retrouver** — contrairement aux FEN d'ADR-0012,
  récupérables depuis le PGN, ce qui est précisément pourquoi cette réparation-là pouvait être
  automatique et pas celle-ci. Ré-analyser ces 20 parties pour remplir leurs lignes devient un
  **choix du joueur à ~11 minutes**, pas une exigence de migration.
- **La conséquence 2 de D9 (reprise : jeter les lignes et réévaluer la partie entière) est
  maintenue, mais nommée.** C'est une vraie perte de données calculées, acceptée uniquement parce
  qu'une partie dont les chiffres mélangent silencieusement deux régimes est **pire** qu'une partie
  réévaluée : la première est fausse sans le dire. Elle reste bornée par le fait de rester
  **déclenchée par le joueur**, comme tout run moteur de l'app.

**ADR-0016 — « An `Analysis pass` records what it searched under »** : `pv` entière en UCI (une seule
colonne), `cp2`/`mate2`, `evaluations.pass_id`, `Search regime` sur le pass, l'exception au « jamais
recalculées », la migration ci-dessus, et la mesure MultiPV due en 15a.

**ADR-0017 — « The verdict is a fold over per-Game records »** : une partie porte tout ce que
l'agrégat consomme (y compris **pourquoi** un Move ne compte pas), l'agrégat est ce récapitulatif
**sommé**, donc la réconciliation est la **définition** et non un test qu'on espère vert. Porte aussi
les deux corollaires (donnée ≠ présentation ; la vue par partie d'abord), et les conséquences
`Drift`-résidu, seuils ancrés sur des nombres déjà publiés, et pas d'étiquette avant validation.

**Pas d'ADR, délibérément** : les seuils de `Phase` et `Drift`-comme-résidu sont **dérivés**,
retunables sans relancer le moteur, et déjà énoncés dans `CONTEXT.md` — les défaire ne coûte rien,
donc ils échouent au premier test. L'absence d'étiquette de nature est un « pas encore » que 15e
renverse par construction.

### D14 — US-15a est **isolée sur sa propre branche d'intégration**

Décision du demandeur (2026-08-21) : il compte développer **une autre feature** avant d'attaquer le
reste de l'EPIC, donc **US-15a ne doit pas attendre l'EPIC pour être mergée**. Elle a sa propre
branche d'intégration, `integration/US-15a-per-game-analysis`, et part vers `develop` **dès la fin de
15a** — pour bénéficier de l'analyse partie par partie tout de suite.

Conséquences d'organisation :

- La branche `integration/US-15-weakness-profile` **ne porte plus que le grilling** (glossaire, ADR,
  notes) et n'accumulera **pas** les sous-issues. Elle n'est pas la branche d'intégration d'une story
  mais le lieu où le grilling de l'EPIC a été écrit.
- **La branche de 15a part de la branche d'EPIC**, pas de `develop` : 15a implémente exactement les
  termes et les ADR écrits pendant le grilling, donc elle a besoin de les porter. La sortie du
  grilling **voyage avec la première story qui la consomme**, et arrive dans `develop` avec elle.
- **15b→15e repartiront de `develop`** (à jour, donc contenant le glossaire et les ADR), chacune avec
  sa propre branche d'intégration si le même besoin d'isolement se présente. L'EPIC reste un
  regroupement de backlog, plus une branche vivante.
- Risque à surveiller : la « autre feature » développée en parallèle touchera probablement
  `BACKLOG.md` et peut-être `CONTEXT.md` — les deux fichiers que le skill `git-flow` désigne comme
  structurellement conflictuels. Conflit attendu, pas surprenant ; il opposera des insertions qui
  **composent** (deux stories dans des sections différentes), donc résoluble en autonomie.
