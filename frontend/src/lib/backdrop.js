/**
 * True when a pointer event on a modal <dialog> landed on its dimmed backdrop.
 *
 * The browser reports a press on the backdrop with the <dialog> itself as the target, but a
 * press on the dialog's own padding (or the empty space under the drawer's form) has the same
 * target. Only the position tells them apart: the backdrop is everything outside the box.
 */
export function isOnBackdrop(dialog, event) {
  if (!dialog || event.target !== dialog) {
    return false;
  }
  const box = dialog.getBoundingClientRect();
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
}
