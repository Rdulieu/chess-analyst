# L'échiquier peint un auteur, la cartouche nomme la comparaison

ADR-0022 a refusé les deux auteurs sur une même case et a nommé la dette : *« un futur écran de
`Confrontation` coup par coup ne peut pas se contenter de cette teinte […] il devra apporter sa
colonne ou son titre »*. Sans ce texte, l'écran qui doit payer cette dette retente la double teinte
— c'est la pente évidente, la case est déjà là — et rien ne l'arrête : une case n'a ni colonne ni
titre, donc deux verdicts dessus sont un indice **uniquement chromatique**, ce qu'ADR-0013 interdit
et qu'aucun test ne détecte.

**Décision : la case porte la teinte du joueur, et la comparaison est portée par une cartouche
titrée, à côté de l'échiquier.** L'échiquier reste ce qu'ADR-0022 en a fait — un auteur, le sien,
et sur la route de confrontation cet auteur est le joueur. La cartouche est le « titre » exigé :
une couleur, un libellé en toutes lettres, et un libellé **paramétré par le cas** plutôt qu'un mot
générique — « Bévue ratée » et « Bévue sous-estimée » sont deux `Sous-lecture`s et ne se disent pas
pareil. Le moteur, lui, n'a aucune case : il est dans la courbe, dans la liste des coups (qui, elle,
a des colonnes) et dans le texte.

Deux familles de cartouches coexistent sur un coup — la lecture (`Bonne lecture` / `Sous-lecture` /
`Sur-lecture`) et le `Key moment` — et elles réutilisent les mêmes couleurs. La famille est donc
portée par un **glyphe**, `◆`, celui que la liste des coups emploie déjà : la couleur dit la
qualité, le glyphe dit de quoi on parle, le libellé dit le cas. Trois indices, aucun seul, et rien
qui repose sur la teinte.

## Conséquences

- **Le gris nomme son cas, il ne dit jamais « NA ».** Coup forcé, position déjà décidée, coup de
  l'adversaire, `Good`, rien dit : cinq situations, une seule couleur, cinq libellés. Les fondre
  effacerait le cas qui règle tout le dénominateur — un coup forcé mesuré `Bévue` où le joueur a dit
  `Sound` et où il a **raison**.
- **C'est ce qui règle le volume des coups exclus** (retour du 25/08, note 8) sans toucher à
  ADR-0017 : la règle exigeait la lisibilité, pas une liste. Dit à son coup, chaque exclu n'occupe
  plus de place nulle part.
- **Une cartouche est un verdict de confrontation, et rien d'autre.** Ce qui est écrit après le
  sceau n'en reçoit pas : lui en donner une le ferait entrer dans le vocabulaire du score, que
  `GameConfrontation` lui refuse explicitement.
- **La cartouche n'apparaît que là où il y a quelque chose à dire.** Sur les moments clés en
  particulier : ni marqueur ni perte, pas de cartouche — sinon soixante cartouches disent « rien ».
