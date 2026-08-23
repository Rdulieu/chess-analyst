/**
 * The **`PlatformClient` port** (ADR-0018): the only thing the Import knows
 * about the outside world. It answers in **our** vocabulary — no caller ever
 * sees a chess.com or Lichess payload. Each `Platform` owns an adapter under
 * ./<platform>/ that does the translation, so adding a third one is a directory
 * and no edit to the import module.
 */

/** The site a `Profile`'s account lives on (CONTEXT.md, ADR-0014). */
export type Platform = "chesscom" | "lichess";

/** How a Platform is named to the Player — never spelled in place. */
const PLATFORM_LABELS: Record<Platform, string> = {
  chesscom: "chess.com",
  lichess: "lichess.org",
};

/** The Platform's own name, for a message or a label the Player reads. */
export function platformLabel(platform: Platform): string {
  return PLATFORM_LABELS[platform];
}

/**
 * The pace of play a Game was played at (CONTEXT.md, "Time control category").
 * **Five values, ours** — not chess.com's four: `classical` has no honest home
 * anywhere else (folded into `rapid` it averages a 10-minute game with a
 * 60-minute one), and `correspondence` is the game's own word for what
 * chess.com calls `daily`, the one that survives now that chess.com is not the
 * only Platform.
 */
export type TimeControlCategory =
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "correspondence";

/** The five categories, in increasing order of time per move. */
export const TIME_CONTROL_CATEGORIES: TimeControlCategory[] = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
  "correspondence",
];

/**
 * An account on a Platform, reduced to what a `Profile` needs: the **canonical
 * username**, spelled the way the Platform itself spells it.
 */
export interface PlatformAccount {
  username: string;
}

/**
 * One game as the Platform gave it, already translated into the Player-relative
 * shape a `Game` is stored in — everything but the `Profile` that owns it. The
 * translation (side, result, date, pace, opening) belongs to the adapter; what
 * remains for the Import is filing it under a Profile.
 */
export interface ImportedGame {
  gameUrl: string;
  pgn: string;
  opponent: string;
  playerColor: "white" | "black";
  result: "win" | "loss" | "draw";
  date: string;
  timeControlCategory: TimeControlCategory;
  eco: string;
  openingName: string;
}

/**
 * One month as the Platform answered it. `totalFetched` is **everything the
 * Platform returned** — out-of-scope games (variants, and whatever else the
 * adapter drops) included — so the summary's headline figure keeps meaning
 * "what the Platform had", not "what we kept".
 */
export interface MonthFetch {
  totalFetched: number;
  games: ImportedGame[];
}

/**
 * What a fetch can tell its caller **while it is still running**. Today that is
 * one thing: it is waiting on the Platform rather than working. A minute of
 * silence reads as a freeze, so the wait has to be sayable — and it is the
 * adapter, the only thing that knows a Platform asked us to wait, that says it.
 */
export interface FetchHooks {
  onWaiting?(message: string): void;
}

export interface PlatformClient {
  /**
   * The account behind this username, or `null` when the Platform does not know
   * it. **Throws** when the Platform cannot be reached or answers an error — a
   * caller must be able to tell "this account does not exist" from "I could not
   * ask", since only the first is the user's mistake (US-11).
   */
  fetchPlayer(username: string): Promise<PlatformAccount | null>;
  /** The account's games for the given year/month (empty when none). */
  fetchMonth(
    username: string,
    year: number,
    month: number,
    hooks?: FetchHooks,
  ): Promise<MonthFetch>;
}

/**
 * The clients the app was wired with, one per supported Platform. Partial on
 * purpose: a Platform the `Profile` type admits may not have an adapter yet, and
 * the caller must say so rather than guess (see `clientFor`).
 */
export type PlatformRegistry = Partial<Record<Platform, PlatformClient>>;

/** Raised when a Profile names a Platform this build has no adapter for. */
export class UnsupportedPlatformError extends Error {
  constructor(readonly platform: Platform) {
    super(`Plateforme non prise en charge : ${platformLabel(platform)}`);
    this.name = "UnsupportedPlatformError";
  }
}

/** The client for this Platform, or a loud failure — never a silent fallback. */
export function clientFor(registry: PlatformRegistry, platform: Platform): PlatformClient {
  const client = registry[platform];
  if (client === undefined) throw new UnsupportedPlatformError(platform);
  return client;
}
