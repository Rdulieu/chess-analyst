import type { Db } from "../db";
import { games, type NewGame, type UnownedGame } from "../db/schema";
import { parseOpening } from "../import/opening";

/**
 * Deterministic `Weak opening` fixture dataset (ADR-0007): a handful of short
 * Games whose PGNs carry **real chess.com `[ECO]`/`[ECOUrl]` headers**, so the
 * openings are resolved through the very same `parseOpening` the real import
 * uses (one logic, two entry points — cf. ADR-0005). It spans several openings
 * across both sides and several cadences, with at least one **weak** opening
 * (Win rate < 50%), one **strong** one, a **50%** boundary case (not
 * highlighted), and one **unclassified** Game (no `[ECO]`) feeding the catch-all
 * **Other** entry. This is the offline substrate the Feature Path runs against;
 * it never touches the network.
 *
 * Expected entries (sorted by game count desc):
 *   Sicilian Defense Alapin Variation · B22 — Blancs, blitz — 3 games (1W/2L) → 33%  [weak]
 *   Italian Game · C50                       — Blancs, rapid — 2 games (2W)    → 100% [strong]
 *   French Defense · C00                     — Noirs,  blitz — 2 games (1W/1L) → 50%  [boundary]
 *   Autre / non classée · other              — Blancs, bullet — 1 game (1L)    → 0%   [weak, Other]
 */

type Result = NewGame["result"];
type Cadence = NewGame["timeControlCategory"];

function pgn(headers: [string, string][], moves: string): string {
  return [...headers.map(([k, v]) => `[${k} "${v}"]`), "", moves].join("\n");
}

let seq = 0;
function fixtureGame(
  pgnText: string,
  playerColor: NewGame["playerColor"],
  result: Result,
  cadence: Cadence,
): UnownedGame {
  const { eco, openingName } = parseOpening(pgnText);
  const ref = `g${seq++}`;
  return {
    gameUrl: `fixture://openings/${ref}`,
    pgn: pgnText,
    opponent: `opponent-${ref}`,
    playerColor,
    result,
    date: "2026-01-01",
    timeControlCategory: cadence,
    eco,
    openingName,
  };
}

const sicilian = (result: Result) =>
  fixtureGame(
    pgn(
      [
        ["ECO", "B22"],
        ["ECOUrl", "https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation"],
      ],
      "1. e4 c5 2. c3 d5 3. exd5 Qxd5",
    ),
    "white",
    result,
    "blitz",
  );

const italian = (result: Result) =>
  fixtureGame(
    pgn(
      [
        ["ECO", "C50"],
        ["ECOUrl", "https://www.chess.com/openings/Italian-Game"],
      ],
      "1. e4 e5 2. Nf3 Nc6 3. Bc4",
    ),
    "white",
    result,
    "rapid",
  );

const french = (result: Result) =>
  fixtureGame(
    pgn(
      [
        ["ECO", "C00"],
        ["ECOUrl", "https://www.chess.com/openings/French-Defense"],
      ],
      "1. e4 e6 2. d4 d5",
    ),
    "black",
    result,
    "blitz",
  );

// No [ECO] header → resolved to the Other opening.
const unclassified = (result: Result) =>
  fixtureGame(pgn([["Event", "Live Chess"]], "1. e4 e5"), "white", result, "bullet");

export const OPENINGS_FIXTURE: UnownedGame[] = [
  sicilian("win"),
  sicilian("loss"),
  sicilian("loss"),
  italian("win"),
  italian("win"),
  french("win"),
  french("loss"),
  unclassified("loss"),
];

/**
 * Seeds the `Weak opening` fixture dataset. Idempotent: Games already present
 * (unique game URL) are skipped, so re-seeding never duplicates.
 */
export function seedOpenings(db: Db, profileId: number): void {
  for (const game of OPENINGS_FIXTURE) {
    db.insert(games).values({ ...game, profileId }).onConflictDoNothing().run();
  }
}
