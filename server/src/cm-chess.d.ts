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
  }

  export class Chess {
    constructor(fenOrProps?: string | Record<string, unknown>);
    loadPgn(pgn: string, sloppy?: boolean): void;
    history(): CmMove[];
    /** The initial position's FEN (SetUp header, or the standard start). */
    setUpFen(): string;
    fen(move?: CmMove): string;
  }
}
