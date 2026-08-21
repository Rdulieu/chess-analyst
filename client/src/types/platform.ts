/**
 * The `Platform` a `Profile`'s account lives on (CONTEXT.md, ADR-0014). The
 * value is what the server stores; the **name** below is the only place the
 * screen spells a site out, so a label can never drift from the data it
 * describes — the failure this whole slice exists against.
 */
export type Platform = "chesscom" | "lichess";

const LABELS: Record<Platform, string> = {
  chesscom: "chess.com",
  lichess: "Lichess",
};

/** How this Platform is named to the Player. */
export function platformLabel(platform: Platform): string {
  return LABELS[platform] ?? platform;
}
