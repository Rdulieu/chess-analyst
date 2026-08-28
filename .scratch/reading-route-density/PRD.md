# US-22 — Rendre la route de lecture tenable sur trente coups

Statut : `ready-for-agent`
Branche d'intégration : `integration/US-22-reading-route-density`
Grilling : 2026-08-27. ADR : [`0021-what-the-player-acts-on-never-moves`](../../docs/adr/0021-what-the-player-acts-on-never-moves.md).
`CONTEXT.md` : **modifié** — `Declared severity` porte désormais les glyphes des cinq verdicts.
Voir `BACKLOG.md` — US-22, décisions **D1→D9**.

## Problem Statement

Annoter une partie entière est une corvée, et la cause est mesurable.

**Le format de l'écran change à chaque coup cliqué.** Mesuré le 2026-08-27 sur la partie 166 (lecture
scellée, couche postérieure comprise), 46 plys parcourus, trois largeurs, deux thèmes :

| largeur | hauteur du panneau | amplitude | déplacement du stepper |
| --- | --- | --- | --- |
| 1400 | 310 → 504 px | **194 px** | 590 → 784 px |
| 900 | 411 → 723 px | **312 px** | 691 → 1003 px |
| 380 | 411 → 723 px | **312 px** | 1129 → 1442 px |

**45 transitions de coup sur 45 déplacent le stepper** — 33 × 28 px, 6 × 48 px, 3 × 24 px, 2 × 80 px,
1 × 114 px. Ce n'est pas intermittent : la notice « coup de l'adversaire » *alterne*, donc elle
**change à chaque** transition. Et le panneau est rendu **au-dessus du stepper dans le même volet**,
donc ce ne sont pas seulement des blocs qui bougent — ce sont **les boutons `Previous` / `Next` que le
joueur est en train de cliquer**. Plus l'écran est étroit, plus c'est pire : le texte se replie, et
l'amplitude passe de 194 à 312 px.

Ce n'est pas une amélioration d'ergonomie, c'est une **correction**. Le projet tient le principe
inverse depuis US-14 — « cacher les annotations ne doit pas déplacer la position que le joueur est en
train de lire » — mais il a été tenu **au-dessus du diagramme, par l'ordre du document**, et jamais
appliqué d'un ply au suivant. Or on change de coup bien plus souvent qu'on ne change de
`Review mode`.

Trois frictions s'ajoutent, et la première est une perte de données :

- **Une `Note` tapée et non enregistrée est perdue en silence** au changement de coup. Le brouillon
  est un état local remis à la valeur stockée dès que le ply change ; rien n'avertit, rien ne retient.
  C'est la seule partie de l'écran où le joueur *pense*.
- **Aucun raccourci clavier.** Le critère 40 d'US-16a voulait « peu de clics, coup après coup » ;
  c'est tenu pour le verdict seul, et à la souris.
- **Rien ne dit ce qu'on a déjà écrit** sans reparcourir la partie. Les glyphes de la liste des coups
  disent *où* ; « Où j'en suis » dit *combien* ; la `Confrontation` n'existe qu'après le scellement.

Et la suite agentique ne pouvait rien voir de tout ça : elle n'audite qu'à **1280 px**, où l'amplitude
est justement la plus faible.

## Solution

**Ce que le joueur clique ne bouge jamais ; ce qui l'explique peut varier, en dessous** (ADR-0021).
La règle porte sur l'**ordre**, pas sur la hauteur — réserver une hauteur fixe coûterait 194 à 312 px
de colonne vide là où la place manque le plus, et le relevé scellé n'a pas de maximum connaissable
puisque sa hauteur dépend de son contenu.

Autour de cette règle, quatre gestes :

1. **La suite regarde enfin l'écran étroit.** La passe de thème gagne une seconde largeur, 380 px, sur
   les neuf écrans — et la stabilité devient une **assertion permanente**, parce que le principe
   d'US-14 avait été énoncé et jamais gardé.
2. **Le panneau se réordonne** et la notice de coup adverse passe dans la légende du fieldset, où elle
   avertit avant le clic sans rien pousser.
3. **La liste des coups porte le verdict lui-même** — `?!` `?` `??` partagés avec le moteur, plus `!`
   pour `Bon` et `✓` pour `Correct` — au lieu d'un `⚖` qui dit seulement qu'un verdict existe. Elle
   devient du même geste la vue d'ensemble qui manquait.
4. **La note s'enregistre en quittant**, et **le clavier pose les verdicts**.

Trois garde-fous, chacun payé par une décision antérieure, encadrent la story :

- **Les notices disent ce que l'app ne peut pas promettre autrement.** Les dire moins souvent n'est
  pas les dire moins clairement ; les cacher derrière une icône ou une infobulle n'est pas une option.
- **La couche scellée reste lisible telle qu'elle était.** Aucune économie de hauteur ne peut la
  replier au point de la rendre facultative.
- **Rien en indice purement chromatique** (ADR-0013), et l'état dit **en mots**.

## User Stories

1. En tant que joueur, je veux que les boutons `Previous` et `Next` restent **exactement au même
   endroit** d'un coup au suivant, pour ne pas rechercher ma cible à chaque clic.
2. En tant que joueur, je veux que les cinq radios de verdict ne se déplacent pas quand je passe d'un
   coup à moi à un coup adverse, pour poser trente verdicts sans viser à nouveau.
3. En tant que joueur, je veux que rien ne bouge non plus **après le scellement**, alors que l'écran
   est à son état le plus riche.
4. En tant que joueur sur un écran étroit, je veux la même stabilité qu'en grand — c'est là que
   l'amplitude est la pire.
5. En tant que joueur, je veux être averti qu'un verdict sur un coup adverse ne sera pas noté
   **avant** de le poser, pas après.
6. En tant que joueur, je veux que cet avertissement soit court, parce que je le lis à chaque coup
   adverse.
7. En tant que joueur, je veux qu'après le scellement l'écran ne me répète pas une règle devenue
   sans objet — après scellement plus rien n'est compté.
8. En tant que joueur, je veux voir dans la liste des coups **quel** verdict j'ai posé, pas seulement
   qu'un verdict existe.
9. En tant que joueur, je veux que le verdict s'y écrive comme le moteur écrit les siens, parce que
   c'est la même échelle et que je n'ai pas deux vocabulaires à apprendre.
10. En tant que joueur, je veux qu'un coup que j'ai jugé `Correct` porte une marque, pour le
    distinguer d'un coup que je n'ai jamais regardé.
11. En tant que joueur, je veux distinguer d'un coup d'œil un verdict, une note et un moment clé,
    même à 16 px.
12. En tant que joueur, je veux parcourir ma lecture entière en lisant la liste des coups, sans
    rouvrir chaque coup.
13. En tant que joueur, je veux que ma note soit conservée quand je passe au coup suivant, même si je
    n'ai rien cliqué.
14. En tant que joueur, je veux écrire une note sans payer un clic de plus que pour un verdict, parce
    que la note est la partie où je pense.
15. En tant que joueur, je veux savoir que ma note a été enregistrée, sans que cette confirmation
    déplace quoi que ce soit.
16. En tant que joueur, je veux poser un verdict au clavier, pour enchaîner « verdict, coup suivant,
    verdict » sans quitter les touches.
17. En tant que joueur, je veux que les cinq touches suivent l'ordre affiché à l'écran, du pire au
    meilleur, pour ne rien mémoriser d'arbitraire.
18. En tant que joueur, je veux changer de coup aux flèches.
19. En tant que joueur, je veux marquer un moment clé au clavier aussi.
20. En tant que joueur en train de taper une note, je veux que mes touches écrivent du texte et rien
    d'autre.
21. En tant qu'utilisateur au clavier, je veux que le groupe de radios garde son comportement natif
    quand il a le focus, parce que c'est la convention que ma technologie d'assistance attend.
22. En tant que joueur, je veux savoir que ces raccourcis existent, sans les découvrir par hasard.
23. En tant que joueur sur un écran étroit, je veux que la liste des profils ne fasse pas défiler
    la page entière de côté.
24. En tant que demandeur, je veux que la suite agentique regarde **aussi** l'écran étroit, parce que
    deux défauts réels y vivaient sans que rien ne les voie.
25. En tant que demandeur, je veux que la stabilité soit **gardée** et pas seulement énoncée — c'est
    faute de garde que le principe d'US-14 s'est perdu.
26. En tant que demandeur, je veux que cette garde soit chiffrée : zéro pixel, pas « à peu près
    stable ».
27. En tant que développeur, je veux qu'une régression d'ordre soit attrapée **en composant**, des
    heures avant le portail.
28. En tant que développeur, je veux que la règle vaille pour ce qu'US-16b ou US-16c ajouteront un
    jour à ce panneau, sans avoir à la redécouvrir.
29. En tant que futur mainteneur, je veux comprendre pourquoi la notice vit dans la légende plutôt
    qu'au-dessus des radios, sans avoir à le déduire.
30. En tant que futur mainteneur, je veux savoir pourquoi les glyphes du moteur ont été repris ici
    alors qu'un commentaire du code l'interdisait, sans avoir à fouiller l'historique.
31. En tant que joueur malvoyant, je veux que chaque marque garde son nom accessible, et que rien ne
    repose sur la couleur seule.
32. En tant que joueur, je veux que la couche scellée reste lisible telle qu'elle était, quoi qu'il
    arrive à la mise en page.
33. En tant que demandeur, je veux que la story ne gagne pas de la place en retirant ce qui porte le
    sens.

## Implementation Decisions

- **D1 — Une seule story** (décision du demandeur). La correction du reflow et la refonte de confort
  restent ensemble, parce que le joueur vit une seule gêne. Conséquence assumée : deux natures de
  risque cohabitent, d'où un ordre de tranches qui n'est pas neutre.

- **D2 — Les contrôles d'abord, la prose ensuite** (ADR-0021). Le panneau se réordonne : le stepper,
  puis le fieldset de verdict, le moment clé et l'éditeur de note ; **ensuite** les notices, le relevé
  scellé, « Où j'en suis ». Réserver une hauteur fixe est **écarté** — 194 à 312 px de colonne vide, et
  le relevé scellé n'a pas de maximum connaissable.

  > La règle porte sur l'ordre, ce qui a une conséquence heureuse : **l'ordre se teste en composant**,
  > à chaque commit, alors que les pixels ne se mesurent qu'au portail.

- **D3 — La notice de coup adverse passe dans la légende du fieldset**, raccourcie. Trois légendes,
  et une seule à la fois :

  | état | légende |
  | --- | --- |
  | avant scellement, coup du joueur | `Mon verdict` |
  | avant scellement, coup adverse | `Mon verdict — coups adverses non notés` |
  | après scellement | `Mon verdict, après le scellement` |

  Mesuré : les trois tiennent sur **une ligne** à 1400, 900 et 380 px, donc le fieldset ne change
  jamais de hauteur. La combinaison des deux clauses se replierait (+19 px sous 900 px) — **elle
  n'existe pas**, parce qu'après scellement rien n'est compté (les marques `posterior` sont écartées
  de la `Confrontation`), donc la clause adverse y serait redondante. Le `<p data-part="uncounted-notice">`
  disparaît du fieldset ; la notice de couche postérieure garde son rôle, sous les contrôles.

  C'est le patron que le code emploie **déjà** pour l'état postérieur, et pour la raison exacte dont on
  a besoin ici : « un joueur qui a dépassé la notice verrait un contrôle identique et se croirait
  encore dans sa lecture scellée ».

- **D4 — La stabilité devient une assertion permanente** de `theme-pass.md` (assertion 7) : parcourir
  les plys d'une lecture et exiger **0 px** de déplacement du stepper et du fieldset de verdict, aux
  deux largeurs et dans les deux thèmes. `theme-pass.md` reste **le seul endroit** où l'inventaire des
  écrans et les assertions sont édités.

- **D5 — La passe de thème gagne une seconde largeur : 380 px**, sur les neuf écrans. Mesuré :
  +23,6 s de pilotage (20,8 → 44,4 s, ×2,14) pour 18 relevés de plus, dont **16 propres**. Une seule
  largeur étroite suffit — à 900 et à 380 le volet latéral fait la même largeur (332 / 333 px) et le
  panneau la même amplitude, la rangée s'étant repliée dans les deux cas.

  **Corollaire : `/profiles` entre dans le périmètre.** La seconde largeur révèle immédiatement un
  débordement — page 676 px contre 380, dans les deux thèmes — et il est corrigé dans la même tranche
  pour que la suite soit **verte le jour de l'adoption** plutôt que de porter une exception. La cause
  est connue et le correctif a un précédent dans le dépôt : la liste des profils est une grille à
  quatre pistes `auto` qui ne rétrécissent pas, sans aucun ancêtre déclaré scroller, là où les tables
  voisines vivent dans un conteneur `overflow-x: auto` et laissent la page immobile.

- **D6 — La `Note` se valide en quittant le champ ou en changeant de coup.** Rouvre le critère 20
  d'US-16a, que le bouton explicite lisait strictement. Le grief réel n'était pas le clic de trop :
  le brouillon est remis à la valeur stockée dès que le ply change, donc **une note tapée et non
  enregistrée est perdue en silence**. On ne stocke pas chaque frappe — « une phrase en cours de
  composition » reste vraie pendant qu'on l'écrit. L'écriture passe par le chemin existant ;
  l'effacement reste explicite, et un texte vide reste une effacement (« le silence n'est pas une
  valeur »).

  La confirmation d'enregistrement est **à hauteur constante** : un élément qui apparaît puis
  disparaît recréerait le défaut que la story ferme.

- **D7 — Raccourcis clavier : des commandes globales qui ne déplacent pas le focus.**

  | touche | effet |
  | --- | --- |
  | `1`…`5` | pose le verdict, dans l'ordre affiché — du pire au meilleur |
  | `←` `→` | coup précédent / suivant |
  | `k` | bascule le moment clé |

  Les touches sont **inertes** dès que le focus est dans un champ de saisie, et **un groupe de radios
  qui a le focus garde ses flèches natives**. Poser un verdict au clavier ne donne pas le focus à la
  radio : c'est une commande, pas un clic — c'est ce qui rend la boucle « verdict, coup suivant,
  verdict » possible. Les raccourcis sont **annoncés à l'écran**, à hauteur constante, sous les
  contrôles.

- **D8 — La liste des coups porte les cinq glyphes de verdict.** `?!` `?` `??` partagés avec le
  moteur, `!` pour `Bon`, `✓` pour `Correct`. Consigné dans `CONTEXT.md` sous `Declared severity`, où
  vivaient déjà les glyphes mesurés. `✎` et `◆` gardent la `Note` et le `Key moment`.

  > **Ceci renverse une décision d'US-16a** écrite dans le composant des marques, dont le commentaire
  > est à supprimer avec elle : « *deliberately not the engine's severity glyph vocabulary — borrowing
  > its marks would suggest a measured verdict where there is only a declared one* ». La raison du
  > renversement, vérifiée : la confusion qu'elle craignait n'a **aucun écran** où se produire — la
  > route de lecture rend le diagramme sans aucune prop moteur, et la page `Analyse` ne rend pas les
  > marques du joueur. Contre ça, le gain est concret : `⚖` disait *un verdict existe ici*, et il
  > fallait ouvrir le coup pour savoir lequel.
  >
  > **La règle qui voyage avec** : le jour où un écran montrera les deux auteurs ensemble — pente
  > naturelle d'US-16b, qui existe pour tenir trois lectures côte à côte *sans jamais les fondre* —
  > des glyphes identiques ne suffiront plus, et il faudra les distinguer par autre chose que la
  > couleur. Elle est dans `CONTEXT.md`, et la FP qui construira cet écran la doit.

  **La liste devient du même geste la vue d'ensemble** que la story cherchait, sans ajouter de bloc au
  panneau qu'elle allège. Les notes n'y montrent toujours que `✎` : il faut ouvrir le coup pour les
  lire, et c'est assez « dans un premier temps » (décision du demandeur).

- **D9 — Ordre des tranches : le regard d'abord, puis la stabilité.** Une tranche ne peut pas fusionner
  avec une assertion rouge, donc **la garde voyage avec son correctif**.

  1. `/profiles` tient à 380 px **+** la seconde largeur — la suite voit enfin l'étroit
  2. les contrôles d'abord + la légende + **l'assertion 7**, verte du premier coup
  3. les cinq glyphes dans la liste des coups
  4. la `Note` validée en quittant
  5. le clavier

  On peut s'arrêter après la 2 et avoir gagné l'essentiel. Les tranches 3, 4 et 5 sont indépendantes
  entre elles.

- **Aucun changement serveur.** Ni API, ni schéma, ni migration. La `Note` passe par le chemin
  d'écriture existant, les glyphes et le clavier sont côté client, `/profiles` est du style. Une story
  entièrement front — c'est rare ici, et ça vaut d'être dit avant qu'une tranche invente un besoin.

- **Ce qui sort des pistes du backlog.** « Replier la couche scellée » est **retiré** : cette piste
  n'existait que parce que le relevé scellé poussait les contrôles, et D2 le place en dessous. « Le
  panneau ailleurs qu'à côté de l'échiquier » devient **sans objet** : sous ~900 px la rangée se
  replie déjà et le panneau prend toute la largeur ; ce qui gênait était le déplacement du stepper.

- **Non tranché, et laissé ouvert exprès.** Les trois autres notices atténuées — « les notes ne sont
  jamais notées », le pivot du moment clé, la couche postérieure — ne coûtent plus la stabilité une
  fois sous les contrôles. Elles coûtent encore de la hauteur. Les dire moins souvent reste une piste,
  sous le garde-fou n°1 : **moins souvent, jamais moins clairement**.

## Testing Decisions

Un bon test affirme ici un **comportement externe** : ce que l'écran rend, ce qu'il enregistre et
quand, ce qui ne bouge pas. Jamais comment le composant s'y prend.

**Le fait qui organise toutes les coutures : jsdom ne calcule aucune géométrie.** Tout ce qui est
hauteur, déplacement ou débordement n'est mesurable qu'au sommet de la pyramide ; tout ce qui est
« quel texte, quel glyphe, quoi est enregistré et quand » se teste en composant. Prétendre tester la
stabilité en jsdom fabriquerait exactement la fausse confiance qui a laissé le défaut naître.

- **Couture principale, existante : les tests de la route de lecture** (721 lignes) — ils montent la
  route rendue et la conduisent par de vrais événements utilisateur. Ils couvrent déjà les cinq
  verdicts, la notice de coup adverse, la `Note`, le `Key moment`, le scellement et la couche
  postérieure ; c'est là que vont l'**ordre du DOM**, les **trois légendes mot pour mot**, la **note
  validée en quittant et jamais perdue**, et les **commandes clavier** avec leur inertie dans le champ
  de saisie.
- **Couture existante pour la liste des coups** (87 lignes) : les **cinq glyphes** et leurs noms
  accessibles, et le fait qu'un coup jugé `Correct` porte une marque là où un coup jamais regardé n'en
  porte aucune.
- **L'ordre est gardé deux fois, et c'est délibéré.** ADR-0021 énonce une règle d'**ordre** : elle se
  vérifie en composant, à chaque commit, pour rien — une régression d'ordre est donc attrapée des
  heures avant le portail. Sa **conséquence** — zéro pixel — se vérifie au portail, seul endroit où
  elle existe.
- **Apex, permanent : `theme-pass.md` gagne l'assertion 7** — parcourir les plys d'une lecture et
  exiger **0 px** de déplacement du stepper et du fieldset de verdict. Elle est jouée à chaque portail
  par les trois scénarios, comme les six autres assertions. C'est le remède au précédent : le principe
  d'US-14 était énoncé et gardé par personne.
- **Apex, permanent : la seconde largeur.** Les neuf écrans à 1280 **et** 380 px, dans les deux
  thèmes. C'est la seule couture qui puisse voir le débordement de `/profiles` et le repli d'une
  légende.
- **Apex, par tranche : une Feature Path** jouée avec la bibliothèque de pilotage sur l'app réellement
  lancée. Elle est le portail d'auto-merge de chaque sous-issue, avec le build et les tests.
- **Pas de nouveau scénario HP.** Le plafond de **3 HP** tient et n'est pas en cause : cette story ne
  change pas ce que la suite affirme sur les parcours, elle ajoute une assertion à une étape que les
  trois jouent déjà.
- **Portail, pour toute tranche qui touche `docs/test-scenarios/tools/`** : `npm test` **et**
  `npm run test:tools`. La règle est écrite dans la skill `agentic-tests`.

## Out of Scope

- **La `Confrontation` (US-16b), les `Candidate line`s (US-16c), l'export PGN annoté** (ADR-0019).
- **Le mobile en tant que cible.** La seconde largeur est du responsive-first sur une fenêtre étroite,
  pas un support de terminal mobile : ni geste tactile, ni orientation, ni test sur appareil.
- **Une refonte visuelle.** Aucun jeton, aucune couleur, aucune typographie ne change. La story
  déplace, raccourcit et réordonne — elle ne redessine pas.
- **Les trois autres notices atténuées**, laissées ouvertes (voir ci-dessus).
- **Les quatre arbitrages produit ouverts sur la PR #70** — le dénominateur de la couverture, le
  `DELETE /api/profiles/:id` à 500, le pluriel du nom accessible des résultats, la remise à `Départ`
  du niveau de l'explorateur. Ils vivent là où ils sont.
- **Les sept autres findings d'application du portail du 2026-08-27** — la carte `/danger` seule
  étirée, le dialogue de scellement sans focus, le `??` de la courbe sans nom accessible, la phrase du
  « raté » qui contredit son 100 %, la diagonale de la matrice à 1,09:1, la marque postérieure
  indiscernable dans la liste, l'`aria-label` anglais. Seul le débordement de `/profiles` entre, et
  seulement parce que la seconde largeur l'exige.

## Further Notes

- **La mesure est déjà faite**, au grill plutôt qu'en première tranche. Elle est consignée dans
  `BACKLOG.md` parce que les transcripts qui la portent s'effacent après trente jours. La première
  tranche n'est donc pas une mesure : c'est l'élargissement du regard.
- **Deux chiffres à ne pas confondre pour la tranche 1.** +23,6 s est le coût de *pilotage* de la
  seconde largeur. Le coût qui compte est le nombre de relevés à **lire** : 18 de plus, dont 16
  propres. Si un jour la seconde largeur devient chère, ce sera de ce côté-là.
- **La story est entièrement front, ce qui change le profil de risque.** Rien n'est irréversible, rien
  ne touche des données que seul le moteur peut reconstruire (ADR-0015). Le risque n'est pas la perte,
  c'est le **retrait silencieux de sens** : gagner de la hauteur en enlevant ce qui explique. Les trois
  garde-fous sont là pour ça, et le premier est le plus facile à enfreindre sans le voir.
- **Un précédent à ne pas répéter.** La FP d'US-16a a montré que le critère « rien en indice purement
  chromatique » peut être tenu à la lettre et manqué en pratique : deux crayons que les noms
  accessibles distinguaient parfaitement et l'œil pas du tout à 16 px. La tranche 3 ajoute deux
  glyphes ; qu'ils se distinguent **à l'œil**, pas seulement au lecteur d'écran.
