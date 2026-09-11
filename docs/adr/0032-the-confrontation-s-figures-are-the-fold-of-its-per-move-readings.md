# Les chiffres d'une `Confrontation` sont le pli de ses lectures par coup

Sans ce texte, un agent qui doit afficher la confrontation coup par coup rejoint la lecture scellée
et les annotations **côté client** — c'est cinq lignes de moins que de traverser le serveur — et
l'app se retrouve avec deux calculs de la même chose. Ni le compilateur, ni les tests, ni une
lecture du code ne le verraient : les deux donneraient le même total le jour où on les compare, et
divergeraient en silence le jour où l'un des deux change.

**Décision : `confrontGame()` produit la lecture de chaque `Move`, et la matrice, `examined`,
`scorable` et `agreed` sont la somme de cette liste.** Ce n'est pas un second système : la boucle
calculait déjà le terme de chaque coup — `matrix[declared][measured] += 1` — puis le jetait à la
sortie. Elle cesse de le jeter. Aucune table n'est ajoutée, rien de neuf n'est parcouru, le
par-coup est **dérivé** et jamais stocké : le schéma ne bouge pas, aucune migration n'est due.

C'est ADR-0017 d'un cran plus bas. Celui-là tenait que l'agrégat du corpus est le pli des
récapitulatifs par partie ; celui-ci tient que le récapitulatif d'une partie est le pli de ses
coups. La même phrase à trois altitudes est ce qui permet à un joueur d'ouvrir un chiffre global,
puis une partie, puis un coup, sans jamais rencontrer un calcul qui n'est pas le précédent.

## Conséquences

- **Un taux devient un chemin.** « 1 sur 4 » mène aux quatre coups parce que les quatre coups
  *sont* ce qui a fait le 1 sur 4. Ce n'est pas une commodité de navigation, c'est la preuve que
  c'est bien le même calcul — et une story qui l'omet abandonne la garantie d'auditabilité d'US-15.
- **Le `Moment clé manqué` entre dans le pli comme les autres.** `damageFound / damageTotal` dit
  « vos marqueurs ont trouvé 30 % des dégâts » et les 70 % restants n'avaient **aucun coup à
  montrer** : `misses` ne portait que les marqueurs qui n'ont rien trouvé, jamais les pertes que nul
  marqueur ne désigne. Elles se dérivent des mêmes données (`faults` moins `marked`).
- **Le corpus ne paie rien de visible.** `foldConfrontations` construit chaque `GameConfrontation`
  en mémoire puis n'en sert que le résumé ; la liste par coup ne quitte donc jamais le serveur sur
  cette route. Si ce coût devenait sensible, la réponse est un pli qui ne matérialise pas — jamais
  un second calcul.
