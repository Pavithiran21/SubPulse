import { IconX } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { isOnBackdrop } from '../lib/backdrop';

/**
 * SubPulse's two modal surfaces, both on the native <dialog> element:
 * - variant "dialog": the centred card that confirms or changes something (screens 10, 11, 14, 15);
 * - variant "drawer": the add/edit panel that slides in from the right (screen 7).
 * Below 860 px, index.css turns both into full-screen sheets.
 *
 * It opens with showModal(), so the browser keeps Tab inside and makes the page behind inert, and
 * focus goes back to whatever opened it on close. data-autofocus on an element inside picks the
 * first focus (Cancel in the delete dialogs); without it the first focusable element gets it.
 *
 * Every way of closing goes through onClose, so the open prop is the one source of truth:
 * Esc always, and a press on the dimmed backdrop, except for an alertdialog (pause, delete,
 * delete account), which needs an explicit answer.
 */
export function Dialog({ open, onClose, variant = 'dialog', role = 'dialog', labelledBy, describedBy, children }) {
  const dialogRef = useRef(null);
  // Selecting text in a drawer field and letting go over the backdrop also ends in a click on
  // the <dialog>. Only a press that started on the backdrop may close it.
  const pressStartedOnBackdrop = useRef(false);
  const closesOnBackdrop = role !== 'alertdialog';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) {
      return undefined;
    }
    const opener = document.activeElement;
    // showModal() itself focuses the element carrying the autofocus attribute. Choosing it this
    // way, instead of calling focus() afterwards, means no field is focused and blurred first,
    // which React Hook Form would treat as "touched" and answer with an error message.
    dialog.querySelector('[data-autofocus]')?.setAttribute('autofocus', '');
    dialog.showModal();
    return () => {
      dialog.close();
      opener?.focus?.();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={variant === 'drawer' ? 'drawer' : 'dialog'}
      role={role === 'alertdialog' ? 'alertdialog' : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(event) => {
        // Esc: ask React to close it rather than letting the browser do it behind React's back.
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        pressStartedOnBackdrop.current = isOnBackdrop(dialogRef.current, event);
      }}
      onClick={(event) => {
        if (closesOnBackdrop && pressStartedOnBackdrop.current && isOnBackdrop(dialogRef.current, event)) {
          onClose();
        }
      }}
    >
      {open && children}
    </dialog>
  );
}

/**
 * The X in the header of a dialog or the drawer. Pressing it doesn't take focus (the mousedown
 * default is prevented, the click still fires). Otherwise the field the user is in would blur
 * first and show its error, and the header could move away from under the pointer.
 */
export function DialogCloseButton({ onClose }) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Close"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClose}
    >
      <IconX size={19} aria-hidden="true" />
    </button>
  );
}
