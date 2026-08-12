# PRD — Import sur une plage de mois (US-9)

Status: ready-for-agent
Business story: US-9 — « Importer plusieurs mois de mon historique chess.com en une seule fois »
Integration branch: `integration/US-9-multi-month-import`
Grilling output: `CONTEXT.md` (`Import`, `Monthly import`), `docs/adr/0010-range-import-as-fault-tolerant-background-job.md`

## Problem Statement

Un `Import` ne couvre qu'**un seul mois**. Le Player qui découvre l'outil arrive avec des années
d'historique chess.com, et la seule façon de le rattraper aujourd'hui est de resaisir le
formulaire mois après mois : choisir le mois, cliquer, attendre, lire le résumé, recommencer. Vingt
fois pour deux ans. C'est assez pénible pour que le Player s'arrête en chemin — et un historique
partiel dégrade tout ce que l'outil sait produire, puisque `Weak opening`, `Move habit` et
`Danger position` sont des agrégats : leur pertinence dépend directement du volume de Games
retenues.

Ce n'est pas seulement une limite d'UI. La forme de la requête, celle de la réponse, et la façon
dont un échec est rapporté sont toutes construites autour du mois unique.

## Solution

Le Player saisit une **plage de mois** — un premier et un dernier mois — et lance un seul Import.
L'Import couvre les mois **un par un, dans l'ordre**, et le Player suit sa progression comptée en
mois (« 4/12 mois importés ») plutôt que face à un indicateur indéterminé.

À l'arrivée, il lit deux choses : les **totaux consolidés** sur la plage (parties importées, déjà
présentes, ventilation par catégorie de cadence, bilan victoires/nuls/défaites), et une **ligne par
mois** qui dit ce que ce mois a apporté — et, le cas échéant, que chess.com n'a pas répondu pour
lui. Un mois qui échoue n'interrompt pas l'Import : les suivants sont quand même couverts. Pour
rattraper, le Player relance simplement la même plage ; la déduplication par URL fait que seul le
manquant est réellement importé.

Le comportement par défaut ne change pas : les deux champs sont préremplis au mois courant, donc
« importer le mois en cours » reste un seul clic.

## User Stories

1. En tant que Player, je veux saisir un premier et un dernier mois, afin d'importer plusieurs mois d'historique en une seule action.
2. En tant que Player, je veux que les deux champs soient préremplis au mois courant, afin que mon import de routine reste aussi rapide qu'avant.
3. En tant que Player, je veux pouvoir saisir le même mois des deux côtés, afin d'importer un mois isolé sans forme de saisie particulière.
4. En tant que Player, je veux que mes catégories de cadence s'appliquent à toute la plage, afin de ne pas les resaisir par mois.
5. En tant que Player, je veux que mon nom d'utilisateur reste mémorisé comme aujourd'hui, afin de ne pas le retaper à chaque Import.
6. En tant que Player, je veux être averti si je saisis une plage inversée, afin de corriger ma saisie plutôt que de lancer un Import vide.
7. En tant que Player, je veux qu'un mois futur ne soit pas parcouru, afin de ne pas voir de faux trous à zéro partie dans mon résumé.
8. En tant que Player, je veux pouvoir demander une plage très longue sans être bloqué, afin de reconstruire tout mon historique en une fois.
9. En tant que Player, je veux qu'on me demande confirmation au-delà de 24 mois, afin d'attraper une faute de frappe sur l'année avant de lancer un long Import.
10. En tant que Player, je veux voir combien de mois sont traités sur combien, afin de savoir où en est l'Import et combien il reste.
11. En tant que Player, je veux que l'interface reste utilisable pendant l'Import, afin de ne pas être bloqué devant un écran figé.
12. En tant que Player, je veux que l'Import se poursuive si je ferme l'onglet, afin de ne pas tout perdre par accident.
13. En tant que Player, je veux voir les totaux consolidés sur la plage, afin de juger d'un coup d'œil ce que l'Import a rapporté.
14. En tant que Player, je veux voir la ventilation par catégorie de cadence sur la plage entière, afin de savoir quelle part de mon jeu a été couverte.
15. En tant que Player, je veux voir mon bilan victoires/nuls/défaites sur la plage, afin d'avoir un premier retour immédiat sur la période importée.
16. En tant que Player, je veux une ligne par mois indiquant ce qu'il a apporté, afin de vérifier que la période visée est réellement couverte.
17. En tant que Player, je veux distinguer un mois où je n'ai pas joué d'un mois qui a échoué, afin de ne pas croire à un trou dans mon historique.
18. En tant que Player, je veux qu'un mois en échec n'annule pas les autres, afin de garder le bénéfice de l'Import.
19. En tant que Player, je veux qu'un Import majoritairement réussi ne me soit pas présenté comme un échec, afin de ne pas douter de mes données sans raison.
20. En tant que Player, je veux pouvoir relancer la même plage après un échec partiel, afin de rattraper les mois manquants sans réfléchir à quoi relancer.
21. En tant que Player, je veux que relancer une plage déjà importée n'ajoute rien en double, afin de pouvoir le faire sans crainte.
22. En tant que Player, je veux être averti immédiatement si mon nom d'utilisateur chess.com est inconnu, afin de le corriger avant d'attendre quoi que ce soit.
23. En tant que Player, je veux voir les Games apparaître dans « Mes parties » une fois l'Import terminé, afin d'enchaîner sur l'analyse.
24. En tant que Player, je veux que les statistiques de `Move habit` soient calculées pour les Games importées comme aujourd'hui, afin que l'explorateur reflète la période rattrapée.
25. En tant que Player, je veux ne pas pouvoir lancer deux Imports concurrents, afin de ne pas doubler les appels à chess.com ni brouiller la progression affichée.

## Implementation Decisions

Toutes issues du grilling ; ADR-0010 porte le raisonnement complet.

### Périmètre et contrat

- L'`Import` est scopé à une **plage contiguë de mois** (`from`/`to`, chacun un couple année/mois).
  Un mois isolé est une plage dont les bornes sont égales. **Un seul contrat** : le chemin mono-mois
  disparaît en tant que forme de requête distincte.
- `POST /api/import` prend `{ username, from: {year, month}, to: {year, month}, categories }`.
  Il **valide, démarre le job et rend `202`** avec le statut initial. Il ne rend plus le résultat.
- `GET /api/import/status` rend le statut courant, et l'`ImportResult` terminal une fois le job
  achevé.
- **Validation à l'entrée** : `from > to` → `400`. `to` postérieur au mois courant est **borné
  silencieusement** au mois courant (un mois futur affiché à zéro se lit comme un trou). **Aucun
  plafond serveur** sur la longueur de la plage.
- **Username inconnu** : `playerExists` est vérifié **une seule fois, avant de démarrer le job** →
  `404` synchrone, aucun job lancé.

### Serveur

- `importMonth` **est conservé inchangé** dans sa responsabilité (fetch, mapping, déduplication par
  URL, persistance, `recordMoveHabits`). Sa signature perd la vérification `playerExists`, remontée
  d'un cran.
- Une nouvelle fonction `importRange` **orchestre** : elle énumère les mois de la plage, appelle
  `importMonth` **séquentiellement**, agrège. Elle ne réimplémente rien.
- Un mois qui lève (chess.com injoignable, 5xx, 429) est **capturé** : il est marqué en échec sur
  sa ligne et la boucle continue. **Aucun retry, aucun backoff** — le rejeu idempotent de la plage
  est la stratégie de récupération.
- `createImportJob(db, client)`, jumelle de `createAnalysisJob` : `status()`, `start(params)`
  (rend le statut immédiatement, sans attendre), `idle()` pour les tests et l'arrêt.
  **Single-flight** : un `start` pendant qu'un Import tourne est ignoré et rend le statut courant.
  Une exception non prévue est journalisée et termine le job proprement, jamais ne fait tomber le
  relais.
- `ImportStatus` : `{ running, total, done }` **compté en mois**, plus le `ImportResult` partiel
  accumulé (le résumé se remplit au fil de l'eau plutôt que d'apparaître d'un coup à la fin).
- Le job n'a **pas de `cancel`** : le risque qu'il couvrirait (plage de 190 mois lancée par erreur)
  est traité avant le démarrage, côté UI.

### Formes de données

- `ImportResult` devient le résumé **de la plage** : les agrégats existants (`totalFetched`,
  `imported`, `alreadyPresent`, `byCategory`, `results`) restent **consolidés sur la plage**, et
  s'ajoute une liste ordonnée de `MonthlyImport`.
- `MonthlyImport` porte le strict nécessaire à la traçabilité : le mois, `imported`,
  `alreadyPresent`, et son état (réussi / échoué avec le message amont). Les agrégats riches ne
  sont **pas** dupliqués par mois.
- Le champ `message` actuel (« aucune partie trouvée ») se réévalue **à l'échelle de la plage**.
- Ces types sont partagés de fait entre `server/src/import` et `client/src/types` (duplication
  existante conservée, le projet n'a pas de package partagé).

### Client

- `runImport(params, onStatus)`, jumelle de `runAnalysis` : `POST` puis polling jusqu'à
  `running: false`, en notifiant chaque statut. **Fonction indépendante**, appelée par le
  formulaire, jamais inlinée.
- `ImportForm` : deux `<input type="month">` libellés « Du » / « Au », **tous deux préremplis au
  mois courant**. Le bouton reste « Import » — c'est le même geste.
- Au-delà de **24 mois** de plage, une **confirmation** est demandée avant de soumettre.
- Pendant l'Import, la progression déterminée remplace le `<progress>` indéterminé :
  « n/N mois importés ».
- `ImportSummary` affiche les totaux consolidés puis les lignes par mois, un mois en échec étant
  distingué **autrement que par la seule couleur** (le client n'a pas de feuille de style : style
  inline + repère textuel).

## Testing Decisions

**Ce qui fait un bon test ici** : il passe par l'interface publique (la fonction exportée, la route
HTTP, le composant rendu) et décrit un comportement observable par le Player — « un mois qui échoue
n'interrompt pas les suivants », pas « la boucle attrape l'exception ». Il doit survivre au
remaniement interne de `importRange` ou du job. Aucun test ne va lire la base directement pour
vérifier ce que l'interface expose déjà, et aucun ne touche l'API chess.com réelle.

### Coutures (validées avec le développeur)

| Couture | Nature | Prior art |
|---|---|---|
| `importRange(db, client, params)` | nouvelle — la plus haute pour la logique de plage | `server/test/import.test.ts` |
| `createImportJob(db, client)` | nouvelle — jumelle de `createAnalysisJob` | `server/test/analysis.test.ts` |
| `POST /api/import`, `GET /api/import/status` | existante (supertest sur `createApp`) | `server/test/api.test.ts` |
| `runImport(params, onStatus)` | nouvelle — jumelle de `runAnalysis`, `fetch` stubbé | `client/test/runAnalysis.test.ts` |
| `ImportForm` (jsdom) | existante | `client/test/GamesPage.test.tsx` |
| `ImportSummary` (jsdom) | existante, étendue aux lignes par mois | `client/test/ImportSummary.test.tsx` |

### Prérequis de fixture

Le `fakeClient` actuel est **dupliqué** dans `import.test.ts` et `api.test.ts` et **ignore
`year`/`month`** — il rend toujours le même tableau, ce qui ne permet pas de distinguer les mois
d'une plage. Il devient **indexé par `YYYY-MM`**, permettant de simuler un mois peuplé, un mois
vide et un mois qui lève, et il est factorisé dans `server/test/fixtures.ts` plutôt que dupliqué
une troisième fois.

### Place dans la pyramide

- **Unitaire / composant** : énumération des mois d'une plage (y compris à cheval sur une année),
  bornage au mois courant, plage inversée, agrégation des totaux, ligne par mois, échec d'un seul
  mois, single-flight du job, confirmation au-delà de 24 mois, rendu des lignes de résumé. Les cas
  d'erreur et de bord vivent **ici**, pas à l'apex.
- **Intégration (supertest)** : le contrat `202` + polling, le `404` synchrone sur username
  inconnu, le `400` sur plage inversée.
- **Apex agentique** : chaque issue porte son **Feature Path** exécutable, servant de garde
  d'auto-merge vers l'integration branch. Un serveur pointé sur une **archive de fixture** via
  `CHESSCOM_BASE_URL` (jamais l'API chess.com réelle, jamais le vrai Stockfish). Le parcours
  nominal — saisir une plage de plusieurs mois, suivre la progression, lire le résumé consolidé et
  les lignes par mois, retrouver les Games dans « Mes parties » — est **candidat à une promotion en
  Happy Path** au moment de la PR `integration → develop`. Le plafond de 3 HP s'applique : à
  arbitrer à ce moment-là, éventuellement en fusionnant avec un HP d'import existant plutôt qu'en
  ajoutant un quatrième.

## Out of Scope

- **Le raccourci « tout mon historique »** via `/pub/player/{u}/games/archives`. Reporté
  explicitement (ADR-0010) : il n'ajoute aucune capacité que la plage ne couvre déjà, et introduit
  une dépendance à un endpoint chess.com supplémentaire. Une fois la plage livrée, il se réduit à
  calculer les bornes et soumettre.
- **La sélection de mois arbitraires non contigus.** Écartée au grilling : besoin non constaté,
  UI nettement plus lourde.
- **Retry / backoff** sur un mois en échec. Le rejeu idempotent de la plage le remplace.
- **Annulation d'un Import en cours.**
- **Déclenchement automatique ou périodique** d'un Import : le glossaire le proscrit
  explicitement (« never automatic »).
- **Enchaîner l'analyse moteur sur les Games importées.** L'analyse reste une passe manuelle et
  séparée (ADR-0008).
- **Persistance de l'historique des Imports.** Le résumé est éphémère, lu par polling ; rien n'est
  stocké en base à son sujet.
- **Toute modification du schéma SQLite.** Aucune n'est nécessaire.

## Further Notes

- ADR-0010 **revient explicitement sur une remarque de portée d'ADR-0008**, qui opposait la passe
  d'analyse longue à l'« Import network-bound ». Une note a été ajoutée en tête d'ADR-0008. Les deux
  passes restent des opérations séparées ; elles partagent désormais une forme de transport.
- La factorisation éventuelle de `runImport` et `runAnalysis` en un helper start+poll commun est
  laissée ouverte : c'est un jugement à porter sur le code une fois les deux écrits, pas une
  décision d'architecture. Ne pas forcer l'abstraction prématurément.
- Le goulot d'étranglement d'une longue plage n'est probablement pas le réseau mais le mapping PGN
  et `recordMoveHabits`, synchrones et mono-thread. Si la durée devient un problème, c'est **là**
  qu'il faudra regarder — pas du côté de la parallélisation des `fetch`, écartée pour cette raison.
- Phase de dev (CLAUDE.md) : aucune compatibilité ascendante à préserver sur le contrat d'import,
  et réimporter est explicitement bon marché.
