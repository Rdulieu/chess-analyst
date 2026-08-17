/**
 * What a chessboard is made of, in this app: its two square colours and the ink
 * of its coordinate labels. Spread into every `Chessboard`'s options, so the three
 * boards the app draws (the Game viewer, the `Danger position` diagrams, the
 * explorer) cannot drift apart — and so `--square-light` / `--square-dark` stop
 * being tokens nobody reads while the boards render react-chessboard's own
 * `#F0D9B5` / `#B58863`. A declared token nobody consumes is a lie about the
 * palette.
 *
 * **Token names, not colours**, for the same reason `chess/severity.ts` holds
 * names: this reaches the board through a third-party prop that takes a style
 * object and cannot be reached by a class, which is what made the tokens custom
 * properties in the first place (ADR-0013).
 *
 * These colours belong to the **constant family**: a chessboard is a chessboard in
 * both themes (they are declared outside the dark block and never redefined).
 */
export const BOARD_SQUARES = {
  lightSquareStyle: { backgroundColor: "var(--square-light)" },
  darkSquareStyle: { backgroundColor: "var(--square-dark)" },
  /**
   * One ink for both squares, where react-chessboard labels each square in the
   * *other* square's colour. Its alternation is prettier and it measured 2.29:1;
   * a coordinate is text drawn on a board and has to be legible on either square,
   * which one constant dark ink is (12.89:1 on the light square, 4.66:1 on the
   * dark one).
   */
  lightSquareNotationStyle: { color: "var(--square-notation)" },
  darkSquareNotationStyle: { color: "var(--square-notation)" },
} as const;
