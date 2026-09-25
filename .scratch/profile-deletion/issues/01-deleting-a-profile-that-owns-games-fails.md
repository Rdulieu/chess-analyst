# 01 — Deleting a `Profile` that owns anything fails with a 500

Status: `needs-triage`

Found during the US-12 slice 01 Feature Path (2026-08-21), incidentally: the step needed a clean
database and tried to delete the reference `Profile` through the API. It is **not US-12's to fix** —
nothing in the Lichess import causes it and nothing there would fix it — and it is filed under its
own slug rather than left inside a US-12 slice so it does not die with that story.

The defect predates US-12: `deleteProfile` has not changed since US-11 slice 02, which is where a
`Profile` began owning rows.

## What happens

`DELETE /api/profiles/:id`, for a `Profile` that owns at least one `Game`, answers **500** with
express's default HTML error page carrying the raw driver message:

```
SqliteError: FOREIGN KEY constraint failed
    at deleteProfile (server/src/profiles/repository.ts:88)
    at server/src/routes/profiles.ts:96
```

Observed directly against the running relay, on a `Profile` holding 1 imported Game. A `Profile` that
owns nothing deletes fine (204) — which is why the suite is green: the only deletion test,
`DELETE /api/profiles/:id removes it, and answers 404 for one that never existed`
(`server/test/api.test.ts`), creates a `Profile` and deletes it without importing anything under it.

On screen, the Player has already confirmed an `alertdialog` that names the Profile and says
*« Cette action est définitive »*, then gets, in the page's error slot, the string
`client/src/api/profiles.ts` builds from a non-ok response: **`Failed to delete profile 1 (500)`** —
English, technical, and silent about the actual reason. The Profile is still there.

## Why the code expected otherwise

`server/src/profiles/repository.ts` says, in as many words:

> Nothing hangs off a Profile yet — the Games, habits and passes it will own arrive in later slices,
> and the deletion cascades to them there.

Those later slices arrived; the cascade did not. Three tables reference `profiles.id` today — `games`,
`move_habits`, `analysis_passes` — and none of them declares `onDelete`, so SQLite refuses the parent
row. A fourth table, `evaluations`, references `games.id`, so whatever removes a Profile's Games has
to account for their `Evaluation`s too.

That comment is the interesting part of this report: the code documents a guarantee it does not have,
which is exactly the kind of gap that reads as intentional to the next reader.

## What "fixed" would look like, roughly

- Deleting a `Profile` either **removes everything filed under it** (partitioning means those rows
  belong to nobody else — ADR-0014) or is **refused with a reason the Player can act on**. Both are
  defensible; picking is the triage decision, not this report's.
- Whichever is chosen, the refusal or the confirmation says what it is doing **before** the
  irreversible click, and no message reaches the Player as an English status code.
- The stale comment goes, in the same change.

**A deletion destroys `Evaluation`s, which nothing rebuilds** (ADR-0015, CLAUDE.md). If the answer is
"cascade", the confirmation dialog should say how much engine work is about to be lost — the number
of analyzed Games is already on the Profile's row — because "definitive" reads much cheaper than it
is. If the answer is "refuse", that is a decision to make Profiles undeletable in practice, since a
Profile is normally there to hold a history.

## Not in scope for whoever picks this up

Deleting individual Games, re-import after deletion, or any archive/export path. The finding is only
that deleting a `Profile` that owns rows fails, fails late (after the irreversible confirmation), and
fails in the driver's words rather than ours.

---

## Reconfirmé le 2026-09-25, inchangé

Redécouvert en aveugle par le path 0 de la suite HP d'US-32 (branche
`integration/US-32-phase-and-material`, HEAD `5c3c320`) : l'agent, ayant besoin de recréer
`Metalyst`, a tenté de le supprimer et a obtenu `Failed to delete profile 3 (500)` à l'écran, avec
`SqliteError: FOREIGN KEY constraint failed` côté serveur. Reproduit deux fois, par l'UI et par un
`DELETE /api/profiles/3` direct, sur un `Profile` de **351 parties**.

Rien n'a bougé depuis le premier relevé : `games.profileId` (`server/src/db/schema.ts:43-45`)
référence `profiles.id` **sans `onDelete`**, là où `personalAnalyses` (lignes 280-283) en déclare
un — la comparaison est dans le même fichier. Et le commentaire de `deleteProfile` promet toujours
une cascade qui n'existe pas.

**Ce n'est pas un bloquant d'US-32** et ça ne doit pas retenir la PR #131 : aucune tranche de la
story ne touche à la suppression de `Profile`, le défaut est antérieur de plus d'un mois, et la
décision qu'il attend — **cascader ou refuser avec une raison** — appartient au demandeur. Noté ici
plutôt que dans les tranches d'US-32 pour la même raison qu'en août : pour qu'il ne meure pas avec
une story.

Deux choses que la reconfirmation ajoute :

- **Le coût de la cascade est maintenant chiffrable** et il a grossi : `Metalyst` porte 351 parties
  dont 11 analysées, `DudulSmash` 186 dont **66**. Une cascade détruirait des `Evaluation`s que
  seul du temps moteur reconstruit (ADR-0015) — le dialogue devra dire combien.
- **Le défaut a un coût opérationnel, mesuré** : ne pouvant pas supprimer le `Profile`, l'agent a
  dû effacer sa base d'essai et rejouer quatre étapes, ce qui a coûté un export Lichess
  supplémentaire et a privé le run d'une mesure propre du total de scénario.
