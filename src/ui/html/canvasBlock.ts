/**
 * Global overlay-active flag. When an HTML overlay (conversation, dialogue) is
 * open, this is set so the world view knows to ignore interaction.
 */

let _blocked = false;

export function isCanvasBlocked(): boolean {
  return _blocked;
}

export function blockCanvas(): void {
  _blocked = true;
}

export function unblockCanvas(): void {
  // Delay so the pointer event that triggered the close has flushed.
  setTimeout(() => { _blocked = false; }, 100);
}
