/**
 * The **`Review mode`** (CONTEXT.md): how much of what the engine found is shown
 * while the Player reviews a Game, in three exclusive levels. Held CLIENT-SIDE
 * and persisted locally, like the current `Profile` — it is a display choice, it
 * says nothing about what was computed or stored, and the server has no opinion
 * on it.
 *
 * **One value, never two flags**: a level is a point on a scale, and a pair of
 * independent switches would let the app show "−28 %, meilleur : Bxh7+" on a page
 * that is otherwise hiding the annotations — a page contradicting itself.
 */
export type ReviewMode = "unaided" | "annotated" | "detailed";

/** The three levels, in the order of what they reveal. */
export const REVIEW_MODES: ReviewMode[] = ["unaided", "annotated", "detailed"];

const KEY = "chess-analyst.review-mode";

/**
 * The remembered level, **Unaided** by default: a Game is opened to be read, and
 * the engine's verdict is something the Player asks for rather than something the
 * app volunteers.
 */
export function loadReviewMode(): ReviewMode {
  const stored = localStorage.getItem(KEY);
  return REVIEW_MODES.includes(stored as ReviewMode) ? (stored as ReviewMode) : "unaided";
}

/** Remembers this level, for this Game, the next one, and the next session. */
export function saveReviewMode(mode: ReviewMode): void {
  localStorage.setItem(KEY, mode);
}

/**
 * The level a **finished `Analysis pass` on the Game being reviewed** puts that
 * review at. It raises Unaided to Annotated and leaves anything higher alone: the
 * pass was asked for so there would be something to look at, but a Player already
 * reading the record must not be demoted by their own pass finishing.
 */
export function atLeastAnnotated(mode: ReviewMode): ReviewMode {
  return mode === "unaided" ? "annotated" : mode;
}
