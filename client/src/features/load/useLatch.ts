import { useRef } from "react";

/**
 * **True once `reached` has been true, and stays true** until `key` changes.
 *
 * It exists for one shape: a block whose load is gated on an *earlier* block
 * having finished. Reading that earlier block's live state as the gate works
 * exactly once — the first pass — and then betrays the page (US-32 slice 08's
 * review): pressing **Réessayer** on the first block sends it back to
 * `loading`, which closes a gate the second block had already walked through,
 * throws away three loaded tables and re-pays a PGN replay of tens of seconds
 * that nothing asked for. A retry must cost its own block and no other.
 *
 * So the gate remembers that it opened. `key` is what legitimately forgets it —
 * the current `Profile`, since switching Profile genuinely restarts everything
 * (ADR-0014).
 *
 * The ref is written during render on purpose and it is safe to: the write is
 * idempotent, derived from this render's own arguments, and never read by
 * anyone else before it returns. An effect would give the same answer one
 * render later, which is one render of the very flicker this prevents.
 */
export function useLatch(reached: boolean, key: unknown): boolean {
  const held = useRef({ key, latched: false });
  if (held.current.key !== key) held.current = { key, latched: false };
  if (reached) held.current.latched = true;
  return held.current.latched;
}
