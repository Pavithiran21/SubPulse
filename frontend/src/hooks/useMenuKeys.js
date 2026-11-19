/**
 * Keyboard support inside a role="menu" (UI-UX.md "Keyboard"): Up and Down move between the
 * items (wrapping round), Home and End jump to the first and last, Esc closes. Tab closes too and
 * puts focus back on the menu's button; the browser's own Tab then moves on from there, so
 * Tab and Shift+Tab continue from the button even though the desktop panel lives at the end of
 * the page (a portal).
 */
export function useMenuKeys(menuRef, onClose) {
  function items() {
    return [...(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? [])];
  }

  function focusItem(index) {
    const all = items();
    if (all.length > 0) {
      all[(index + all.length) % all.length].focus();
    }
  }

  function onKeyDown(event) {
    const current = items().indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusItem(-1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose({ returnFocus: true });
    } else if (event.key === 'Tab') {
      onClose({ returnFocus: true });
    }
  }

  return { onKeyDown, focusFirst: () => focusItem(0) };
}
