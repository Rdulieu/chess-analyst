# 04 — L'`Opportunity` à l'écran : trois sites, et pas un de plus

**What to build:** rendre l'`Opportunity` sur l'écran de `Confrontation`, **minimalement**.

Trois sites, exactement :
1. la colonne **« Le moteur »** de la liste des coups, sur les plis adverses ;
2. la **cartouche sous l'échiquier**, qui nomme l'`Opportunity` et, s'il y a un verdict, ce que la
   lecture y a valu ;
3. le **bloc de figures**, qui montre la paire adverse à côté de celle du joueur sans la fondre
   dedans.

Et trois interdits, aussi fermes que les sites :
- **aucun nouveau glyphe sur la courbe** d'évaluation — le dessin parle de la partie du joueur ;
- **la teinte de la case de l'échiquier ne change pas** : un échiquier, un auteur (ADR-0022) ;
- **la couleur n'est jamais le seul indice** (ADR-0013) : un mot, et un nom accessible qui distingue
  une `Opportunity` d'une faute du joueur.

Le mot et le glyphe viennent des **modules qui les possèdent** (le tableau de libellés, la table des
glyphes) et ne sont **jamais retapés** : un joueur qui lit le même fait dans la liste et sur la
cartouche doit lire **un** fait, pas deux qui se ressemblent.

Le vocabulaire : « `Opportunity` » et sa gravité comme propriété (*une `Opportunity` de la taille
d'une bévue*). **Jamais** « erreur de l'adversaire », « cadeau », « chance manquée » — les trois
mots de gravité sont réservés au sujet de cet outil.

Le coût de densité des deux figures est **constaté** et renvoyé à US-33, pas traité ici.

**Piège nommé d'avance** : trois des onze findings bloquants d'US-26 étaient des correctifs qui
n'atteignaient jamais l'écran (règle CSS absente, propriété en trop silencieusement perdue, règle
qui perd la cascade face à `:is()`). La FP **vérifie le rendu**, pas la présence du champ dans la
réponse.

Implémenté sur la branche d'intégration `integration/US-30-judge-the-opponent`.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] La colonne « Le moteur » rend l'`Opportunity` sur les plis adverses
- [ ] La cartouche sous l'échiquier la nomme, et nomme ce que la lecture y a valu quand il y a un
      verdict
- [ ] Le bloc de figures montre la paire adverse, séparée, avec son dénominateur
- [ ] La courbe n'a **aucun** glyphe nouveau — test ancré
- [ ] La teinte des cases de l'échiquier est **inchangée** — test ancré
- [ ] Chaque indication porte un mot et un nom accessible ; aucune ne repose sur la seule couleur
- [ ] Le mot et le glyphe sont **importés** des modules qui les possèdent (aucune chaîne dupliquée)
- [ ] Les deux cartouches ne se superposent à aucune largeur testée
- [ ] Un test de rendu part d'une réponse d'API fabriquée et vérifie le **texte rendu**

### Feature Path (FP)

1. Ouvrir la `Confrontation` de la fixture → naviguer jusqu'à un pli adverse portant une
   `Opportunity` : la colonne « Le moteur » et la cartouche la nomment toutes deux, avec **le même
   mot**
2. Le pli adverse **vu et bien lu** → la cartouche dit la bonne lecture ; le **sous-lu** → la
   sous-lecture
3. Vérifier la courbe : aucun glyphe n'est apparu côté adverse ; vérifier une case d'arrivée
   adverse : sa teinte est celle d'avant
4. Réduire la fenêtre → les cartouches ne se chevauchent pas
5. Ouvrir la partie 715 réelle → le bloc de figures adverses s'affiche avec son dénominateur

Verify: par l'interface, et **en regardant le rendu** (capture / styles calculés), pas la réponse
réseau. C'est le piège qui a coûté trois findings sur US-26.
