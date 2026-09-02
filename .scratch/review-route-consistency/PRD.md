# US-23 — Tenir la même route de revue partout

Statut : `ready-for-agent`
Branche d'intégration : `integration/US-23-review-route-consistency`
Grilling : 2026-09-01 — [`GRILL-NOTES.md`](GRILL-NOTES.md), décisions **D1→D9**.
ADR : [`0022-one-board-one-author`](../../docs/adr/0022-one-board-one-author.md).
`CONTEXT.md` : **modifié** — `Declared severity` écarte désormais `Evaluation` et `Annotation`.
Socle : US-22 mergée (PR #89). Source des demandes :
[`docs/feedback/2026-08-25-us16-confrontation.md`](../../docs/feedback/2026-08-25-us16-confrontation.md).

## Problem Statement

La route de revue a été construite **écran par écran** — US-7 puis US-15a pour `Analyse`, US-16a pour la
lecture personnelle, US-11 pour les profils — et chaque écran a gagné ses propres gestes. Le joueur, qui
les traverse dans la même session, paie l'écart. C'est la première session de test du demandeur sur ses
propres parties qui l'a relevé.

Le relevé du code du 2026-09-01 dit que **trois demandes sur quatre ne sont pas des fonctionnalités
manquantes, mais des raccordements absents** :

| Ce qui manque au joueur | Ce qui manque réellement |
| --- | --- |
| « Il manque un indicateur permettant de voir quel coup est actuellement visualisé » | `aria-current="true"` est posé sur la bonne puce depuis toujours, et **aucune règle de la feuille de style ne le lit**. Le joueur au lecteur d'écran sait où il est ; celui qui regarde ne le sait pas. |
| « Je veux pouvoir avancer/reculer dans la partie avec les flèches du clavier » | `Board` porte déjà `keyboardStepping`, et `keyboard.ts` est déjà neutre. Seule la route de lecture la passe — et une règle écrite en commentaire interdit de l'activer ailleurs sans l'y annoncer. |
| « Certains boutons devraient être des boutons alors que ce sont des liens » | La règle existe (`a[data-action]` : *« un lien qui porte `data-action` est une action et doit se lire comme telle »*) et n'est appliquée **qu'à un seul élément de toute l'application**. |
| « Des boutons plus gros avec le logo du type d'erreur et des couleurs » | La table de glyphes existe (`DECLARED_SEVERITY_GLYPH`, livrée par US-22) et sert la liste des coups, jamais le contrôle. Le `fieldset` est un flex qui passe à la ligne, donc les cinq valeurs refluent en cibles minuscules dans une colonne de 14rem. |

À quoi s'ajoutent **quatre manques francs** :

- **La `Confrontation` n'est offerte nulle part sur l'écran de lecture — pas même une fois la lecture
  scellée.** L'unique porte est sur `/analyse/:id`. Le joueur scelle — l'acte dont la confirmation dit
  *« c'est exactement cela qui sera confronté »* — et l'écran le laisse là. **Personne ne l'avait
  décidé.**
- **Les numéros de coup sont absents** de la liste : elle rend le SAN seul, donc « le coup 16 » n'est
  pas trouvable autrement qu'en comptant.
- **Cliquer le nom d'un profil ne fait pas ce que le joueur croit** : il navigue vers la page du profil,
  et *sélectionner* est un second geste ailleurs sur la ligne. Il n'existe par ailleurs aucune route
  « liste des parties d'un profil donné » — « Mes parties » est `/`, rendue pour le profil *courant*.
- **Le sens de chaque verdict n'est qu'un `title`** : invisible au clavier, invisible au tactile,
  visible seulement en survolant. C'est `DECLARED_SEVERITY_MEANING`, qui porte la phrase la plus
  chargée du modèle (« j'ai regardé, je ne trouve rien à reprocher »).

## Solution

**Le même dispositif partout, chaque écran le remplissant avec ce qu'il a le droit de montrer.**

C'est la formulation exacte que le grill a dû trouver, parce que « harmoniser partout » a une limite que
la consigne ne pouvait pas voir seule (ADR-0022) :

- un **repère sans auteur** — le numéro du coup, l'indicateur du coup courant, les flèches du clavier,
  la sémantique lien/bouton — s'harmonise **littéralement**, à l'identique sur les deux écrans ;
- une **affirmation avec un auteur** — le verdict du joueur, la sévérité du moteur — s'harmonise dans sa
  **forme** et jamais dans son contenu : chaque échiquier peint **un seul auteur, le sien**.

Rien de tout cela ne touche le serveur : ni API, ni schéma, ni dérivation, **donc aucune migration**.

## User Stories

1. En tant que joueur, je veux qu'un clic sur « Sélectionner » me place sur le profil **et** m'amène à ses parties, pour que choisir un profil et travailler dessus soient un seul geste.
2. En tant que joueur, je veux que le nom d'un profil reste un lien vers sa page, pour continuer d'atteindre son import et ses compteurs sans quitter la liste.
3. En tant que joueur, je veux un bouton « Voir mes parties » à côté de « Importer mes parties », pour que le profil **courant** — qui n'a pas de bouton « Sélectionner » — ait aussi sa porte.
4. En tant que joueur, je veux atteindre l'import depuis « Mes parties », pour ne pas repasser par la liste des profils quand je constate qu'il me manque des parties.
5. En tant que joueur, je veux que ce qui agit se lise comme un contrôle et que ce qui navigue se lise comme un lien, pour savoir ce qu'un clic va faire avant de le faire.
6. En tant que joueur, je veux que « Commencer / Reprendre ma lecture » se voie comme une action, parce que c'est la porte d'entrée de l'exercice et qu'elle se lisait comme une note de bas de page.
7. En tant que joueur, je veux que « Confronter ma lecture au moteur » se voie comme une action, pour la trouver sans la chercher.
8. En tant que joueur, je veux que le nom de l'adversaire dans la liste des parties soit un lien, pour l'ouvrir dans un nouvel onglet et comparer deux parties.
9. En tant que joueur, je veux avancer et reculer dans une partie aux flèches du clavier **sur `Analyse`**, comme je le fais déjà sur ma lecture, pour parcourir trente coups sans viser un bouton.
10. En tant que joueur, je veux que l'écran m'annonce les flèches là où elles marchent, parce qu'un raccourci découvert par accident n'existe pas.
11. En tant que joueur, je ne veux pas qu'un écran m'annonce des raccourcis qui n'y font rien, parce qu'une promesse fausse est pire que le silence.
12. En tant que joueur, je veux voir le numéro de chaque coup dans la liste, pour retrouver « le coup 16 » sans compter.
13. En tant que joueur des noirs, je veux que **mes** coups portent leur numéro aussi, pour que la liste ne soit pas lisible seulement du point de vue des blancs.
14. En tant que joueur au lecteur d'écran, je veux entendre « 12… Nc6 » plutôt que « Nc6 », pour savoir quel coup j'atteins.
15. En tant que joueur qui dicte à la voix, je veux pouvoir prononcer ce que je lis dans la liste, pour l'atteindre à la voix.
16. En tant que joueur, je veux **voir** quel coup je suis en train de regarder, pas seulement l'entendre.
17. En tant que joueur, je veux que la liste des coups ne se recompose pas quand je change de coup, pour que la puce que je viens de viser ne se déplace pas sous mon curseur.
18. En tant que joueur qui ne distingue pas les couleurs, je veux reconnaître le coup courant sans percevoir de teinte, parce qu'un indice chromatique seul n'est pas un indice.
19. En tant que joueur, je veux que l'échiquier reste l'élément principal de l'écran, et que la liste des coups reste un repère.
20. En tant que joueur, je veux poser mon verdict sur une cible confortable, pour annoter trente coups sans viser.
21. En tant que joueur, je veux voir le glyphe du verdict dans le contrôle, le **même** que dans la liste des coups, pour ne pas traduire entre poser et relire.
22. En tant que joueur, je veux des couleurs sur les verdicts, pour distinguer une bévue d'une imprécision d'un coup d'œil.
23. En tant que joueur, je veux lire ce que chaque verdict **affirme** sans avoir à survoler, pour savoir que `Correct` veut dire « j'ai regardé et je ne trouve rien à reprocher » et non « je n'ai rien dit ».
24. En tant que joueur au clavier, je veux garder les flèches natives dans le groupe de verdicts et l'annonce « 3 sur 5 », pour que le contrôle reste un choix exclusif et pas cinq boutons.
25. En tant que joueur, je ne veux pas que choisir un verdict déplace les quatre autres valeurs sous mon doigt.
26. En tant que joueur, je veux qu'après avoir scellé ma lecture l'écran me propose la confrontation, parce que c'est ce que le scellement vient de rendre possible.
27. En tant que joueur, je veux savoir **avant** de sceller que la confrontation vient ensuite, pour comprendre l'ordre de l'exercice au lieu de découvrir un refus.
28. En tant que joueur, je veux voir mon propre verdict sur l'échiquier pendant que je parcours la partie, pour lire le drapeau là où je regarde.
29. En tant que joueur, je veux que l'échiquier de ma lecture ne montre **que** ma lecture, parce que c'est la seule garantie que cet écran peut honnêtement faire.
30. En tant que joueur, je veux que l'échiquier d'`Analyse` continue de ne montrer que le moteur, pour que les deux couches ne se confondent jamais.
31. En tant que joueur, je veux que la case peinte le soit pour un verdict postérieur comme pour un verdict scellé, parce que c'est mon verdict dans les deux cas et que la couche est nommée ailleurs.
32. En tant que joueur, je veux que `Correct` ne soit pas peint comme un compliment, parce que ce n'en est pas un.
33. En tant que joueur, je veux que ces changements arrivent sur `Analyse` **et** sur ma lecture, pour ne pas réapprendre l'écran en changeant d'onglet.
34. En tant que demandeur, je veux connaître la hauteur que le nouveau contrôle prend dans la colonne, pour arbitrer moi-même si l'échiquier en souffre.
35. En tant qu'agent futur, je veux qu'activer les flèches sans les annoncer soit impossible, pas seulement déconseillé.
36. En tant qu'agent futur, je veux savoir pourquoi l'échiquier de la lecture ne montre pas les teintes du moteur, pour ne pas « corriger » l'omission par bonne intention.

## Implementation Decisions

Les neuf décisions sont motivées dans [`GRILL-NOTES.md`](GRILL-NOTES.md) ; ce qui suit est ce qu'elles
engagent dans le code.

### D1 / D3 — La navigation des profils : trois portes, chacune du bon type

- Le **nom du profil reste un lien** vers la page du profil : il navigue, il est un lien.
- **« Sélectionner » devient un acte composé** : il enregistre le profil courant, **puis** navigue vers
  « Mes parties ». C'est une mutation suivie d'une navigation, donc un bouton — et il est **nommé** au
  lieu d'être caché sous un nom propre.
- L'en-tête de la liste des profils gagne **« Voir mes parties »** à côté de « Importer mes parties » :
  le profil courant n'a pas de bouton « Sélectionner » (sa ligne dit « Profil actuel »), donc c'est là
  qu'est sa porte. Les deux moitiés se complètent sans se doubler.
- « Mes parties » gagne une porte vers l'import, en **lien-action vers la page du profil courant avec le
  fragment `#import`** — l'import est une opération *sur* un profil (ADR-0014) et son formulaire ne se
  déplace pas ; c'est la porte qui navigue. Le fragment demande le formulaire, pas seulement la page,
  et l'existant lui donne déjà le focus.

Écarté : servir la liste des parties sous la route du profil. Cela **contesterait ADR-0014** (« la seule
route portant un id, délibérément ») et dédoublerait « Mes parties » à deux adresses.

### D2 — Lien contre bouton : une passe d'**application**

La règle est déjà écrite dans la feuille de style et n'a jamais été généralisée. **Aucun type d'élément
ne change, sauf un.**

Reçoivent le marqueur d'action (ils se lisent comme des contrôles, restent des ancres — donc le
clic-milieu, « ouvrir dans un nouvel onglet » et la barre d'état continuent de marcher) : l'entrée dans
la lecture personnelle, l'entrée dans la `Confrontation` depuis `Analyse`, la reprise de lecture pour
sceller, et les deux retours vers l'analyse de la partie.

**Change de type** : la ligne de partie, seul contrôle qui navigue par programme. Elle devient un lien
**nu**, sans marqueur d'action — il navigue, et le styler en contrôle mettrait un pavé dans chacune des
lignes d'un tableau dense. La cible reste **le nom de l'adversaire**, ce qui est déjà le cas.

**Ne bougent pas** : les liens en pleine phrase (« …importez son historique ») et le bandeau de profil.
Un lien dans une phrase est un lien.

### D4 — Le numéro, dans la notation qui distingue les deux moitiés

La liste est une suite plate de **demi-coups**. Le numéro du coup entier écrit sur chacun donnerait
« 12. Nf3 » puis « 12. Nc6 », ce qui est **faux** : le second est `12…Nc6`. Donc **`12.` sur le
demi-coup blanc, `12…` sur le noir**, et **dans le contrôle du coup**, pour que le nom accessible
devienne « 12… Nc6 » — un joueur au lecteur d'écran entend quel coup il atteint, un joueur qui dicte
peut prononcer ce qu'il lit.

Écarté : le numéro sur le blanc seulement (la notation imprimée) — la liste deviendrait asymétrique
selon la couleur que le joueur joue, un fait étranger à la numérotation. Écarté : grouper par coup
entier — `aria-current` est posé **par demi-coup** et la frontière de `Phase` s'insère **entre** deux
demi-coups en prenant toute la rangée ; un groupe de deux ne se coupe pas en son milieu.

### D5 — Le coup courant : un renversement encre/fond, à **largeur constante**

Le marqueur accessible existe ; il lui manque une règle de style. Le motif du projet pour l'écran
courant — *« le poids et une bordure, pas la couleur seule »* — **ne se transpose pas** : la navigation
porte huit onglets sur une ligne, la liste en porte quatre-vingts en flex qui passe à la ligne. Le gras
élargit les glyphes, une bordure ajoutée ajoute deux pixels à la boîte ; dans les deux cas le coup
courant devient plus large que les autres, tout ce qui suit se décale et **les rangées se recomposent à
chaque flèche** — le défaut qu'ADR-0021 vient de fermer, rouvert par la story qui existe pour harmoniser.

Donc : **la puce courante s'inverse** (encre et fond échangés), et la bordure est présente sur **toutes**
les puces, transparente sauf la courante. La boîte ne change jamais de taille ; aucun caractère n'est
ajouté. L'indice n'est pas chromatique au sens d'ADR-0013 — c'est un **négatif**, pas une teinte, et il
reste perceptible sans perception des couleurs. Le nom accessible ne change pas : le marqueur le porte
déjà.

**Pas de défilement automatique vers le coup courant** — décision du demandeur, et retenue comme
**garde-fou** : *l'échiquier est l'élément majeur, la liste est un repère*. La même hiérarchie écarte
d'avance ce qui voudrait faire grossir la liste.

### D6 — L'annonce du clavier descend dans le composant qui porte la capacité

Activer les flèches sur `Analyse` est une prop à passer — et cette prop **viole une règle écrite en
commentaire** tant que rien n'y est annoncé : *« un raccourci que rien à l'écran ne mentionne n'existe
pas, et un raccourci qui marche là où il n'est jamais mentionné est pire »*. La notice de la lecture ne
se reprend pas telle quelle : elle annonce le verdict et le moment clé, qui ne font rien sur `Analyse`.

Donc **le composant d'échiquier annonce lui-même les flèches quand elles sont actives.** L'invariant
« les flèches marchent ⟺ elles sont annoncées » devient **structurel** : on ne peut plus activer l'une
sans l'autre, et un troisième appelant en hériterait sans rien savoir. La notice de la route de lecture
**perd la mention des flèches** et se réduit au verdict et au moment clé — des commandes de *lecture*,
non de *navigation*. Le joueur voit toujours les trois, venues de deux endroits, chacun annonçant ce
qu'il possède.

Placement : **sous** les contrôles de pas, jamais au-dessus (ADR-0021), à hauteur constante.

Sur `Analyse`, les flèches restent **inertes tant que le focus est dans le groupe de radios du
`Review mode`** — le groupe garde ses flèches natives, et le contrôle ne rend pas le focus après un
choix. Comportement confirmé par le demandeur.

### D7 — La porte vers la `Confrontation`, là où le scellement la rend possible

- **Après le sceau**, l'écran de lecture offre l'entrée dans la `Confrontation`, en action primaire.
- **Avant le sceau**, une **phrase** près de « Sceller ma lecture » dit que la confrontation vient
  ensuite. C'est l'idiome du projet, déjà écrit à côté du refus d'une lecture vide : *« "désactivé" tout
  seul dit seulement que quelque chose ne va pas, jamais quoi »* — donc une phrase, pas un bouton grisé.

Écarté : ouvrir la `Confrontation` sur une lecture non scellée, ce que la note demande à la lettre.
`CONTEXT.md` définit la `Confrontation` comme tenant **trois lectures côte à côte** dont une figée :
sans le sceau, la lecture bouge pendant qu'on la compare. Si la gêne réelle est « comparer *pendant* que
j'écris », c'est une story de fond et pas un bouton.

### D8 — Le verdict devient un contrôle segmenté

**Cinq rangées pleine largeur**, chacune portant le **glyphe** (repris de la table existante, celle-là
même que sert la liste des coups — donc poser puis relire ne demande aucune traduction), le **mot**, et
**la phrase de ce que la valeur affirme, rendue visible** au lieu de vivre dans un `title`.

Les entrées de formulaire restent **sous** l'apparence et l'étiquette devient la cible : on garde la
sémantique de groupe, l'annonce « 3 sur 5 », les flèches natives et l'exemption déjà écrite dans le
module clavier. La teinte vient en **renfort** du glyphe et du mot, jamais seule (ADR-0013).

**Les cinq phrases sont visibles en permanence, pas seulement sur la valeur choisie** : les afficher au
choix ferait bouger les quatre autres rangées **sous le doigt du joueur**, ce qu'ADR-0021 interdit
précisément. La hauteur du contrôle devient ainsi **constante**, là où le reflux actuel la faisait
dépendre de la largeur.

**Deux tokens de couleur manquent.** Les trois sévérités du moteur en ont ; `Correct` et `Bon` n'en ont
**aucun** — la palette n'a jamais eu à peindre un verdict favorable. Et **`Correct` ne se peint pas en
vert vif** : ce n'est pas un compliment, c'est « j'ai regardé, je ne trouve rien à reprocher ». Teinte
neutre-froide pour `Correct`, teinte franche pour `Bon`.

Écarté : cinq tuiles glyphe seul — les trois marques de faute deviendraient la seule distinction visible
entre trois valeurs voisines, ce qui exigerait de connaître la notation pour poser son propre verdict.
Écarté : de vrais boutons à état, ce que la note dit littéralement — on perdrait le groupe, donc les
flèches natives, l'annonce « 3 sur 5 » et l'exemption du module clavier : les flèches se remettraient à
changer de coup pendant qu'on choisit un verdict.

### D9 / ADR-0022 — Un échiquier, un auteur

L'échiquier peint **déjà** la case d'arrivée du coup courant avec la teinte de la sévérité **du
moteur**, sur `Analyse` ; sur la route de lecture cette teinte est absente par construction. La demande
est donc : le même dispositif, la même case, **avec l'autre auteur**.

Retenu : **la route de lecture peint la case avec le verdict du joueur, `Analyse` garde le moteur.** Le
glyphe reste dans la liste, donc la teinte n'est jamais l'unique indice. Le dispositif est partagé, la
**source** ne l'est pas : la teinte se lit d'une table par auteur, et c'est l'écran qui décide laquelle
s'applique — jamais la case.

**Aucune distinction entre un verdict scellé et un verdict postérieur sur la case** : le panneau nomme
déjà la couche dans sa légende, et faire porter cette différence à une teinte serait exactement l'indice
chromatique seul qu'ADR-0013 interdit.

Écarté : les deux auteurs sur les deux échiquiers, l'harmonisation littérale. `CONTEXT.md` tient les
lectures « côte à côte et **jamais fondues** », et `Declared severity` exige déjà qu'une vue montrant les
deux auteurs les distingue « par une colonne, un titre — jamais par le glyphe seul ». **Une case n'a ni
colonne ni titre : elle n'a qu'une couleur.** L'échiquier n'est donc pas cette vue, et le faire devenir
est une story, pas une tranche.

### Ce que rien ne touche

**Aucun travail serveur** : ni route d'API, ni contrat, ni dérivation, ni schéma — **donc aucune
migration** (ADR-0015 n'est pas sollicitée). Les neuf décisions vivent entièrement dans le client, et
aucune n'ajoute de donnée persistée.

## Testing Decisions

Un bon test ici énonce **ce que le joueur peut constater** — un lien qui s'ouvre dans un nouvel onglet,
une puce qui ne se déplace pas, un nom accessible qui dit quel coup on atteint — et jamais la façon dont
le composant s'en acquitte. Les tests de style, en particulier, **n'épinglent aucune couleur** : ils
énoncent qu'une boîte ne change pas de taille, qu'une bordure est réservée, qu'un token existe.

**Les coutures sont toutes existantes, sauf une.**

| Couture | Prior art | Ce qu'elle prend |
| --- | --- | --- |
| **Feuille de style compilée** (compilation + lecture des déclarations d'un sélecteur) — le seul étage sous l'agentique où une règle de mise en page soit observable, jsdom ne chargeant jamais la feuille | `denseScreens`, `listsAndTables` | D2 (un lien-action se lit comme un contrôle), **D5** (la puce courante s'inverse ; la bordure est réservée sur *toutes* les puces, donc la boîte est constante), D8 (cinq rangées pleine largeur, hauteur constante) |
| **Audit des tokens** — un token mal orthographié retombe en silence dans le navigateur, donc il échoue ici | `tokenConsistency` | Les deux tokens de D8 résolvent dans les deux thèmes ; aucune couleur ne reste en dur |
| **Composants, par le rôle et le nom accessible** | `Board`, `ProfilesPage`, `GamesPage`, `GameList`, `GameViewer`, `PersonalReading`, `ReadingPage`, `readingMarkers`, `shortcuts` | D1, D3, D4, D6, D7, D8, D9 |
| **Passe de thème agentique** | `theme-pass.md` | Son assertion **existe déjà** et elle est exactement le garde-fou de D8 |

Trois points méritent d'être nommés :

- **D8 doit survivre à une assertion que personne n'a à écrire.** La passe de thème exige déjà, en
  parcourant les plys, **zéro pixel** de déplacement des contrôles de pas et du fieldset de verdict, aux
  deux largeurs. Le contrôle segmenté grossit ce fieldset : c'est précisément le cas que cette assertion
  surveille, et elle est jouée à l'étape 16 de HP-03.
- **La seule couture neuve est un relevé, pas une assertion.** La passe vérifie que le panneau ne
  *bouge* pas ; elle n'a jamais relevé sa **hauteur**. D8 la fait croître, donc la passe rapporte cette
  hauteur aux trois largeurs, **en mesure**. Un seuil inventé par l'agent serait arbitraire :
  l'arbitrage « l'échiquier en souffre-t-il » revient au demandeur, avec le chiffre sous les yeux.
- **`shortcuts` ne change pas de table, mais son écran change de partage.** D6 déplace l'annonce sans
  toucher aux commandes : la table clavier reste ce qu'elle est, et ce qui se teste en plus est
  qu'**aucun écran n'annonce une commande qui n'y fait rien**, dans les deux sens.

**Aucun test serveur.** Rien sous `server/test/` n'est concerné, et il n'y a pas de test de migration à
écrire — il n'y a pas de migration.

**Étage agentique.** Chaque tranche porte sa **Feature Path** exécutable comme gate d'auto-merge. Pas de
**HP** nouveau : la suite est à trois, son plafond, et US-23 ne crée aucun parcours — elle rend
praticables ceux qui existent. Les trois HP en place sont le filet de régression, et HP-03 en particulier
traverse la route de lecture et joue l'assertion de déplacement. La proposition de co-création d'un HP
sera néanmoins posée au moment de la PR `integration → develop`, comme le veut le flux.

## Out of Scope

- **« Mes parties » : filtre, tri, recherche** — hors du périmètre que le demandeur a fixé. Le libellé
  « 30/85 positions évaluées », qui ne dit ni ce qu'il compte ni qui l'a lancé, reste un défaut ouvert ;
  le chiffre précis observé le 25/08 venait d'une passe lancée par l'agent sur l'instance de test, et une
  story ne doit pas partir en chasse de ce fantôme. Les **dates sont véridiques** (en-tête du PGN, jamais
  recalculée) ; ce qui manque est l'**heure**, deux parties du même jour étant indiscernables — et cela
  relève du tri.
- **La `Confrontation` coup par coup** — six notes du 25/08 réclament la même chose sous six angles : la
  `Confrontation` est agrégée et le demandeur la veut coup par coup, sur l'échiquier. **Sujet à part
  entière**, dont deux notes **contestent une décision documentée** (le coût de poser `Sound` sur chaque
  coup, la lisibilité des positions exclues exigée par ADR-0017). ADR-0022 lui pose une contrainte
  d'entrée : il lui faudra une colonne ou un titre, pas une teinte.
- **Les deux auteurs sur le même échiquier** — écarté par ADR-0022, et une story en soi.
- **L'écran « Mes lectures »**, jamais exercé sur des dizaines de lectures.
- **L'explorateur** : il porte une liste de coups mais **aucun échiquier de partie** — c'est l'arbre des
  `Move habit`s, pas la lecture d'une partie. Noté pour qu'on ne l'y greffe pas par symétrie apparente.
- **Le défilement automatique de la liste vers le coup courant** — écarté par le demandeur, la hiérarchie
  étant échiquier d'abord.

## Further Notes

- **La liste des coups vit dans un composant à deux appelants** (`Analyse` et la lecture). D4 et D5
  arrivent donc des deux côtés **par construction** : il n'y a pas de seconde liste à synchroniser, et
  la consigne « harmoniser partout » est, pour ces deux décisions, une propriété du code et non une
  discipline à tenir.
- **Deux mots ont été rendus au moteur.** La note d'origine disait « les **évaluations** du joueur …
  sous forme d'**annotations** » ; `Evaluation` est le score du moteur et `Annotation` son relevé par
  demi-coup, déjà écarté deux fois au glossaire. Appliquée à la lettre, la phrase demandait de mettre le
  relevé du moteur sur l'échiquier de la lecture personnelle — l'inverse de son intention. `CONTEXT.md`
  porte désormais les deux mots dans la liste *Avoid* de `Declared severity`, avec la raison.
- **Cette story rend le contrôle plus gros dans la colonne qu'US-22 a passé une story entière à
  alléger.** Ce n'est pas contradictoire — grossit ce sur quoi on agit, maigrit ce qui explique — mais
  c'est la tension à surveiller, et c'est pour elle que le relevé de hauteur existe.
- **Trois des quatre demandes étaient des raccordements absents**, et c'est le fait le plus utile du
  grill : chercher la fonctionnalité manquante aurait fait construire ce qui existait déjà. Le relevé du
  code avant toute décision est ce qui l'a évité.
