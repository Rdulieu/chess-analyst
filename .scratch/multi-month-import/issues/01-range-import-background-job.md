# 01 — Import d'une plage de mois en job de fond, avec progression comptée en mois

Status: done

## Parent

`.scratch/multi-month-import/PRD.md` (US-9). Décisions : `docs/adr/0010-range-import-as-fault-tolerant-background-job.md`, glossaire `Import` / `Monthly import` dans `CONTEXT.md`.

**Branche** : cette sous-issue s'implémente sur l'integration branch de la story métier,
`integration/US-9-multi-month-import` — brancher depuis elle et y remerger, **pas** depuis
`develop`. Auto-merge dans l'integration branch une fois le check local vert (build + tests + FP
verte, aucun finding bloquant).

## What to build

Le tracer bullet de US-9 : l'`Import` cesse d'être scopé à un mois unique et couvre une **plage
contiguë** saisie par le Player, exécutée en **job de fond** dont la progression est comptée en
mois.

Le Player saisit un premier et un dernier mois — tous deux préremplis au mois courant, de sorte que
l'import de routine reste un seul clic — et lance l'Import. Les mois sont couverts **un par un,
dans l'ordre**. Pendant ce temps le Player voit une progression **déterminée** (« n/N mois
importés ») là où il n'avait qu'un indicateur indéterminé, et l'interface reste utilisable. À la
fin, il lit le **résumé consolidé sur la plage** : parties importées, déjà présentes, ventilation
par catégorie de cadence, bilan victoires/nuls/défaites.

Côté serveur, `importMonth` **garde sa responsabilité inchangée** (fetch, mapping, déduplication
par URL, persistance, `recordMoveHabits`) ; une nouvelle fonction **orchestre** la plage en
l'appelant séquentiellement et en agrégeant — elle ne réimplémente rien. Un job jumeau de celui de
l'analyse (`createAnalysisJob`) porte l'exécution : `POST /api/import` valide, démarre et rend
**202** avec le statut initial sans attendre ; `GET /api/import/status` rend le statut courant et
le résumé, qui **se remplit au fil de l'eau** plutôt que d'apparaître d'un coup. Le job est
**single-flight** : démarrer pendant qu'un Import tourne est ignoré et rend le statut courant. Une
exception imprévue est journalisée et termine le job proprement, sans jamais faire tomber le relais.

Côté client, une fonction indépendante `runImport` porte la boucle start+poll (jumelle de
`runAnalysis`), appelée par le formulaire — jamais inlinée.

Il n'y a **qu'un seul contrat d'import** : un mois isolé est une plage dont les bornes sont égales.
Le chemin mono-mois disparaît en tant que forme de requête distincte. Phase de dev — aucune
compatibilité ascendante à préserver.

Hors périmètre de cette tranche : les lignes par mois et la tolérance à l'échec d'un mois (issue
02), les garde-fous de saisie (issue 03).

## Acceptance criteria

- [ ] `POST /api/import` accepte une plage (`from`/`to` en année/mois) et l'ensemble de catégories de cadence, qui s'applique à toute la plage
- [ ] `POST /api/import` rend **202** avec le statut initial et **ne rend plus** le résultat de l'Import
- [ ] `GET /api/import/status` rend `running` / `total` / `done` **comptés en mois**, plus le résumé accumulé
- [ ] Les mois de la plage sont couverts **séquentiellement**, dans l'ordre, y compris à cheval sur un changement d'année
- [ ] Une plage à bornes égales importe exactement ce mois-là
- [ ] `importMonth` conserve sa responsabilité ; l'orchestration de la plage est une fonction distincte qui l'appelle, sans duplication de logique
- [ ] Le job est single-flight : un démarrage pendant un Import en cours est ignoré et rend le statut courant inchangé
- [ ] Une exception imprévue pendant la passe est journalisée, termine le job en `running: false`, et ne fait pas tomber le relais
- [ ] Le résumé consolide sur la plage entière : parties importées, déjà présentes, total récupéré, ventilation par cadence, bilan victoires/nuls/défaites
- [ ] Le message « aucune partie trouvée » se réévalue à l'échelle de la plage, pas d'un mois
- [ ] Le formulaire présente deux champs mois libellés « Du » / « Au », tous deux préremplis au mois courant ; le bouton reste « Import »
- [ ] Le nom d'utilisateur reste prérempli et mémorisé comme aujourd'hui
- [ ] La progression affichée est déterminée (n/N mois) et remplace l'indicateur indéterminé
- [ ] `runImport` est une fonction indépendante, testable seule, appelée par le formulaire
- [ ] Rejouer la même plage n'ajoute aucune Game en double (déduplication par URL) et le résumé le reflète en « déjà présentes »
- [ ] Les `Move habit` sont calculés pour les Games importées, comme avant
- [ ] Le `fakeClient` de test est indexé par `YYYY-MM` et factorisé dans les fixtures serveur plutôt que dupliqué
- [ ] Aucune modification du schéma SQLite
- [ ] Build + suite de tests verts

### Feature Path (FP)

1. Le Player saisit son nom d'utilisateur chess.com et une plage de trois mois, puis lance l'Import → l'Import démarre sans figer l'interface
2. Pendant l'exécution → une progression comptée en mois avance jusqu'au total de la plage
3. À la fin → un résumé consolidé affiche les parties importées, la ventilation par catégorie de cadence et le bilan victoires/nuls/défaites sur toute la plage
4. Le Player consulte « Mes parties » → les parties des trois mois y figurent
5. Le Player relance la même plage → aucune partie n'est ajoutée en double, et le résumé les décompte comme déjà présentes

Vérifier par l'UI d'abord. Serveur pointé sur une **archive de fixture** via `CHESSCOM_BASE_URL` — jamais l'API chess.com réelle.

## Blocked by

None - can start immediately.

## Comments

**2026-08-12 — implémentée et fusionnée dans `integration/US-9-multi-month-import`.**

13 cycles TDD (rouge → vert), 201 tests verts (108 serveur, 93 client), build et lint propres.

Écarts au plan, délibérés :
- `runImport` **rend** son statut final au lieu de le faire capturer par le callback — le résumé
  consolidé y vit, le faire transiter par une fermeture était gratuit (et TypeScript narrowait la
  variable capturée à `never`). `runAnalysis` garde son `void` : il n'a rien à rendre.
- `playerExists` est sorti de `importMonth` vers la route ; son test a suivi, d'`import.test.ts`
  vers `api.test.ts`, seul endroit où le 404 synchrone est observable.
- L'ancien test « 502 quand chess.com échoue » a disparu : avec le job, un mois qui lève n'a plus
  de réponse HTTP à teinter. Remplacé par « le relais reste répondant ». Le **rapport** de cet
  échec au Player est le sujet de l'issue 02.

**Feature Path : verte, 5/5**, jouée UI-first contre l'app lancée, chess.com remplacé par une
archive de fixture (2024-01 : 2 parties · 2024-02 : aucune · 2024-03 : 3 parties), base vierge.
Progression observée `0/3` → `3/3 mois importés` ; résumé `5 imported, 0 already present`,
Blitz 4 / Rapid 1, `3 W · 0 D · 2 L` ; rejeu de la plage → `0 imported, 5 already present`.
Le mois vide est traversé sans incident.

Finding fermé au passage : le finding non bloquant d'US-7 « le bouton Import reste actif pendant
un import » ne se reproduit plus (bouton désactivé pendant toute la passe, sondé au runtime).
Aucune erreur console.
