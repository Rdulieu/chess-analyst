/**
 * Minimal ambient typings for `cm-chess`, which ships no TypeScript
 * declarations (ADR-0004). Only the surface this project uses is declared.
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
    /** Plays a Move (SAN); returns the resulting move (with its `fen`) or null if illegal. */
    move(move: string): CmMove | null;
    history(): CmMove[];
    /** The initial position's FEN (SetUp header, or the standard start). */
    setUpFen(): string;
    fen(move?: CmMove): string;
  }
}
