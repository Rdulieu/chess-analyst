# 01 — Le tracé de dérive gagne une échelle et un repère

Status: `ready-for-agent`
Type: AFK
Branche : depuis `integration/US-15a-bis-deepen-per-game-analysis`, PR **vers elle**, jamais vers `develop`.

## Parent

[`PRD.md`](../PRD.md) — US-15a-bis. Décisions **D8** et **D9** de [`GRILL-NOTES.md`](../GRILL-NOTES.md).

## What to build

Le tracé de dérive normalise aujourd'hui par le total de la partie, donc **tout tracé finit en haut
de sa boîte** : une partie à 5 % de pertes dessine la même ascension pleine hauteur qu'une à 191 %.
L'œil lit « hauteur = gravité », et cette lecture est fausse à chaque fois.

Plutôt que de corriger l'échelle, on rend le mensonge **impossible** : le plafond par partie est
conservé mais relevé à `max(total, 100)`, une **ligne horizontale rouge** marque les 100 %, et une
**échelle chiffrée** est graduée à gauche du graphique. Le lecteur a les nombres sous les yeux.

Le plafond relevé n'est pas un détail cosmétique : sans lui, la ligne des 100 % tombe hors cadre sur
toute partie perdant moins de 100 %, c'est-à-dire le cas le plus fréquent. Avec lui, le défaut
disparaît **sous** 100 % (le tracé n'atteint plus le haut) et est **désamorcé** au-dessus, la ligne
rouge devenant elle-même la règle graduée : deux tracés se comparent par la position du trait.

Le **cumul total** est conservé — le tracé finit exactement sur le total que le récapitulatif affiche
à côté, ce qui est vérifiable d'un coup d'œil et constitue la promesse d'ADR-0017. Ne pas le
remplacer par le résidu.

Le graphique reste **écrit pour être supprimable** : dérivé client, aucun schéma, aucun temps moteur.

## Acceptance criteria

- [ ] Le plafond du tracé vaut `max(total, 100)`.
- [ ] Une ligne horizontale rouge marque les 100 %, **toujours dans le cadre**.
- [ ] Une échelle chiffrée est graduée sur le bord gauche du graphique.
- [ ] Sur une partie sous 100 %, le tracé finit **sous** la ligne rouge, à `total/100` de la hauteur.
- [ ] Sur une partie au-delà de 100 %, le tracé finit en haut et la ligne rouge est à `100/total` de
      la hauteur.
- [ ] Le tracé finit sur le **total** que le récapitulatif affiche pour la même partie — aucune
      divergence possible entre les deux vues.
- [ ] Le tracé reste le **cumul total**, pas le résidu.
- [ ] La ligne rouge ne repose pas sur la seule couleur pour être identifiable (règle non-chromatique
      du projet).
- [ ] Rien n'est persisté, aucun appel moteur n'est ajouté.

### Feature Path (FP)

1. Ouvrir une partie analysée perdue à **moins de 100 %** de chances → l'échelle chiffrée est lisible
   à gauche du tracé, et la ligne rouge des 100 % est **visible dans le cadre**.
2. Lire la fin du tracé → il s'arrête **sous** la ligne rouge, sur la valeur exacte que le
   récapitulatif affiche à côté.
3. Ouvrir une partie dont le total dépasse 100 % → le tracé finit en haut du cadre et la ligne rouge
   est **à l'intérieur**, plus bas.
4. Comparer les deux parties → la position de la ligne rouge diffère, et elle sert de règle pour
   juger laquelle a coûté le plus.

Verify: UI d'abord. Aucun magasin à sonder — tout est dérivé côté client.

## Blocked by

None - can start immediately.
