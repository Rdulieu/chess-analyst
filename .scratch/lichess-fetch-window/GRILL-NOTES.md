# US-17 — grill : un import Lichess qui ne paie pas une requête par mois vide

Session du 2026-08-23. Branche `integration/US-17-lichess-fetch-window`.
Grillée **avec** US-18 en ouverture, puis US-18 renvoyée à sa propre session (voir D1).

Sortie documentaire : `CONTEXT.md` (`Monthly import` amendée), **ADR-0018** (renumérotée depuis
0016, section « What US-17's grilling changed » ajoutée, décisions 1, 2, 4, 5 révisées).

---

## D1 — Le span de `Metalyst` reste à 71 mois ; US-18 perd son plus gros levier

US-18 proposait de **raccourcir le span** du compte de référence, en assumant de rediscuter la règle
« do not shorten its span » de `docs/test-scenarios/README.md`.

**Décision : non. Le span reste 2017-10 → 2023-08, la règle n'est pas rediscutée.**

Les ~6 minutes qu'US-18 visait sont **6 pauses de 60 s**, c'est-à-dire six retries 429. Ces 429 sont
un throttle par IP déclenché par la **rafale** de 71 requêtes. US-17 ramène la rafale à une requête :
les six minutes disparaissent **sans toucher au span**, donc sans perdre l'assertion que les 51 mois
vides portent.

Grillées séparément, les deux stories auraient pu trancher en sens contraire sur le même compte de
référence — et on aurait payé une perte d'assertion pour un gain qu'US-17 donnait gratuitement.

## D2 — Le mois reste l'unité de **restitution**, cesse d'être l'unité de **récupération**

`CONTEXT.md` définissait déjà le `Monthly import` comme « the unit the Player is shown progress and
outcome by ». Une seule clause l'attachait à la récupération (« a Platform that serves arbitrary date
ranges is asked for a month's worth ») : c'est elle, et elle seule, qu'US-17 retire.

**Le code contredisait déjà l'ADR.** ADR-0018 décision 2 justifiait le découpage par « a single
stream that dies at month 40 is an Import entirely in failure ». `importMonth` insère **partie par
partie**, dédupliqué par URL : un flux mort au mois 40 laisse les mois 1-39 persistés. Ce qu'une
coupure coûte, c'est le **compte rendu**, pas la donnée.

Et le compte rendu est **dérivable** : la requête pose `sort=dateAsc`, donc tout mois antérieur à la
dernière partie reçue est couvert. L'assertion centrale — *un trou d'historique se distingue d'un
trou de récupération* — tient intégralement.

La localité de l'échec n'est pas perdue : elle passe du **mois** au **point d'arrêt du flux**, ce qui
est plus fin.

## D3 — Le port passe à une plage ; la boucle de mois rentre chez chess.com

`fetchMonth(username, year, month)` **est** la forme de chess.com, promue en contrat commun — le
backlog le disait déjà (« on a plaqué la forme de chess.com sur une API qui n'en a pas besoin »).

**Décision : `fetchRange(username, since, until)`.** Chaque adaptateur le satisfait dans la forme que
sa Platform sert réellement : chess.com boucle ses mois **à l'intérieur de lui-même**, Lichess fait
une requête.

Critère du demandeur : « le traitement Lichess le plus simple possible **sans impacter chess.com** »,
précisé en séance comme **aucun changement de comportement** — pas comme « pas une ligne touchée ».
La FP de chess.com est « l'import se comporte exactement comme avant », mot pour mot ce qu'ADR-0018
avait déjà employé pour son refactor précédent.

**Écartée** : garder `fetchMonth` et laisser Lichess bufferiser en interne. Des appels mois par mois
**ne révèlent jamais la plage demandée** ; l'adaptateur devrait deviner jusqu'où bufferiser.

**Écartée** : ajouter `fetchRange` *à côté* de `fetchMonth`. Le port porterait deux façons de dire la
même chose et le service une branche permanente — la simplicité de Lichess payée par une complexité
déplacée d'un cran.

## D4 — Le port **yield**, il ne retourne pas

`fetchRange` est un `AsyncGenerator<ImportedGame>`, pas une `Promise<ImportedGame[]>`.

Ce n'est pas un choix de style. **`readNdjson` est déjà un `AsyncGenerator`** — écrit ainsi en US-12,
avec le commentaire « the export is a stream, so the lines are consumed as they arrive ». C'est
`fetchMonth` qui **rompt** ce flux en le matérialisant. Passer le port en générateur ne fait que
cesser de casser quelque chose qui coulait déjà.

Trois conséquences :
1. **La localité de l'échec est sauvée.** Avec un tableau, un flux mort au mois 40 lève une exception
   et le tableau part avec elle — les 39 mois arrivés seraient perdus alors qu'ils étaient là.
2. **La mémoire cesse d'être un sujet** : jamais 50 000 `ImportedGame` avec leurs PGN en RAM.
3. **Le signe de vie devient continu**, ce qui répond à la seconde question ouverte de l'entrée.

**Point laissé à la tranche d'implémentation** : `totalFetched` compte ce que la Platform **avait**,
hors périmètre compris (pour qu'un mois majoritairement hors périmètre ne se lise pas vide). Un
générateur qui ne yield que le périmètre le perd. Deux voies — yield `{ game, inScope }`, ou le
rendre en valeur de retour du générateur. La première est plus simple à consommer.

## D5 — Aucune borne sur la plage

L'entrée craignait « un seul flux sans le moindre retour avant la fin » pour un compte à 50 000
parties. Le streaming supprime ce risque : le mois se clôt dès qu'arrive une partie du mois suivant,
les lignes se remplissent comme aujourd'hui.

Découper en tranches annuelles **rétablirait la rafale**, donc le throttle, donc les pauses de 60 s —
pour acheter une garantie que le streaming donne déjà. Une borne pourra être ajoutée plus tard si un
compte massif le justifie.

## D6 — Retry avant le premier octet, aucun après ; et le Player sait quoi relancer

**Avant le premier octet** — un `429` sur la réponse : le retry d'ADR-0018 décision 5 est **conservé**
(une attente, un rejeu). Il devient quasiment du code mort — la cascade qu'il prévenait n'existe plus
— mais une IP fraîchement bridée reste possible. Son message doit nommer la **plage** : il dit
aujourd'hui « reprise **du mois** dans X s », ce qui mentirait sur ce qui reprend.

**Après le premier octet** — le flux casse en vol : **aucun retry**, par application d'ADR-0010, pas
par exception à celle-ci. La reprise est le **rejeu par le Player**, correct et bon marché grâce à la
déduplication par URL.

**Écartée** : reprendre le flux à `since` = date de la dernière partie reçue. Ça ressemble à une
reprise, ça rouvre la porte aux rafales, et ça sous-entend une complétude qu'on ne peut pas garantir.

### Ce que le Player voit (exigence du demandeur)

La surface existe : `MonthlyImport.failure?: string`, rendu en mots (`échec : …`) **et** par
`data-failed` — jamais la couleur seule, parce qu'un mois en échec doit rester distinguable d'un mois
d'inactivité qui se lit comme un zéro. Les mois postérieurs au point d'arrêt la portent.

S'y ajoute un **énoncé global**, dans le champ `message` d'`ImportFigures` (qui existe déjà pour
« dire au Player pourquoi ») — **dans le vocabulaire `YYYY-MM` du formulaire, pour être retapable
tel quel** :

> « Le flux s'est interrompu après **2020-03**. Les parties récupérées sont **conservées**. Pour
> couvrir le reste, relancez un import de **2020-04** à **2023-08**. »

Trois informations, aucune décorative : où ça s'est arrêté, que rien n'est perdu (sinon le Player
croit devoir tout refaire), et la plage exacte.

**Le dernier mois reçu est déclaré NON couvert.** Un flux mort au milieu de mars laisse mars partiel.
Rejouer un mois à moitié importé est gratuit ; annoncer mars couvert alors qu'il ne l'est pas est un
trou **silencieux et durable**. On sur-déclare l'incomplétude, jamais la complétude.

L'Import **ne lève pas** : il rend son résumé, comme un mois en échec n'a jamais avorté un Import.

## D7 — Le pin IPv4 est conservé et rétrogradé ; ADR renumérotée en 0018

`request.ts` annonce « **This is a correctness requirement** » et l'ADR conclut que Lichess refuse
l'IPv6 sur l'export. **Les deux sont faux.** Le 2026-08-22 l'inverse exact s'est reproduit (IPv4 →
429, IPv6 → 200, deux comptes, quelques secondes d'écart) après que l'import de référence de la
veille eut envoyé ses 71 requêtes **par l'IPv4 épinglée**. L'explication qui couvre les deux
observations est un **throttle par IP sur l'endpoint export**, pas une propriété de la famille.

**Le pin reste** — `node:http` est voulu de toute façon pour le flux, et le pin ne nuit pas — mais il
devient un **choix de déterminisme** : une variable de moins quand on diagnostique un 429. À corriger
dans le même mouvement : le commentaire de `request.ts`, la précondition de `path-0-bootstrap.md` et
le corps de la PR #52, qui répètent tous la version IPv6.

**Renumérotation** : deux ADR portaient le numéro 0016. Celle-ci passe en **0018** (0017 est prise) ;
l'ADR du pass d'analyse garde 0016. Les **60 références** du dépôt ont été désambiguïsées dans le
même commit — pas reportées.

## D8 — path 0 est amendée, pas allégée ; pas d'HP pour US-17 ; **et elle mesure le gain**

Le span et l'assertion des 51 mois à zéro ne bougent pas. L'assertion est même **mieux** testée :
aujourd'hui elle vérifie que 51 requêtes ont répondu vide, ce qui est presque tautologique ; demain
elle vérifiera que **le découpage d'un flux en mois** produit 51 lignes à zéro — de la logique neuve.

path 0 gagne une observation qu'elle ne pouvait pas faire : **une requête au lieu de 71**. Sans elle,
rien dans la suite ne distinguerait US-17 livrée d'US-17 non livrée.

**Le test agentic final d'US-17 doit mesurer le temps d'exécution de path 0** et le comparer à la
référence, pour chiffrer le gain (demande du demandeur). C'est le **premier point de mesure réel**
d'US-18, dont l'entrée dit que ses chiffres sont *déduits, pas mesurés* — donc US-17 livre à US-18 sa
première donnée au lieu d'une déduction. Le rapport doit donner la durée mesurée, pas « c'est plus
rapide ».

**Pas d'HP** : le plafond de 3 est tenu, HP-01 couvre déjà l'import, et ce que change US-17 se valide
par les FP de ses tranches et par path 0.

**Angle mort assumé, consigné plutôt que compensé** : après US-17, plus rien n'exerce « un mois échoue
en cours de plage » côté Lichess — il n'y a plus de mois isolés à faire échouer. Le chemin reste
couvert côté chess.com (qui garde sa boucle) et par les tests unitaires du service.
