# 05 — path 0 asks once, and the gain is a figure

Status: done

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

Amend `path 0` so the suite can tell this story shipped from it not having shipped, and so US-18
starts from a **measurement** instead of a deduction.

- **The reference span does not move.** `Metalyst` stays at **2017-10 → 2023-08**, its full 71
  months. `docs/test-scenarios/README.md`'s "do not shorten its span" rule is **not** reopened:
  US-17 removes the cost without removing the assertion the 51 empty months carry. That assertion is
  in fact now **better** tested — it used to check that 51 requests each answered empty, which is
  nearly tautological; it now checks that **slicing one stream into months** produces 51 zero lines,
  which is new code.
- **path 0 asserts the request count**: one export request for the whole range, not 71. Without this,
  nothing in the suite distinguishes US-17 delivered from US-17 undelivered.
- **path 0's duration is measured and reported**, against the reference (~3.5 min for the Lichess
  import, of which ~2.4 min was pure waiting across six one-minute pauses). The report must give the
  **measured duration and the delta**, not "it is faster".

This last point is the deliverable US-18 is waiting on: its entry says plainly that its figures are
**deduced, not measured**, so this slice hands it its first real datum.

## Acceptance criteria

- [x] `path 0` still builds the three reference Profiles across two Platforms, unchanged.
- [x] `Metalyst` is still imported over its full 71-month span, with **51 months at zero**.
- [x] The scenario asserts the Lichess import cost **one** export request.
- [x] The scenario's duration is measured and reported, with the delta against the reference figures.
- [x] The precondition no longer claims Lichess refuses IPv6 (corrected in slice 03 — verify it took).
- [x] The suite still holds at **three** HP; no fourth journey is added.
- [x] The report distinguishes the Lichess import's own duration from the scenario's total, so US-18
      can attribute the gain.

### Feature Path (FP)

1. Run `path 0` end to end against the real Lichess → the three Profiles and both histories are in
   place, `Metalyst` over its 71 months with **51 at zero**.
2. The Lichess import cost **one** export request.
3. No minute-long pause occurred.
4. The run's duration is **measured and reported**, with its gap to the reference.
5. The two chess.com Profiles are unaffected, and the scoping assertions still hold.

Verify: UI first — the import summary and the Profiles screens, as path 0 already does.

## Blocked by

- `.scratch/lichess-fetch-window/issues/04-an-interruption-says-where-it-stopped.md`

## Comments

**2026-08-24 — implémentée et fusionnée dans `integration/US-17-lichess-fetch-window`.**

Tranche de documentation : `path-0-bootstrap.md` et une règle de `README.md`. Rien à tester en
dessous ; sa vérification est le run de path 0 lui-même.

**Le travail de fond a été l'instrument.** Deux candidats auraient menti, et c'est mesuré :
- **compter les connexions** rapporte **1** pour une rafale de 71 requêtes — l'agent global de Node
  garde les connexions vivantes. Exactement le faux vert que l'assertion existe pour empêcher ;
- **`NODE_DEBUG=http`**, essayé sur le code sous test : trois requêtes d'export successives émettent
  **une** ligne `call onSocket` et **une** `createConnection`. Incomptable.

Retenu : un **proxy inverse journalisant** devant Lichess, `LICHESS_BASE_URL` pointé dessus. Le
contrat testé reste le vrai (vraie API, vrai ndjson, vrai throttle), seule l'URL de base bouge — un
bouton déjà supporté. Bonus décisif : son journal donne la durée **propre** de l'import, que le
chrono d'une étape pilotée par l'UI ne peut pas donner. Les deux instruments rejetés sont consignés
**avec la mesure qui les rejette**, pour que le prochain run ne les re-dérive pas.

**Feature Path : verte, 5/5**, contre les vraies API chess.com et Lichess.

| Figure | Référence (71 requêtes) | Mesuré | Delta |
|---|---|---|---|
| Requêtes d'export | 71 | **1** | −70 |
| Pauses d'une minute | 6 | **0** | −6 |
| Import Lichess, durée propre | ~210 s | **33,571 s** | **−176 s, ~6,3×** |
| dont attente | ~144 s | **0 s** | −144 s |

`Metalyst` sur 2017-10 → 2023-08 : **71 lignes de mois, dans l'ordre, 51 à zéro** — vérifié
programmatiquement contre une séquence de mois générée, pas à l'œil. Toutes les figures consignées
reproduites **à l'identique** (403 récupérées, 351 importées, 38 `classical`, 37 `correspondence`,
20 mois peuplés, 51 à zéro) : aucune dérive, rien à relire. Aucun `429`, l'export unique répond
`200` en 52 ms d'en-têtes pour 653 896 octets. Scoping intact : 82 sur le profil 1, 351 sur le 3,
**aucune** sur le 2.

**Le texte était-il exécutable tel quel ?** Oui, suivi littéralement, sans déviation — et le run a
trouvé deux manques, corrigés dans la tranche (`4d1fb60`) : « une ligne par requête » suffit à
compter mais pas à chronométrer (il en faut trois : requête, en-têtes, fin), et le proxy doit poser
`Host: lichess.org` sur le saut sortant. Pour une tranche de documentation, un texte qu'on ne peut
pas suivre tel qu'écrit **est** le défaut.

Le chiffre est désormais **dans le dépôt**, pas seulement dans un corps de PR : c'est le premier
datum réel d'US-18, dont l'entrée dit noir sur blanc que ses chiffres sont déduits.

Findings, **aucun bloquant** :
- Le **total du scénario n'est pas une mesure propre** sur ce run : la session pilotante a été
  interrompue entre les étapes 6 et 7, son horloge murale contient du temps mort et un redémarrage.
  Rapporté comme approximatif plutôt que reconstruit. La durée de l'import n'en souffre pas (journal
  du proxy, entièrement avant l'interruption) et n'a pas à être repayée pour obtenir un total.
- Le `window.confirm` des 71 mois a été re-signalé par le pilote ~2 min plus tard, à la navigation
  suivante. Re-mesuré : **toujours une seule** requête d'export, donc aucun second import déclenché.
  Jugé artefact du pilote — **déduit, pas mesuré**, le handler n'a pas été instrumenté.
- L'arrêt brutal a laissé 2,5 Mo de `.db` à côté de **4,1 Mo de `-wal`** — exactement ce dont la
  section *Backing store* prévient. `wal_checkpoint(TRUNCATE)` a tout récupéré, vérifié par
  relecture. L'avertissement du scénario est juste et porteur : consigné comme confirmation.
