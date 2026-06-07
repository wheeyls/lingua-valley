/**
 * Blocks / unblocks ALL Phaser input while an HTML overlay is open.
 *
 * The CSS pointer-events:none approach didn't fully work — Phaser's input
 * system can still receive events via its own listeners. Instead, we:
 * 1. Set pointer-events:none on the canvas (belt)
 * 2. Set a global flag that WorldScene checks before processing taps (suspenders)
 * 3. On unblock, delay both restorations so the closing pointer event fully
 *    clears before Phaser starts listening again.
 */

/** Global flag: true while an HTML overlay is active. WorldScene checks this. */
let _blocked = false;

export function isCanvasBlocked(): boolean {
  return _blocked;
}

function getCanvas(): HTMLCanvasElement | null {
  return document.querySelector("#game canvas");
}

export function blockCanvas(): void {
  _blocked = true;
  const c = getCanvas();
  if (c) c.style.pointerEvents = "none";
}

export function unblockCanvas(): void {
  // Delay unblocking so the pointer event that triggered the close (e.g. Leave
  // button) has fully flushed before Phaser starts receiving input again.
  setTimeout(() => {
    _blocked = false;
    const c = getCanvas();
    if (c) c.style.pointerEvents = "";
  }, 100);
}
