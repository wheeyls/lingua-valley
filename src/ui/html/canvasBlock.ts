/**
 * Blocks / unblocks Phaser canvas pointer events while an HTML overlay is open.
 *
 * Problem: when an HTML overlay button (e.g. "Leave") is tapped, the pointer
 * event propagates to the Phaser canvas underneath. WorldScene sees the tap at
 * the button's screen coordinates and interprets it as a tap-to-move, so the
 * character walks to where the button was.
 *
 * `blockCanvas` sets `pointer-events: none` on the canvas when an overlay
 * opens; `unblockCanvas` restores it after a short delay (two rAF frames) so
 * the pointer event that closed the overlay has fully completed before Phaser
 * starts receiving input again.
 */

function getCanvas(): HTMLCanvasElement | null {
  return document.querySelector("#game canvas");
}

export function blockCanvas(): void {
  const c = getCanvas();
  if (c) c.style.pointerEvents = "none";
}

export function unblockCanvas(): void {
  // Wait two animation frames — enough for the closing pointer event to flush
  // through Phaser's input queue before re-enabling canvas hit-testing.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const c = getCanvas();
      if (c) c.style.pointerEvents = "";
    });
  });
}
