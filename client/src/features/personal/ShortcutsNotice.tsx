/**
 * The keyboard, said on the screen.
 *
 * **A shortcut discovered by accident does not exist.** These are the app's first
 * keyboard commands, so nothing anywhere else would hint that they are there.
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
      <kbd>←</kbd> <kbd>→</kbd> pour changer de coup ; <kbd>k</kbd> pour le moment clé.
    </p>
  );
}
