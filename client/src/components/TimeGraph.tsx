import { timeTrace } from "../chess/timeTrace";
import type { PhaseBand } from "../chess/phaseBands";
import type { GameTime } from "../types";

/**
 * The third drawing beside the board: **how long each Move took** (US-15b).
 *
 * It exists because the figures were tried in the move list first and made it
 * unreadable — two numbers per line, on a list whose job is to name Moves. The
 * requester said so on 2026-09-09, and the list went back to bare notation. What
 * the drawing buys in exchange is the thing a column of numbers cannot give: the
 * **shape** of a Game's time. Forty seconds burned on one Move and the last ten
 * played in two each is a picture, not an arithmetic.
 *
 * **The Player's Moves go up, the opponent's go down**, from one shared axis.
 * The side is carried by **position**, so nothing here depends on a colour to
 * say whose Move a bar is (ADR-0013) — and the two halves facing each other is
 * what makes "he was moving fast and I was not" visible rather than computed.
 *
 * **One ceiling for both halves**, printed beside the box. A ceiling per side
 * would draw the opponent's 2 s Move as tall as the Player's 40 s one, and that
 * comparison is the only reason the opponent is drawn at all.
 *
 * **`aria-hidden`, on the same licence as `DriftGraph`**: every figure in it
 * exists in text — the scale prints the magnitude, the line under the drawing
 * gives the exact pair for the Move being read, and the panel below gives the
 * total and the longest Moves. That invariant is what permits the drawing; if
 * those texts ever go, this goes with them.
 *
 * Not one colour is written here: the bars, the axis and the box are the
 * stylesheet's.
 */
export function TimeGraph({
  time,
  playerColor,
  currentPly,
  bands,
}: {
  time: GameTime;
  /** The Player's side — the Player is not a colour, so it must be told. */
  playerColor: "white" | "black";
  currentPly: number;
  /** The Phase spans, for the boundary rules drawn over the plot — the same
   *  x axis as the other two drawings, so the three can be read by looking down. */
  bands: PhaseBand[];
}) {
  const { bars, lastX, ticks } = timeTrace(time.plies, playerColor);
  if (bars.length === 0) return null;

  const span = Math.max(lastX, 1);
  // The axis sits in the middle: the Player's half above it, the opponent's
  // below. Percentages of the box, so a height and its share are one number.
  const AXIS = 50;

  return (
    <div aria-hidden="true" data-part="time-frame">
      {/* The graduated scale, OUTSIDE the plot and never over it — the bars are
          solid, and a figure laid on one would print on the bar itself. Mirrored
          about the axis, because the same magnitude governs both halves. */}
      <ul data-part="time-scale">
        {ticks.map((tick) => (
          <li key={`up-${tick.label}`} style={{ top: `${AXIS - tick.y / 2}%` }}>
            {tick.label}
          </li>
        ))}
        {ticks.map((tick) => (
          <li key={`down-${tick.label}`} style={{ top: `${AXIS + tick.y / 2}%` }}>
            {tick.label}
          </li>
        ))}
      </ul>
      <div data-part="time-plot">
        <svg aria-hidden="true" viewBox={`0 0 ${span} 100`} preserveAspectRatio="none">
          {bars.map((bar) => {
            // Half the box per side, so the shared ceiling reaches the top of
            // its own half rather than the top of the picture.
            const height = (bar.height / 100) * AXIS;
            return (
              <rect
                key={bar.ply}
                data-mine={bar.mine ? "true" : undefined}
                x={bar.ply - 0.4}
                y={bar.mine ? AXIS - height : AXIS}
                width={0.8}
                height={height}
              />
            );
          })}
          {/* The Phase boundaries, on the same axis as the other two drawings. */}
          {bands.slice(1).map((band) => (
            <line
              key={band.from}
              data-mark="phase-boundary"
              x1={band.from}
              y1={0}
              x2={band.from}
              y2={100}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* The axis the two halves hang from — drawn over the bars, since a bar
              of nearly no time is a sliver that would otherwise hide it. */}
          <line
            data-mark="axis"
            x1={0}
            y1={AXIS}
            x2={span}
            y2={AXIS}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <line
            data-mark="cursor"
            x1={currentPly}
            y1={0}
            x2={currentPly}
            y2={100}
            strokeWidth={0.8}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
