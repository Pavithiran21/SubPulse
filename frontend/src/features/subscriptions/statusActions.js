import { IconArchive, IconCircleX, IconPencil, IconPlayerPause, IconPlayerPlay, IconRestore, IconTrash } from '@tabler/icons-react';

// UI-UX.md "Row menu by status": a menu offers only the changes the backend allows from that
// status (StatusAction in BACKEND.md), so a 422 can only come from a race with another tab.
export const ACTIONS_BY_STATUS = {
  ACTIVE: ['edit', 'pause', 'cancel', 'archive', 'delete'],
  PAUSED: ['edit', 'resume', 'cancel', 'archive', 'delete'],
  CANCELLED: ['edit', 'restore', 'archive', 'delete'],
  ARCHIVED: ['edit', 'restore', 'delete'],
};

export const ACTION_ITEMS = {
  edit: { label: 'Edit', icon: IconPencil },
  pause: { label: 'Pause', icon: IconPlayerPause },
  resume: { label: 'Resume', icon: IconPlayerPlay },
  cancel: { label: 'Mark cancelled', icon: IconCircleX },
  archive: { label: 'Archive', icon: IconArchive },
  restore: { label: 'Restore', icon: IconRestore },
  delete: { label: 'Delete', icon: IconTrash, danger: true },
};
