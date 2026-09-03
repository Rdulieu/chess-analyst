# L'angle mort, documenté plutôt qu'assumé

Tranche [`06`](issues/06-the-predicate-shipped.md), dans la forme que son issue prévoyait : *« Cette
tranche peut ne rien livrer. […] elle devient "documenter l'angle mort" : le dossier explique pourquoi
l'app reste muette sur la fin des parties perdues, l'app est inchangée, et ADR-0023 est amendé. »*

**L'app est inchangée. Aucune ligne de code, aucun schéma, aucun temps moteur.** Le récapitulatif
d'une partie affiche exactement les mêmes chiffres qu'avant la story — ce qui était la promesse
centrale d'US-15a-bis, et elle est tenue jusqu'au dixième.

Ce document existe pour qu'un lecteur futur — humain ou agent — trouve **pourquoi** l'app se tait sur
la fin d'une partie perdue, et n'aille pas le « réparer » en croyant à un oubli.

## Ce que l'app ne dit pas, et à quel endroit exactement

Un coup du Player joué dans une position où il lui reste **moins de 10 %** de chances de gain est
exclu du dénominateur, avec le motif « la position était déjà décidée ». Il ne compte pas comme une
erreur, il ne contribue rien aux chances perdues, et — **jusqu'au barème à 5 (US-37)** — il ne peut
structurellement porter aucun glyphe : la chute ne peut pas dépasser les chances restantes, donc un
coup joué à 9 % ne peut pas chuter de 10.

Ce n'est pas une omission, c'est une conséquence arithmétique de la bande publiée. Mesuré : **0 des
81** coups de la zone morte des deux corpus porte un glyphe au barème de 10.

## Pourquoi c'est assumé, et sur quelles données

Trois raisons, toutes mesurées sur vingt parties et 744 coups du Player.

### 1. L'angle mort est petit — bien plus petit que le dossier chess.com ne le suggérait

Le PRD s'ouvrait sur un constat brutal : sur la partie 51, *« sur les mêmes 22 coups, ils en signalent
6 et nous 1 »*, et les trois que nous manquions étaient tous joués entre 18 % et 6 % de chances. La
revue, sur dix bilans lichess au lieu d'un bilan chess.com, dit autre chose :

| | |
| --- | --- |
| Coups que lichess signale et que nous manquons | **43** |
| …joués dans une position que nous **comptons** | **39 (91 %)** |
| …joués dans la **zone morte** | **4 (9 %)** |
| …attribués à un désaccord de **seuil** et non de moteur | **32 (74 %)** |
| …que lichess appelle `Inaccuracy`, sa bande la plus basse | **35 sur 43** |

**L'écart avec un moteur ouvert n'est donc pas, pour l'essentiel, un angle mort de fin de partie :
c'est un écart de barre dans la partie vivante.** Le sentiment du demandeur — « je vois souvent des
trucs qui ne sont pas mis en valeur par le moteur » — est confirmé, mais sa cause n'est pas celle que
le dossier chess.com désignait.

### 2. Le barème à 5 en couvre déjà la moitié, gratuitement

US-37 baisse la bande d'`Inaccuracy` à 5 points en laissant le plancher du dénominateur à 10 %. Le
lien structurel se défait alors, et **deux des quatre** coups de la zone morte que lichess signale
deviennent signalés **d'eux-mêmes** :

| Coup | Chute | Chances avant |
| --- | --- | --- |
| 587/59 `Re8` | 9,0 | 10,0 % |
| 715/106 `Rxc4` | 5,5 | 5,8 % |

Ils porteront un glyphe **et** leur motif inchangé, par le cas « montré par la partie, non retenu par
l'analyse » que la tranche 04 d'US-15a avait construit et que personne n'avait jamais atteint. **Le
mécanisme d'ADR-0023 tire enfin — sans prédicat.**

### 3. Ce qu'un prédicat ajouterait ne paye pas son prix

Restent **trois coups sur vingt parties** (0,15 par partie) :

| Coup | Chute | Chances | Matériel | cp | Lichess |
| --- | --- | --- | --- | --- | --- |
| 619/67 `Rxf7` | 3,9 | 6,8 % | 4p | 246 | signalé |
| 622/102 `Kc7` | 0,3 | 0,4 % | 1p | 268 | signalé |
| 709/150 `Kc6` | 0,3 | 0,3 % | 1p | **5836** | aucune référence |

Deux sont confirmés, le troisième porte un `cp` de 5836 — le bruit de saturation caractéristique de la
zone morte. Le prix, lui, est un **second axe dans le vocabulaire** : une phrase de plus à l'écran, un
seuil de plus à défendre, et une décision de plus pour US-15c. **Décision du demandeur, 2026-09-03 :
non pour le moment.**

## Ce qui rendrait cette décision fausse

Elle est falsifiable, et voici par quoi :

1. **Un bilan chess.com sur la 708.** Le corpus DudulSmash n'a **aucune** référence extérieure, et
   c'est là que le prédicat est suspect de sur-ajustement : la conjonction retenue par la revue y
   désigne **un seul** coup sur dix parties, contre quatre chez Metalyst. Un bilan sur la 708 — où
   `material ≥ 3` désigne deux coups et la conjonction aucun — **séparerait les deux candidats**. Le
   second bilan chess.com reste en réserve pour ça.
2. **L'oracle est aveugle là où on l'interroge.** Lichess ne signale que **4 des 48** coups de la zone
   morte Metalyst (8 %) : ses seuils saturent comme les nôtres. « Non confirmé par lichess » n'est
   donc pas « faux » — pour les sept coups que le matériel désigne, le fait mécanique est vrai dans
   les sept cas. Un juge moins aveugle pourrait renverser le rapport valeur/prix.
3. **L'écran du barème à 5.** La revue ne peut pas trancher ce qu'on ressent devant **1,6× plus de
   glyphes**. Si, une fois US-37 livrée, la fin des parties perdues paraît encore muette, les trois
   coups ci-dessus redeviennent une question ouverte — avec, cette fois, un prédicat déjà mesuré et
   prêt : `material ≥ 1` **et** `cpDrop ≥ 200`, dont le signal **affiché** doit rester le fait
   matériel.

## Ce qui reste vrai du contrat d'ADR-0023

*« Je vous dis ce qui a coûté la partie, **et** je vous montre ce que je ne compte pas. »* La seconde
moitié est tenue, mais par un autre chemin que celui prévu : c'est la **bande abaissée** qui fait
apparaître les coups de la zone morte, pas un prédicat. `UncountedReason` garde ses **deux** valeurs,
le dénominateur ne bouge pas, et le vocabulaire n'a pas grossi d'un mot.
