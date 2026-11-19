import { createContext, useContext } from 'react';

export const DrawerContext = createContext(null);

/**
 * The subscription drawer is owned by AppShell, because "Add subscription" sits in the band and
 * calendar chips, Next up rows and table rows all open it. { openAdd(), openView(id), openEdit(id) }:
 * a click on a subscription opens the read-only view; the row menu's Edit opens the form directly.
 */
export function useDrawer() {
  const drawer = useContext(DrawerContext);
  if (!drawer) {
    throw new Error('useDrawer must be used inside <AppShell>');
  }
  return drawer;
}
