# US-35 — « Analyser cette partie » ne doit pas être avalé en silence

Business story: **US-35** (`BACKLOG.md`) · grillée le 2026-09-07 ·
branche d'intégration `integration/US-35-analysis-request-answered`

## Problem Statement

Le Player ouvre une de ses parties sur la page `Analyse` et demande son `Analysis pass`. Rien ne
part, et l'écran lui montre pourtant une analyse qui avance. Il attend, parfois plusieurs minutes,
devant la progression d'une **autre** partie — parce que le relevé de passe affiché n'est pas celui
de la partie qu'il regarde, et qu'aucun libellé ne le dit.

Deux gestes distincts produisent le même mensonge :

- **à l'ouverture de la page**, le relevé de la dernière passe du `Profile` s'affiche tel quel, même
  quand cette passe porte sur une partie que le Player n'a jamais ouverte ;
- **au clic**, le bouton est désactivé dès qu'une passe tourne — n'importe laquelle — donc la
  demande n'est jamais émise, et le message de refus que l'app sait déjà écrire n'est jamais atteint.

Le coût n'est pas seulement de l'attente : le Player croit avoir dépensé du temps moteur sur sa
partie et ne l'a pas fait, et il repart avec une partie non analysée qu'il croit analysée.

Le diagnostic d'ouverture de la story attribuait le blocage à une **passe non acquittée**. C'est
faux, vérifié : la seule garde du démarrage est « une passe tourne déjà », et l'acquittement n'y
entre pour rien.

## Solution

Une demande d'`Analysis pass` reçoit **toujours une réponse**, et tout relevé de passe **dit de quoi
il parle**.

- Le bouton « Analyser cette partie » reste **cliquable** pendant qu'une passe tourne. Le Player
  apprend l'état de l'app en agissant, et l'app répond : *une analyse est déjà en cours sur telle
  partie*.
- Le relevé de passe — en cours **comme** terminé — **répond d'abord à l'appartenance** : cette
  passe couvre-t-elle la partie que je regarde, ou d'autres parties ? Quand elle ne couvre qu'une
  seule partie, elle est en plus **nommée**, avec les mêmes mots que la confirmation de réanalyse.
- Aucune file d'attente. Une demande refusée est refusée à voix haute, pas mise de côté.

## User Stories

1. En tant que `Player`, je veux que ma demande d'analyse reçoive une réponse, pour ne pas attendre
   devant un écran qui ne m'a rien promis.
2. En tant que `Player`, je veux pouvoir cliquer « Analyser cette partie » même quand une analyse
   tourne ailleurs, pour apprendre par l'app ce qu'elle est en train de faire.
3. En tant que `Player`, je veux que le refus me dise **quelle** analyse me bloque, pour savoir
   quoi attendre et combien de temps.
4. En tant que `Player`, je veux qu'un relevé d'analyse en cours me dise s'il concerne la partie que
   je regarde, pour ne pas prendre le travail d'une autre partie pour le mien.
5. En tant que `Player`, je veux qu'un relevé d'analyse **terminée** me dise aussi de quelle partie
   il parle, pour ne pas croire que ma partie vient d'être analysée.
6. En tant que `Player`, je veux qu'une passe qui ne couvre qu'une partie soit **nommée**, pour la
   reconnaître sans deviner.
7. En tant que `Player`, je veux qu'une passe qui couvre un lot de parties reste lisible sans être
   énumérée, pour que le relevé d'un import de trois cents parties tienne en une ligne.
8. En tant que `Player`, je veux que la bannière et la confirmation de réanalyse nomment une partie
   de la même façon, pour ne pas avoir à traduire d'un écran à l'autre.
9. En tant que `Player`, je veux que « Analyser cette partie » sur une partie **déjà couverte** par
   la passe en cours me montre l'avancement plutôt qu'un refus, parce que le travail demandé est
   déjà en train de se faire.
10. En tant que `Player`, je veux qu'une demande refusée ne soit **pas** mise en file, pour ne pas
    voir une analyse démarrer plus tard sans que je l'aie demandée.
11. En tant que `Player`, je veux que le comportement soit le même depuis « Mes parties » et depuis
    la page `Analyse`, pour que ce que j'apprends d'un écran vaille pour l'autre.
12. En tant que `Player` qui change de `Profile`, je veux que le relevé du profil précédent
    disparaisse, pour ne pas lire le travail de quelqu'un d'autre (déjà acquis, à ne pas casser).
13. En tant que `Player`, je veux qu'un rechargement de page me rende le relevé non acquitté avec
    son attribution, pour que l'information survive au rechargement comme le relevé lui-même.
14. En tant que `Player`, je veux que le refus reste distinct de « rien à analyser », pour ne pas
    être contredit sur un écrasement que je viens d'autoriser (déjà acquis, à ne pas casser).
15. En tant que `Player` non voyant, je veux que l'attribution soit dans la région live annoncée,
    pour l'entendre avec la progression et non à côté.
16. En tant qu'agent qui lit ADR-0011, je veux que le texte ne présente pas comme assumé le
    comportement qu'on vient de réparer, pour ne pas ré-autoriser le bug à la relecture.
17. En tant qu'agent qui lit les tests, je veux qu'un titre qui dit « scoped to only this Game »
    scope réellement ce qu'il annonce, pour ne pas croire une garantie inexistante.

## Implementation Decisions

### Le relevé de passe répond de son appartenance

`GET /api/analyze/status` **garde son scope `Profile`** (ADR-0011 : c'est la dernière passe du
profil qui est reportée, en cours ou non) et gagne un paramètre **`gameId` optionnel**. La réponse
gagne deux champs :

| champ | valeur |
| --- | --- |
| `covers` | booléen — la passe reportée couvre-t-elle la partie demandée ; `null` quand aucun `gameId` n'est passé (cas « Mes parties ») |
| `game` | l'identité de la partie couverte — **non-null seulement** quand la passe ne couvre qu'une partie ; `null` sinon |

`game` porte de la **donnée**, pas un libellé : les deux camps et la date, ce dont le client a
besoin pour composer la phrase. Le serveur ne compose rien.

**Alternative écartée — renvoyer le tableau brut des identifiants couverts** et laisser le client
comparer : la payload devient non bornée (un profil de référence a 354 parties) sur un relevé qui
est *sondé toutes les 500 ms*. Le contrat retenu est de taille constante.

**Aucune migration due** : la table des passes enregistre déjà les parties qu'une passe couvre. La
donnée qui manque à l'écran est en base ; c'est le contrat de lecture qui ne la sortait pas.

### La garde de démarrage ne change pas

Un moteur, une passe à la fois : une demande reçue pendant qu'une passe tourne est refusée, et cette
garde reste telle quelle. Elle ne regarde ni l'acquittement ni les parties visées, et n'a pas à le
faire — le refus est un fait sur le **moteur**, pas sur la partie. Ce qui change est que ce refus
**arrive jusqu'au Player**.

### Le bouton n'est plus désactivé

Le contrôle de lancement perd sa désactivation pendant une passe, et le drapeau « une passe tourne »
qui ne servait qu'à ça disparaît de son interface. Un contrôle désactivé sans motif *est* le défaut :
il transforme un refus explicite en silence.

Conséquence voulue : le clic part toujours, atteint la garde, et revient avec le refus que le relevé
sait déjà afficher.

### Une seule façon de nommer une partie

La fonction qui nomme une partie pour la confirmation de réanalyse (les deux camps et la date) est
**promue** au niveau de la feature d'analyse et **partagée** avec le relevé. Une fonction, deux
appelants, jamais dupliquée — la bannière et la confirmation ne peuvent pas diverger sur le nom
d'une même partie.

### Le libellé, cas par cas

L'appartenance passe **avant** le nom, parce qu'elle est la seule réponse qui marche aussi pour un
lot :

- passe en cours **sur la partie regardée** → l'avancement, sans mention d'appartenance : le Player
  est déjà au bon endroit ;
- passe en cours **sur une autre partie**, une seule → l'avancement, **la partie nommée** ;
- passe en cours **sur un lot** ne couvrant pas la partie regardée → l'avancement, « sur d'autres
  parties » ;
- passe en cours **sur un lot** couvrant la partie regardée → l'avancement, « dont cette partie » ;
- passe **terminée** → les mêmes règles s'appliquent au résumé, qui mentait de la même façon.

Le résumé d'une passe terminée et non acquittée est traité **comme la passe en cours** : même
fuite, même correctif, aucune décision supplémentaire.

### Ce qu'ADR-0011 devient

ADR-0011 est **réécrit** (pas doublé d'un ADR de plus, décision du demandeur). La décision de fond
est **gardée** : une seule passe est reportée, une nouvelle passe supersède un résumé non acquitté,
pas de file d'attente. Ce qui est **retiré** est la justification qui autorisait le défaut — « starting
another analysis is an action taken with the page in view » — parce qu'elle supposait que la passe à
l'écran est celle que le Player a lancée : vrai sur la liste des parties, faux sur la page de revue
d'une partie. Sa clause de révision est corrigée : elle guettait une passe démarrant là où le Player
ne regarde pas, alors que la panne est l'inverse.

`CONTEXT.md` porte désormais le contrat dans l'entrée `Analysis pass` : *one at a time, refused out
loud, never queued, never silently dropped*.

### Deux phrases du dépôt à corriger

- Le commentaire du relevé qui affirme qu'un résumé « stays until dismissed, so a Player cannot miss
  it » : contredit par ADR-0011 lui-même (une nouvelle passe supersède un résumé non acquitté).
  Contradiction antérieure à cette story, retirée au passage.
- Le titre du test qui annonce scoper « to only this Game » : il scope la **demande** (il assère bien
  que le corps du POST ne porte que cette partie), jamais le **relevé**. Retitré pour dire ce qu'il
  fait.

## Testing Decisions

**Consigne du demandeur : réutiliser au maximum les tests existants, et ne pas créer de test
nouveau pour du libellé.** Le plan la respecte — **un seul test nouveau**, cinq amendements, aucun
nouveau fichier de test, aucun nouveau seam.

Un bon test ici assère ce que le Player lit et ce que l'app répond, jamais comment elle s'y prend :
le texte de la région live, l'état activé/désactivé du contrôle, et la réponse du relevé. Aucun test
n'ira lire un état interne du job.

### Seams — trois, tous existants

1. **Le job d'analyse** (suite serveur existante `analysis job`) : le relevé répond de
   l'appartenance et de l'identité. Seam le plus haut côté serveur — il pilote la payload, et la
   route par transitivité.
2. **Le composant de relevé** (suite existante) : les variantes de libellé, en props pures, sans
   stub de requête. Il sert « Mes parties » autant que la page `Analyse`, donc son contrat mérite ce
   point d'appui.
3. **La page d'analyse d'une partie** (suite existante du visualiseur) : le câblage — bannière
   attribuée, bouton actif, clic qui part.

### Amendements (5), sur des tests qui doivent changer de toute façon

- *« opens no pass when every given Game is already analyzed… »* compare la payload **au champ
  près** : elle change avec le contrat. Point d'appui gratuit pour les deux nouveaux champs.
- *« is single-flighted — a second start while one is running is ignored »* sème **déjà deux
  parties** et lance une passe sur chacune : le scénario croisé y est déjà. On y assère
  l'appartenance dans les deux sens, et le titre perd « ignored » — le refus est **répondu**.
- *« confirms a completed pass with both figures »* : la phrase du résumé gagne l'appartenance, donc
  son assertion de texte évolue.
- *« says a pass is already running, rather than claiming the selection is analysed »* : le refus
  nomme désormais la passe qui bloque.
- Le test du visualiseur qui prétend scoper « to only this Game » : retitré, et on y assère que le
  bouton **n'est pas** désactivé pendant une passe — comportement qu'aucun test ne couvre
  aujourd'hui, ce qui est aussi pourquoi il a pu être écrit.

### Le seul test nouveau

**Une passe tourne sur la partie X ; on rend la page d'analyse de la partie Y du même `Profile`.**
Attendu : la bannière est attribuée (elle nomme X), le bouton est actif, et le clic part et revient
avec le refus. Il ne peut pas être un amendement — **aucun** test existant ne rend deux parties d'un
même profil — et ce n'est pas un test de libellé : c'est le test de non-régression du défaut.

### Place dans la pyramide

Tout tient sous le sommet : trois suites unitaires/intégration déjà en place. Pas de test de bout en
bout nouveau.

**Feature Path** (porte d'auto-merge de chaque sous-ticket) : un sous-agent pilote l'app réelle et
couvre **les deux chemins**, parce que le code confirme que les deux existent — la bannière au
montage de la page *et* le refus après clic. Le grill n'a pas eu besoin du souvenir du demandeur pour
trancher ce point.

La base locale porte de quoi le jouer : deux `Profile`s avec des parties analysées et analysables. Si
la FP a besoin d'une passe **longue** pour observer l'état « en cours », elle la fabrique sur une
partie non analysée plutôt que d'attendre une passe réelle.

**Happy Path** : aucun HP nouveau proposé. La suite est à **3 HP, son plafond**, et ce correctif est
un défaut d'attribution sur un écran que HP-01 traverse déjà. Le relevé attribué sera visible dans
HP-01 sans qu'il faille l'y ajouter.

## Out of Scope

- **La file d'attente des demandes refusées.** Refusée explicitement (décision 1) : c'est la notion
  permanente qu'ADR-0011 avait déjà écartée pour les résumés.
- **Le libellé du compteur** — ce que « X/Y positions évaluées » compte, et qui a lancé la passe :
  c'est **US-27**, frontière posée au grill et inscrite dans son entrée de backlog. Cette story ne
  prend que « de quelle partie la bannière parle », sans quoi son refus est incompréhensible.
- **Le moteur enregistré avec la passe** : c'est **US-36**, et elle doit sa migration.
- **La concurrence de plusieurs passes.** Un moteur, une passe : la garde reste, et rien ici ne
  cherche à la lever.
- **Le chemin de réanalyse de la tranche 07 d'US-15a**, re-testé et hors de cause.
- **Reporter la plus ancienne passe non acquittée, ou agréger les non lues.** Alternatives d'ADR-0011,
  toujours refusées.

## Further Notes

**Le diagnostic d'ouverture de la story était faux**, et le dire économise la tranche : le démarrage
d'une passe ne lit **jamais** l'acquittement, donc « avalée sous une bannière de passe non
acquittée » ne décrit rien. Le vrai mécanisme est un relevé scopé au `Profile` et un bouton
désactivé sur ce relevé. Conséquence : **le correctif serveur est un ajout de contrat, pas un
changement de comportement**, et la garde ne bouge pas.

**Ce qui rend la tranche petite** : la donnée manquante est déjà en base (aucune migration), le
message de refus est déjà écrit (il suffit de le laisser arriver), le composant de relevé est déjà
l'unique implémentation partagée par les deux écrans, et la fonction qui nomme une partie existe
déjà — elle change seulement de portée.

**Le drapeau « une passe tourne » passé au contrôle de lancement ne sert qu'à le désactiver.** En
retirant la désactivation, il devient mort : le supprimer fait partie de la tranche, pas d'un
nettoyage ultérieur.
