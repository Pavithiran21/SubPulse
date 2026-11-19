import { DialogCloseButton } from '../../components/Dialog';

/** The drawer's title row: title, optional extras (a status pill) and the close button. */
export function DrawerHeader({ title, onClose, children }) {
  return (
    <div className="mb-5 flex items-center gap-2.5">
      <h2 id="drawer-title" className="flex-1 text-[22px]">
        {title}
      </h2>
      {children}
      <DialogCloseButton onClose={onClose} />
    </div>
  );
}
