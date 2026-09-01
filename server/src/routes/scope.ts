import { eq } from "drizzle-orm";
import type { Request, Response } from "express";
import type { Db } from "../db";
import { games, type Game, type Profile } from "../db/schema";
import { findProfileById } from "../profiles/repository";

/**
 * The `Profile` a scoped read is **about**, taken from the request itself
 * (ADR-0014). Scoping is carried **explicitly**: the server holds no current
 * Profile, so an answer is only ever the answer to a question that named one.
 *
 * A request naming **no** Profile, or an **unknown** one, is refused —
 * `undefined` here, the refusal already written to the response. Answering it
 * over every row is the silent failure this whole story exists to remove: the
 * figures would be a blend of two players' histories, and nothing on screen
 * would say so.
 *
 * The two refusals are told apart on purpose: a missing parameter is a caller
 * that forgot to name a Profile (400), an unknown id is a caller naming one
 * that is not there — deleted, or from another database (404).
 */
export function scopedProfile(db: Db, req: Request, res: Response): Profile | undefined {
  const raw = req.query.profileId;
  if (typeof raw !== "string" || raw.trim() === "") {
    res.status(400).json({ error: "Aucun profil indiqué : cette réponse serait celle de personne." });
    return undefined;
  }
  const profile = findProfileById(db, Number(raw));
  if (profile === undefined) {
    res.status(404).json({ error: `Profil introuvable : ${raw}` });
    return undefined;
  }
  return profile;
}

/**
 * The `Game` a scoped read is about, once the `Profile` has vouched for it: the
 * request names a Profile, and the Game must be **that Profile's**.
 *
 * The second half is what `scopedProfile` alone cannot do. Naming a Profile
 * makes an answer attributable; it does not make it *true*. A Game reached by
 * id alone came back whoever asked — one Player's Game under another's name,
 * with nothing in the answer saying so (ADR-0014: nothing is ever shared across
 * Profiles).
 *
 * The refusal is a **404 and not a 403**: from the caller's Profile, the Game
 * genuinely is not there. Saying "forbidden" would assert the Game exists
 * somewhere, which is a fact about another Player's history and none of this
 * caller's business.
 *
 * `undefined` here, the refusal already written to the response — the same
 * contract `scopedProfile` has, so a route reads as one guard clause.
 */
export function scopedGame(db: Db, req: Request, res: Response): Game | undefined {
  const profile = scopedProfile(db, req, res);
  if (!profile) return undefined;

  const id = Number(req.params.gameId ?? req.params.id);
  const game = Number.isInteger(id)
    ? db.select().from(games).where(eq(games.id, id)).get()
    : undefined;
  // An unknown id and another Profile's Game are **one** refusal on purpose:
  // telling them apart would answer "this Game exists, just not for you", which
  // is exactly the leak across Profiles the partition forbids.
  if (!game || game.profileId !== profile.id) {
    res.status(404).json({ error: `Partie introuvable pour ce profil : ${req.params.gameId ?? req.params.id}` });
    return undefined;
  }
  return game;
}
