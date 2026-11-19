import { IconDotsVertical, IconLoader2 } from '@tabler/icons-react';
import { Menu } from '../../components/Menu';
import { ACTION_ITEMS, ACTIONS_BY_STATUS } from './statusActions';

/** The ⋮ menu on a table row: only the actions allowed from the subscription's status. */
export function RowMenu({ subscription, busy, onAction }) {
  if (busy) {
    return (
      <span className="icon-btn" role="status" aria-label={`Updating ${subscription.name}`}>
        <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />
      </span>
    );
  }
  const items = ACTIONS_BY_STATUS[subscription.status].map((action) => ({
    key: action,
    label: ACTION_ITEMS[action].label,
    icon: ACTION_ITEMS[action].icon,
    danger: ACTION_ITEMS[action].danger,
    separatorBefore: action === 'delete',
    onSelect: () => onAction(subscription, action),
  }));
  return (
    <Menu
      label={`Actions for ${subscription.name}`}
      buttonClassName="icon-btn"
      buttonContent={<IconDotsVertical size={18} aria-hidden="true" />}
      items={items}
    />
  );
}
