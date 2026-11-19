import { createContext, useContext } from 'react';

export const ToastContext = createContext(null);

/**
 * toast.success(message, { icon, iconClass, action }) shows a 4-second toast (role="status");
 * action is { label, onClick }, for example Undo.
 * toast.error(message) shows one that stays until dismissed (role="alert"); a null message shows nothing.
 * Both return the toast's id, which toast.dismiss(id) takes.
 */
export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return toast;
}
