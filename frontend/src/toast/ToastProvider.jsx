import { IconAlertCircle, IconCircleCheck, IconX } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { ToastContext } from './ToastContext';

// UI-UX.md "Toasts": a success goes away after 4 seconds, an error stays until it is dismissed.
const SUCCESS_VISIBLE_MS = 4000;

function toastReducer(toasts, action) {
  switch (action.type) {
    case 'added':
      return [...toasts, action.toast];
    case 'dismissed':
      return toasts.filter((toast) => toast.id !== action.id);
    default:
      return toasts;
  }
}

/** SubPulse's toasts: solid navy bars at the bottom right (full width on phones). */
export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, []);
  const lastId = useRef(0);

  const dismiss = useCallback((id) => dispatch({ type: 'dismissed', id }), []);

  const api = useMemo(() => {
    function add(toast) {
      lastId.current += 1;
      dispatch({ type: 'added', toast: { ...toast, id: lastId.current } });
      return lastId.current;
    }
    return {
      success: (message, { icon = IconCircleCheck, iconClass = 'text-[#6ee7b7]', action } = {}) =>
        add({ kind: 'success', message, icon, iconClass, action }),
      // lib/apiErrors gives null for an ended session (Log in says why), and null shows nothing.
      error: (message) => (message ? add({ kind: 'error', message, icon: IconAlertCircle, iconClass: 'text-[#ff8a8a]' }) : null),
      dismiss,
    };
  }, [dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      {/* The live regions are always in the page: a screen reader only announces what is added to one it already knows. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2.5 tab:left-auto">
        <div role="alert" className="flex w-full flex-col items-end gap-2.5">
          {toasts
            .filter((toast) => toast.kind === 'error')
            .map((toast) => (
              <ToastBar key={toast.id} toast={toast} dismiss={dismiss} />
            ))}
        </div>
        <div role="status" className="flex w-full flex-col items-end gap-2.5">
          {toasts
            .filter((toast) => toast.kind === 'success')
            .map((toast) => (
              <ToastBar key={toast.id} toast={toast} dismiss={dismiss} />
            ))}
        </div>
      </div>
    </ToastContext>
  );
}

/**
 * One navy bar: icon, message, then Undo (if any) and, on errors, the close button.
 * A success bar removes itself. The timer belongs to the bar, so when Undo removes it sooner,
 * the effect's cleanup cancels the timer too.
 */
function ToastBar({ toast, dismiss }) {
  const { id, kind, message, action, iconClass } = toast;
  const Icon = toast.icon;

  useEffect(() => {
    if (kind !== 'success') {
      return undefined;
    }
    const timer = setTimeout(() => dismiss(id), SUCCESS_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [id, kind, dismiss]);

  return (
    <div className="toast">
      <Icon size={20} className={`shrink-0 ${iconClass}`} aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {action && (
        <button
          type="button"
          className="font-semibold text-[#a5b4fc] hover:text-white"
          onClick={() => {
            dismiss(id);
            action.onClick();
          }}
        >
          {action.label}
        </button>
      )}
      {kind === 'error' && (
        <button type="button" className="grid size-7 place-items-center rounded-lg text-band-muted" aria-label="Dismiss" onClick={() => dismiss(id)}>
          <IconX size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
