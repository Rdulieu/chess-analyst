# 02 — Ligne par mois et tolérance à l'échec d'un mois

Status: ready-for-agent

## Parent

`.scratch/multi-month-import/PRD.md` (US-9). Décisions : `docs/adr/0010-range-import-as-fault-tolerant-background-job.md`, terme `Monthly import` dans `CONTEXT.md`.

**Branche** : sous-issue implémentée sur `integration/US-9-multi-month-import` — brancher depuis
elle et y remerger, **pas** depuis `develop`. Auto-merge après check local vert (build + tests + FP
verte, aucun finding bloquant).

## What to build

Rendre l'`Import` sur une plage **traçable et tolérant à un mois défaillant**.

Aujourd'hui (après l'issue 01) le résumé ne dit que des totaux : un mois à zéro partie est
invisible, et rien ne distingue « je n'ai pas joué en mars » de « chess.com n'a pas répondu pour
mars ». Cette tranche introduit le `Monthly import` : **une ligne par mois**, dans l'ordre,
portant ce que ce mois a apporté (importées, déjà présentes) et **son état** — couvert, ou en
échec avec la raison remontée de chess.com.

Un mois qui échoue (chess.com injoignable, 5xx, rate-limit) **n'interrompt plus l'Import** :
l'échec est capturé, porté sur la ligne de ce mois, et les mois suivants sont quand même couverts.
Le job se termine normalement, **sans état d'échec global** — un Import dont la plupart des mois
ont réussi n'est pas un Import raté, et les lignes portent déjà le verdict. Les totaux consolidés
ne comptent que ce qui est réellement passé.

**Aucun retry, aucun backoff** : la déduplication par URL rend l'Import idempotent, donc la
récupération consiste à **rejouer la même plage** — seuls les mois manquants sont réellement
importés. C'est une décision arbitrée en ADR-0010, ne pas la réintroduire.

Les lignes s'accumulent **au fil de l'eau** dans le statut, pas seulement à la fin. Un mois en
échec doit être distinguable **autrement que par la seule couleur** : le client n'a pas de feuille
de style, donc style inline **plus** un repère textuel.

## Acceptance criteria

- [ ] Le statut de l'Import porte une liste ordonnée de lignes par mois, alimentée au fil de l'eau
- [ ] Chaque ligne porte son mois, les parties importées, les parties déjà présentes, et son état
- [ ] Une ligne en échec porte la raison remontée de l'appel amont
- [ ] Un mois qui lève n'interrompt pas la passe : les mois suivants sont couverts
- [ ] Le job se termine en `running: false` sans état d'échec global, même avec un ou plusieurs mois en échec
- [ ] Les totaux consolidés n'agrègent que les mois effectivement couverts
- [ ] Un mois sans partie (Player inactif) est rapporté à zéro, comme un mois normal, et reste distinguable d'un mois en échec
- [ ] Aucun retry ni backoff n'est introduit
- [ ] Rejouer la plage après un échec partiel importe les mois manquants et rien d'autre
- [ ] Les agrégats riches (ventilation par cadence, bilan victoires/nuls/défaites) restent consolidés et **ne sont pas** dupliqués par mois
- [ ] Le résumé affiche les totaux consolidés puis les lignes par mois, dans l'ordre
- [ ] Un mois en échec est signalé par un repère non chromatique en plus du style inline
- [ ] Build + suite de tests verts

### Feature Path (FP)

1. Le Player lance un Import sur une plage dont un mois est injoignable → l'Import va jusqu'au bout de la plage au lieu de s'arrêter
2. À la fin → le résumé liste chaque mois de la plage avec ce qu'il a apporté
3. Le Player regarde les lignes → le mois en échec est identifiable comme tel, et se distingue d'un mois où il n'a simplement pas joué
4. Le Player regarde les totaux → ils ne comptent que les mois effectivement couverts, et l'Import n'est pas présenté comme un échec
5. Le Player relance la même plage, le mois défaillant étant redevenu joignable → ce mois est rattrapé, les autres sont décomptés comme déjà présents

Vérifier par l'UI d'abord. Archive de fixture via `CHESSCOM_BASE_URL`, avec un mois configuré pour échouer — jamais l'API chess.com réelle.

## Blocked by

- `.scratch/multi-month-import/issues/01-range-import-background-job.md`
