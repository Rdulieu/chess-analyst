import type { Request, Response } from "express";
import type { Db } from "../db";
import type { Profile } from "../db/schema";
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
