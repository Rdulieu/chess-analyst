import { Router } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games } from "../db/schema";
import {
  getPersonalAnalysis,
  writeMark,
  sealAnalysis,
  SealRefusal,
  type MarkPatch,
} from "../personal/repository";
import { isDeclaredSeverity } from "../personal/severity";
import { confrontGame, ConfrontationRefusal } from "../personal/confrontation";
import { getGameAnnotations } from "../annotations/repository";
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

  /**
   * The `Confrontation` of one Game (US-16b) — the sealed reading set against
   * what the engine found. **A join** (ADR-0019), computed on the spot from rows
   * two other routes already serve: nothing here is stored, so retuning a
   * threshold retunes this with no re-analysis (ADR-0009).
   *
   * Its two refusals are **409s, named apart**, never a 404: the Game is there,
   * and the Player has two different things to go and do — seal, or analyse.
   */
  router.get("/:gameId/confrontation", (req, res) => {
    const scoped = scopedGame(req, res);
    if (!scoped) return;
    const annotations = getGameAnnotations(db, scoped.gameId);
    const analysis = getPersonalAnalysis(db, scoped.gameId);
    // `scopedGame` already vouched for the Game, so neither can be absent here.
    if (!annotations || !analysis) {
      res.status(404).json({ error: "Partie introuvable." });
      return;
    }

    const confrontation = confrontGame(analysis, annotations);
    if (confrontation instanceof ConfrontationRefusal) {
      res
        .status(409)
        .json({ reason: confrontation.reason, error: CONFRONTATION_REFUSAL[confrontation.reason] });
      return;
    }
    res.json(confrontation);
  });

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
    const { declaredSeverity, note, keyMoment } = body;
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
    // A `Key moment` is posed or it is not (CONTEXT.md): there is no third state,
    // so anything but a boolean is a caller bug rather than a value to coerce.
    if (keyMoment !== undefined && typeof keyMoment !== "boolean") {
      res.status(400).json({ error: "Un moment clé est posé ou ne l'est pas." });
      return;
    }
    // Only the fields the request actually named are passed on: a field the
    // caller left out must be left as it was, and one it sent as `null` is a
    // deliberate erasure. Collapsing the two would make erasing impossible.
    const patch: MarkPatch = {};
    if ("declaredSeverity" in body) patch.declaredSeverity = declaredSeverity as MarkPatch["declaredSeverity"];
    if ("note" in body) patch.note = note as MarkPatch["note"];
    if ("keyMoment" in body) patch.keyMoment = keyMoment as boolean;
    res.json(writeMark(db, scoped.gameId, ply, patch));
  });

  /**
   * **Sealing** — *this is my reading, now show me the engine*. There is
   * deliberately **no counterpart**: nothing here unseals, and no route rewrites
   * `sealedAt`, because a reading that could be reopened would no longer be what
   * the Player had written.
   *
   * The two refusals are **explicit business errors** (409) rather than silent
   * no-ops: both are things the Player has to be told, and told the reason for.
   */
  router.post("/:gameId/seal", (req, res) => {
    const scoped = scopedGame(req, res);
    if (!scoped) return;
    const { engineSeen } = (req.body ?? {}) as Record<string, unknown>;
    // Not optional, and with no safe default: quietly recording "not seen" would
    // let a caller launder an informed reading into a blind one, which is exactly
    // the honesty this flag exists for.
    if (typeof engineSeen !== "boolean") {
      res.status(400).json({ error: "Il faut dire si le moteur avait déjà été montré." });
      return;
    }

    const sealed = sealAnalysis(db, scoped.gameId, { engineSeen });
    if (sealed instanceof SealRefusal) {
      res.status(409).json({ reason: sealed.reason, error: SEAL_REFUSAL[sealed.reason] });
      return;
    }
    res.json(sealed);
  });

  return router;
}

/**
 * What each refusal to confront is told to the Player. **Two sentences, because
 * there are two roads**: one goes back to the reading to seal it, the other
 * launches an `Analysis pass`. A single message would leave the Player guessing.
 */
const CONFRONTATION_REFUSAL: Record<ConfrontationRefusal["reason"], string> = {
  "not-sealed":
    "Cette lecture n'est pas encore scellée : il n'y a rien de figé à confronter. Retournez à votre lecture et scellez-la quand elle vous convient.",
  "not-analyzed":
    "Cette partie n'a pas été analysée : le moteur n'a rien dit dont on puisse rapprocher votre lecture. Lancez son analyse depuis la page Analyse.",
};

/** What each refusal is told to the Player — its reason, in their own terms. */
const SEAL_REFUSAL: Record<SealRefusal["reason"], string> = {
  empty:
    "Cette lecture est vide : il n'y a rien à confronter. Posez au moins un verdict, une note ou un moment clé.",
  "already-sealed":
    "Cette lecture est déjà scellée, et une lecture scellée le reste : ce qui sera confronté est ce que vous aviez écrit.",
  "no-such-game": "Partie introuvable.",
};
