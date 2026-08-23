# US-15a — ce que le grilling « front » doit encore trancher

Le grilling des 19 et 21 août a tranché **le modèle** : ce qu'une partie porte (D5), les seuils, la
dérive en résidu, la provenance, et le principe que **la donnée et sa présentation sont deux
contraintes distinctes** (D6 / ADR-0017). Cette seconde contrainte, elle, **n'a jamais été grillée** :
on n'a jamais parlé de *comment* ces informations s'affichent. À faire **avant** `/to-prd`.

Contraintes déjà posées, qui encadrent ces questions :

- **L'UI ne décide pas du modèle** (D6) : la page peut découper, jamais amputer.
- La page Analyse est **déjà la plus dense de l'app** : plateau, liste des coups, barre d'avantage,
  `Evaluation curve`, toggle d'annotations (`Board.tsx`, `GameViewer.tsx`).
- US-14 n'a été acceptée qu'à condition qu'il n'y ait **aucune divergence** entre la courbe, la barre
  et les valeurs par coup. Toute nouvelle vue hérite de cette exigence.
- US-13 a doté l'app d'une feuille de style (tokens, custom properties) : on s'y branche, on
  n'invente pas.
- Règle non chromatique : **jamais la couleur seule** comme porteuse d'information.

## Questions ouvertes

1. **Où vit le relevé par Move ?** En ligne dans la liste des coups (qui porte déjà `?!`/`?`/`??` et
   l'`Evaluation`), dans un **panneau de détail** du Move sélectionné, ou dans une **seconde vue** ?
   Un relevé complet inline sur 60 à 100 demi-coups est probablement illisible ; un panneau n'affiche
   qu'un Move à la fois et perd la lecture d'ensemble. Compromis à trancher, pas à improviser.
2. **Comment montrer deux variantes sans noyer la page ?** Chaque Move fautif porte **deux** lignes
   (le coup à jouer, et la réfutation du coup joué). Combien de plys affichés ? En SAN, dépliables ?
   Et surtout : **sur le plateau** — `arrows.ts` existe déjà, une flèche sur le meilleur coup est
   sans doute plus parlante que du texte.
3. **Peut-on parcourir une variante sur le plateau ?** C'est la question la plus lourde : jouer la
   ligne demande une navigation **en arbre**, que `history.ts` n'a pas (il aplatit le PGN) alors que
   `cm-chess` sait le faire (ADR-0004). **Recouvrement direct avec US-16**, qui a besoin de la même
   navigation en variations. À trancher : qui la construit, et donc dans quel ordre.
4. **Le tracé de dérive, comment coexiste-t-il avec l'`Evaluation curve` ?** Deuxième série sur le
   même axe (mais ce sont deux grandeurs différentes), second petit graphique, ou bandes sur la courbe
   existante ? Risque explicite : ajouter une série qui **dit autre chose** que la courbe à côté est
   exactement ce qu'US-14 avait interdit.
5. **Comment marquer « ce Move ne compte pas » ?** Sur une liste qui porte déjà une sévérité et une
   évaluation, un troisième signe doit se lire **sans** ressembler à une erreur — et sans reposer sur
   la couleur seule. Les deux motifs (position déjà décidée / coup forcé) sont-ils distingués à
   l'écran ?
6. **Où va le récapitulatif par partie** (Moves comptés, erreurs comptées, chances perdues, dérive) ?
   En-tête, pied de liste, à côté du plateau ? C'est le point de réconciliation avec le futur agrégat
   (ADR-0017), donc ce qu'un joueur ira lire en premier pour vérifier.
7. **La `Phase` s'affiche-t-elle par Move ou comme bandes** sur la courbe ? D4 exige de pouvoir voir
   **où sont tombées les frontières** pour les contester — des bandes le montrent d'un coup d'œil,
   une étiquette par Move le montre précisément. Peut-être les deux.
8. **Le toggle d'annotations devient-il un sélecteur de mode ?** Il est aujourd'hui binaire et à
   `true` par défaut. Avec le relevé, la dérive et les variantes, « afficher les annotations » ne
   suffit plus. À relier à US-16, qui aura besoin d'un mode **aveugle** supprimant tout cela.
9. **Accessibilité et largeur.** La page est déjà `data-width="wide"`. Le tracé de dérive a-t-il un
   équivalent textuel (précédent US-14 à vérifier) ? Que devient tout ça en colonne étroite ?
10. **Le `Search regime` est-il montré, et où ?** ADR-0016 le justifie par la lisibilité de la
    méthode (« profondeur 16, deux lignes » est la garantie de l'affirmation). Discret mais présent,
    ou seulement dans le récapitulatif ?
