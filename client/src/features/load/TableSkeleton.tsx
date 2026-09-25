/**
 * What a block that is **still being computed** shows in its own place.
 *
 * `/stats` no longer waits for its slowest fold to show its fastest one
 * (US-32 slice 08): the results summary arrives in milliseconds and the two
 * expensive groups land behind it, seconds later. Between the two, the reader
 * must be able to tell the page apart from a page that is finished — hence a
 * skeleton **at the shape of the table it stands for**, in the place that table
 * will occupy, rather than a spinner somewhere else.
 *
 * Three things it refuses:
 *
 * - **It is not carried by the animation, nor by the colour** (ADR-0013). The
 *   `role="status"` line **names what is being computed** in words, so a screen
 *   reader learns that something is missing and *which* something; the greyed
 *   cells are the visual echo of that sentence, never its only carrier. The
 *   region carries `aria-busy` for the same reason.
 * - **It does not lie about the volume.** The caller says how many rows the
 *   finished table will hold when that is known (the `Phase` tables always hold
 *   three), and otherwise asks for a shape — never twenty ghost rows above a
 *   table that will have three.
 * - **It does not widen the page.** The ghost table sits in the same
 *   `[data-scroll="x"]` its real counterpart uses, with the prose outside it, so
 *   at 380 px it scrolls in its own box and the page does not (US-32 paid that
 *   defect once at 925 px in a 365 px window).
 *
 * `prefers-reduced-motion` is honoured in the stylesheet: the pulse is opt-in on
 * motion, and what remains without it — the sentence and the grey cells — is the
 * whole message anyway.
 */
export function TableSkeleton({
  id,
  heading,
  awaiting,
  columns,
  rows,
}: {
  /** The id its heading carries, so the region is named by the block's title. */
  id: string;
  /** The finished block's own heading — the reader sees where it will land. */
  heading: string;
  /** What is being computed, in the Player's words, for the status line. */
  awaiting: string;
  /** The finished table's column headers, so the shape is the real shape. */
  columns: string[];
  /** How many rows to sketch — a shape, not a prediction. */
  rows: number;
}) {
  return (
    <section aria-labelledby={id} aria-busy="true" data-testid={`${id}-skeleton`}>
      <h3 id={id}>{heading}</h3>

      <p role="status">{awaiting} — calcul en cours…</p>

      {/* The ghost table is decoration for a reader who cannot see it: the
          sentence above already said what is coming, and a screen reader
          walking empty cells would learn nothing it does not know. */}
      <div data-scroll="x" aria-hidden="true">
        <table data-skeleton="table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                {columns.map((column) => (
                  <td key={column}>
                    <span data-skeleton="cell" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
