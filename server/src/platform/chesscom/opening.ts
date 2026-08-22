/**
 * Resolves a Game's `Opening` (see CONTEXT.md) from its PGN, trusting
 * **chess.com's own classification** rather than recomputing an ECO ourselves
 * (ADR-0007) — the same stance already used for the time control category. The
 * `[ECO]` header carries the code (the Opening's identity); the `[ECOUrl]`
 * header carries a slug we turn into a human-readable display name.
 *
 * Pure, no I/O, so it can be unit-tested on its own and reused identically by
 * the real import path and the fixture-seeding path (one logic, two entry
 * points — cf. ADR-0005).
 */

/** Opening the Player did not, per chess.com, play a recognised line of. */
export const OTHER_OPENING = { eco: "other", openingName: "Autre / non classée" } as const;

export interface Opening {
  eco: string;
  openingName: string;
}

function header(pgn: string, tag: string): string | null {
  const m = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`));
  return m ? m[1] : null;
}

/** Turns a chess.com ECOUrl into a display name (last slug segment, dashes → spaces). */
function nameFromEcoUrl(url: string): string {
  const slug = url.split("/").filter(Boolean).pop() ?? "";
  return slug.replace(/[-_]+/g, " ").trim();
}

export function parseOpening(pgn: string): Opening {
  const eco = header(pgn, "ECO");
  if (!eco) return { ...OTHER_OPENING };
  const ecoUrl = header(pgn, "ECOUrl");
  return { eco, openingName: ecoUrl ? nameFromEcoUrl(ecoUrl) : eco };
}
