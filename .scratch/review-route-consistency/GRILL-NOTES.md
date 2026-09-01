# US-23 — Tenir la même route de revue partout : relevé de grill

Source des demandes : `docs/feedback/2026-08-25-us16-confrontation.md` (notes du demandeur du 25/08).
Socle : US-22 mergée (PR #89, `dfc1ebe`).
Branche : `integration/US-23-review-route-consistency`.

## Ce que le code dit déjà (relevé du 2026-09-01, avant toute décision)

| Demande | État vérifié |
| --- | --- |
| Indicateur du coup visualisé | `Board.tsx:379` pose `aria-current="true"` ; **aucune règle de style ne le rend visible** (`_semantics.scss` stylise la liste, jamais `aria-current`). Défaut de **rendu**. |
| Flèches clavier sur `Analyse` | `Board` porte déjà `keyboardStepping` ; `components/keyboard.ts` est déjà neutre. Seul `PersonalReading` la passe, pas `GameViewer`. |
| Numéro de chaque coup | Absent : la liste rend `ply.san` seul. |
| Boutons/liens | La ligne de partie est un `<button>` qui navigue (`GameList.tsx:67`). |
| Nom du profil | Déjà un `Link` vers `/profiles/:id` ; « Sélectionner » est un bouton distinct. |
| Verdict perso | `DeclaredSeverityControl` : cinq radios, libellé texte, sens en `title`. Aucun glyphe, aucune couleur. |
| Liste des parties d'un profil donné | **N'existe pas** : « Mes parties » est `/`, rendue pour le profil *courant* (`ScopedPage`, ADR-0014). |

## Décisions

### D1 — Le nom du profil reste un lien ; c'est « Sélectionner » qui mène aux parties

Le geste demandé (« sélectionner ce profil **et** accéder à sa liste de parties ») est une
**mutation plus une navigation** : c'est un acte, donc un bouton, et il est **nommé** au lieu d'être
caché sous un nom propre.

- « Sélectionner » sélectionne puis navigue vers `/`.
- L'en-tête de `/profiles` gagne **« Voir mes parties »** à côté de « Importer mes parties ».
- Le nom du profil **reste un lien** vers `/profiles/:id` : il navigue, il est un lien.

Écarté : faire du nom un bouton qui navigue — cela réintroduirait, dans cette story même,
l'incohérence lien/bouton qu'elle existe pour supprimer. Écarté aussi : servir la liste des parties
sous `/profiles/:id`, qui **contesterait ADR-0014** (« la seule route portant un id, délibérément »)
et dédoublerait « Mes parties » à deux adresses.

Conséquence tenue : le profil courant n'a **pas** de bouton « Sélectionner » (sa ligne dit « Profil
actuel »), donc le bouton d'en-tête est sa porte. Les deux moitiés se complètent sans se doubler.

### D2 — Lien contre bouton : une passe d'**application**, pas une règle neuve

`_controls.scss:5` porte déjà la règle : *« un lien qui porte `data-action` est une action que le
joueur prend, et doit se lire comme telle — même si naviguer est ce qu'il fait, donc une ancre est ce
qu'il reste (clic-milieu, "ouvrir dans un nouvel onglet" et la barre d'état continuent de marcher) »*.
Elle n'était appliquée qu'à « Importer mes parties ». **Ce qui manquait n'est pas une règle, c'est sa
généralisation** — c'est donc un changement d'**apparence**, jamais de type d'élément.

Reçoivent `data-action` (des actes qui se lisaient comme du texte) :

| Élément | Écran |
| --- | --- |
| « Commencer / Reprendre / Voir ma lecture » | `AnalysePage.tsx:73` |
| « Confronter ma lecture au moteur » | `AnalysePage.tsx:85` |
| « Reprendre ma lecture pour la sceller » | `ConfrontationPage.tsx:105` |
| « Retour à l'analyse de cette partie » | `ReadingPage.tsx:86`, `ConfrontationPage.tsx:84` |

Devient un `Link` (le seul élément dont le **type** est faux) : la ligne de partie,
`GameList.tsx:67`, qui `navigate()` depuis un `<button>`.

**Ne bougent pas** : les liens en pleine phrase (« …importez son historique » sur `StatsPage`,
`OpeningsPage`, `GamesPage`) et le bandeau de profil. Un lien dans une phrase est un lien.

Écarté : transformer les actes en `<button>` + `navigate()`. Cela contredirait `_controls.scss`,
perdrait les gestes du navigateur, et ferait de la seule vraie anomalie la norme.

**La navigation de la ligne de partie reste sur le nom de l'adversaire** — ce qui est déjà le cas :
la colonne « Adversaire » porte le seul contrôle de la ligne. Il devient un lien **nu**, sans
`data-action` : il navigue, et le styler en bouton mettrait un pavé dans chacune des 54 lignes d'un
tableau dense.

### D3 — « Mes parties » gagne sa porte vers l'import

Un lien-action vers `/profiles/${profile.id}#import`, le motif déjà en place dans l'en-tête de
`/profiles`. L'import est une opération **sur** un profil (ADR-0014) et son formulaire vit sur la page
du profil : la porte navigue, elle ne déplace pas le formulaire. Avec D1, la boucle se ferme :
`/profiles` ⇄ `/` ⇄ import.

### D4 — Chaque demi-coup porte son numéro, dans la notation qui le distingue

`12.` sur le demi-coup blanc, `12…` sur le noir, **dans le bouton** du coup.

La liste est une suite plate de demi-coups (un `<li>` par ply) : y écrire le numéro du coup entier
sur chacun afficherait « 12. Nf3 » puis « 12. Nc6 », ce qui est **faux** — le second est `12…Nc6`.

- Écarté : le numéro **sur le blanc seulement** (la notation imprimée, la plus économe). Elle rend la
  liste asymétrique selon un fait — la couleur que le joueur joue — qui n'a rien à voir avec la
  numérotation : un joueur des noirs n'aurait jamais **sa** moitié numérotée.
- Écarté : **grouper par coup entier** (un `<li>` = un numéro + deux demi-coups), la plus belle
  typographiquement. Elle casse deux mécanismes qui marchent : `aria-current` est posé **par
  demi-coup**, et la frontière de `Phase` (`data-part="phase-start"`) s'insère **entre** deux
  demi-coups en prenant toute la rangée — un groupe de deux ne se coupe pas en son milieu.

**Le numéro est dans le contrôle, pas à côté** : le nom accessible devient « 12… Nc6 », donc un
joueur au lecteur d'écran entend *quel* coup il va atteindre, et un joueur qui dicte à la voix peut
prononcer ce qu'il lit (WCAG 2.5.3, le même motif que « Importer mes parties — … »).

### D5 — Le coup courant se voit par un **renversement encre/fond**, à largeur constante

`aria-current="true"` est déjà posé (`Board.tsx:379`) et **aucune règle ne le lit** : le joueur au
lecteur d'écran sait où il est, celui qui regarde ne le sait pas.

Le motif du projet pour l'écran courant (`_chrome.scss:69`) est *« le poids et une bordure, pas la
couleur seule »* — **il ne se transpose pas ici**. La navigation porte huit onglets sur une ligne ; la
liste en porte quatre-vingts, en flex qui passe à la ligne. `font-weight: 700` élargit les glyphes, une
bordure de 1 px ajoute 2 px à la boîte : dans les deux cas le coup courant devient plus large que les
autres, tout ce qui suit se décale et **les rangées se recomposent à chaque flèche** — le défaut
qu'ADR-0021 vient de fermer, rouvert par la story qui existe pour l'harmoniser.

Donc : **la puce courante s'inverse** (encre et fond échangés), et la bordure est présente sur
**toutes** les puces, transparente sauf la courante. La boîte ne change jamais de taille, aucun
caractère n'est ajouté. L'indice n'est pas chromatique au sens d'ADR-0013 : c'est un **négatif**, pas
une teinte — il reste perceptible en monochrome. `aria-current` porte déjà le nom accessible ; rien
n'est dit deux fois.

Écarté : un caractère devant le coup courant (`▸`), le plus robuste — il ajoute un caractère, donc il
déplace. Écarté : poids + bordure à l'identique de la navigation, seule option qui contredise ADR-0021.

**Pas de défilement automatique vers le coup courant**, décision du demandeur : *« la liste des coups
n'est pas l'élément majeur que le joueur veut voir, c'est le board »*. À retenir comme **garde-fou** et
pas seulement comme un report : la hiérarchie échiquier > liste écarte aussi la prochaine idée qui
voudrait faire grossir la liste.

### L'harmonisation est structurelle, pas une consigne

La liste des coups vit dans `Board.tsx`, et `Board` n'a que **deux appelants** : `GameViewer`
(Analyse) et `PersonalReading` (lecture). D4 et D5 arrivent donc des deux côtés **par construction** —
il n'y a pas de seconde liste à synchroniser.

`ExplorerPage` porte une liste de coups mais **aucun échiquier** : c'est l'arbre des `Move habit`s, pas
la lecture d'une partie. **Hors périmètre**, et noté pour qu'on ne l'y greffe pas par symétrie
apparente.

### D6 — L'annonce du clavier descend dans `Board`, avec la capacité

`PersonalReading.tsx:161` porte la règle en commentaire : *« les flèches font avancer les coups ici,
parce qu'ici le panneau les annonce ; un raccourci que rien à l'écran ne mentionne n'existe pas, et un
raccourci qui marche là où il n'est jamais mentionné est pire »*. Activer `keyboardStepping` sur
`GameViewer` est une ligne — et **cette ligne viole la règle** tant que rien n'est annoncé sur
`Analyse`. La notice actuelle ne se reprend pas telle quelle : elle annonce `1`–`5` et `k`, qui n'y
font rien, et une notice promettant trois commandes dont une seule marche est pire que l'absence.

Donc **`Board` annonce lui-même les flèches quand `keyboardStepping` est vrai.** L'invariant « les
flèches marchent ⟺ elles sont annoncées » devient **structurel** : on ne peut plus activer l'une sans
l'autre, et un troisième appelant de `Board` en hériterait sans rien savoir. C'est la forme que le
projet applique déjà — une fonctionnalité portée par sa propre fonction, appelée depuis chaque point
d'entrée.

Conséquence assumée : la notice de la route de lecture **perd la mention des flèches** et se réduit au
verdict et au moment clé, qui sont des commandes de *lecture* et non de *navigation*. Le joueur voit
toujours les trois, venues de deux endroits, chacun annonçant ce qu'il possède.

Placement : **sous** les contrôles de pas, jamais au-dessus (ADR-0021), à hauteur constante.

Écarté : une notice propre à `GameViewer` (deux notices à maintenir, la convention reste une
convention). Écarté : une notice unique avec les commandes inactives grisées — deux lignes mortes sur
`Analyse`, dans la hauteur que l'échiquier n'a pas.

**Sur `Analyse`, les flèches restent inertes tant que le focus est dans le groupe de radios du
`Review mode`** (`keyboard.ts` rend au groupe ses flèches natives). Comportement **confirmé par le
demandeur** : le contrôle ne rend pas le focus après un choix.

### D7 — La porte vers la `Confrontation` manquait **après** le sceau, et personne ne l'avait décidé

Le relevé change la nature de la note. Deux manques distincts, un seul opposant une décision :

- **(i) Après le scellement, aucune porte sur l'écran de lecture.** Vérifié : aucune mention de la
  `Confrontation` dans `features/personal/` ni dans `ReadingPage`. L'unique porte est
  `AnalysePage.tsx:85`. Le joueur scelle — l'acte dont la confirmation dit *« c'est exactement cela qui
  sera confronté »* — et l'écran le laisse là. **Pur oubli.**
- **(ii) Avant le scellement, aucune porte nulle part.** Délibéré : rien n'est figé à confronter.

**Retenu** : l'écran de lecture offre « Confronter ma lecture au moteur » **une fois scellé**, en action
primaire ; **et** une phrase près de « Sceller ma lecture » dit que la confrontation vient après. La
phrase est l'idiome du projet, écrit dans `SealAction` : *« "désactivé" tout seul dit seulement que
quelque chose ne va pas, jamais quoi »* — donc une phrase, pas un bouton grisé.

Ce qui a manqué avant le sceau n'était probablement pas de pouvoir confronter une lecture inachevée,
mais de **savoir que ça existe et quand**. Une phrase le dit ; un bouton mentirait.

Écarté : ouvrir la `Confrontation` sur une lecture non scellée, ce que la note demande à la lettre.
`CONTEXT.md` définit la `Confrontation` comme tenant **trois lectures côte à côte** dont une figée :
sans le sceau, la lecture bouge pendant qu'on la compare. **Si la gêne réelle est « comparer *pendant*
que j'écris », c'est une story de fond et pas un bouton** — le demandeur a retenu la phrase.

### D8 — Le verdict devient un **contrôle segmenté** : cinq rangées, glyphe, mot, et la phrase

Deux constats avant la décision :

- **La table de glyphes existe déjà** : `DECLARED_SEVERITY_GLYPH` (US-22) donne `??` `?` `?!` `✓` `!`,
  et la liste des coups s'en sert. Le « logo du type d'erreur » est une **réutilisation** — et le
  contrôle et la liste diront le verdict avec **la même marque**, donc poser puis relire ne demande
  aucune traduction.
- **La gêne est de la mise en page** : `_controls.scss:82` fait du `fieldset` un flex qui passe à la
  ligne, donc les cinq valeurs refluent en petits couples `radio + mot` dans une colonne de 14rem —
  deux ou trois rangées de cibles minuscules.

Retenu : **cinq rangées pleine largeur**, chacune portant le glyphe, le mot, **et la phrase de
`DECLARED_SEVERITY_MEANING` rendue visible** (elle n'était qu'un `title` : invisible au clavier,
invisible au tactile). Les `<input type="radio">` restent **sous** l'apparence, le `label` devient la
cible : on garde la sémantique de groupe, l'annonce « 3 sur 5 », les flèches natives et l'exemption
déjà écrite dans `keyboard.ts`. La teinte vient en **renfort** du glyphe et du mot, jamais seule
(ADR-0013).

**Les cinq phrases sont visibles en permanence, pas seulement sur la valeur choisie** : les afficher au
choix ferait bouger les quatre autres rangées **sous le doigt du joueur**, ce qu'ADR-0021 interdit
précisément.

Écarté : cinq tuiles glyphe seul (le plus compact) — `?!` `?` `??` deviendraient la seule distinction
visible entre trois valeurs voisines, ce qui exige de connaître la notation pour poser son propre
verdict. Écarté : de vrais `<button>` à état, ce que la note dit littéralement — on perdrait le groupe
de radios, donc les flèches natives, l'annonce « 3 sur 5 », et l'exemption de `keyboard.ts` : les
flèches se remettraient à changer de coup pendant qu'on choisit un verdict.

**Il manque deux tokens de couleur.** `--tint-blunder`, `--tint-mistake`, `--tint-inaccuracy` existent
(le moteur s'en sert) ; `Correct` et `Bon` n'en ont **aucun** — la palette n'a jamais eu à peindre un
verdict favorable. Et `Correct` **ne se peint pas en vert vif** : ce n'est pas un compliment, c'est
« j'ai regardé, je ne trouve rien à reprocher ». Teinte neutre-froide pour `Correct`, teinte franche
pour `Bon`.

**Coût vertical à mesurer, pas à supposer.** Cette story rend le contrôle plus gros dans la colonne
qu'US-22 a passé une story entière à alléger. Ce n'est pas contradictoire — grossit ce sur quoi on
agit, maigrit ce qui explique — mais cinq rangées à deux lignes dans 14rem est un vrai budget, et
« j'ai regardé, je ne trouve rien à reprocher » y passe à la ligne. **La tranche doit mesurer la
hauteur du panneau** (la passe de thème le fait à 1400, 900 et 380 depuis US-18/US-22) et **remonter le
chiffre** : si l'échiquier en souffre, l'arbitrage revient au demandeur — il ne se prend pas dans le
code.

### D9 — Un échiquier, un auteur : chaque écran peint le sien

`Board.tsx:204` peint **déjà** la case d'arrivée du coup courant avec la teinte de la sévérité — celle
du **moteur**, sur `Analyse`. Sur la route de lecture cette teinte est absente **par construction**
(`PersonalReading` ne passe ni `annotations`, ni `detailed`, ni `recap` : *« toute la garantie que cet
écran peut honnêtement faire »*). La note demande donc le **même dispositif, la même case, avec l'autre
auteur**.

Retenu : sur la route de lecture, la case d'arrivée prend la teinte du **verdict du joueur** ; sur
`Analyse`, elle garde celle du **moteur**. Le glyphe reste dans la liste (`MoveMarks`), donc la teinte
n'est jamais l'unique indice (ADR-0013).

**C'est ici que la consigne « harmoniser partout » trouve sa limite, et il faut la nommer.** La
numérotation et l'indicateur de coup courant sont des **repères, sans auteur** : ils s'harmonisent
littéralement. Le verdict **a un auteur**, et `CONTEXT.md` tient les lectures « côte à côte et **jamais
fondues** ». Le sens fort de la consigne est donc : *le même **dispositif** partout, chaque écran le
remplissant avec ce qu'il a le droit de montrer.*

Écarté : un glyphe dessiné sur la case en plus de la teinte — `react-chessboard` ne prend qu'un objet
de style par case (surcouche à construire), et cela poserait une **seconde copie** du glyphe à trois
centimètres de celle de la liste. Écarté : les deux auteurs sur les deux échiquiers, l'harmonisation
littérale — c'est la fusion que `CONTEXT.md` refuse, et elle déclencherait la règle héritée d'US-22
(*« des glyphes identiques ne suffiront pas, il faudra les distinguer par autre chose que la
couleur »*) : une story, pas une tranche.

**Aucune distinction entre un verdict scellé et un verdict postérieur sur la case** (décision du
demandeur). Le panneau nomme déjà la couche dans sa légende ; faire porter à une teinte de case la
différence scellé/postérieur serait exactement l'indice chromatique seul qu'ADR-0013 interdit.
