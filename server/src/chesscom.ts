/**
 * The chess.com public API surface this app depends on. Kept as a narrow
 * interface (ChessComClient) so the import logic can be driven by a fake in
 * tests and by a real fetch-based client at runtime (ADR-0002: the relay is the
 * only thing that talks to chess.com).
 */

export type TimeControlCategory = "bullet" | "blitz" | "rapid" | "daily";

/** One side (white/black) of a chess.com game. */
export interface ChessComPlayerSide {
  username: string;
  /** Result code: "win", or a loss/draw code ("checkmated", "resigned", "agreed", …). */
  result: string;
}

/** A game as returned by chess.com's monthly-archive endpoint (fields we use). */
export interface ChessComGame {
  url: string;
  pgn: string;
  time_class: TimeControlCategory;
  /** Game variant: "chess" for standard, "chess960" etc. otherwise. */
  rules: string;
  /** Game-end timestamp, seconds since the Unix epoch. */
  end_time: number;
  white: ChessComPlayerSide;
  black: ChessComPlayerSide;
}

/**
 * A chess.com member, reduced to what a `Profile` needs: the **canonical
 * username**, spelled the way chess.com spells it. The public endpoint answers
 * `username` lowercased and keeps the member's own casing in `url`
 * (`.../member/DudulSmash`), so that segment is the canonical spelling.
 */
export interface ChessComPlayer {
  username: string;
}

export interface ChessComClient {
  /**
   * The member behind this username, or `null` when chess.com does not know it.
   * **Throws** when chess.com cannot be reached or answers an error — a caller
   * must be able to tell "this account does not exist" from "I could not ask",
   * since only the first is the user's mistake (US-11).
   */
  fetchPlayer(username: string): Promise<ChessComPlayer | null>;
  /** The player's games for the given year/month (empty when none). */
  fetchMonth(username: string, year: number, month: number): Promise<ChessComGame[]>;
}

const DEFAULT_BASE_URL = "https://api.chess.com";

/**
 * The member's own spelling, read off the profile `url`'s last segment; falls
 * back to the `username` field when the payload carries no url.
 */
function canonicalUsername(body: { username?: string; url?: string }): string | undefined {
  const fromUrl = body.url?.split("/").filter(Boolean).pop();
  return fromUrl || body.username;
}

/**
 * The real chess.com client, talking to the public Published-Data API over
 * HTTP. `baseUrl` is configurable (env `CHESSCOM_BASE_URL`, default the live API)
 * so tests and the agentic Feature Path can point it at a fixture archive.
 */
export function createHttpChessComClient(
  baseUrl: string = process.env.CHESSCOM_BASE_URL ?? DEFAULT_BASE_URL,
): ChessComClient {
  const root = baseUrl.replace(/\/$/, "");
  return {
    async fetchPlayer(username) {
      const res = await fetch(`${root}/pub/player/${encodeURIComponent(username)}`);
      if (res.status === 404) return null; // chess.com does not know this account
      if (!res.ok) throw new Error(`chess.com request failed (${res.status})`);
      const body = (await res.json()) as { username?: string; url?: string };
      return { username: canonicalUsername(body) ?? username };
    },
    async fetchMonth(username, year, month) {
      const mm = String(month).padStart(2, "0");
      const res = await fetch(`${root}/pub/player/${encodeURIComponent(username)}/games/${year}/${mm}`);
      if (res.status === 404) return []; // no archive that month
      if (!res.ok) throw new Error(`chess.com request failed (${res.status})`);
      const body = (await res.json()) as { games?: ChessComGame[] };
      return body.games ?? [];
    },
  };
}
