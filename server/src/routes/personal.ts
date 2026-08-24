import { Router } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games } from "../db/schema";
import { getPersonalAnalysis, writeMark, type MarkPatch } from "../personal/repository";
import { isDeclaredSeverity } from "../personal/severity";
import { scopedProfile } from "./scope";

/**
 * The `Personal analysis` routes (mounted at /api/personal) — the Player's own
 * reading of one Game (CONTEXT.md, ADR-0019).
 *
 * Every route is **scoped to the `Profile`** through the shared mechanism
 * (ADR-0014) *and* checks that the named Game is that Profile's: a reading is
 * filed where the Game it reads is filed, so reaching one Player's Game under
 * another's name is refused rather than silently answered. That refusal is a
 * 404 on the Game and not a 403: from the caller's Profile, the Game genuinely
 * is not there.
 *
 * Nothing here comes from the engine, so there is no `Search regime` in sight
 * and no analysis is required — a Game is readable the moment it is imported.
 */
export function createPersonalRouter(db: Db): Router {
  const router = Router();

  /** The Game this request is about, once the Profile has vouched for it. */
  const scopedGame = (
    req: Parameters<Parameters<Router["get"]>[1]>[0],
    res: Parameters<Parameters<Router["get"]>[1]>[1],
  ): { gameId: number } | undefined => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return undefined;
    const gameId = Number(req.params.gameId);
    const game = Number.isInteger(gameId)
      ? db.select().from(games).where(eq(games.id, gameId)).get()
      : undefined;
    if (!game || game.profileId !== profile.id) {
      res.status(404).json({ error: `Partie introuvable pour ce profil : ${req.params.gameId}` });
      return undefined;
    }
    return { gameId };
  };

  router.get("/:gameId", (req, res) => {
    const scoped = scopedGame(req, res);
    if (!scoped) return;
    res.json(getPersonalAnalysis(db, scoped.gameId));
  });

  router.put("/:gameId/marks/:ply", (req, res) => {
    const scoped = scopedGame(req, res);
    if (!scoped) return;
    const ply = Number(req.params.ply);
    if (!Number.isInteger(ply) || ply < 0) {
      res.status(400).json({ error: `Coup invalide : ${req.params.ply}` });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { declaredSeverity, note } = body;
    // The five values are the vocabulary (CONTEXT.md); anything else is a caller
    // bug, refused rather than stored as a sixth severity nothing can read.
    if (declaredSeverity !== undefined && declaredSeverity !== null && !isDeclaredSeverity(declaredSeverity)) {
      res.status(400).json({ error: `Verdict inconnu : ${String(declaredSeverity)}` });
      return;
    }
    // A `Note` is free text (CONTEXT.md) — free, but text. Anything else is a
    // caller bug; `null` is how a Note is taken back, and is not one.
    if (note !== undefined && note !== null && typeof note !== "string") {
      res.status(400).json({ error: "Une note est du texte." });
      return;
    }
    // Only the fields the request actually named are passed on: a field the
    // caller left out must be left as it was, and one it sent as `null` is a
    // deliberate erasure. Collapsing the two would make erasing impossible.
    const patch: MarkPatch = {};
    if ("declaredSeverity" in body) patch.declaredSeverity = declaredSeverity as MarkPatch["declaredSeverity"];
    if ("note" in body) patch.note = note as MarkPatch["note"];
    res.json(writeMark(db, scoped.gameId, ply, patch));
  });

  return router;
}
