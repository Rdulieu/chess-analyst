/**
 * Minimal ambient typings for `cm-chess`, which ships no TypeScript
 * declarations (ADR-0004). Only the surface this project uses is declared.
 * Mirrors the client's shim; the server uses cm-chess to walk a Game's Moves
 * for Move habit precomputation.
 */
declare module "cm-chess" {
  export const FEN: { empty: string; start: string };

  /** A half-move in cm-chess's tree history. `fen` is the position *after* it. */
  export interface CmMove {
    san: string;
    fen: string;
    /** Origin/target squares (present on move results and verbose move lists). */
    from?: string;
    to?: string;
    /** The promotion piece, on a promoting Move. */
    promotion?: string;
  }

  export class Chess {
    constructor(fenOrProps?: string | Record<string, unknown>);
    loadPgn(pgn: string, sloppy?: boolean): void;
    /** Plays a Move (SAN, or from/to squares); returns it, or null if illegal. */
    move(move: string | { from: string; to: string; promotion?: string }): CmMove | null;
    /** Legal moves from the current Position; `{ verbose: true }` includes from/to. */
    moves(options?: { verbose?: boolean; square?: string }): CmMove[];
    history(): CmMove[];
    /** The initial position's FEN (SetUp header, or the standard start). */
    setUpFen(): string;
    fen(move?: CmMove): string;
  }
}
