/**
 * The reading route's own keyboard commands, said on the screen.
 *
 * **A shortcut discovered by accident does not exist.** These are the app's first
 * keyboard commands, so nothing anywhere else would hint that they are there.
 *
 * It announces the **verdict** and the **Key moment**, and no longer the arrows
 * (US-23, D6): those belong to the board component, which announces them itself
 * wherever it has them — so the invariant "the arrows work ⟺ they are announced"
 * is structural rather than a rule in a comment. These two are commands of
 * *reading*, not of *navigation*, and this is the screen that has them. The Player
 * still sees all three, from two places, each saying what it owns.
 *
 * One constant sentence, at a height that never changes in any state — a notice
 * that grew or shrank with the ply would rebuild, in the last slice of the story,
 * the very defect the second one closed (ADR-0021). It sits below the controls
 * for the same reason.
 *
 * The keys are `kbd`, which is what they are.
 */
export function ShortcutsNotice() {
  return (
    <p data-part="shortcuts">
      Au clavier : <kbd>1</kbd> à <kbd>5</kbd> pour le verdict, du pire au meilleur ;{" "}
      <kbd>k</kbd> pour le moment clé.
    </p>
  );
}
