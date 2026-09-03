/**
 * The **`Review mode`** (CONTEXT.md): how much of what the engine found is shown
 * while the Player reviews a Game, in three exclusive levels. Held CLIENT-SIDE
 * and **not persisted at all** — it is a display choice, it says nothing about
 * what was computed or stored, the server has no opinion on it, and since US-28
 * it does not outlive the review it belongs to.
 *
 * **One value, never two flags**: a level is a point on a scale, and a pair of
 * independent switches would let the app show "−28 %, meilleur : Bxh7+" on a page
 * that is otherwise hiding the annotations — a page contradicting itself.
 */
export type ReviewMode = "unaided" | "annotated" | "detailed";

/** The three levels, in the order of what they reveal. */
export const REVIEW_MODES: ReviewMode[] = ["unaided", "annotated", "detailed"];

/**
 * The level a **new review** starts at. It is a constant, and that is the whole
 * rule: a Game is opened to be read, and the engine's verdict is something the
 * Player asks for rather than something the app volunteers.
 *
 * The level used to be **remembered** across Games and sessions — chosen once
 * rather than on every Game. That is withdrawn (US-28), and the reason is not
 * comfort but honesty. A Review mode is not only a display: a level above
 * Unaided on an analysed Game is what records a reading as **informed**, and
 * that record is handed to the server at sealing and labels the
 * `Personal analysis` (see `engineSeen.ts`). A level inherited from what was read
 * yesterday therefore did not merely decide in the Player's place — it
 * **stamped** a reading nobody had asked to inform, in the one direction that
 * discredits the Player's own work.
 *
 * The cost is real and is accepted: a Player who wants Detailed on every Game
 * asks for it on every Game. That price is paid by the one who summons the
 * engine, never by the one reading unaided.
 */
export const INITIAL_REVIEW_MODE: ReviewMode = "unaided";

/**
 * The level a **finished `Analysis pass` on the Game being reviewed** puts that
 * review at. It raises Unaided to Annotated and leaves anything higher alone: the
 * pass was asked for so there would be something to look at, but a Player already
 * reading the record must not be demoted by their own pass finishing.
 */
export function atLeastAnnotated(mode: ReviewMode): ReviewMode {
  return mode === "unaided" ? "annotated" : mode;
}
