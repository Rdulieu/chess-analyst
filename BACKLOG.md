# Backlog

## To do

- **US-15 (EPIC)**: Savoir sur quoi travailler — identifier mes points faibles par **thèmes**, pas
  seulement par ouverture ou par position.
  > **Recadrage de l'objectif du produit** (2026-08-19). **Grillée** (2026-08-21) — état complet et
  > raisonnement : `.scratch/weakness-profile/GRILL-NOTES.md` (décisions D1→D12). `CONTEXT.md` :
  > cinq termes ajoutés (**Best line**, **Phase**, **Counted Move**, **Drift**, **Search regime**),
  > et `Analysis pass` amendée. Branche `integration/US-15-weakness-profile`.
  >
  > **Roadmap** — l'EPIC se découpe en stories lettrées (précédent US-10a/US-10b) :
  > - **US-15a** — Comprendre l'analyse sur **une** partie. Sortie de l'EPIC en story autonome, sur
  >   sa propre branche d'intégration : **livrée et mergée** (PR #58, 2026-08-23), voir `## Done`.
  > - **US-15b** — La pression du temps (parser `[%clk]`, aucun coût moteur).
  > - **US-15a-bis** — Approfondir la vue par partie sur de vraies parties **avant** l'agrégat
  >   (demandé le 2026-08-23, après la livraison de 15a). **Bloque 15c** : l'agrégat étant la somme
  >   du récapitulatif par partie (ADR-0017), tout approximatif se propage.
  > - **US-15c** — L'agrégat sur tout l'historique ; c'est là que se tranche « taux marginaux vs
  >   conditionnels », avec de vraies données sous les yeux.
  > - **US-15d** — Le verdict « sur quoi travailler » (et le sort de `/openings` et `/danger`).
  > - **US-15e+** — Les motifs, un par un.
  > - Non planifié : le suivi dans le temps (est-ce que ça s'améliore ?).
  >
  > Ce n'est **pas une US mais une EPIC** : elle se découpera en plusieurs US grillées séparément.
  > Les briques existantes (`/openings`, `/danger`, annotations `?!`/`?`/`??`) ont été construites
  > parce qu'elles étaient les plus simples, pas parce qu'elles étaient le but : l'app **détecte**
  > déjà des faiblesses sous trois formes, mais ne rend **aucun verdict** et ne dit jamais la
  > **cause**.
  >
  > Déjà tranché :
  > - L'objectif est bien le **thème** (« je m'effondre en finale », « je rate les fourchettes »),
  >   pas un classement des briques actuelles.
  > - Méthode : **dorsale sans motifs** (axes dérivés du moteur et du FEN — phase, matériel,
  >   tactique manquée vs dérive, pression du temps, position calme/tranchante), puis **détection par
  >   règles greffée un motif à la fois**. **Pas de LLM** (décision du demandeur).
  > - **Premier chantier** : le moteur calcule `bestmove` **et la variante**, et on les **jette** —
  >   `uci-driver.ts` collecte toutes les lignes `info` puis n'en garde que le score et `bestmove`.
  >   Tout motif est une affirmation sur l'écart entre le coup joué et le meilleur coup, donc sans
  >   elles rien n'est possible. **Les stocker ne coûte aucun temps moteur** (un changement de parsing
  >   et deux colonnes) ; seule la ré-analyse des parties déjà faites se paie. MultiPV=2, lui, se paie
  >   vraiment — d'où la mesure due en 15a.
  > - **Méthodologie auditable** (exigence structurante du demandeur) : le joueur doit pouvoir
  >   **comprendre et évaluer** la méthode, donc la vue par partie et le verdict global sont **le même
  >   calcul**, et une partie porte **tout** ce que l'agrégat consomme — y compris **pourquoi un coup
  >   ne compte pas**. C'est pourquoi la première story ne porte que sur **une** partie.
  > - La **donnée et sa présentation sont deux contraintes distinctes** : l'UI ne décide pas du
  >   modèle.
  > - Pas d'étiquette « erreur tactique / positionnelle » à l'étape 1 : on **montre la variante**
  >   (déjà calculée et jetée aujourd'hui) plutôt que d'affirmer une catégorie qu'on classerait mal.
  >
  > Reste ouvert, à trancher en **15c** avec les données en main : taux marginaux ou conditionnels.
  > Les axes sont **corrélés** (en blitz les coups de finale *sont* les coups à faible horloge), donc
  > un classement par axe risque de dire « travaille tes finales » quand la vraie cause est
  > l'horloge — d'où 15b avant 15c.
  >
  > Dépendance **levée** : US-11 (Profils) est mergée, `games` et `analysis_passes` portent
  > `profile_id`, donc tout agrégat de l'EPIC naît cloisonné par construction.

- **US-16c**: Explorer mes variantes et savoir ce qu'elles valent.
  > **Grillée le 2026-08-24.** Sort **en dernier** : c'est la partie la plus chère (éditer un arbre sur
  > l'échiquier), la seule qui coûte du temps moteur, et la seule abandonnable si l'exercice ne prend
  > pas. Elle est verticalement complète seule (éditeur + `Line check` + sa lecture dans la
  > `Confrontation`), donc la différer ne laisse rien d'inachevé.
  >
  > - **Une `Candidate line` est jugée par ce qu'elle coûte, jamais par la coïncidence** avec la
  >   `Best line` : le critère textuel est gratuit mais **apprend l'imitation** — il déclarerait fausse
  >   une idée qui perd 2 %. On évalue la Position atteinte (`Line check`), **temps moteur assumé**, à
  >   la demande.
  > - **`Line check` n'est pas une `Analysis pass`** : la Position atteinte n'appartient à **aucun**
  >   `Game`. Les confondre corromprait « cette partie est analysée » et les compteurs de progression.
  >   Le `Search regime` est porté quand même, sinon le verdict est un artefact de profondeur.
  > - **Ligne plate, pas un arbre** : symétrie avec `Best line` ; une variante dans une variante n'a
  >   personne en face.
  > - **C'est ici qu'ADR-0004 est enfin exploité** — `cm-chess` tient l'arbre **en mémoire** pendant
  >   l'édition et **écrit** le PGN annoté en export ; `history.ts` continue d'aplatir pour le replay.
  >
  > Attention livraison : le titre d'origine d'US-16 promettait les variations. **US-16a n'en a pas**,
  > et c'est voulu.

- **US-22**: Rendre la route de lecture agréable à tenir sur trente coups — pour qu'annoter une
  partie entière soit un exercice et non une corvée.
  > **Pas encore grillée.** Demandée le 2026-08-25, après revue d'US-16a livrée : « l'US-16a est
  > bonne mais l'interface pourra être améliorée ».
  >
  > ### Le défaut nommé : **le format de la page change à chaque coup cliqué**
  >
  > Observé par le demandeur sur l'app livrée, le 2026-08-25. Ce n'est pas une amélioration
  > d'ergonomie, c'est une **correction** : le projet tient déjà le principe inverse depuis US-14 —
  > « cacher les annotations ne doit pas déplacer la position que le joueur est en train de lire ».
  > Ce principe a été tenu **au-dessus du diagramme**, par l'ordre du document, et **jamais appliqué
  > d'un ply au suivant** dans le panneau latéral. Or on change de coup bien plus souvent qu'on ne
  > change de niveau de revue.
  >
  > **Cause probable, vérifiée dans le code** (`client/src/features/personal/`) : cinq blocs
  > apparaissent et disparaissent selon le ply, et **aucun `min-height` ne réserve leur place** dans
  > `_dense.scss`.
  >
  > | Bloc | Condition | Fréquence du saut |
  > | --- | --- | --- |
  > | La notice « Coup de l'adversaire… » | `!playersOwnMove` | **un coup sur deux** — c'est le principal suspect |
  > | Le fieldset de verdict | absent si `ply === 0` | à l'entrée et à la sortie de la position de départ |
  > | Le contrôle de moment clé | absent si `ply === 0` | idem |
  > | La note sur la partie | absente au ply 0, et absente s'il n'y en a pas | idem |
  > | Le relevé de la couche scellée | seulement sur les plys portant une marque scellée, **hauteur variable** selon son contenu | à chaque coup, après scellement |
  >
  > Le panneau vit dans `[data-row="board"]`, **à côté** de l'échiquier : une variation de sa hauteur
  > peut donc faire bouger la rangée entière. À mesurer plutôt qu'à supposer — mais le mécanisme,
  > lui, est établi.
  >
  > **Ce que « corriger » veut probablement dire** : réserver la place plutôt que retirer le
  > contenu. Une notice qui alterne un coup sur deux peut occuper une hauteur constante, ou vivre à
  > un endroit stable de l'écran au lieu d'être collée au contrôle — ce qui rejoint la piste
  > « les notices une fois, pas à chaque coup » ci-dessous. **Ne pas la supprimer** : le garde-fou
  > n°1 s'applique.

  > ### Le constat : le fond est juste, la densité ne l'est pas
  >
  > US-16a a livré ce qu'elle promettait, et ses règles sont **bonnes** — chaque phrase de l'écran
  > existe pour une raison nommée au glossaire. Le problème n'est pas qu'une règle manque : c'est
  > que **toutes tiennent dans la même colonne de 14rem, à côté de l'échiquier**, et que le prix se
  > paie coup après coup.
  >
  > Ce que le panneau empile aujourd'hui, sur **un seul** ply : le fieldset de verdict (cinq radios,
  > un bouton « Retirer », plus la notice de coup adverse), l'éditeur de note (label, textarea, la
  > phrase « les notes ne sont jamais notées », deux boutons), le moment clé (case + notice de
  > pivot), la note sur la partie, le fieldset « Où j'en suis », l'action de scellement — puis, une
  > fois scellé, **les deux couches** (le relevé scellé *et* les contrôles postérieurs) plus la
  > notice de couche. Le tout au-dessus du stepper, du coup courant et de la liste des coups, qui
  > faisait **137 entrées** sur la partie mesurée par HP-01.
  >
  > **Quatre phrases explicatives atténuées à 13 px** cohabitent : coup adverse, notes jamais
  > notées, ni-bon-ni-faute, couche postérieure. Chacune est nécessaire **une fois** — la FP 03 a
  > d'ailleurs montré qu'empilées elles se lisent l'une comme la suite de l'autre (le compte des
  > moments clés passait pour une troisième ligne de l'explication du pivot). Aucune n'est de trop ;
  > c'est leur **répétition à chaque coup** qui est en cause.
  >
  > ### La mesure à faire d'abord
  >
  > **Rien de tout ça n'est mesuré.** La hauteur réelle du panneau, à combien de coups le
  > défilement commence, ce qui sort de l'écran sur un portable — inconnu. Les FP ont vérifié
  > l'absence de **débordement horizontal**, jamais le confort vertical. Ouvrir cette story sans
  > mesure serait refaire l'erreur qu'US-10b a évitée en commençant par chronométrer `/danger`
  > (3111 ms → 55 ms). **Première tranche : une mesure, sur une partie longue, en clair et en
  > sombre, à 1400 / 900 / 380 px.**
  >
  > ### Les frictions concrètes, telles qu'observées
  >
  > | Friction | Pourquoi ça pèse |
  > | --- | --- |
  > | Un verdict = **un clic** ; une note = **cliquer, taper, cliquer « Enregistrer »** | l'asymétrie décourage la note, qui est pourtant la seule partie où le joueur *pense* |
  > | **Aucun raccourci clavier** | le critère 40 d'US-16a voulait « peu de clics, coup après coup » ; c'est tenu pour le verdict seul |
  > | La note sur la partie est **lisible partout mais modifiable au ply 0 seulement** | corriger une pensée d'ensemble oblige à remonter au début |
  > | Après scellement le panneau **double** : deux couches rendues | l'état le plus riche est aussi le plus haut, au moment où le joueur découvre le moteur |
  > | **Aucune vue d'ensemble de sa lecture** | les glyphes de la liste des coups disent *où*, rien ne dit *quoi* sans parcourir |
  > | Le vocabulaire de glyphes `⚖ ✎ ◆` a été **choisi sous la pression d'une FP**, pas dessiné | il marche (deux crayons indiscernables l'ont précédé), il n'est pas un système |
  >
  > ### Ce qu'il ne faut pas « simplifier »
  >
  > Le risque de cette story est de gagner de la place en **retirant ce qui porte le sens**. Trois
  > garde-fous, chacun payé par une décision de grilling ou une FP :
  >
  > 1. **Les notices disent ce que l'app ne peut pas promettre autrement.** « Ce verdict ne sera pas
  >    noté » sur un coup adverse, « les notes ne sont jamais notées », « ni un bon coup ni une
  >    faute » — les cacher derrière une icône ou une infobulle les rend invisibles au moment
  >    exact où elles servent. Les **dire moins souvent** n'est pas les **dire moins clairement**.
  > 2. **La couche scellée reste lisible telle qu'elle était.** C'est le critère qui a coûté une
  >    seconde migration (`posterior` dans la clef). Aucune économie de hauteur ne peut la replier
  >    au point de la rendre facultative.
  > 3. **Rien en indice purement chromatique** (ADR-0013), et l'état dit **en mots**. La FP 05 a
  >    montré que le critère peut être tenu à la lettre et manqué en pratique : deux crayons que les
  >    noms accessibles distinguaient parfaitement et l'œil pas du tout à 16 px.
  >
  > ### Pistes, à trancher au grill
  >
  > - **Un verdict au clavier** (1–5 sur les cinq valeurs, flèches pour naviguer), qui rendrait
  >   « verdict, coup suivant, verdict » réellement rapide. Probablement le meilleur rapport
  >   valeur/coût de la story.
  > - **Les notices une fois, pas à chaque coup** — au premier usage, ou dans un endroit stable de
  >   l'écran plutôt que collé au contrôle. À arbitrer contre le garde-fou n°1.
  > - **Enregistrement de la note au fil de l'eau**, comme le verdict — le critère 20 d'US-16a
  >   demandait déjà « enregistrée au fil de l'eau » et le bouton explicite est une lecture stricte
  >   de « une note est une phrase en cours de composition ». À rouvrir.
  > - **Une vue d'ensemble de la lecture** : tous les coups marqués, avec leur marque, sur un écran.
  >   C'est aussi ce que la `Confrontation` d'US-16b voudra afficher — **d'où la question de
  >   séquencement ci-dessous**.
  > - **Replier la couche scellée** une fois lue, sans la rendre introuvable.
  > - **Le panneau ailleurs qu'à côté de l'échiquier** sur écran étroit — la contrainte d'US-14
  >   (rien au-dessus du diagramme ne doit bouger) porte sur le haut, pas sur le côté.
  >
  > ### Séquencement : **tranché — grilling après US-16b**
  >
  > Décision du demandeur, le 2026-08-25. Rien n'est urgent tant que le joueur n'a pas la
  > `Confrontation`, qui est la valeur qu'il attend ; et grillée après, cette story connaîtra la
  > **charge réelle** des écrans plutôt que de la deviner — US-16b y ajoute trois lectures côte à
  > côte, la matrice déclaré/mesuré, la part des dégâts et la couverture.
  >
  > **Conséquence à assumer** : US-16b sera donc conçue **dans la contrainte actuelle**, panneau
  > dense et format instable compris. Deux garde-fous pour que ce ne soit pas un piège :
  >
  > 1. **Le défaut de reflow ci-dessus ne doit pas être *étendu* par US-16b.** Tout bloc que 16b
  >    ajoute au panneau et qui apparaît selon le ply aggrave exactement le symptôme signalé ici.
  >    À dire au grilling de 16b, pas seulement à celui-ci.
  > 2. **La mesure de la première tranche reste faite tôt si l'occasion se présente** — elle vaut
  >    dans les deux ordres, et une mesure avant 16b donne un point de comparaison qu'on ne pourra
  >    plus obtenir après.
  >
  > ### Ce que cette story ne couvre pas
  >
  > La `Confrontation` (US-16b), les `Candidate line`s (US-16c), et l'export PGN annoté (ADR-0019,
  > toujours hors périmètre). Ni les quatre arbitrages produit déjà ouverts sur la PR #70 — le
  > dénominateur de la couverture, le `DELETE /api/profiles/:id` à 500, le pluriel du nom accessible
  > des résultats, la remise à `Départ` du niveau de l'explorateur — qui vivent là où ils sont.

- **US-15a-bis**: Approfondir l'analyse par partie avant de l'étendre — regarder de vraies parties,
  corriger ce que le premier jet a laissé approximatif, et seulement ensuite bâtir l'agrégat dessus.
  > **Pas encore grillée.** Demandée par le demandeur le 2026-08-23 après la livraison d'US-15a :
  > la feature « paraît pas mal pour un premier jet », mais elle mérite une passe d'analyse plus
  > poussée **avant** d'être étendue à l'analyse globale.
  >
  > **Elle bloque US-15c.** C'est la raison d'être de la story : ADR-0017 fait de l'agrégat la
  > **somme du récapitulatif par partie**, donc tout ce qui est approximatif ici est approximatif à
  > l'échelle du corpus, en pire — et corrigé après coup, il faudrait réécrire les deux côtés.
  > Corollaire heureux : rien de ce qui suit ne coûte de temps moteur, tout est **dérivé** (ADR-0009)
  > et donc retunable sans ré-analyse ni migration. C'est exactement pour cette passe que la
  > dérivation a été gardée hors du schéma.
  >
  > **Matière première déjà identifiée** — les points laissés ouverts par les sept FP, à instruire
  > sur de vraies parties plutôt qu'à trancher sur le papier :
  > - **Les seuils de `Phase`.** Annoncés « heuristiques, pas des faits » et affichés exprès pour
  >   être contestés. Le cap « coup 15 » est implémenté comme *le 15e coup des Blancs est le premier
  >   hors début de partie* ; l'autre lecture décale d'un coup entier. Et « développement achevé »
  >   est exigé **des deux camps** — lecture retenue, jamais validée sur des parties.
  > - **Le tracé de dérive reste en l'état pour l'instant — décision du demandeur (2026-08-23).** Le
  >   graphique est **gardé tel quel**, l'analyse détaillée est reportée à cette story. La tranche 06
  >   reste **écrite pour être supprimable** (dérivée client, aucun schéma, aucun temps moteur), donc
  >   rien n'est engagé par ce report.
  >   Ce qui est acquis pour cette analyse-là, à ne pas redécouvrir :
  >   - Le **chiffre** de `Drift` n'est pas en cause : c'est le résidu d'ADR-0017, il est en texte dans
  >     le récapitulatif et 15c le sommera. Seul le **dessin** est en question.
  >   - L'argument porteur du dessin n'est pas « falaises vs pente » mais **brut contre net** : la
  >     courbe mélange les pertes du Player et les cadeaux de l'adversaire, le tracé ne compte que les
  >     coups **comptés** du Player. Deux parties peuvent avoir la même courbe et des tracés très
  >     différents — c'est ce qui se voit sur la partie 51, où la position ne bougeait pas parce que
  >     l'adversaire rendait ce que le Player lâchait.
  >   - Parts de dérive mesurées : **25 %** (partie 41), **24 %** (72), **53 %** (51), **65 %** (86).
  >     Sur la moitié de cet échantillon la dérive porte la majorité de ce qui a été perdu — mais les
  >     parties avaient été choisies pour d'autres raisons, ce n'est pas un tirage.
  > - **L'échelle des y du tracé est par partie**, et c'est le défaut à corriger **avant** la revue des
  >   dix parties, pas après : `ceiling = total`, donc **tout** tracé finit en haut de sa boîte. Une
  >   partie à 5 % de pertes dessine la même ascension pleine hauteur qu'une à 191 %. L'œil lit
  >   « hauteur = gravité », et cette lecture est fausse à chaque fois — donc une revue faite en
  >   l'état jugerait l'encodage, pas le dessin. Une échelle fixe et partagée rend la hauteur porteuse
  >   et les parties comparables.
  >   Option à arbitrer ensuite : ne tracer que **le résidu** plutôt que le cumul total, pour que le
  >   dessin ne porte que ce que rien d'autre ne montre. Cela cogne contre une décision grillée (« la
  >   dérive s'y **lit** au lieu d'y être dessinée ») — l'ADR interdisait la dérive en **épisodes
  >   bornés**, qui double-compterait, et un cumul du résidu reste additif ; mais c'est une décision
  >   du demandeur, pas de l'agent.
  > - **Le plancher `Counted Move` à 10 %** n'a jamais été regardé sur des données : combien de coups
  >   une vraie partie perd-elle réellement par « position déjà décidée » ? Si la part est grosse, le
  >   dénominateur de 15c l'est aussi. Mesuré sur la partie **51** : 4 coups sur 22.
  > - **Angle mort confirmé sur pièces : une erreur voyante peut n'être signalée par rien.** Repéré par
  >   le demandeur le 2026-08-23 sur la partie 51, coup 16 `Ke6` — l'évaluation passe de **+4,26 à
  >   +5,84** (1,58 pion lâché, « facile à voir »), et l'app n'affiche **aucun glyphe**.
  >   Ce n'est pas un défaut : les sévérités sont définies sur les **chances de gain**, qui **saturent**
  >   aux extrêmes. Le même écart de 1,58 pion, calculé avec la fonction de l'app selon l'endroit où il
  >   tombe :
  >
  >   | Position du Player | Chances avant → après | Chute | Signalé ? |
  >   | --- | --- | --- | --- |
  >   | équilibre (0,00) | 50,0 → 35,9 % | **14,1** | oui, imprécision |
  >   | −1,00 | 40,9 → 27,9 % | **13,0** | oui, imprécision |
  >   | −3,00 | 24,9 → 15,6 % | 9,3 | **non** |
  >   | **−4,26 (le `Ke6` réel)** | **17,2 → 10,4 %** | **6,8** | **non** |
  >   | −6,00 | 9,9 → 5,8 % | 4,1 | **non** |
  >
  >   Le coup est bien **compté**, et ses 6,8 points sont dans la dérive (6,8 des 29,7) — il n'est pas
  >   perdu, il n'est pas *nommé*. L'intention se défend : signaler sur les centipions ferait dix-huit
  >   reproches sur une partie déjà jouée au coup 25.
  >   **Mais l'angle mort est réel et il est double** : sous 10 % de chances, rien n'est signalé **et**
  >   le coup est exclu du dénominateur. Toute la fin de chaque partie perdue est donc invisible à
  >   l'analyse — or « je m'effondre quand je suis derrière » est une faiblesse réelle, répétable et
  >   travaillable. **La valeur pour le résultat et la valeur pour la progression ne sont pas la même
  >   chose, et l'outil ne mesure que la première.** Un coup qu'un humain repère d'un coup d'œil et que
  >   l'app ne mentionne pas est aussi, très concrètement, ce qui fait douter de la méthode.
  >   **Piste, et le vocabulaire existe déjà** : la tranche 04 a construit le cas « **montré par la
  >   partie, non retenu par l'analyse** » — glyphe affiché, coup hors dénominateur, motif en mots — et
  >   personne ne l'a jamais atteint (seuls les coups forcés pouvaient, et un coup forcé n'est jamais
  >   signalé, cf. plus haut). Le Player verrait ses coups marqués avec « ne compte pas : la position
  >   était déjà décidée », le dénominateur ne bougerait pas, et l'écart serait expliqué par la phrase
  >   que le récapitulatif sait déjà écrire. **Arbitrage du demandeur** : cela ajoute un seuil, et
  >   US-15a avait tenu à n'en ajouter aucun.
  >   **Mais attention : abaisser un seuil ne suffit PAS.** Voir la section de comparaison ci-dessous —
  >   le coup `Kc7` de la même partie coûte 0,36 pion et chess.com le signale quand même. Il faut un
  >   critère qui ne soit **pas** une chance de gain.
  > - **Un coup forcé n'est jamais signalé** sur ce corpus (mesuré : sept parties, tous les coups
  >   forcés non signalés — avant/après sont deux lectures de la **même** recherche). Le motif
  >   d'exclusion « forcé » existe donc surtout pour le dénominateur ; vérifier qu'il vaut encore la
  >   peine d'être distingué à l'écran.
  >
  > ### Comparaison avec chess.com sur la partie 51 — rapport complet
  >
  > Le demandeur a fourni le bilan chess.com de la **même partie** (2026-08-23). Le rapport complet —
  > méthodologie des deux systèmes, avantages, inconvénients, angles morts, options d'arbitrage,
  > sources — est dans **`.scratch/per-game-analysis/COMPARISON-CHESSCOM.md`**. L'essentiel :
  >
  > **Sur les mêmes 22 coups : chess.com en signale 6, nous en signalons 1.** Précision annoncée 77,7
  > chez eux ; chez nous 57,2 % de chances perdues dont 29,7 de dérive. Avec la formule **lichess
  > publiée** sur nos données, la partie vaut 83,5 — ils sont donc **plus sévères** que lichess, ce qui
  > est cohérent avec un moteur plus fort.
  >
  > **Leur méthode n'est pas auditable** : CAPS2 est un secret commercial, et leur centre d'aide dit
  > explicitement ne divulguer ni la formule, ni la profondeur du moteur, ni les seuils. Les seuils
  > qu'on trouve en ligne (7-10 / 10-20 / 20+ sur les chances de gain, avec une escalade en centipions)
  > sont de **tierce partie**, pas officiels.
  >
  > **Les quatre coups qu'ils mettent en avant, avec nos chiffres :**
  >
  > | Coup | Éval avant → après (nous) | Chances du Player | Notre chute | Nous | chess.com |
  > | --- | --- | --- | --- | --- | --- |
  > | **12. Nd7** | +0,39 → +3,96 | 46,4 → 18,9 % | **27,5** | erreur `?` | **gaffe `??`** |
  > | **13. Kc7** | +4,09 → +4,45 | 18,2 → 16,3 % | **1,9** | *rien* | signalé |
  > | **16. Ke6** | +4,26 → +5,84 | 17,2 → 10,4 % | **6,8** | *rien* | signalé |
  > | **20. Bxb2** | +7,17 → +10,01 | 6,7 → 2,4 % | 4,3 | **exclu** | signalé |
  >
  > Ce que cet alignement établit, et qui doit guider la décision :
  >
  > 1. **Les trois coups qu'ils voient et que nous manquons sont tous dans la zone où notre métrique
  >    s'est éteinte** (chances entre 18 % et 6 %). Le seul que les deux systèmes signalent est le seul
  >    joué dans une position encore disputée. Ce n'est pas un hasard : c'est **la forme de la
  >    différence** — notre analyse est fine tant que la partie est vivante, aveugle dès qu'elle est
  >    jouée.
  > 2. **`Kc7` falsifie « il suffit d'abaisser un seuil »** : 0,36 pion, 1,9 point de chances, signalé
  >    chez eux. La position dit pourquoi — après `13.Nxf7+ Kc7?`, `14.Nxh8` emporte la tour ; l'éval ne
  >    bouge pas parce qu'ils gagnaient déjà de quatre pions, mais du matériel a changé de camp.
  >    **Inférence, pas fait** : leur classifieur garde une notion **concrète** (matériel, séquence
  >    forcée) que les chances de gain effacent.
  > 3. **`Nd7` n'est qu'un désaccord de calibrage** : même coup, même meilleur coup (`Ke8`), 27,5 points
  >    perdus. Notre ligne « gaffe » est à 30, la leur à 20.
  > 4. **Test de transposition** : leurs seuils appliqués à **nos** évaluations, sans plancher ni
  >    exclusion, donnent **2** coups signalés, pas 6. Les seuils n'expliquent donc pas l'écart seuls.
  > 5. **La fin de partie vaut zéro, pas « peu »** : `22. Bd4` fait passer le mat de sept coups à un
  >    coup, et notre métrique enregistre **exactement 0**.
  >
  > **Un angle mort qui n'avait pas encore été nommé : l'attribution.** L'adversaire a joué à **96,1**,
  > niveau estimé 1800, zéro faute. Notre app ne l'analyse pas du tout (les sévérités sont Player-only
  > par décision) et ne peut donc **jamais** dire « en face c'était très bien joué ». Le Player ne peut
  > pas distinguer *je me suis effondré* de *il a été trop fort* — deux conclusions opposées sur ce
  > qu'il faut travailler. C'est ce qui menace le plus le verdict de **15d**.
  >
  > **Ce qui reste à faire** : un cas n'est pas un échantillon. Refaire cet alignement sur les dix
  > parties de la revue déjà prévue, avant de trancher.
  >
  > **À vérifier en premier, parce que la prémisse en dépend : le récapitulatif est-il
  > reproductible ?** En recollant les rapports de FP, la **même partie 51** ressort à **60,6 %** de
  > chances perdues chez un agent et **56,5 %** chez un autre, sous le même régime annoncé
  > (profondeur 16, 2 lignes) ; la partie 86 varie de 31,9 à 32,0. Un troisième agent a en revanche
  > vérifié qu'une **ré-analyse par lui-même** redonnait des chiffres identiques. **Non vérifié** :
  > c'est peut-être une lecture croisée de deux rapports produits sur deux bases différentes. Mais si
  > l'écart est réel, un récapitulatif non reproductible n'est **pas auditable**, et c'est toute la
  > raison d'être d'ADR-0017 qui tombe. Protocole : analyser deux fois la même partie sous le même
  > régime, comparer les récapitulatifs au chiffre près, **avant** que 15c ne somme quoi que ce soit.
  >
  > **Bug antérieur à ticketer au passage** (hors tranche, vu par la FP de la 05) : « Analyser cette
  > partie » est **silencieusement avalé** tant qu'une bannière de pass non acquittée est affichée —
  > rien ne se passe, aucun message — et l'écran montre pendant ce temps la progression d'une **autre**
  > partie comme si elle concernait celle qu'on regarde. Le chemin de réanalyse de la tranche 07 n'est
  > **pas** touché (re-testé), mais le chemin ordinaire l'est.
  >
  > À grillier avec de vraies parties sous les yeux, pas en salle : c'est une story de **mesure et
  > d'arbitrage**, pas de construction.

- **US-18**: Accélérer la suite HP — pour que la faire tourner ne coûte plus quarante minutes, sans
  rien céder de ce qu'elle teste.
  > **Pas encore grillée.** Demandée le 2026-08-23 après la passe HP d'US-15a : la suite est verte
  > mais lente, et une suite lente est une suite qu'on lance moins souvent — donc une suite qui
  > protège moins.
  >
  > ### Ce que la course du 2026-08-23 a coûté
  >
  > | Étape | Durée | Provenance de la mesure | Dont, mesuré |
  > | --- | --- | --- | --- |
  > | path 0 (bootstrap) | **~15-20 min** | non instrumenté — borne basse déduite | import Lichess **~10 min** (12:59→13:09), dont **~6 min de pure attente** (6 pauses de 60 s) |
  > | HP-01 (import + explore) | **~19 min** | déduit des horodatages de fin | import chess.com **6,5 s** · passe moteur 29 positions **34,7 s** · calcul `/danger` **0,9 s** |
  > | HP-02 (habitudes de coup) | **~13 min** | déduit des horodatages de fin | — |
  > | HP-03 (ouvertures faibles) | **~12 min** | déduit des horodatages de fin | — |
  > | **Total mur** | **~35-40 min** | path 0 en série, puis les trois HP en parallèle | |
  >
  > **Ces chiffres sont déduits, pas mesurés** — sauf ceux de la dernière colonne. Les trois durées
  > d'HP viennent de l'écart entre le lancement groupé et l'horodatage de fin de chaque sous-agent ;
  > le total de path 0 n'a pas de début connu. **C'est la première chose à corriger** : que chaque
  > scénario rende sa propre durée, et celle de ses phases (import, passe moteur, parcours, passe de
  > thème). On ne peut pas optimiser ce qu'on déduit.
  >
  > ### Ce qui a cessé d'être le coût
  >
  > **Le moteur n'est plus le problème** : 29 positions en **34,7 s**. La suite a longtemps été
  > dominée par lui (« ~3,5 min » traîne encore dans un commentaire de `README.md`, d'avant le
  > backend natif). Le coût s'est déplacé sur **le réseau** et sur **la longueur des parcours**.
  >
  > ### Pistes, à instruire — pas encore des décisions
  >
  > - **Le plus gros levier est un jeu de données, comme pressenti.** L'import Lichess de `Metalyst`
  >   couvre **71 mois dont 51 vides** et paie ~6 min de bridage. Or l'assertion qu'il porte est
  >   « un mois vide est listé à zéro, donc un trou d'historique se distingue d'un trou de
  >   récupération » : elle a besoin de **quelques** mois vides entre des mois peuplés, pas de 51.
  >   Un compte de référence à **span court et troué** tiendrait la même assertion pour une fraction
  >   des requêtes. `README.md` dit aujourd'hui « ne pas raccourcir le span » — **cette US est
  >   l'endroit où rediscuter cette règle**, en séparant ce qui est testé de ce qui est payé.
  > - **Le bridage Lichess est par IP** sur l'export : moins de requêtes, moins de pauses. Le gain
  >   est donc superlinéaire, pas proportionnel.
  > - **Réutiliser le snapshot entre deux courses.** Tous les mois des deux plages sont immuables, donc
  >   le snapshot ne périme pas. Mais `README.md` veut le **contrat réseau réel exercé une fois par
  >   course** : mettre le snapshot en cache, c'est cesser d'exercer l'adaptateur Lichess en direct.
  >   **Arbitrage du demandeur**, à poser explicitement — par exemple un cache avec une péremption, ou
  >   un import live réduit à un mois témoin.
  > - **Instrumenter avant d'optimiser** (cf. ci-dessus), puis regarder où passent les ~12 min
  >   d'HP-02 et d'HP-03, qui n'importent rien et n'analysent rien. Sur ces deux scénarios, le
  >   parcours et la passe de thème sont **tout** le coût.
  > - **Le pilotage lui-même a coûté cher** : les trois scénarios se sont fait voler leur page par le
  >   navigateur partagé, deux ont dû rebasculer sur leur propre Chrome **en cours de route**. Partir
  >   directement sur un navigateur privé (déjà consigné dans le skill) supprime des reprises.
  >
  > ### Ce qui n'est pas à brader
  >
  > `docs/test-scenarios/README.md` §« What not to trim » reste la référence, et cette US ne l'annule
  > pas : **pas** de profondeur moteur abaissée, **pas** d'archive fixture à la place du contrat
  > chess.com réel, **pas** de second profil supprimé, **pas** d'état hérité d'un autre scénario,
  > **pas** de passe de thème raccourcie aux écrans déjà traversés. La seule règle que cette US met
  > explicitement sur la table est la longueur du span Lichess — parce que c'est la seule où le prix
  > payé et l'assertion tenue se sont visiblement décorrélés.
  >
  > **Critère de succès à définir au grill**, mais l'ordre de grandeur visé est « la suite tourne en
  > moins de dix minutes, et rien de ce qu'elle affirmait n'a disparu ».

- **US-19**: Finir de rendre la liste des parties lisible — la colonne qu'on ne voit pas, l'en-tête
  qui flotte, et la date qu'il faut décoder.
  > **Pas encore grillée.** Quatre observations remontées par les **Feature Paths** des PR #59 et
  > #60 (2026-08-23), qui ont fait passer la liste des parties en tableau six colonnes, les plus
  > récentes en premières. **Aucune n'est un bug** : les deux tranches sont vertes et mergées. Ce
  > sont quatre décisions produit que le demandeur n'a pas encore prises, regroupées ici plutôt que
  > laissées dans des rapports de test.
  >
  > Le fil commun : le tableau demande **788 px** de largeur intrinsèque (cellules en
  > `white-space: nowrap`), et tout ce qui suit découle de ce chiffre.
  >
  > ### Les quatre points
  >
  > **1. Le bandeau d'en-tête reste sur la mesure étroite pendant que le contenu est large.** Depuis
  > la PR #60, `/` porte `data-width="wide"` : la colonne de contenu va de 16 à 1408.8 px, alors que
  > le bandeau nav/titre reste centré sur ~382 → 1042. L'en-tête se lit détaché du tableau qu'il
  > coiffe. **Préexistant** sur `/openings` et `/profiles`, qui portent le même attribut depuis plus
  > longtemps — mais `/` est la page d'atterrissage, donc c'est là qu'on le voit. Deux directions
  > opposées, à trancher : le bandeau suit le contenu, ou la chrome garde délibérément sa propre
  > mesure et il faut alors l'assumer visuellement.
  >
  > **2. Rien ne signale la colonne `État` quand elle déborde.** Le tableau rentre jusqu'à 900 px ;
  > **entre 900 et 800 px** le conteneur `[data-scroll="x"]` reprend la main (débordement mesuré
  > 35 px à 800, 135 à 700, 235 à 600). Il fonctionne — la page ne défile jamais latéralement — mais
  > les barres de défilement sont en **overlay** : à 600 px la pastille « analysée » est hors écran
  > et **rien à l'écran n'indique qu'une colonne existe à droite**. C'est le finding que les deux FP
  > ont soulevé indépendamment. Une colonne dont rien n'indique l'existence est une colonne que
  > personne ne lit. Pistes non instruites : une affordance de défilement visible, un dégradé de
  > bord, ou reconnaître qu'`État` est la colonne la moins large et la remonter dans l'ordre.
  >
  > **3. Les dates s'affichent en ISO brut dans une UI en français.** `2023-08-04` sur les 351
  > lignes. Ça trie parfaitement (le tri lexicographique de `date` **est** le chronologique, c'est
  > ce sur quoi repose l'ordre serveur `date DESC, id DESC`) et c'est sans ambiguïté, mais ça se
  > décode au lieu de se lire. À noter que **la donnée ne porte pas d'heure** — c'est un jour, pas
  > un instant — donc tout format retenu doit rester un jour, et plusieurs parties le même jour
  > resteront une vraie égalité. Question ouverte : un format français, un format relatif
  > (« il y a 3 jours »), ou l'ISO assumé pour sa non-ambiguïté.
  >
  > **4. `/stats` est le dernier écran resté sur la mesure étroite.** Après la PR #60, `/`,
  > `/openings`, `/profiles`, `/analyse`, `/explorer` et `/danger` sont larges ; `/stats` seule
  > garde 382.9 → 1041.9. Son tableau y tient (c'est bien pour ça qu'elle est étroite), donc ce
  > n'est **pas** un défaut — mais c'est une exception d'un seul, et une exception d'un seul est
  > soit une intention à écrire, soit un oubli. À décider, pas à corriger par réflexe.
  >
  > ### Ce que cette US n'est pas
  >
  > Pas le hors-périmètre du plan d'origine, qui reste hors périmètre tant qu'il n'est pas demandé :
  > **pas** d'en-têtes de colonne triables, **pas** de `caption`, **pas** de pagination, **pas** de
  > changement des faits affichés. Et **pas** de retrait du conteneur `[data-scroll="x"]` : il est le
  > filet qui garantit que c'est le conteneur qui défile et jamais la page (`_tables.scss`), et le
  > point 2 demande de le **signaler**, pas de le supprimer.
  >
  > ### Pourquoi ces quatre-là ensemble
  >
  > Aucune n'était visible sous le tier agentique : jsdom ne charge pas la feuille de style et ne
  > fait pas de mise en page. Les quatre viennent d'une **mesure sur l'app réelle**, et trois
  > d'entre elles (1, 2, 4) sont des questions de **mesure de colonne** — la même question posée à
  > trois endroits. Elles se grillent probablement mieux ensemble que séparément.
  >
  > **Critère de succès à définir au grill.**

- **US-20**: Reprendre la main sur les processus des tests agentiques — pour qu'un run interrompu ne
  laisse ni serveur qui sert dans le vide, ni machine à genoux.
  > **Pas encore grillée.** Demandée le 2026-08-24, après que le poste a gelé pendant la passe HP
  > d'US-17 et qu'il a fallu l'arrêter au bouton.
  >
  > ### Le constat : il n'existe aucun mécanisme, seulement une consigne
  >
  > La skill `agentic-tests` dit « teardown by pid, jamais `pkill` par motif », et chaque agent
  > l'applique lui-même. **Aucun hook n'est configuré**, ni côté projet ni côté utilisateur : rien
  > n'est automatique. Ça tient tant que l'agent **termine**. Le trou est là — un agent tué en cours
  > de route laisse tout tourner, et ce n'est pas un cas d'école : c'est arrivé **deux fois le
  > 2026-08-24**.
  >
  > | Incident | Ce qui a survécu | Comment ça s'est réglé |
  > | --- | --- | --- |
  > | Sortie de session pendant la FP d'US-17-05 | un **Vite orphelin sur 5271**, servant un backend mort | tué à la main, après identification par `/proc/<pid>/environ` |
  > | Gel du poste pendant la suite HP | tous les processus des 4 agents | **le reboot** — nettoyage par accident, pas par conception |
  >
  > « Libérer la mémoire » n'a pas d'existence séparée : ce sont les processus qui la retiennent, et
  > les tuer *est* le mécanisme. À côté, sur disque, les scratchpads accumulent des bases `.db` de
  > run et des `node_modules` posés en `--no-save` — 55 Mo au moment du constat, négligeable en soi
  > mais sur une partition à **86 %**.
  >
  > ### Le piège du grand-enfant, redécouvert à chaque run
  >
  > `npx` interpose un wrapper : **le processus qui écoute n'est pas celui qu'on a lancé**. Tuer le
  > pid retourné laisse le vrai serveur debout. C'est re-confirmé sur **absolument chaque run** —
  > encore sur le dernier (listener 7965 sous wrapper 7954). Aujourd'hui chaque agent le
  > redécouvre, le contourne à la main, et le consigne. C'est du travail répété qui devrait être
  > structurel.
  >
  > ### Pistes, par ordre d'efficacité (à trancher au grill)
  >
  > 1. **`systemd-run --user --scope --unit=…` autour de chaque processus lancé.** Correction à la
  >    racine : `systemctl --user stop <unit>` tue **l'arbre entier**, grand-enfants compris. Le
  >    piège ci-dessus disparaît structurellement. Demande de toucher la recette de lancement de la
  >    skill.
  > 2. **Un script de récupération** dans `docs/test-scenarios/tools/`, **`--dry-run` par défaut**,
  >    identifiant les processus de test par signature (port dans la plage agentique, `cwd` sous
  >    `.claude/worktrees/`, `DB_FILE` pointant un scratchpad, Chrome en `--user-data-dir` sous
  >    `/tmp/claude-*`). Filet pour les orphelins, purement additif.
  >
  > ### Une piste explicitement déconseillée, et pourquoi
  >
  > **Un hook Claude Code qui nettoie automatiquement.** C'est le réflexe tentant et c'est un
  > piège : un hook `Stop` se déclenche à la fin du tour de l'agent principal, or **les sous-agents
  > tournent en arrière-plan** — il tuerait l'app d'un agent en pleine FP. Le nettoyage automatique
  > et les runs en arrière-plan s'opposent, sauf à savoir précisément quels processus appartiennent
  > à un agent encore vivant, ce qui est le problème même qu'on cherche à résoudre. Préférer un
  > outil explicite qu'on lance en connaissance de cause.
  >
  > ### Tension à arbitrer avec US-18
  >
  > Le gel a produit une contre-mesure immédiate : la skill plafonne désormais la concurrence à
  > `min(3, floor(nproc / 4))`, soit **2** sur ce poste (§5.7). C'est **la direction opposée à
  > US-18**, qui veut accélérer la suite. Les deux ne s'excluent pas — reprendre la main sur les
  > processus pourrait permettre de **remonter** le plafond en sécurité — mais l'ordre compte, et
  > c'est un sujet de grill commun aux deux stories. Les mesures et le diagnostic sont dans la
  > skill §5.7, avec leurs limites : aucun kill OOM, `systemd-oomd` inactif, rien de thermique,
  > aucun *GPU hang* — donc **famine CPU** plutôt que mémoire, et **le déclencheur de la sortie de
  > session n'est pas établi**.
  >
  > Le demandeur signale que le gel s'est produit **plusieurs fois en trois jours**, corroboré par
  > `/var/log/apport.log` (2026-08-23 16:23, 2026-08-24 00:29, 2026-08-24 16:49). L'un d'eux ne
  > coïncide avec aucun run d'agent : **il pourrait donc exister une cause seconde, indépendante**,
  > que cette story ne corrigerait pas.
  >
  > **Critère de succès à définir au grill.**

- **US-21**: Remettre l'usine d'accord avec elle-même — pour qu'un agent qui lit la méthode y trouve
  ce que le dépôt fait vraiment, et que la file `ready-for-agent` redevienne une file.
  > **Pas encore grillée.** Demandée le 2026-08-24, après un audit de l'usine confrontée à l'état
  > réel du dépôt. **Relevé complet, avec les commandes de vérification :**
  > [`docs/factory-coherence-audit-2026-08-24.md`](docs/factory-coherence-audit-2026-08-24.md) —
  > 11 incohérences, 6 points d'incomplétude, et ce qu'il ne faut pas casser.
  >
  > ### Le constat : l'usine a évolué plus vite que sa propre documentation
  >
  > Rien de cassé au sens d'une panne. Le problème est plus insidieux : **la méthode décrit un
  > projet qui n'est plus tout à fait celui-ci**, et un agent obéit à ce qu'il lit. Trois exemples,
  > du plus grave au plus visible :
  >
  > | Constat | Ce que ça coûte |
  > | --- | --- |
  > | Le gabarit `CLAUDE.md` de `build-factory` a divergé du vrai (il ignore « Dev phase » et tout l'orchestrateur HP) | rejouer `/build-factory` **régresse** la méthode — c'est la seule incohérence qui détruit du travail |
  > | `agentic-tests` §4 dit « limite de 20 sous-agents », §5.7 dit `min(3, floor(nproc/4))` = **2** | un agent qui s'arrête à la §4 refige le poste (cf. US-20) |
  > | 17 PRD livrés lisent encore `ready-for-agent`, et `done` (55 fichiers) n'existe pas dans les cinq rôles canoniques | la file censée piloter l'autonomie est **majoritairement du bruit** |
  >
  > Le cas de `done` n'est pas un oubli de mise à jour mais **un manque dans le modèle** : la machine
  > à états du triage n'a jamais eu d'état terminal, donc la pratique en a inventé un hors
  > vocabulaire, et la glose de merge s'est logée dans le champ de statut faute d'un endroit pour
  > elle. Le grill devra trancher : ajouter un sixième rôle, ou séparer l'état du triage de l'état
  > de livraison.
  >
  > ### La lacune la plus coûteuse n'est pas une incohérence
  >
  > Quatre recettes **load-bearing** ne vivent que dans la mémoire personnelle de l'agent, pas dans
  > le dépôt : le worktree obligatoire avant toute modification, les trois symlinks `node_modules`
  > d'un worktree frais, la recette de migration `NOT NULL` SQLite (`foreign_keys OFF`,
  > `defer_foreign_keys` inopérant), et le throttle Lichess **par IP**. Un agent frais — ou tout
  > autre contributeur — **repaie chaque piège**. C'est la seule dette de l'audit que l'usine ne peut
  > pas découvrir seule.
  >
  > ### Pistes, à trancher au grill
  >
  > 1. **Faire de l'hygiène ce qu'on peut mécaniser.** Les `_Avoid_` de `CONTEXT.md` sont une liste
  >    explicite : un grep sur le code, les issues et les scénarios en ferait un test. Même logique
  >    pour la colonne `Covers` du README HP, qui se régénère depuis les frontmatters `covers:` ou
  >    disparaît — aujourd'hui elle est **conservée avec un avertissement disant qu'elle est fausse**.
  > 2. **Séparer les règles des preuves dans `agentic-tests`** (550 lignes, dont cinq paragraphes
  >    datés qui disent la même chose). Les règles impératives dans la skill, le journal daté à côté.
  >    **Attention** : le mécanisme d'auto-audit de la §5.6 est la meilleure invention de l'usine —
  >    ses défauts sont d'**application**, pas de conception. L'alléger sans le casser.
  > 3. **Rapatrier les quatre recettes** dans le dépôt, à l'endroit où un agent les lit sans les
  >    chercher.
  > 4. **Supprimer l'outillage mort** : tout le triage vise GitHub (`gh issue list --label`, « posté
  >    sur une issue GitHub », le disclaimer IA sur chaque commentaire) alors que le tracker est
  >    markdown local et que `gh issue list` renvoie zéro. Ces instructions occupent du contexte à
  >    chaque session et désignent le mauvais endroit.
  >
  > ### Deux tensions à nommer plutôt qu'à trancher ici
  >
  > - **`/tdd` exige « get user approval on the plan »** alors que `ready-for-agent` signifie « an
  >   agent can pick this up with no human context ». Les deux ne tiennent pas ensemble ; en pratique
  >   c'est le TDD qui plie, mais rien ne l'écrit, donc chaque agent tranche seul et différemment.
  >   C'est une **décision de méthode**, pas un nettoyage.
  > - **Le plafond de concurrence appartient aussi à US-18 et US-20.** Corriger la contradiction
  >   documentaire (20 vs 2) est de l'hygiène et revient ici. Décider de la **valeur** du plafond est
  >   un arbitrage commun aux deux autres stories et **n'appartient pas à celle-ci**.
  >
  > ### Réserves consignées
  >
  > Que `/build-factory` régresse effectivement le `CLAUDE.md` est un constat de **divergence
  > textuelle** — ce n'est pas testé, et ça ne devrait l'être que sur une branche jetable. Les HP
  > (47 Ko) et les 76 issues n'ont pas été relus ligne à ligne : l'audit compte des statuts et des
  > tailles, il ne juge pas leur contenu. Enfin, une partie du chantier est de la suppression, donc
  > **le risque est de jeter un garde-fou qu'on croyait mort** : l'audit liste explicitement ce qui
  > tient bien, à lire avant de couper.
  >
  > **Critère de succès à définir au grill.** Piste : qu'un agent frais, en lisant la méthode et
  > rien d'autre, ne prenne aucune décision que le dépôt contredit.

## Doing

- **US-16b**: Confronter ma lecture à celle du moteur, pour savoir où je lis bien et où je lis mal.
  > **Grillée le 2026-08-24.** Dépend d'US-16a et du relevé par Move d'US-15a (livrée).
  >
  > **Trois lectures côte à côte, jamais un score composite** — un total exigerait des poids
  > arbitraires, et un chiffre unique s'optimise en **imitant le moteur**, le seul résultat contre
  > lequel la story existe. On suit trois valeurs dans le temps.
  > 1. `Declared severity` vs mesurée : **couverture** (part des coups examinés — le silence n'est pas
  >    un verdict) et **justesse**, jamais fondues.
  > 2. `Key moment` : **part des dégâts trouvée** = chances de gain perdues par les coups flagués
  >    désignés / perdues par **tous** les coups flagués du joueur. Une seule division, dans la monnaie
  >    déjà utilisée. Crédit partiel par construction, `Key moment`s multiples **additifs et non
  >    trichables** (un coup compte une fois). Dénominateur **hors `Drift`** (le Drift n'a aucun coup à
  >    désigner) mais Drift **rapporté à côté** : « tu as cherché une faute, il n'y en avait pas ».
  >    Dénominateur nul = **pas de score**, pas un zéro. **Aucune fenêtre de tolérance** : l'écart est
  >    **affiché** au lieu d'être crédité.
  > 3. Le **sens du biais**, gratuit (l'asymétrie de la matrice) : sur-estimer ou sous-estimer le danger
  >    sont deux défauts opposés qu'aucun des trois scores ne distingue seul.
  >
  > **À vérifier à l'usage** (accepté provisoirement par le demandeur, jugé « un peu compliqué ») : la
  > matrice se lit sur les **`Counted Move`s** seulement. Le cas qui l'impose : un coup **forcé**
  > catastrophique mesure une `Blunder` mais n'est « nobody's mistake », donc un joueur qui le déclare
  > `Sound` **a raison** et une matrice naïve le compterait faux. Si à l'usage la complexité ne paye
  > pas, c'est ce point-là qu'on rouvre.
  >
  > **Agrégat en dernière tranche** (ADR-0017, repliement) + entrée de Nav. **Aucun axe en v1** :
  > l'échantillon est de quelques dizaines de lectures écrites à la main. L'axe `Phase` est le premier
  > qui méritera sa place, mais il est **exclu tant que la détection des phases n'est pas fiable**
  > (terrain d'US-15a-bis) — décision explicite du demandeur. `Opening` (échantillon nul) et
  > `Time control category` (confond jouer et analyser : une partie est lue à froid) ne sont pas
  > candidats.
  >
  > **La circularité du bonus, assumée** : juger *notre* moteur d'analyse par l'accord joueur/moteur
  > suppose le joueur juste. Un désaccord est une **divergence** — où regarder, jamais qui se trompe.
  >
  > **À lire avant de griller 16b** (ajouté le 2026-08-25) : la `Confrontation` s'installe dans le
  > panneau latéral de la route de lecture, **déjà dense et au format instable** — voir **US-22**,
  > dont le grilling est volontairement placé **après** celle-ci. Deux conséquences pour 16b : tout
  > bloc qu'elle ajoute et qui **apparaît selon le ply** aggrave le défaut de reflow signalé là-bas,
  > et le dénominateur de la **couverture** livré par US-16a (demi-coups, ply 0 exclu) devra être
  > tranché ici, puisque la justesse portera sur les coups **du joueur** — deux chiffres côte à côte
  > sur des bases différentes sinon (arbitrage ouvert sur la PR #70).
  >
  > **Passée en Doing le 2026-08-25**, US-16a étant mergée. PRD : `.scratch/confrontation/PRD.md`.
  > Six tranches sur `integration/US-16-my-own-analysis` :
  > `01-a-confrontation-exists` (couverture et justesse, provenance, les deux refus nommés) →
  > `02-how-i-get-it-wrong` (matrice et sens du biais) →
  > `03-shown-without-being-scored` (`Good`, coups adverses, coups non comptés avec leur raison,
  > couche postérieure) → `04-where-i-looked` (`Key moment`s, part des dégâts, `Drift`, distance)
  > → `05-where-i-read-well` (le bilan et son entrée de `Nav`) → `06-hp-suite-and-story-exit`
  > (**HITL** : fusion HP-02+HP-03, nouvelle HP dédiée, suite complète, PR vers `develop`).
  >
  > **Livrée le 2026-08-25** — six tranches (PR #71→#76), toutes FP vertes, suite HP **3/3** plus son
  > prérequis. PR `integration → develop` ouverte, en attente du merge humain.
  > Décisions prises en chemin, consignées dans les issues : la **couverture** de la `Confrontation`
  > prend la base de la justesse (les `Counted Move`s du joueur) et le chiffre d'US-16a perd le nom de
  > couverture pour devenir un **avancement** — l'arbitrage que la PR #70 avait laissé ouvert.

## In review

## Done

- **US-16a**: Analyser moi-même une de mes parties — commenter chaque coup, juger sa qualité,
  désigner les moments où la partie a tourné — puis sceller ma lecture, pour exercer mon analyse.
  > **Grillée le 2026-08-24** (avec US-16b et US-16c). Branche `integration/US-16-my-own-analysis`.
  > `CONTEXT.md` : `Personal analysis`, `Note`, `Candidate line`, `Key moment`, `Declared severity`,
  > `Line check`, `Confrontation` ; entrée `Inaccuracy`/`Mistake`/`Blunder` **amendée** (échelle à deux
  > auteurs). **ADR-0019** : stockage relationnel, PGN annoté en export.
  >
  > Périmètre : route dédiée `/analyse/:gameId/lecture`, `Note`s, `Declared severity` sur **tous** les
  > coups (adverses compris, jamais scorés), `Key moment`s, le **scellement** et sa **provenance**, la
  > migration due (ADR-0015) et le cloisonnement par `Profile` (ADR-0014). **Aucune dépendance, aucun
  > temps moteur.**
  >
  > Décisions structurantes du grilling :
  > - **Le scellement, pas le verrou.** L'app ne peut pas rendre aveugle (autre onglet) ; prétendre le
  >   contraire est la faute que `Review mode` a refusée en écartant le nom *Blind mode*. Donc : un acte
  >   explicite qui fige ce qui sera confronté, plus un drapeau « le moteur avait-il déjà été montré ».
  >   Ce qui est écrit **après** la révélation est conservé et hors confrontation.
  > - **Conséquence assumée** : sur ce seul fait, ce qui a été affiché est **persisté**, alors que
  >   `Review mode` reste un choix local dont le serveur n'a pas d'opinion. Une confrontation sans
  >   provenance n'est pas une confrontation. (ADR proposé, **refusé par le demandeur** — la décision
  >   vit au glossaire.)
  > - **Route dédiée, et c'est ce qui dissout le problème de l'aveuglement** : dans la page Analyse il
  >   faudrait écraser le `Review mode` mémorisé du joueur. Une route distincte est aveugle *par nature*.
  > - **Prémisse du backlog corrigée** : le « toggle d'annotations à `true` par défaut » n'existe plus,
  >   US-15a a livré `Review mode` avec **Unaided par défaut**.
  >
  > **PRD + issues (2026-08-24)** : `.scratch/personal-analysis/PRD.md`, six tranches —
  > `01-a-reading-exists-and-judges-a-move` (tracer bullet : tables + API + route + `Declared
  > severity`), `02-i-comment-a-move`, `03-i-mark-where-the-game-turned`, `04-i-seal-my-reading`
  > (gardée **entière** : scellement + provenance + couche postérieure), `05-i-see-where-i-stand`,
  > `06-graft-on-hp-01-and-run-the-suite` (**HITL**). Coutures validées : **aucune nouvelle**.
  > **Pas de 4ᵉ HP** — greffe sur **HP-01 après l'étape 9** (elle asserte déjà « the app does not start
  > volunteering the engine's verdict » et a déjà ouvert une partie non analysée) ; HP-02 écarté comme
  > hôte, il n'ouvre une partie que dans sa passe de thème. **Décidé pour US-16b** : fusion HP-02 + HP-03
  > en « lire mes agrégats », le créneau libéré accueillant une HP dédiée « lire à l'aveugle, sceller,
  > confronter ».
  >
  > **Livrée le 2026-08-24** — six tranches, PRs **#64 → #69**, toutes auto-mergées sur la branche
  > d'intégration après FP verte. **Suite HP 3/3 verte** (prérequis path 0 vert d'abord et seul).
  > PR `integration → develop` : **#70**, en attente du merge humain.
  >
  > **Ce que la livraison a appris, et qui n'était pas dans le grilling :**
  > - **La migration due l'a été deux fois.** La tranche 01 avait lu « un drapeau postérieur au
  >   scellement » comme un drapeau *sur la ligne*. Le critère « la lecture initiale reste lisible
  >   telle qu'elle était » l'interdit : avec une seule ligne par ply, une écriture postérieure n'a
  >   nulle part où aller qu'**au-dessus** de la valeur scellée — ce qui détruit ce que le scellement
  >   existe pour fixer. `posterior` est donc entré dans la **clef primaire** (migration `0014`) :
  >   deux couches par ply, plafonnées à deux par construction.
  > - **`writeMark` confondait « le caller a dit `null` » et « le caller n'a rien dit »** (`??`), ce
  >   qui rendait l'effacement d'une `Note` impossible — le repli restaurait le texte. Un champ
  >   **nommé** est ce que le joueur dit ; un champ omis est laissé tel quel.
  > - **Le silence a une conséquence de stockage** : quand la dernière marque d'un ply est reprise,
  >   la **ligne part**. Une ligne de nuls serait une marque affirmant « j'ai regardé et rien
  >   trouvé » — ce qui est exactement le rôle de `Sound`.
  > - **La greffe HP est placée à l'étape 9b, *avant* l'étape 10** (qui analyse), et pas seulement
  >   après l'étape 9 comme prévu : jouée avant qu'aucune analyse n'existe, l'étiquette « Lue à
  >   l'aveugle » est **méritée par la course**. Vérifié à la course : `engine-seen` a fini à
  >   `[395,407]` — les deux parties de l'étape 10 — et **pas** la partie scellée en 9b.
  > - **La FP a trouvé ce que les tests ne pouvaient pas.** Une lecture rendue sous un **autre
  >   `Profile`** (le seul rouge de la story, tranche 01) ; deux crayons quasi identiques que les
  >   noms accessibles distinguaient et l'œil pas ; les contrôles postérieurs au scellement portant
  >   les libellés de la couche initiale ; un écran de refus offrant un lien vers la partie qu'il
  >   venait de refuser.
  >
  > **Décisions laissées au demandeur** (dans la PR #70) :
  > - **Le dénominateur de la couverture** — demi-coups, ply 0 exclu. US-16b calculera la justesse
  >   sur les coups **du joueur** : les deux chiffres seraient alors rapportés côte à côte sur des
  >   **bases différentes**. À trancher en 16b, pas ici.
  > - `DELETE /api/profiles/:id` **répond 500 pour tout `Profile`** (préexistant,
  >   `.scratch/profile-deletion/`, `needs-triage`) — c'est pourquoi la cascade depuis le `Profile`
  >   n'a pu être prouvée qu'au niveau du magasin.
  > - Le niveau de pluriel du nom accessible des résultats (`1 victoires`), trouvé par HP-03.
  > - La remise à `Départ` du niveau de l'explorateur quand on quitte l'écran, trouvée par HP-02 :
  >   aucune assertion ne la couvre, et la formulation « après avoir été piloté » de sa passe de
  >   thème suppose un état que l'app ne garde pas.
  >
  > **Livrée le 2026-08-25** — PR #70 mergée dans `develop`. Six tranches, HP 3/3.

- **US-17**: Importer un historique Lichess sans payer une requête par mois vide.
  > **Grillée** (2026-08-23) — décisions **D1→D8** dans
  > `.scratch/lichess-fetch-window/GRILL-NOTES.md`. Branche
  > `integration/US-17-lichess-fetch-window`. `CONTEXT.md` : **`Monthly import` amendée** — le mois
  > reste l'unité de **restitution** et cesse d'être l'unité de **récupération**. **ADR-0018**
  > (renumérotée depuis 0016, collision de numéros) : décisions 1, 2, 4 et 5 révisées, et sa section
  > de mesure terrain corrigée — « Lichess refuse l'IPv6 » est **faux**, c'est un throttle par IP sur
  > l'export.
  >
  > Tranché : le port passe de `fetchMonth` à **`fetchRange` qui *yield***, chess.com garde sa boucle
  > **à l'intérieur de son adaptateur** (aucun changement de comportement), **aucune borne** sur la
  > plage, retry conservé **avant le premier octet** et aucun après — la reprise étant le rejeu par le
  > Player, avec un message qui nomme le point d'arrêt et la plage à retaper. **Le span de `Metalyst`
  > reste à 71 mois** : les ~6 min visées par US-18 étaient six retries 429 causés par la rafale, donc
  > US-17 les supprime sans toucher à l'assertion des 51 mois vides — **la piste « raccourcir le
  > span » sort du périmètre d'US-18**.
  >
  > Le test agentic final devra **mesurer le temps d'exécution de path 0** et le comparer à la
  > référence : c'est le premier point de mesure réel d'US-18, dont les chiffres sont aujourd'hui
  > déduits.
  >
  > **PRD** : `.scratch/lichess-fetch-window/PRD.md` (`ready-for-agent`, 31 user stories).
  > **Cinq sous-issues**, toutes AFK, dans `.scratch/lichess-fetch-window/issues/` — en chaîne, chacune
  > bloquée par la précédente :
  > 1. `01-a-truncated-stream-is-not-a-finished-one` — **en tête parce qu'elle bouche un trou déjà
  >    présent** : un ndjson coupé en vol s'importe partiellement et se rapporte à zéro. Tout le reste
  >    de l'US repose sur une coupure détectable.
  > 2. `02-the-port-speaks-a-range` — le refactor sans rien à montrer ; chess.com absorbe sa boucle,
  >    aucun changement de comportement.
  > 3. `03-lichess-asks-once-for-the-whole-range` — le gain, plus la correction de la fausseté IPv6.
  > 4. `04-an-interruption-says-where-it-stopped` — le message retapable et le dernier mois non couvert.
  > 5. `05-path-zero-measures-the-gain` — la requête unique assérée et **la durée chiffrée**.
  >
  > **Constat mesuré** (import de référence `Metalyst`, 2026-08-21) : sur les
  > **71 mois** du span, **51 étaient vides** — on a payé **72 % des requêtes pour zéro partie**,
  > soit ~2,4 min de vide sur ~3,5 min d'import. Et les comptes creux sont la norme sur Lichess,
  > pas l'exception : `Monado_Boy`, c'est 86 parties réparties sur ~80 mois.
  >
  > **La cause est structurelle, pas un réglage.** chess.com sert des **archives mensuelles** ;
  > Lichess sert un **flux `since`/`until`** et peut renvoyer tout le span **en une seule requête**.
  > On a plaqué la forme de chess.com sur une API qui n'en a pas besoin. Moins de requêtes
  > *améliorerait* d'ailleurs notre position vis-à-vis de la règle « une requête à la fois » de
  > Lichess, qui est la contrainte réelle du port (ADR-0018, point 4).
  >
  > **Ce n'est pas « importer par année ».** Le mois n'est pas une taille de requête, c'est un
  > concept du domaine : `Monthly import` est dans `CONTEXT.md`, et la ligne à zéro est ce qui
  > distingue *un trou dans l'historique* d'*un trou dans la récupération*. Une unité annuelle
  > détruirait ça, ou imposerait un `Yearly import` qui ne veut rien dire pour le joueur.
  >
  > **Piste à instruire** : garder le mois comme unité **du domaine** et cesser d'en faire l'unité
  > **de la requête** — une requête sur la plage, puis répartition des parties par mois **en local**
  > sur la date de début. Exact et sans perte : la tranche US-12/06 a établi que Lichess date une
  > partie sur son **début**, et c'est déjà la date qu'on stocke. Les lignes mensuelles, les mois à
  > zéro et la progression sont préservés (le flux se trie `dateAsc`, chaque ligne se ferme au
  > franchissement de la frontière).
  >
  > **Ce que le grill devra trancher** — c'est un **amendement à ADR-0018**, dont le point 2 a
  > choisi le mois *délibérément* :
  > - ADR-0018 oppose qu'« un flux unique qui meurt au mois 40 est un problème tout-ou-rien ».
  >   L'argument est réel mais plus faible qu'il n'y paraît : la reprise est **déjà** « re-jouer la
  >   plage » (US-12/04), la déduplication par URL rendant l'import exactement ce qui manque. La
  >   localité du mois n'achète donc pas la reprise, elle achète la **ligne « en échec »** sur le
  >   mois fautif. Que devient cette ligne quand la requête est unique ?
  > - Faut-il **une borne** malgré tout (par année ? par nombre de parties ?), pour qu'un compte à
  >   50 000 parties ne soit pas un seul flux sans le moindre retour avant la fin ? Le coût n'est
  >   pas la mémoire — le ndjson est déjà lu en flux — mais le **délai avant le premier signe de
  >   vie**.
  >
  > **Périmètre** : n'affecte **que** l'adaptateur Lichess. chess.com reste mois par mois, puisque
  > c'est ce que son API sert, et le port garde le mois. Aucune migration de schéma attendue.
  >
  > Sortie de l'exploitation de US-12, mergée depuis (PR #52, 2026-08-22).
  >
  > **Livrée et mergée** (2026-08-24) — cinq tranches, **PR #62** (`9290492`) vers `develop`. Gain
  > **mesuré** contre l'API réelle : **1 requête d'export au lieu de 71**, **0 pause** au lieu de 6,
  > **34,4 s au lieu de ~210 s** (−175,6 s, ~6,1×). Suite HP **3/3 vertes** plus le prérequis, aucun
  > finding bloquant.
  >
  > La suite reste à **trois HP** : le parcours du Player ne change pas, c'est son coût qui change —
  > l'assertion revient donc à `path 0`, sans quoi rien ne distinguerait la story livrée de la story
  > non livrée. C'est aussi de là que sort le premier chiffre réel attendu par **US-18**, dont
  > l'entrée disait ses durées *déduites* : il est consigné dans `path-0-bootstrap.md`, pas seulement
  > dans une PR.
  >
  > **Cinq findings sont sortis de la story, tous antérieurs à elle**, rendus visibles parce qu'une
  > coupure de flux est devenue détectable. Trois corrigés dans la même PR, à la demande du
  > demandeur : un mois coupé compté dans ce qui a été récupéré ; « aucune partie trouvée » qui ne
  > s'affirme plus d'une plage jamais lue ; un mois en échec qui dit désormais ce qu'il a ramené.
  > **Deux décisions produit ont été tranchées en route** — une plage à moitié réussie nomme la
  > période à relancer (ce qui **renverse** la règle « a partly successful Import is not a failed
  > one »), et un mois partiellement rempli s'appelle **incomplet**, `échec` restant au mois qui n'a
  > rien reçu.
  >
  > **Restent ouverts, non tranchés**, sous `.scratch/import-summary-unfounded-claims/` : l'en-tête
  > du résumé encore en anglais au-dessus de lignes françaises (issue 04), et l'accord du pluriel du
  > tally d'`/openings` (issue 05). Les deux sont les symptômes d'une **règle absente** sur les
  > textes destinés au Player — langue d'un côté, accord de l'autre — et se corrigent mieux ensemble
  > qu'un par un.
  >
  > La passe HP a par ailleurs fait geler le poste, d'où **US-20** (reprendre la main sur les
  > processus des tests agentiques) et un plafond de concurrence dans la skill.

- **Liste des parties en tableau** (drive-by, sans numéro de story) : les parties les plus récentes
  en premières, sous forme de tableau.
  > **Livrée** (2026-08-23), en **deux PR vers `develop`** — #59 (`e1ff6aa`) et #60 (`1328ec8`).
  > Née d'une demande directe, sans passer par une story ni par un grill : elle est consignée ici
  > **après coup**, parce qu'US-19 y renvoie et qu'une story livrée qui n'apparaît nulle part est
  > une story qu'on refera.
  >
  > **PR #59** — `listGames` ordonne `date DESC, id DESC` (l'ordre appartient au `Game list`, pas à
  > un écran) et `GameList` passe de `ul` à `table`, six colonnes, un fait par cellule. Ceci
  > **renverse la décision US-13 « what is a list stays a list »**, à la demande du demandeur : le
  > commentaire de `_lists.scss` qui l'affirmait est retiré avec sa date. Sept comportements en TDD,
  > FP **12/12**.
  >
  > **PR #60** — `GamesPage` prend `data-width="wide"`. Un attribut, parce que la FP de #59 avait
  > mesuré que le tableau demande **788 px** dans une colonne de **659** : sa dernière colonne
  > `État`, celle qui porte la pastille « analysée » que #59 venait d'ajouter, était **hors écran à
  > 1440, 900 et 600 px**. FP **10/10**.
  >
  > **Ce que ça a appris, et qui vaut au-delà de cette story** : les deux régressions étaient
  > **invisibles à tous les tiers inférieurs** — jsdom ne charge pas la feuille de style et ne fait
  > pas de mise en page. La première (la *page* défilait latéralement) et la seconde (une colonne
  > entière hors champ) n'ont existé que sous l'œil du tier agentique. Un passage liste → tableau
  > coûte **deux tranches**, pas une : le markup, puis la place.
  >
  > Quatre décisions produit restent ouvertes — **US-19**.

- **US-15a**: Comprendre, sur **une** partie, comment l'analyse juge mes coups — pour pouvoir croire
  (ou contester) ce que l'app me dira plus tard sur mes faiblesses.
  > **Front grillé** (2026-08-22) : décisions **F1→F12** dans
  > `.scratch/per-game-analysis/GRILL-FRONT.md`. `CONTEXT.md` gagne **`Review mode`** (Unaided /
  > Annotated / Detailed, **Unaided par défaut** — changement de comportement : les annotations étaient
  > affichées par défaut depuis US-7, donc **HP-01 et quatre suites client sont à amender**). Coutures
  > de test validées : `.scratch/per-game-analysis/SEAMS.md`. **Pas d'ADR pour le front** (tout est bon
  > marché à défaire) ; en revanche **ADR-0016 est amendée** et **ADR-0015 reçoit une note** : on
  > **jette** les 1199 `Evaluation`s existantes plutôt que de porter à jamais une branche `pv` null.
  > Deux points laissés à vérifier sur pièces plutôt qu'affirmés : la **valeur réelle du tracé de
  > dérive** (dix parties, puis on garde ou on supprime) et la **lisibilité de l'empilement** du
  > panneau latéral (à regarder dans le FP). **Prête pour `/to-prd`.**
  >
  > **Grillée (modèle) avec l'EPIC US-15** (2026-08-21) : décisions D1→D14 dans
  > `.scratch/weakness-profile/GRILL-NOTES.md`, glossaire dans `CONTEXT.md`, **ADR-0016** et
  > **ADR-0017**. **Isolée de l'EPIC** (choix du demandeur) : branche d'intégration propre,
  > `integration/US-15a-per-game-analysis`, PR vers `develop` **dès la fin de 15a** — une autre
  > feature passe avant le reste de l'EPIC, et l'analyse partie par partie ne doit pas l'attendre.
  >
  > **Aucun agrégat, aucune page de verdict.** La valeur de cette story se juge à « je peux évaluer
  > la méthode », pas à « je sais sur quoi travailler » (ADR-0017).
  >
  > Contenu :
  > - Stocker la **`Best line`** (PV entière, UCI, une seule colonne) et le score de la 2e ligne
  >   (`cp2`/`mate2`) — **zéro temps moteur** : `uci-driver.ts` collecte déjà toutes les lignes `info`
  >   et jette la variante.
  > - **MultiPV=2**, avec la **mesure** due : < 1,5× on garde, 1,5–2× on revient au demandeur, > 2× on
  >   revoit la méthode. La profondeur 16 n'est **pas** la variable d'ajustement (ADR-0009).
  > - `evaluations.pass_id` + le **`Search regime`** porté par le pass, et la reprise restreinte au
  >   même régime (ADR-0016).
  > - **Migration** (ADR-0015 : plus de wipe) : un pass synthétique portant profondeur 16 / une ligne,
  >   auquel on rattache les 1199 `Evaluation`s existantes, `pv` null assumé — aucun rejeu ne
  >   reconstitue une variante. Ré-analyser les 20 parties = choix du joueur, ~11 min.
  > - Dérivation (jamais stockée, retunable sans moteur) : **`Phase`** (seuils de départ à ajuster en
  >   regardant de vraies parties), **`Counted Move`** + le motif d'exclusion, **`Drift`** en résidu,
  >   et le **récapitulatif par partie** qui sommera vers l'agrégat de 15c.
  > - Sur la page Analyse : le relevé par Move (`Best line` + réfutation, delta, phase, compté ou
  >   non et pourquoi) et le **tracé cumulé** de la dérive. Mise en page libre — **l'UI ne décide pas
  >   du modèle** (ADR-0017) ; la page est déjà la plus dense de l'app.
  >
  > Story grosse : voudra des tranches internes. Balle traçante : schéma + régime + PV stockée → le
  > relevé par Move à l'écran → le tracé de dérive → le récapitulatif.
  >
  > **PRD** : `.scratch/per-game-analysis/PRD.md`. **Sept tranches** (à jouer **séquentiellement**,
  > choix du demandeur), dans `.scratch/per-game-analysis/issues/` :
  > - `01-the-best-line-end-to-end` — **HITL** (la mesure MultiPV peut revenir au demandeur ; c'est
  >   aussi la tranche qui jette les analyses existantes)
  > - `02-review-mode` — bloquée par 01 ; porte l'amendement de **HP-01** et des suites client
  > - `03-the-phase-of-a-move` — bloquée par 02
  > - `04-which-moves-count` — bloquée par 02
  > - `05-what-this-game-contributes` — bloquée par 03 et 04 ; la fonction que **15c pliera**
  > - `06-the-drift-trace` — bloquée par 05 ; **écrite pour être supprimable** (point de contrôle des
  >   dix parties)
  > - `07-relaunch-the-analysis-from-the-review` — bloquée par 01
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #58, mergée le
  > 2026-08-23). Les **sept tranches** auto-mergées sur FP verte : 02 (7/7), 03 (6/6), 06 (6/6),
  > 07 (rouge au premier passage, corrigé, 6/6 au second) ; 04 (4/5) et 05 (5/6) portent chacune
  > **une étape structurellement inexerçable sur ce corpus**, documentée sur l'issue — pas un rouge.
  > La 01 a été validée par le demandeur. **543 tests client, 269 serveur, build vert.**
  >
  > **Suite HP rejouée au gate** (2026-08-23) : path 0 ✅ 10/10, HP-01 ✅, HP-02 ✅ 10/10, HP-03 ✅
  > 7/7, **aucune constatation bloquante**. 48 audits de thème (8 écrans × 2 thèmes × 3 scénarios) :
  > zéro couleur non résolue, zéro débordement horizontal, zéro erreur console, les huit tokens
  > invariants **identiques au bit** entre thèmes.
  >
  > **Le changement de comportement a été exercé pour de vrai** (HP-01), et c'est ce qui comptait :
  > la partie analysée s'ouvre **Sans aide** — ni glyphe, ni évaluation, ni barre, ni courbe ;
  > **Annoté** fait apparaître la courbe et « Vos erreurs : 1 grosse erreur ?? » ; **Détaillé**
  > ajoute le récapitulatif (10/10 coups comptés, 55,6 % de chances perdues, profondeur 16 / 2
  > lignes), le ruban de phases et le second dessin. Le niveau survit au rechargement et au
  > changement de partie.
  >
  > Jugement du demandeur : « **pas mal pour un premier jet** » — d'où **US-15a-bis**, qui doit
  > passer **avant** l'agrégat de 15c.
  >
  > **Trois arbitrages de la tranche 01 sont restés ouverts**, et ne figuraient jusqu'ici nulle part
  > dans `develop` : ils avaient été consignés le 2026-08-22 dans un commit posé sur
  > `feature/US-15a-01-best-line` **après** que cette branche avait déjà été fusionnée dans
  > l'intégration (`84ed264`), donc sur un chemin qui ne menait plus à `develop`. Rapatriés ici parce
  > qu'un point produit ouvert qu'on ne voit nulle part est un point qu'on redécouvre :
  >
  > 1. **Le clamp de défilement quand le panneau rétrécit** — comportement à trancher, jamais tranché.
  > 2. **Le bandeau ne dit pas qu'une passe était une *ré*analyse.** À ne pas confondre avec le bug
  >    voisin relevé par US-15a-bis (« Analyser cette partie » silencieusement avalé sous une bannière
  >    non acquittée) : celui-ci porte sur le **libellé** d'une passe qui aboutit, celui-là sur une
  >    action qui n'aboutit pas.
  > 3. **L'a11y préexistante de la liste des parties** — antérieure à la story, laissée en l'état.
  >
  > Le reste de cette note orpheline était **déjà couvert ailleurs**, vérifié avant de la rapatrier :
  > la mesure MultiPV vit dans **ADR-0016** avec plus de détail que le backlog n'en portait (`2.11×`
  > à une ligne d'abord, `2.19×` à deux, les deux runs et le protocole), et le rejet des 1199
  > `Evaluation`s héritées est déjà dit plus haut. Seuls ces trois arbitrages manquaient.

- **US-12**: Importer mes parties depuis un compte Lichess, pas seulement chess.com.
  > **Livrée.** Aujourd'hui la seule source est chess.com et elle n'est pas isolée derrière
  > une abstraction neutre : `ChessComClient` (`server/src/chesscom.ts`) est **injectable mais
  > modelé sur chess.com** — `fetchMonth(username, year, month)` (archives mensuelles),
  > `time_class`, `rules` pour écarter les variantes, codes de résultat maison, et l'`Opening` est
  > résolue depuis les en-têtes PGN `[ECO]`/`[ECOUrl]` **propres à chess.com** (ADR-0007). Le reste
  > du domaine est en revanche neutre (PGN, `Game`, dedup par URL de partie), donc le travail est
  > surtout de faire émerger un port « source de parties » et de brancher un second adaptateur.
  >
  > **À griller après US-11** — l'ordre n'est pas indifférent : c'est US-11 qui décide si un
  > `Profile` porte la plateforme, donc où vit le choix de la source. Griller US-12 d'abord
  > obligerait à trancher deux fois la même question.
  >
  > Ce que dit l'API Lichess (spec OpenAPI officielle
  > [`lichess-org/api`](https://github.com/lichess-org/api/blob/master/doc/specs/tags/games/api-games-user-username.yaml),
  > vérifiée le 2026-08-12) — elle est **plus proche de nos besoins que chess.com**, mais pas
  > alignée sur nos archives mensuelles :
  > - `GET /api/games/user/{username}` : **un seul appel par plage**, bornée par `since`/`until`
  >   (timestamps ms), tri `dateAsc`/`dateDesc`, `max` optionnel. Pas de pagination par mois — la
  >   réponse est un **flux** à consommer en streaming (NDJSON via `Accept: application/x-ndjson`,
  >   ou PGN via `application/x-chess-pgn`).
  > - **Débit annoncé** : 20 parties/s en anonyme, 30 authentifié, 60 pour ses propres parties.
  >   Jeton **non obligatoire** pour l'export public. Un `429` impose d'attendre une minute entière ;
  >   Lichess ne documente pas de limites de requêtes chiffrées au-delà.
  > - Existence d'un compte : `GET /api/user/{username}` (200 / 404) — équivalent direct de notre
  >   `playerExists`.
  > - Filtre variantes/cadences par `perfType` (`ultraBullet`, `bullet`, `blitz`, `rapid`,
  >   `classical`, `correspondence` + variantes `chess960`, `crazyhouse`, …), et champ `speed` sur
  >   chaque partie.
  > - En NDJSON, `opening` est un **objet `{ eco, name, ply }`** : il s'aligne directement sur nos
  >   colonnes `eco`/`opening_name`, sans passer par un en-tête PGN. Le PGN est disponible dans le
  >   même flux avec `pgnInJson=true`.
  > - Identité de la partie : `id` (URL `https://lichess.org/{id}`), donc notre dedup par URL tient.
  > - Résultat : pas de code par joueur comme chess.com, mais `winner` (`white`/`black`, absent si
  >   nulle) + `status` (`mate`, `resign`, `outoftime`, `draw`, …).
  >
  > **Grillée** (2026-08-21) — branche `integration/US-12-lichess-import`. Les onze points ci-dessous
  > sont tranchés ; doc : `CONTEXT.md` (`Platform`, `Time control category`, `Game`,
  > `Monthly import`, `Import`), **ADR-0018** (les adaptateurs traduisent vers notre vocabulaire),
  > amendement d'**ADR-0007** (l'autorité de classification est la plateforme d'origine).
  > Décisions : la plateforme est un attribut du `Profile`, jamais un paramètre d'import (mais l'écran
  > d'import la **nomme**) ; le **mois** reste l'unité du port, évolutif plus tard ; ndjson lu en flux
  > mais résolu par mois, filtrage des catégories en local ; **cinq** `Time control category` —
  > `ultraBullet`→`bullet`, `daily` **renommée** `correspondence`, `classical` ajoutée ; le port parle
  > le domaine (`PlatformClient` + `ImportedGame`) et chaque adaptateur possède sa traduction, câblage
  > par registre `Record<Platform, PlatformClient>` ; pas de token ; hors périmètre : variantes,
  > `fromPosition`, **parties contre l'ordinateur** ; parties abandonnées importées (symétrie) ;
  > `Game.date` = la date sous laquelle la plateforme classe la partie (`createdAt` chez Lichess).
  > **Vérifié contre l'API réelle** (compte de référence retenu : **`Metalyst`**, 403 parties, 20 mois
  > peuplés sur 71, dont 38 `classical` et 64 `correspondence` — les deux traductions neuves sont donc
  > exercées pour de vrai) : `since`/`until` filtrent sur `createdAt` ; le débit anonyme mesuré est de
  > ~24 parties/s ; et **l'endpoint d'export refuse l'IPv6** depuis cette machine (429 instantané,
  > insensible à l'attente) alors qu'il répond 200 en IPv4 — piège à neutraliser dans l'adaptateur,
  > sans quoi le message d'erreur invite précisément au mauvais correctif.
  > Validation : pas de 4ᵉ HP (le parcours ne change pas) — path 0 accueille le profil Lichess de
  > référence contre l'API réelle, HP-01 gagne une étape de bascule inter-plateformes, les FP portent
  > les cas précis sur fixture (`LICHESS_BASE_URL` en miroir de `CHESSCOM_BASE_URL`).
  > Dette signalée hors périmètre : la table `settings` (username chess.com mémorisé) est caduque
  > depuis US-11 et ne doit **pas** être étendue à Lichess.
  > PRD : `.scratch/lichess-import/PRD.md` (38 user stories). Découpée en 7 issues techniques,
  > `.scratch/lichess-import/issues/` :
  > - `01-platform-is-a-value.md` — le port parle le domaine, chess.com devient un adaptateur, la
  >   plateforme est nommée à l'écran (AFK)
  > - `02-five-time-control-categories.md` — `classical` ajoutée, `daily` → `correspondence`, les
  >   deux migrations dues (AFK, bloquée par 01 — **séquencement**, pas dépendance logique)
  > - `03-a-lichess-profile-exists.md` — choix de la plateforme, vérification du compte chez Lichess
  >   (AFK, bloquée par 01)
  > - `04-a-lichess-month-lands.md` — l'adaptateur Lichess sur le chemin nominal, IPv4 épinglé
  >   (AFK, bloquée par 01/02/03)
  > - `05-what-we-do-not-keep.md` — variantes, position arbitraire, parties contre l'ordinateur
  >   (AFK, bloquée par 04)
  > - `06-month-boundary-and-rate-limit.md` — datation par le début, partie à cheval, 429
  >   (AFK, bloquée par 04)
  > - `07-path-zero-and-the-cross-platform-switch.md` — path 0 contre l'API réelle + étape HP-01
  >   (**HITL**, bloquée par 02/05/06)
  > **Tranches 01 à 06 livrées** (2026-08-21) sur la branche d'intégration, chacune build + tests +
  > FP verts : le port parle le domaine et chess.com devient un adaptateur, cinq cadences
  > (`daily` → `correspondence`, `classical` ajoutée, migration 0011), un profil Lichess existe,
  > un mois Lichess atterrit, les exclusions (variantes, position arbitraire, parties contre
  > l'ordinateur ; abandonnées gardées), la datation par le début et le `429` traité comme une
  > instruction. Deux défauts réels trouvés par les FP et corrigés au passage : un PGN sans coup
  > (partie abandonnée) faisait échouer l'import du mois entier, et l'attente imposée par la
  > plateforme n'était pas dite à l'écran.
  > Reste à faire : la tranche **07 (HITL)** — path 0 contre l'API réelle et l'étape inter-plateformes
  > d'HP-01 — puis la suite HP et la PR `integration -> develop`, décision humaine.
  >
  > Points tranchés au grilling (énoncé d'origine) :
  > - Forme du port : `since`/`until` en millisecondes couvre nativement la plage introduite par
  >   US-9, alors que chess.com impose le découpage mensuel. Le port expose-t-il une **plage de
  >   dates** (chess.com la découpe en mois en interne, Lichess la passe telle quelle), ou garde-t-on
  >   le mois comme unité commune ? La progression comptée en mois d'US-9 en dépend.
  > - Streaming : les 20-60 parties/s et un flux non paginé cadrent mal avec notre `fetchMonth`
  >   qui renvoie un tableau complet. Consommer en flux (et rendre la progression continue) ou
  >   accumuler par tranches ?
  > - Cadences : `ultraBullet`, `classical` et `correspondence` n'existent pas dans
  >   `TimeControlCategory` (`bullet`/`blitz`/`rapid`/`daily`). Étendre le vocabulaire ou replier
  >   (`correspondence` → `daily`, `ultraBullet` → `bullet`) ? Ça touche `CONTEXT.md`, `move_habits`
  >   et les ventilations de `/stats` et `/openings`.
  > - `Opening` : ADR-0007 fixe « la classification de chess.com, jamais recalculée ». Lichess
  >   fournit sa propre `{ eco, name }` — deux classifications pour le même concept, à assumer
  >   explicitement dans l'ADR plutôt qu'à mélanger en silence dans les agrégats par ECO.
  > - Où vit le choix de la source : porté par le **`Profile`** d'US-11 (un profil = une plateforme +
  >   un compte) ou choisi à chaque import ? Voir la dépendance ci-dessus.
  > - Une ADR est probable (port multi-plateforme, en regard d'ADR-0002 qui fait du relais local le
  >   seul interlocuteur des sources externes).
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #52, mergée le
  > 2026-08-22). Trace de la revue : les sept tranches sur `integration/US-12-lichess-import`,
  > **path 0 + HP-01 + HP-02 + HP-03 tous verts**, zéro finding bloquant, build et tests verts
  > (659). Path 0 porte désormais un **troisième profil de référence sur l'autre plateforme**,
  > `Metalyst` (lichess.org), importé sur ses 71 mois réels — 403 récupérées, **351** importées,
  > 38 `classical`, 37 `correspondence` — et HP-01 gagne une étape qui **bascule de plateforme** :
  > bannière et chiffres suivent la `Platform`, la suite reste à **trois** HP.
  > Limite de couverture assumée : ce compte n'a ni partie `ultraBullet` ni partie abandonnée,
  > ces deux règles restent couvertes par fixtures. Suite : **US-17** (le mois vide coûte une
  > requête pour rien côté Lichess).


- **US-11**: Choisir mon profil et retrouver les parties importées et analysées sous ce profil.
  > **Grillée** (2026-08-17) — branche `integration/US-11-profiles`.
  > Un **`Profile`** = **un compte sur une plateforme** (plateforme + username), validé chez
  > chess.com à la création et stocké dans sa casse canonique. Il **partitionne** : chaque `Game` et
  > chaque agrégat appartient à un seul profil, **rien n'est partagé** — une partie jouée entre deux
  > profils suivis est stockée deux fois, chacune du point de vue de son `Player`. `Player` est
  > redéfini comme le **point de vue** (la personne derrière le profil courant, éventuellement un
  > ami), plus comme une identité. Sélection côté client passée explicitement à chaque appel API,
  > bandeau permanent qui nomme le profil courant, page dédiée `/profiles` + `/profiles/:id` qui
  > **accueille désormais l'import** (l'ancien `/import` disparaît).
  > **Conséquence hors story** : la base locale n'est plus jetable (20 parties analysées, 1199
  > `evaluations`). La règle « wiper et ré-importer » de `CLAUDE.md` est **retirée** — toute
  > évolution de schéma doit désormais venir avec sa migration.
  > **Débloquée** (2026-08-18) : US-13 est mergée dans `develop`, la branche est rebasée dessus. La
  > feuille de style, le squelette de page et l'audit des tokens deviennent des contraintes des
  > tranches côté écran ; le pass de thème passe de six à huit écrans (tranche 06) ; et le finding
  > `games-load-failure` d'US-13 est rapatrié dans la tranche 04.
  > - Doc : `CONTEXT.md` (`Profile`, `Player`), ADR-0014 (le profil partitionne), ADR-0015 (la base
  >   porte des données irremplaçables), `CLAUDE.md` (phase dev amendée)
  > - PRD : `.scratch/profiles/PRD.md`
  > - Issues techniques : `.scratch/profiles/issues/`
  >   - `01-profiles-exist.md` — créer / lister / sélectionner / supprimer un profil (AFK)
  >   - `02-existing-data-belongs-to-dudulsmash.md` — la migration, préserve les 1199 évaluations (AFK)
  >   - `03-import-from-the-profile-page.md` — l'import déménage sur la page du profil (AFK)
  >   - `04-every-view-speaks-of-the-current-profile.md` — scoping de toutes les vues + bandeau (AFK)
  >   - `05-the-analysis-pass-belongs-to-a-profile.md` — la passe d'analyse est scopée (AFK)
  >   - `06-path-zero-and-the-hp-rework.md` — path 0 + reprise des 3 HP et du pass de thème (**HITL**)
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #51, mergée le
  > 2026-08-21). Trace de la revue : les six tranches mergées sur `integration/US-11-profiles`,
  > **path 0 + HP-01 + HP-02 + HP-03 tous verts**, build et tests verts. Path 0 est un nouveau
  > **prérequis hors plafond des 3 HP** : il crée les profils de référence, importe la plage contre
  > l'API chess.com réelle et laisse deux snapshots que les trois journeys restaurent.
  >
  > **Trois retours d'usage traités après la livraison, avant le merge** (2026-08-21) : l'import
  > était livré mais **introuvable** (un seul bouton sur `/profiles` l'ouvre désormais, focus dans le
  > formulaire) ; la liste des profils **débordait de sa carte dès le second profil** (colonne large,
  > comme les autres écrans denses) ; et surtout la suite HP **ne tenait qu'un seul profil**, si bien
  > que huit écrans dans deux thèmes déclaraient propre un écran cassé — path 0 crée maintenant un
  > second profil vide et HP-03 bascule de l'un à l'autre, ce qui rend ADR-0014 observable au lieu
  > de supposée. Leçon transférable : *une fixture dont la cardinalité est toujours un ne prouve
  > rien sur la cardinalité.*
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-14**: Voir d'un coup d'œil l'évolution de l'évaluation Stockfish sur toute la partie, dans un graphique à côté du plateau.
  > **Grillée** (2026-08-14) — **pas d'ADR** : rien n'est coûteux à défaire (composant client isolé,
  > aucun schéma, aucun endpoint, aucune donnée persistée) et le seul vrai arbitrage découle
  > d'ADR-0009. `CONTEXT.md` : nouveau terme **`Evaluation curve`**. Branche :
  > `integration/US-14-evaluation-graph`.
  >
  > Le besoin : sur la page **Analyse**, un graphique **à côté** du plateau, début
  > de partie **à gauche**, où **la zone d'un joueur grandit à mesure qu'il prend l'avantage**, et où
  > le **coup en cours est mis en avant**. Une illustration de référence a été fournie (aire
  > blanc/noir sur un axe vertical borné, curseur vertical sur le coup courant, pastilles de qualité
  > de coup posées sur la courbe).
  >
  > Cadré par le demandeur, hors débat au grilling :
  > - Le graphique **n'est pas cliquable** (lecture seule ; la navigation reste la liste des coups).
  > - Il porte **exactement la même information** que la barre d'évaluation et que la valeur affichée
  >   à côté de chaque coup (`+0.3`) — même grandeur, même repère Blancs, aucune divergence possible
  >   entre les trois vues.
  > - Il inclut **le nombre et la nature des erreurs**, telles qu'elles sont déjà en base.
  > - **Aucune nouvelle valeur calculée** : cette US est de l'affichage, rien d'autre.
  >
  > État vérifié : **la donnée est déjà là, aucun changement serveur attendu**.
  > `GET /api/games/:id/annotations` renvoie déjà, pour **chaque demi-coup**, `whiteEval` **et**
  > `whiteWinChances` (0–100, repère Blancs) plus la `severity` du coup
  > (`server/src/analysis/derivation.ts:9`), dérivés à la volée des `evaluations` d'US-4 (ADR-0009).
  > `GameViewer.tsx:20` les charge déjà et `Board.tsx:91` en consomme **un seul point à la fois** via
  > `WinningChancesBar` : le graphique est cette même barre étendue au temps. C'est donc une US
  > **purement client**.
  >
  > **Le piège du cadrage, désamorcé** : « la même information que la barre **et** que la valeur à
  > côté des coups » désignait deux **rendus distincts de la même `Evaluation`** — la barre est pilotée
  > par `whiteWinChances` (0–100, saturé), la valeur `+0.3` par `whiteEval` (centipions, non borné,
  > mats compris). Une aire ne peut pas être géométriquement les deux.
  >
  > Décisions du grilling :
  > - **L'aire porte les winning chances**, pas les centipions. La proportion blanc/noir du graphique
  >   est donc exactement celle de la barre à l'instant courant : les deux vues sont la même chose,
  >   l'une dans le temps, l'autre à l'instant. Bornée par construction, mat = aire pleine, et c'est
  >   l'échelle sur laquelle les sévérités sont définies (`CONTEXT.md`) — une chute visible correspond
  >   donc à l'erreur marquée. Écrêter des centipions à ±N aurait été une règle de présentation
  >   **nouvelle** (et un graphique qui ne dit plus la même chose que la barre juste au-dessus).
  >   Le `+0.3` reste en libellé, inchangé.
  > - **Le graphique vit dans `Board`**, conditionné à la présence d'`annotations` — le précédent
  >   exact de `WinningChancesBar` (`Board.tsx:91`). Aucun état remonté : le demi-coup courant est
  >   `index` (`Board.tsx:56`) et, le graphique n'étant pas cliquable, le flux est **à sens unique**.
  >   Il reste **son propre composant** (`EvaluationGraph`), jamais inliné. Le jour où il deviendrait
  >   une commande, remonter `index` dans `GameViewer` sera un refactoring local.
  > - **Impact vérifié : `Board` n'a qu'un seul appelant**, `GameViewer.tsx:58`. L'Explorateur
  >   (`ExplorerPage.tsx:85`) et `/danger` (`DangerPage.tsx:118`) utilisent directement le
  >   `Chessboard` de `react-chessboard` — ils ne voient pas passer ce changement (la vigilance
  >   « `Board` est partagé » d'US-10a portait sur le *terme* `Board orientation`, pas sur le
  >   composant). Restent trois impacts locaux à la page Analyse : la mise en page de `Board` (une
  >   rangée plateau | graphique, sans feuille de style — US-13), `client/test/Board.test.tsx`, et la
  >   suite HP (HP-01 étape 8, HP-02 passent par Analyse).
  > - **Un seul décompte d'erreurs, celui du Player** (`3 ?!`, `1 ?`, `2 ??`), agrégé côté client
  >   depuis `annotations` — agrégat d'affichage, pas une valeur nouvelle, cohérent avec ADR-0009.
  >   Pas les deux colonnes W/B de l'illustration : `gameAnnotations`
  >   (`server/src/analysis/derivation.ts:99`) laisse `severity` à **`null` sur tous les coups de
  >   l'adversaire**, et `CONTEXT.md` le pose comme une décision de domaine, pas comme un manque.
  >   **Conséquence assumée** : la courbe montre les deux joueurs (l'évaluation est un fait de la
  >   position), les marqueurs seulement le Player — donc le libellé dit « **vos** erreurs », sinon
  >   une chute sans pastille sur un coup adverse se lira comme un bug.
  > - **Les erreurs sont à la fois marquées sur la courbe et décomptées** : le décompte dit
  >   « combien », la courbe dit « quand », et c'est le « quand » qui justifie un axe temporel. Le
  >   marqueur porte le **glyphe** (`?!`/`?`/`??`, `SEVERITY_GLYPH` `Board.tsx:8`), pas une pastille de
  >   couleur : vocabulaire déjà à l'écran, sévérité distinguée par la **forme**. La teinte
  >   (`SEVERITY_TINT` `Board.tsx:15`) peut renforcer, jamais porter seule.
  > - **Le graphique est `aria-hidden`, et c'est une description exacte, pas un renoncement** : toute
  >   donnée qu'il porte est déjà en texte dans le même composant — la liste des coups donne `san` +
  >   glyphe + `Evaluation` **par demi-coup** (`Board.tsx:102-121`), le readout donne le coup courant
  >   et son `+0.3` (`:87`), la barre donne la balance de l'instant (`:91`). Un `aria-label` résumant
  >   80 demi-coups serait du bruit, et l'*interpréter* serait de la valeur nouvelle. Le décompte
  >   d'erreurs, lui, est du **vrai texte**. Bénéfice de bord : pas de second `role="img"` chiffré, donc
  >   pas de collision avec `getByRole("img", { name: /55/ })` (`Board.test.tsx:142,146`) — et pas de
  >   troisième région annoncée sur une page qui en a déjà une de trop (celle de `react-chessboard`,
  >   tierce, finding ouvert depuis US-8). **Latitude accordée** : si des tests unitaires de `Board`
  >   entrent malgré tout en conflit, en profiter pour renommer / assainir le composant.
  > - **Repère du coup courant doublement porté** : curseur vertical sur le graphique (visuel) et
  >   l'`aria-current` déjà présent sur le coup dans la liste (`Board.tsx:109`) — le repère non
  >   chromatique existe donc déjà.
  > - **Géométrie** : un point par **`Move` (demi-coup)**, espacement uniforme (pas le temps de
  >   réflexion, qu'on n'a pas) ; bord gauche = **ply 0, la Position initiale** à 50/50, ce qui est
  >   déjà l'état d'ouverture du plateau (`Board.tsx:56`) — noter que `/danger` **exclut** la Position
  >   initiale, mais c'est une règle d'agrégat, une partie unique a un point de départ qui a un sens ;
  >   **un seul repère, la médiane 50 %**, sans graduation ni grille (la lecture précise se fait sur le
  >   `+0.3` et la liste des coups).
  > - **États sans rien à montrer, aucun nouveau message ni contrôle** : partie non analysée →
  >   `{ analyzed: false, plies: [] }` (`server/src/annotations/repository.ts:20`), le graphique
  >   n'apparaît pas et `GameViewer.tsx:47-52` parle déjà (« pas encore analysée » + bouton
  >   Analyser) ; case « Afficher les annotations » décochée → `annotations` à `undefined`
  >   (`GameViewer.tsx:61`), le graphique disparaît avec la barre, les glyphes et les valeurs. À
  >   surveiller à l'implémentation : décocher ne doit pas faire sauter la mise en page (plateau seul
  >   dans une rangée prévue pour deux).
  >
  > Le **critère d'acceptation** d'une Feature Path agentique sur un graphique est tranché dans le
  > PRD : présence, sens de l'axe, synchronisation du curseur, position des marqueurs, cohérence du
  > décompte — jamais l'esthétique.
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #35, mergée le 2026-08-14).
  > Trace de la revue : PR `integration/US-14-evaluation-graph` → `develop`, **étape 9 d'HP-01 rejouée**
  > (greffe incluse) contre le vrai chess.com et le vrai Stockfish, base repartie de zéro.
  > PRD : `.scratch/evaluation-curve/PRD.md`. Découpée en **2 issues**, sur
  > `integration/US-14-evaluation-graph` :
  > - `01-evaluation-curve-beside-the-board` ✅ — tracer bullet, auto-mergée après FP verte (6/6)
  > - `02-your-errors-marked-and-counted` ✅ — marqueurs par glyphe posés au bon demi-coup + décompte
  >   en texte, libellé comme **vos** erreurs, Player uniquement ; auto-mergée après FP verte (5/5)
  >
  > **Livrée.** Trois défauts trouvés **à l'écran** et invisibles aux étages inférieurs : le
  > graphique n'avait que 110 px pour toute une partie (axe du temps écrasé, courbe lue de haut en
  > bas), les glyphes des marqueurs étaient **étirés** par l'échelle non uniforme du SVG (sortis du
  > repère déformé, posés au-dessus), et le décompte ne s'accordait pas en nombre. La collision de
  > tests annoncée au grilling a eu lieu (`AnalysePage` demandait `??` par son texte, que la courbe
  > rend ambigu) : le test interroge désormais la liste des coups par son nom accessible, sa source
  > accessible. `SEVERITY_GLYPH`/`TINT` extraits en module partagé (une seule source pour la liste
  > des coups, la teinte de case et les marqueurs).
  >
  > Seams : la logique dans une **fonction pure** (prior art `candidateArrows`), le test composant du
  > plateau gardé mince, **FP sur base seedée** (`seed:danger` insère des parties déjà analysées avec
  > leurs `evaluations` — ni réseau ni moteur). **Budget HP inchangé** : greffe gratuite sur l'étape 9
  > d'HP-01, qui analyse déjà deux parties pour de vrai. Le demandeur se contente de **cette seule
  > étape 9** pour la PR `integration → develop` (HP-02 et HP-03 ne passent pas par Analyse) — à
  > reconfirmer au moment de la PR.
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-10b**: Ne pas attendre dans le vide sur "Positions dangereuses".
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #34, mergée le 2026-08-14).
  > Trace de la revue : PR `integration/US-10b-danger-page-waiting` → `develop`, suite HP rejouée en
  > entier (3/3 vertes), les 3 issues livrées et auto-mergées (PR #31, #32, #33). Issue de la
  > scission d'US-10 (les deux préoccupations qui y étaient réunies n'ont rien en commun). `GET /api/danger` (`server/src/routes/danger.ts:13`) est synchrone — pas
  > de job de fond comme l'`Analysis pass` — et `DangerPage.tsx:21,33` rend `null` tant que la
  > réponse n'est pas là : **écran blanc** pendant le calcul. Le chemin d'erreur retombe sur la même
  > branche que « rien d'analysé » (`:26`), donc un échec est indiscernable d'un état vide.
  >
  > **Commencer par mesurer** : le choix job+polling vs. simple indicateur est arbitraire sans
  > chiffre. Coût relevé en lecture de code — un **N+1** (une requête `evaluations` par partie
  > analysée, `danger/repository.ts:35`) et surtout un **rejeu cm-chess complet du PGN par partie et
  > par requête** (`chess/positions.ts:9`), le tout sur le thread principal, sans cache ni
  > mémoïsation (choix assumé d'ADR-0009 : agrégat dérivé à la volée). Chronométrer
  > `getDangerPositions` contre une DB réellement importée + analysée avant de trancher.
  >
  > **Grillée** (2026-08-14). La mesure a déplacé le problème : le N+1 soupçonné coûte **41 ms**,
  > mais le **rejeu cm-chess du PGN** en coûte **2419** sur 2,5 s — et ce n'est pas tout côté
  > serveur, l'agrégat renvoyait **3736 entrées dont 66 récurrentes** (400 Ko, autant de plateaux).
  > Décisions : job + polling **rejeté** (masque un coût au lieu de le supprimer, aucune unité de
  > progression naturelle) au profit du stockage de la **FEN par demi-coup** — **ADR-0012**, qui
  > ramène `/danger` de ~2,5 s à ~0,1 s (et de ~31 s à ~1,3 s sur une année) ; `CONTEXT.md` :
  > `Danger position` = atteinte **au moins deux fois**, Position initiale **exclue**, classement
  > **par proportion d'erreur sérieuse**. HP-01 pas 9 réécrit (deux parties les plus courtes de
  > même premier coup — une entrée garantie par construction, ~3,5 min, moins qu'avant).
  > PRD : `.scratch/danger-page-waiting/PRD.md`. Découpée en 3 issues, sur
  > `integration/US-10b-danger-page-waiting` :
  > - `01-recurring-positions-most-dangerous-first` — plancher de récurrence, exclusion ply-0, tri
  >   par proportion, cap d'affichage à 30
  > - `02-four-states-never-a-mute-screen` — calcul annoncé, échec distinct de l'état vide, et
  >   l'état « rien de récurrent » (bloquée par 01)
  > - `03-store-the-per-ply-fen` — colonne `fen` requise, écrite par la passe, contrôle d'intégrité
  >   et réparation à l'ouverture (bloquée par 02, ADR-0012)
  >
  > **Livrée.** `/danger` mesuré sur l'historique réel (78 parties, 6278 positions) : **3111 ms →
  > 55 ms**, et l'agrégat passe de 3736 entrées à 109. La page ne rend plus jamais d'écran muet :
  > quatre états distincts, dont l'échec serveur qui ne renvoie plus le joueur analyser ce qu'il
  > vient d'analyser.
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-10a**: Savoir dans quel sens lire un échiquier et qui joue quoi.
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #29, mergée le 2026-08-14).
  > Trace de la revue : PR `integration/US-10a-players-on-the-board` → `develop`, suite HP rejouée en
  > entier (3/3 vertes). Issue de la scission d'US-10 (voir US-10b pour l'autre moitié). **Grillée** — pas d'ADR : rien
  > n'est coûteux à défaire ici. `CONTEXT.md` : nouveau terme **`Board orientation`**.
  > Branche : `integration/US-10a-players-on-the-board`.
  >
  > Constat vérifié : les **trois** plateaux (`components/Board.tsx:77`, `pages/ExplorerPage.tsx:75`,
  > `pages/DangerPage.tsx:44`) sont **Blancs-en-bas en dur** — aucun ne passe `boardOrientation`.
  > `AnalysePage.tsx:32` charge la `Game` complète et `GameViewer.tsx:18` n'en retient que
  > `pgn`/`analyzed`/`id` : `opponent` et `playerColor` sont récupérés puis jetés. `playerColor`
  > n'est affiché **nulle part** dans l'app.
  >
  > Décisions :
  > - Le besoin commun aux trois écrans est **l'orientation et le trait**, pas les noms : sur
  >   l'Explorateur et sur Danger il n'y a pas d'adversaire nommable, l'agrégat porte sur N parties.
  >   Les noms ne concernent que la page Analyse.
  > - **Orientation imposée par le contexte, jamais pilotable** : Analyse = côté joué par le Player,
  >   Explorateur = côté sélectionné (le radio existant `ExplorerPage.tsx:21` en devient la commande,
  >   sans nouveau contrôle), maintenu constant dans la descente ; Danger = **trait de la FEN**.
  > - Sur `/danger`, orienter « du point de vue du Player » est **indéfini** : `danger/repository.ts:38`
  >   compte toutes les positions atteintes et la clé FEN-4 n'inclut pas le côté joué, donc une même
  >   entrée agrège des parties jouées Blancs *et* Noirs. Seul le trait y est affiché — jamais
  >   « votre côté ».
  > - **Source des noms sur Analyse : les en-têtes PGN `[White]`/`[Black]`.** Une seule source, déjà
  >   dans la `Game`, cohérente avec le plateau par construction ; aucune dépendance à `settings`
  >   (que US-11 remplacera) ni appel réseau ; Lichess sert les mêmes en-têtes, donc robuste à US-12.
  >   `parseGame` (`chess/history.ts:37`) jette les en-têtes aujourd'hui — cm-chess les expose.
  >   `game.playerColor` sert uniquement à marquer lequel des deux est le Player.
  > - **Bandeau de partie complet** sur Analyse : les deux joueurs (nom + couleur, avec un repère
  >   **non chromatique** marquant le Player), le résultat, la date, la cadence et l'**ouverture**
  >   (ECO + nom). `eco`/`openingName` sont déjà renvoyés par `GET /api/games/:id`
  >   (`routes/games.ts:14` renvoie la ligne brute) mais absents de l'interface client
  >   (`types/game.ts:54`) : à déclarer côté client seulement, pas de changement serveur. Une `Game`
  >   non classée relève du bucket **Other**.
  > - **Résultat affiché comme mention explicite côté Player** (« Victoire »/« Défaite »/« Nulle »
  >   sur la ligne du Player), pas comme score symétrique : `result` est relatif au Player
  >   (`import/mapping.ts:37`), et c'est déjà la convention de `GameList` et `/stats`.
  >
  > À surveiller à l'implémentation : `Board.tsx` est **partagé** avec l'Explorateur, qui n'a pas de
  > `Game` — il ne doit pas se mettre à en supposer une. Retourner les plateaux change un
  > comportement existant : **HP-01 et HP-02 s'appuient sur Blancs-en-bas**, à rejouer. Pas de
  > feuille de style dans le projet (US-13) : un bandeau chargé reste du texte brut, et tout repère
  > doit être doublé d'un marqueur non chromatique.
  >
  > Découpée en 3 issues, toutes implémentées et auto-mergées sur l'intégration après Feature Path
  > verte. PRD : `.scratch/players-on-the-board/PRD.md`. **Aucun changement serveur** sur toute l'US.
  > - `01-game-header-and-player-side-board` ✅ (PR #25) — tracer bullet : primitives `gameHeaders`
  >   (en-têtes PGN) et `sideToMove` (FEN 4 champs), orientation en propriété du plateau, bandeau de
  >   partie. Finding trouvé **à l'écran** en FP et corrigé : le bandeau rendu en `ul` sous celui de
  >   la navigation se lisait comme deux entrées de menu.
  > - `02-explorer-follows-the-side-explored` ✅ (PR #26) — orientation tenue au côté exploré, sans
  >   se retourner sur un `Opponent reply` ; trait affiché.
  > - `03-danger-diagrams-show-the-side-to-move` ✅ (PR #27) — chaque diagramme orienté au trait
  >   depuis sa propre FEN ; jamais formulé comme le côté du Player.
  >
  > **Suite HP adaptée** (PR #28) puis **rejouée en entier**, contre la vraie API chess.com et le
  > vrai Stockfish WASM, base repartie de zéro avant chacune : **HP-01 9/9** (chiffres durs exacts —
  > 82 parties, Bullet 10 / Blitz 72, 45·0·37, mois à 28 et 54 ; pass réel 78/78 ; 78 entrées sur
  > `/danger`, aucune orientation en désaccord avec son trait), **HP-02** (orientation constante sur
  > toute la descente, trait alternant, flèches mirroitées), **HP-03** (32 entrées, somme 54, seuil
  > 50 % strict exercé sur 3 lignes). Aucune erreur console sur les trois.
  >
  > Le budget HP restant à 3/3, US-10a s'est greffée : HP-01 gagne une **étape 6b** (ouvrir une
  > partie de l'autre couleur — sans elle le retournement n'est jamais exercé) et HP-02 une
  > **étape 9** (le plateau ne se retourne *pas* en descendant).
  >
  > Findings non bloquants ouverts : la barre de winning chances ne suit pas l'orientation ; sur
  > l'Explorateur le libellé du trait est loin de la liste des candidats ; `react-chessboard` injecte
  > ses instructions de glisser-déposer dans chacun des 119 diagrammes de `/danger` (tierce partie) ;
  > cette même page rend tous ses diagrammes d'un coup, ce qui **se combine avec US-10b**.
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-9**: Importer plusieurs mois de mon historique chess.com en une seule fois.
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #19, mergée le 2026-08-12).
  > Trace de la revue : PR `integration/US-9-multi-month-import` → `develop`, suite HP jouée (3/3 vertes).
  > Grillée. Décision : une **plage contiguë** de mois (pas une sélection de mois arbitraires),
  > exécutée en **job de fond** avec progression comptée en mois, **séquentielle**, **tolérante à
  > l'échec d'un mois** (rejeu idempotent de la plage plutôt que retry), **sans plafond serveur**
  > (confirmation UI au-delà de 24 mois). Un seul contrat d'import : le mono-mois devient une plage
  > à bornes égales. `CONTEXT.md` : `Import` re-scopé, terme `Monthly import` ajouté.
  > Nouvelle **ADR-0010** (revient sur une remarque de portée d'ADR-0008, annotée en conséquence).
  > PRD : `.scratch/multi-month-import/PRD.md`. Découpée en 3 issues, implémentée sur
  > `integration/US-9-multi-month-import` :
  > - `01-range-import-background-job` ✅ — tracer bullet : plage + job + polling + progression en
  >   mois + résumé consolidé.
  > - `02-monthly-import-lines-and-fault-tolerance` ✅ — ligne par mois, un mois en échec n'interrompt
  >   pas l'Import (bloquée par 01).
  > - `03-range-input-guardrails` ✅ — plage inversée (400), bornage au mois courant, 404 synchrone
  >   sur username inconnu, confirmation au-delà de 24 mois.
  >
  > Les 3 issues validées par leur Feature Path (fixture d'archive via `CHESSCOM_BASE_URL`), puis la
  > **suite HP rejouée en entier contre la vraie API chess.com** : HP-01/02/03 vertes. HP-01 a été
  > réécrit pour couvrir la plage (`2026-05 → 2026-06`, 82 parties) au lieu d'un mois unique, et
  > asserte désormais des chiffres durs relevés sur le compte réel. Pas de 4e HP : la plage est
  > absorbée dans le scénario d'import existant.
  >
  > Reporté hors US-9 : le raccourci « tout mon historique » via `/pub/player/{u}/games/archives`.
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-13**: Doter l'application d'une feuille de style, pour qu'elle soit présentable — sans maquette en entrée.
  > **Grillée** (2026-08-17) — **ADR-0013**. `CONTEXT.md` **inchangé, et c'est un constat** : une
  > feuille de style n'introduit aucun concept de domaine, et « token » / « rôle de thème » sont du
  > vocabulaire d'implémentation, dont la place est dans l'ADR. Branche :
  > `integration/US-13-stylesheet`.
  >
  > État vérifié : **aucun CSS dans le projet** — zéro `.css`, aucun `<link>` dans
  > `client/index.html`, aucune dépendance de style. Le backlog annonçait cinq composants stylés
  > inline ; il y en a **neuf**, et surtout les inline sont de **deux natures** que rien ne
  > distinguait : des **teintes porteuses de sens** (`SEVERITY_TINT` `chess/severity.ts:17`, la ligne
  > faible `#fbe0e0` sur `OpeningsPage.tsx:58` et `DangerPage.tsx:115`, la pastille « ✓ analysée »
  > `GameList.tsx:41`, l'échec d'import `ImportSummary.tsx:22`, le gras du Player
  > `GameHeader.tsx:36`, la palette d'`EvaluationGraph.tsx:7-11`, l'`hsla` d'`arrows.ts:25`) et de la
  > **mise en page pure** (`maxWidth: 480/240/820`, `flex`, `height: 220` dans `Board.tsx:87-104`).
  > Seule la première famille a un enjeu d'accessibilité.
  >
  > **Pas de maquette : la référence est produite ici, en trois pièces** — les tokens (écrits), le
  > squelette de page (écrit, ci-dessous), et la capture de l'écran pilote validée par le demandeur.
  >
  > Décisions du grilling :
  > - **SCSS comme langage d'écriture, custom properties comme forme des tokens** (ADR-0013). SCSS
  >   demandé par le demandeur et retenu : `sass` est une devDependency de build, elle n'importe
  >   aucun design system et ne laisse rien dans le bundle — contrairement à Tailwind (qui remettrait
  >   les décisions visuelles dans les `className`, soit ce que l'US défait) ou à une bibliothèque de
  >   composants (qui imposerait de réécrire le markup et de risquer les noms accessibles verrouillés
  >   par les tests d'US-1 à US-14). Les `$variables` sont réservées au compile-time (breakpoints dans
  >   `@media`, maps itérées, arguments de mixin).
  > - **Les tokens ne peuvent pas être des `$variables`, et l'argument est local** : plusieurs
  >   couleurs sont consommées **depuis TypeScript**, pas depuis un sélecteur — `SEVERITY_TINT`
  >   alimente la prop `squareStyles` de `react-chessboard` (`Board.tsx:56`), API tierce qui prend un
  >   objet de style et qu'aucune classe n'atteint. Une `$variable` a disparu à l'exécution : il
  >   faudrait redéclarer les hex en TS, donc rétablir la duplication que l'US supprime et défaire
  >   l'extraction d'US-14 qui avait fait de `SEVERITY_GLYPH`/`TINT` une source unique.
  >   `var(--tint-blunder)` traverse la frontière. Prix payé : plus d'erreur de compilation sur un nom
  >   de token.
  > - **Mode sombre dedans**, en **préférence système seule** (`@media (prefers-color-scheme: dark)`)
  >   — aucun contrôle, aucun état, aucune persistance, aucun changement serveur. Un `[data-theme]`
  >   se greffera plus tard sans toucher une règle.
  > - **Trois familles de couleur, et c'est une règle, pas une convention** : les *rôles de thème*
  >   s'inversent ; les *teintes sémantiques* gardent leur sens, reçoivent une valeur par thème **et
  >   emportent leur propre encre** (leur contraste ne dépend jamais de l'héritage) ; les *couleurs de
  >   joueur et de plateau* (parts Blancs/Noirs de `WinningChancesBar` et d'`EvaluationGraph`, cases
  >   du plateau) **ne réagissent jamais au thème** — la part des Blancs est claire parce que ce sont
  >   les Blancs. Elles gagnent une bordure pour rester détachables d'un fond sombre.
  >   `react-chessboard@5.10.0` expose `lightSquareStyle`/`darkSquareStyle`/`boardStyle` : on a la
  >   prise, aucun des trois plateaux ne s'en sert aujourd'hui.
  > - **Responsive : fluide, sans breakpoint conçu.** Largeurs en `ch`/`rem`, grilles qui se replient
  >   d'elles-mêmes. C'est une manière d'écrire, pas un travail de plus — et c'est le seul choix qui
  >   ne grave pas des px à défaire.
  > - **Markup libre** (choix du demandeur, contre ma recommandation d'un périmètre borné aux
  >   accroches). Coût assumé et énoncé : `StatsPage`, `DangerPage`, `ExplorerPage`, `GameList`,
  >   `Board`, `AnalysePage` sont directement exposés et cessent de servir de filet pendant le
  >   travail ; **la suite HP pilote la vraie UI** et devra être adaptée puis rejouée, exactement
  >   comme en US-10a (PR #28) — budget à prévoir, pas à découvrir à la PR.
  > - **Séquencement : markup d'abord, en tranche séparée**, sans une ligne de style. Les tests sont
  >   adaptés là et nulle part ailleurs, donc un test rouge dans les tranches suivantes désigne
  >   forcément le style. Contrepartie assumée : cette tranche n'est pas démontrable à l'œil, sa FP
  >   porte sur la structure.
  > - **Le squelette est fixé ici**, sinon la tranche markup restructure à l'aveugle au service d'une
  >   grille qui n'existe pas : châssis `header` (`h1` + `nav` en barre, onglet courant marqué sur
  >   `[aria-current="page"]` que `NavLink` pose déjà — repère non chromatique gratuit) ; colonne de
  >   lecture bornée à `72ch` avec une **variante large** pour `/danger` et `/analyse` ; **une page =
  >   une `section aria-labelledby` + un `h2`** ; données tabulaires en `<table>` (`th scope`, nombres
  >   à droite, `tabular-nums` en token global) ; ce qui est une liste reste une liste (`GameList` en
  >   `display: grid`, `/danger` en grille de cartes `auto-fit`) ; Analyse garde la rangée d'US-14
  >   avec des bases fluides ; séparation par l'espacement, jamais par des filets.
  > - **`/stats` devient un seul tableau** (amendement du demandeur) : Total, cadences et côtés en
  >   groupes de lignes. Conséquence à porter dans la tranche markup — les `h3` « Par cadence » /
  >   « Par côté » disparaissent comme titres et les `aria-label` des `ul` migrent vers des `th` de
  >   groupe, or `StatsPage.test.tsx` interroge exactement ces libellés.
  > - **Grille d'acceptation d'une US esthétique** : l'agent **mesure et bloque** sur ce qui est
  >   objectif — feuille effectivement appliquée (aucun token non résolu), contraste calculé sur les
  >   paires réellement rendues ≥ 4.5:1 **dans les deux thèmes**, aucun débordement horizontal en
  >   fenêtre étroite, repère non chromatique toujours présent, couleurs de joueur inchangées entre
  >   thèmes. Le **goût se juge une seule fois**, par le demandeur, sur l'écran pilote ; les écrans
  >   suivants ne sont plus jugés qu'à leur conformité au squelette et aux tokens. Le contraste est
  >   **bloquant** : le finding a11y d'US-3 (surlignage invisible) est le précédent à ne pas rejouer.
  > - **Budget HP** : pas de 4ᵉ HP, et la suite couvre déjà les invariants sensibles — HP-03 étape 4
  >   asserte le surlignage sémantique, HP-02 étape 4 l'opacité et la teinte des flèches, HP-01
  >   étape 9 la courbe et ses marqueurs. Le demandeur retient une **passe thème sur les trois HP**
  >   (plutôt que la greffe bornée sur HP-03 que je recommandais) : chaque HP gagne une **étape
  >   finale** qui repasse sous préférence sombre les écrans **déjà atteints**, sans réimporter ni
  >   réanalyser — le surcoût est du rendu, pas du parcours.
  > - **Exigence du demandeur : la suite HP doit être revue pour visiter tous les écrans.** Une passe
  >   thème qui ne voit pas un écran ne prouve rien sur cet écran, et aujourd'hui `/stats` n'est
  >   visité par aucun HP, `/danger` seulement en drive-by. Forme retenue : l'étape finale de passe
  >   thème **parcourt la navigation** et traverse les six écrans dans les deux thèmes, en réutilisant
  >   l'état déjà construit — les journeys elles-mêmes restent des parcours de valeur et ne se
  >   transforment pas en balayage de couverture. À confirmer au PRD.
  >
  > **Pilote validé avant toute tranche** (prototype jetable, `/` et `/analyse` dans les deux thèmes,
  > conservé comme référence visuelle dans `.scratch/stylesheet/pilot-reference.html`). Produit
  > **maintenant** plutôt qu'en tranche 2 sur remarque du demandeur : le goût est la seule décision
  > qu'on ne peut pas déléguer, et elle ne devait pas se retrouver derrière une tranche déjà mergée.
  > Deux pilotes plutôt qu'un, parce qu'une palette qui tient sur une liste peut s'effondrer sur la
  > page Analyse. Il a payé son coût — **trois enseignements que rien d'autre n'aurait donnés avant
  > la fin** :
  > - **La règle des trois familles avait une faille** : une sévérité posée **sur une case** relève de
  >   la famille constante, pas de la famille sémantique, parce que la pièce qu'elle porte garde son
  >   encre dans les deux thèmes. La case surlignée tombait à **1.49:1** en sombre. D'où
  >   `--square-inaccuracy/mistake/blunder`, constantes, distinctes des `--tint-*` du châssis. La
  >   frontière n'est pas le sens de la couleur mais **ce qui est peint par-dessus**.
  > - **Le plateau relève du 3:1 des graphiques non textuels**, pas du 4.5:1 du texte — en production
  >   ce sont les SVG de `react-chessboard`.
  > - **Et il se juge sur `max(remplissage, contour)` contre la case**, pas sur le remplissage seul :
  >   une pièce blanche sur case claire mesure 1.24:1 en remplissage et 14.65:1 en contour, et c'est
  >   le contour qui porte la lisibilité. Jugé au remplissage, le critère rejetterait un plateau
  >   parfaitement lisible. Pire cas mesuré sur le pilote validé, toutes combinaisons confondues :
  >   **4.81:1**. Texte : **0 faute** sur 63 nœuds par thème, aucun débordement horizontal.
  >
  > Tokens figés et référence visuelle : dans **ADR-0013**.
  >
  > PRD : `.scratch/stylesheet/PRD.md`. **Découpée en 6 issues**, toutes `ready-for-agent`, sur
  > `integration/US-13-stylesheet` :
  > - `01-restructure-markup-to-the-skeleton` — tous les écrans au squelette, **zéro style**, les
  >   tests adaptés ici et nulle part ailleurs ; FP structurelle, pas esthétique
  > - `02-tokens-and-the-app-chrome` — le pilote rendu réel : SCSS câblé, tokens, châssis, bloc
  >   `prefers-color-scheme: dark`, et le test de cohérence des tokens (bloquée par 01)
  > - `03-semantic-tints-move-to-tokens` — la tranche à risque : une source par teinte, famille
  >   constante du plateau, repères non chromatiques intacts (bloquée par 02)
  > - `04-lists-and-tables` — Mes parties, `/stats`, `/openings` : rangées constantes, chiffres
  >   alignés (bloquée par 02)
  > - `05-dense-screens` — `/danger` en grille de cartes, explorateur, rangée d'Analyse fluide ;
  >   après elle, **plus aucun style inline de mise en page** (bloquée par 02)
  > - `06-revise-the-hp-suite` — adapter les 3 HP au markup, puis l'étape finale qui parcourt les six
  >   écrans dans les deux thèmes ; ferme l'angle mort `/stats` (bloquée par 03, 04, 05)
  >
  > Seams confirmés : **agentique en apex** (styles calculés via CDP — le seul endroit où une feuille
  > de style est observable ; le script de mesure du pilote est réutilisable comme outillage de FP),
  > **composants en jsdom** pour la structure et le nom du token seulement (jsdom ne charge pas la
  > feuille), un **seam nouveau** de cohérence des tokens au niveau du repo, et le build. Aucun test
  > serveur : l'US ne touche pas le serveur. Régression visuelle par captures **rejetée** (dépendance,
  > binaires versionnés, flake notoire, aucune CI pour la porter).
  >
  > Vigilances relevées : **aucun HP ne visite `/stats`**, or c'est l'écran dont le markup change le
  > plus — sa vérification repose entièrement sur sa FP. Les tests composants tournent en **jsdom**,
  > qui ne charge pas la feuille : les assertions de couleur littérale devront porter sur le nom du
  > token (plus honnête, elles vérifient le câblage). Décocher les annotations ne doit pas faire
  > s'effondrer la rangée d'Analyse (vigilance déjà ouverte en US-14).
  >
  > Trouvailles hors périmètre strict, à traiter en drive-by ou à laisser : **`GamesPage` est la
  > seule page sans `<section>` ni `<h2>`** (le squelette la réaligne) et porte **la seule chaîne
  > restée en anglais** de l'app (« No games yet — import your chess.com history to get started. ») ;
  > `client/package.json` déclare `vite ^8.1.5` alors que le `node_modules` installé est en 5.4.21.
  >
  > **Livrée** (2026-08-17) — les **six slices** mergées dans `integration/US-13-stylesheet`
  > (PR #37 → #43). Suite **HP 3/3 verte** sur l'app réelle, avec la passe thème sur les six écrans
  > dans les deux thèmes (36 audits, aucun échec). PR `integration → develop` ouverte : le merge est
  > une décision humaine. Deux points laissés au relecteur, écrits sur les issues : la **largeur de
  > l'explorateur** (son diagramme tombe à 317 px sur écran large ; un attribut suffit, mais le goût
  > avait été figé sur un pilote qui ne montrait pas cet écran) et la cellule `Win rate` **vide**
  > plutôt qu'un tiret sur une cadence sans partie (du contenu, hors périmètre).

  >
  > **Terminée** (2026-08-18) — fusionnée dans `develop` (PR #44, 42 commits). Six slices plus
  > quatre rondes de corrections nées de la relecture à l'écran du demandeur. `develop` vérifié
  > après merge : build vert, 144 tests serveur + 370 client. Deux constats versés au backlog
  > technique en `needs-triage` (un échec de `/api/games` qui s'affiche comme un historique vide ;
  > la question produit du sélecteur de côté de l'explorateur), et un choix laissé ouvert : la
  > cellule `Win rate` vide plutôt qu'un tiret, du contenu hors périmètre.

- **US-8**: Être rassuré que le pass d'analyse s'est bien terminé, sans avoir à deviner.
  > Un indicateur de progression et une coche "analysée" existent déjà
  > (`GamesPage`/`GameList`), mais à la fin d'un pass la progression disparaît sans aucun message de
  > confirmation — incertitude sur le fait que ça se soit bien passé. La coche "analysée" actuelle
  > est un texte gras (`✓ analysée`), pas nécessairement assez visible. Points à trancher au
  > grilling : forme du message de fin (toast ? texte permanent ?), et si la coche doit changer de
  > forme/visibilité.
  > **Grillée** (**ADR-0011** : le pass est persisté, sa progression reste dérivée des
  > `Evaluation`s stockées ; `CONTEXT.md` : nouveau terme **`Analysis pass`** — le glossaire n'en
  > avait aucun pour le pass, introduit pourtant par US-4). Découpée en 4 issues, implémentée sur
  > `integration/US-8-analysis-pass-completion` (worktree dédié). PRD :
  > `.scratch/analysis-pass-completion/PRD.md`.
  > - `01-positions-progress-on-a-persisted-pass` ✅ — table `analysis_passes`, `done` dérivé du
  >   `COUNT` sur `evaluations`, progression en Positions, ligne de progression extraite en
  >   composant unique. Bug trouvé et corrigé en Feature Path (le compteur n'atteignait jamais son
  >   total : la remise à zéro fusionnait avec la dernière progression).
  > - `02-completion-summary-and-acknowledgement` ✅ — résumé de fin persistant (survit au
  >   rechargement **et** au redémarrage serveur, vérifié), acquitté par le Player
  >   (`POST /api/analyze/acknowledge`), « rien à analyser » explicite
  > - `03-interrupted-and-failed-outcomes` ✅ — les trois issues du pass, réconciliation au boot
  >   (jamais de reprise automatique), erreur moteur enfin visible, greffe sur HP-01 (budget à
  >   3/3). Mine du cadrage désamorcée (partie à moitié évaluée vs. clé primaire). Finding
  >   bloquant trouvé en FP : un moteur natif cassé tuait le serveur au démarrage, donc l'issue
  >   `failed` n'était atteignable par aucune configuration réelle — corrigé.
  > - `04-analysis-state-at-a-glance-in-the-game-list` ✅ — badge renforcé (pastille encadrée) +
  >   décompte global dérivé des Games déjà chargées, sans appel réseau supplémentaire
  >
  > Les 4 issues validées par leur Feature Path (agentique, UI-first contre l'app réelle : Chrome
  > en CDP, vrai Stockfish WASM, fixture `seed:move-habits`). **Trois bugs trouvés par l'étage
  > agentique et invisibles aux étages inférieurs** : le compteur n'atteignait jamais son total
  > (la remise à zéro fusionnait avec la dernière progression) ; un moteur natif cassé tuait le
  > serveur au démarrage, rendant l'issue `failed` inatteignable ; un moteur muet aurait laissé un
  > pass tourner sans fin. HP-01 étape 8 porte la confirmation de fin (budget HP à 3/3).
  >
  > - `05-readable-readouts-and-one-live-region` ✅ — tranche de finition : lever la confusion entre
  >   le décompte d'historique et le résumé de pass, et ne laisser qu'une région live à nous sur
  >   la page Analyse (celle de `react-chessboard` est tierce, non supprimable)
  >
  > Le finding « un résumé non acquitté est silencieusement remplacé par un pass plus récent » est
  > **assumé** : décision enregistrée dans les Conséquences d'**ADR-0011** (la promesse d'US-8 est
  > qu'on ne rate pas une confirmation *sans agir*, et relancer une analyse est un acte).
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #22, mergée le
  > 2026-08-12). `develop` (US-9) fusionnée dans la branche **avant** l'ouverture : quatre
  > conflits réels, pas seulement le backlog — US-9 avait remodelé l'API d'import et renuméroté le
  > parcours HP-01 ; le merge a cassé deux choses que les tests ont rattrapées. Mergeabilité
  > revérifiée après ouverture : `CLEAN`.
  >
  > **Suite HP rejouée en entier après ce merge** (la première exécution portait sur l'import
  > mono-mois, donc périmée) : HP-01 9/9, HP-02, HP-03 — vertes, contre la vraie API chess.com
  > (`DudulSmash`, 2026-05 → 2026-06, 82 parties) et le vrai Stockfish WASM, sans erreur console.
  > Le **plafond de profondeur d'HP-02**, noté « non exerçable » depuis US-7, l'est enfin : 40
  > demi-coups atteints.
  >
  > **Collision d'ADR corrigée** : US-9 et US-8 avaient toutes deux créé une `ADR-0010` en
  > parallèle, sans conflit git (noms de fichiers différents). Celle d'US-9 étant déjà sur
  > `develop`, celle d'US-8 est renumérotée en **ADR-0011**, avec ses 14 références.
  >
  > Findings non bloquants ouverts : la ligne de progression ne se nomme pas pendant l'exécution ;
  > la région live résiduelle de `react-chessboard` est `assertive` et sans libellé (tierce) ; le
  > backend moteur natif reste non vérifié sur son chemin nominal (seuls ses modes de panne le
  > sont). Un flake observé une fois sur `GameViewer` (annotations), non reproduit, non diagnostiqué.
  >
  > ⚠️ La PR #22 a été mergée sur `5953c78` alors que le dernier commit de la branche
  > (`5460b15`) n'y était pas encore : la renumérotation d'ADR et cette mise à jour du backlog
  > sont arrivées par une PR de rattrapage. Reste `develop → main` (pré-prod, non décidé).

- **US-7**: Voir mes erreurs pendant la revue d'une partie — annoter la qualité des coups (`?!`/`?`/`??`) et l'`Evaluation` sur la page **Analyse**, à partir des `Evaluation`s stockées par US-4.
  > **Différée depuis le grilling d'US-4** : surfaçage **par coup** du `Mistake` (distinct de l'agrégat `Danger position` de `/danger`). **Dépend d'US-4** (table `evaluations` ; aucun calcul moteur supplémentaire, réutilise les évals stockées). Inclut une **option d'activation/désactivation** de la visualisation, **activée par défaut**.
  > Grillée (pas de nouvelle ADR — conséquence directe d'ADR-0009 ; `CONTEXT.md` : terme `Evaluation`
  > précisé, repère Blancs à l'affichage vs. stocké relatif au trait), découpée en 3 issues,
  > implémentée sur `integration/US-7-mistake-annotations-on-analysis`. PRD :
  > `.scratch/move-annotations/PRD.md`.
  > - `01-move-quality-list` ✅ — dérivation partagée avec `/danger` (extraite sans régression),
  >   endpoint `GET /api/games/:id/annotations`, liste de coups annotée (`?!`/`?`/`??` + Evaluation
  >   au repère Blancs) + toggle par défaut activé. Bug trouvé et corrigé en Feature Path
  >   (`whiteEval` fuitait des colonnes SQLite brutes).
  > - `02-position-balance-and-highlight` ✅ — balance winning-chances + Evaluation à côté du
  >   plateau, surlignage de la case d'arrivée du coup fautif courant (teinte par sévérité,
  >   glyph de la liste des coups reste la source accessible).
  > - `03-analyze-from-analyse-page` ✅ — action "Analyser cette partie" scopée à une seule Game
  >   directement sur Analyse, boucle start+poll extraite (`runAnalysis`, réutilisée par "Mes
  >   parties"), rafraîchissement automatique de la Game + des annotations sans reload.
  >
  > Les 3 issues validées par leur Feature Path (agentique ; fixtures `seed:danger`/
  > `seed:move-habits`, jamais le vrai Stockfish). Pas d'extension Chrome disponible cette
  > session : FP vérifiées via le contrat API réel contre le serveur en direct + les tests
  > composant (jsdom), pas de confirmation visuelle navigateur (idem 01).
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #12, mergée le 2026-08-12 ;
  > conflit `BACKLOG.md` avec l'ajout d'US-8/9/10 résolu avant merge). Suite **HP jouée pour de vrai, UI-first** cette fois (Chrome système piloté
  > en CDP, vraie API chess.com, vrai Stockfish WASM, DB repartie de zéro, `DudulSmash` 2026/06) :
  > HP-02 et HP-03 vertes, **HP-01 rouge à l'étape 5** — une Game non analysée n'affichait plus
  > aucun plateau, régression d'`03-analyze-from-analyse-page` **corrigée sur la branche**
  > (`657b6ad`). Le test unitaire existant verrouillait le bug, d'où le silence des étages sous
  > l'apex : il a été inversé. 3 findings non bloquants laissés ouverts dans la PR (progression
  > d'analyse figée à `0/1`, bouton Import non désactivé pendant l'import, `/danger` sans garde
  > d'échantillon minimal). Cap de profondeur d'HP-02 non exerçable sur 54 parties réelles.
  >
  > HP budget à 3/3 : greffe d'US-7 sur l'étape 8 d'HP-01 proposée dans la PR plutôt qu'un 4e HP.
  > Reste `develop → main` (pré-prod, non décidé).

- **US-4**: Identifier mes positions dangereuses par analyse moteur (Stockfish — Mistake et Danger position).
  > Grillée (**ADR-0008** : moteur dans le Node local derrière une interface `Engine` — WASM
  > défaut, natif opt-in `STOCKFISH_PATH`, fake injecté ; supersède ADR-0001 — + **ADR-0009** :
  > `Evaluation`s brutes stockées par demi-coup, qualité + danger dérivés **à la volée**), découpée
  > en 2 issues, implémentée sur `integration/US-4-danger-positions`, **fusionnée dans `develop`**
  > (décision humaine `integration → develop`, PR #6). PRD : `.scratch/danger-positions/PRD.md`.
  > - `01-analysis-pass` ✅ — moteur derrière `Engine` (WASM `worker_thread` par défaut, natif
  >   `STOCKFISH_PATH` en option, fixture en tests), passe d'analyse incrémentale (sélection sur
  >   "Mes parties", flag `analyzed`, `POST /api/analyze` + `GET /api/analyze/status`)
  > - `02-danger-positions-view` ✅ — `Inaccuracy`/`Mistake`/`Blunder` façon Lichess (chute
  >   winning-chances 10/20/30 %, depth 16), `Danger position` = FEN-4 (transpositions fusionnées,
  >   ni cadence ni côté), fenêtre 10 demi-coups, page `/danger` (diagrammes, tri occurrences desc,
  >   surlignage ≥ 50 %)
  >
  > Chaque issue validée par sa Feature Path (agentic ; fixture `seed:danger` pour la 02, jamais le
  > vrai Stockfish en tests). Pas de HP dédié (plafond de 3 atteint) : greffé en drive-by sur
  > **HP-01** (étape 8 — analyse réelle WASM + `/danger`), vert contre le vrai chess.com. Backend
  > natif (`STOCKFISH_PATH`) câblé mais **jamais vérifié empiriquement** (pas de binaire UCI
  > disponible). Annotations par coup sur Analyse → différées en **US-7**. Reste `develop → main`.

- **US-3**: Identifier mes ouvertures faibles par statistiques de résultat (Weak opening — taux de victoire par ouverture, par côté et par cadence).
  > Grillée (**ADR-0007**), découpée en 1 issue, implémentée sur `integration/US-3-weak-openings`, **fusionnée dans `develop`** (décision humaine `integration → develop`, PR #4, 2026-07-24). PRD : `.scratch/weak-openings/PRD.md`. Page **`/openings`** : l'ouverture (ECO + nom) est stockée sur `games` **à l'import** depuis les en-têtes chess.com `[ECO]`/`[ECOUrl]` ; agrégation **à la volée** `GROUP BY (eco, côté, cadence)` ; surlignage < 50 %, tri parties décroissantes, bucket `Other`. Primitive `Win rate` extraite vers un module neutre partagé avec US-6. **HP-03 vert** (`docs/test-scenarios/HP-03-weak-openings.md`) contre le vrai chess.com (DudulSmash 2026/06 : 32 entrées, somme des parties = 54). Finding FP (surlignage invisible — l'app n'a pas de CSS) **corrigé** avant merge (teinte inline + marqueur accessible « à revoir ⚠ »). Reste `develop → main` (pré-prod, non décidé).

- **US-6**: Consulter mes statistiques globales sur l'historique importé, sur la page `/stats`.
  > Grillée, découpée en 1 issue, implémentée sur `integration/US-6-global-stats`, **fusionnée dans `develop`** (décision humaine `integration → develop`, PR #3). PRD : `.scratch/global-stats/PRD.md`. Page **`/stats`** (placeholder réservé par l'ADR-0006) : un **Total** + ventilation **par cadence** et **par côté**, chacune `parties · V/N/D · Win rate`. **Calcul à la volée** sur `games` (pas de précalcul), sans matrice croisée ni taille d'échantillon minimale ; état vide = message d'invitation. Pas de HP dédié (couvert en drive-by). Reste `develop → main`.

- **US-5**: Explorateur visuel de mes coups joués — parcourir l'arbre de mes coups, avec fréquence et taux de victoire par coup, pour comprendre mes habitudes.
  > PRD : `.scratch/move-habit-explorer/PRD.md`. Découpée en 3 issues techniques, implémentée sur `integration/US-5-move-explorer`, **fusionnée dans `develop`** (décision humaine `integration → develop`) :
  > - `01-single-level-move-habits` ✅ — candidats par Position (fréquence, `Win rate`, ventilation par cadence)
  > - `02-drill-down-navigation` ✅ — descente niveau par niveau + fil d'Ariane, bascule de côté
  > - `03-board-arrows` ✅ — coups candidats dessinés en arêtes sur le plateau (opacité = fréquence, teinte = win rate)
  >
  > Précalcul incrémental des compteurs `Move habit` à l'import (**ADR-0005**). **HP-02 vert** (`docs/test-scenarios/HP-02-explore-move-habits.md`) contre le vrai chess.com. Reste `develop → main`.

- **US-2**: Importer mes parties depuis chess.com (relais local + persistance incrémentale), pour remplacer la partie fixture par mon véritable historique.
  > Grillée, découpée, implémentée sur `integration/US-2-import-chess-com`, **fusionnée dans `develop`** (décision humaine `integration → develop` du 2026-07-21). PRD : `.scratch/import-chess-com/PRD.md`. **HP-01 vert 7/7** contre le vrai chess.com (compte DudulSmash, 2026/06 : 54 parties). **5 slices livrés + 1 US technique de découpage**, chacun validé par sa Feature Path (agentic, Chrome réel) et auto-mergé sur check local vert :
  > - `01-import-backend` ✅ — schéma (game_url/player_color/result), client chess.com injectable, service, `POST /api/import`
  > - `02-import-ui` ✅ — formulaire (mois/catégories) + parcours des parties sur le plateau
  > - `03-import-summary` ✅ — fenêtre de résumé (par cadence, nouvelles vs présentes, bilan V/N/D)
  > - `04-import-progress` ✅ — indicateur de progression (indéterminé ; SSE différé, cf. issue)
  > - `05-remember-username` ✅ — mémorisation du username (table `settings`)
  > - `code-decomposition` ✅ — découpage en modules par feature + error boundary (`.scratch/code-decomposition/`)
  >
  > Suite HP : `docs/test-scenarios/HP-01-import-and-explore.md`. Finding a11y **corrigé** (bilan V/N/D annoncé en toutes lettres pour les lecteurs d'écran, mergé dans `develop`). Reste `develop → main` (pré-prod, non décidé).

- **US-1**: Squelette de l'application — structure React + serveur Node local + persistance SQLite en place, avec un plateau interactif capable d'afficher et de naviguer dans une partie fixture (pas d'import chess.com, pas d'analyse).
  > PRD : `.scratch/app-skeleton/PRD.md`. Les 3 issues techniques implémentées et fusionnées dans `integration/US-1-chess-history-analysis` (01 boot+plateau, 02 navigation avant/arrière, 03 saut vers un coup), chacune validée par sa Feature Path (agentic, Chrome réel). Fusionnée dans `develop` (décision humaine `integration → develop` du 2026-07-21). Pas de suite Happy Path pour cette US infrastructurelle (à reconsidérer une fois US-2/3/4).
