import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useMenuKeys } from '../hooks/useMenuKeys';
import { isOnBackdrop } from '../lib/backdrop';

/**
 * A button that opens a role="menu": the row menus and the avatar menu.
 * - Desktop: a small panel under the button, position: fixed and rendered into document.body
 *   (a portal). Otherwise the table's scroll box would clip it, and the avatar menu would sit
 *   under the page's cards: the band's children are their own stacking layer below <main>.
 *   It closes on a click outside, or when a scroll or a resize moves the button (the menu would
 *   no longer line up with it).
 * - Phone: a bottom sheet on a native <dialog> (UI-UX.md "Layout and responsive").
 *
 * items: [{ key, label, icon, onSelect, danger, separatorBefore }]; header: optional content above them.
 */
export function Menu({ label, buttonClassName, buttonContent, items, header }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const triggerRef = useRef(null);
  // Where the button was when the menu opened.
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const sheetRef = useRef(null);
  const isPhone = useMediaQuery(PHONE_QUERY);
  const menuId = useId();

  function close({ returnFocus = true } = {}) {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }
  const { onKeyDown } = useMenuKeys(menuRef, close);

  function toggle() {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current.getBoundingClientRect();
    anchorRef.current = { top: rect.top, right: rect.right };
    const openUpwards = window.innerHeight - rect.bottom < 280 && rect.top > 280;
    setPlace({
      right: Math.max(8, window.innerWidth - rect.right),
      ...(openUpwards ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
    setOpen(true);
  }

  // Phone: show the sheet as a modal. Closing it gives focus back to the button by itself.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!open || !isPhone || !sheet) {
      return undefined;
    }
    sheet.showModal();
    return () => sheet.close();
  }, [open, isPhone]);

  // Focus the first item once the menu shows. Desktop: close on a click outside, or when a scroll
  // or a resize moves the button. Not on every scroll event: one can arrive just after the menu
  // opened, from a scroll that happened before the click (the page scrolled up to the button).
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    menuRef.current?.querySelector('[role="menuitem"]')?.focus();
    if (isPhone) {
      return undefined;
    }
    function onPointerDown(event) {
      if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    function onMove() {
      const rect = triggerRef.current?.getBoundingClientRect();
      const anchor = anchorRef.current;
      if (!rect || !anchor || rect.top !== anchor.top || rect.right !== anchor.right) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, isPhone]);

  function select(item) {
    close();
    item.onSelect();
  }

  const menu = (
    <div ref={menuRef} id={menuId} role="menu" aria-label={label} onKeyDown={onKeyDown}>
      {header}
      {items.map((item) => (
        <Fragment key={item.key}>
          {item.separatorBefore && <hr className="mx-1 my-[5px] border-line" />}
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className={`menu-item ${item.danger ? 'danger' : ''}`}
            onClick={() => select(item)}
          >
            <item.icon size={18} aria-hidden="true" /> {item.label}
          </button>
        </Fragment>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={buttonClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        {buttonContent}
      </button>
      {isPhone ? (
        <dialog
          ref={sheetRef}
          className="menu menu-sheet"
          onCancel={(event) => {
            event.preventDefault();
            close({ returnFocus: false });
          }}
          // A tap on the dimmed backdrop closes it; a tap on the sheet's own padding doesn't.
          onClick={(event) => isOnBackdrop(sheetRef.current, event) && close({ returnFocus: false })}
        >
          {open && menu}
        </dialog>
      ) : (
        open &&
        createPortal(
          <div className="menu fixed z-40" style={place}>
            {menu}
          </div>,
          document.body,
        )
      )}
    </>
  );
}
