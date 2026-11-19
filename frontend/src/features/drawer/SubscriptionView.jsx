import { IconPencil } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { Pill, ServiceTile } from '../../components/ServiceTile';
import { categoryLabel, cycleLabel, REMINDER_CHIPS, statusLabel, statusTone } from '../../lib/enums';
import { daysText, formatDate, formatMoney, formatMonthShort } from '../../lib/format';
import { useStatusActions } from '../subscriptions/useStatusActions';
import { DrawerHeader } from './DrawerHeader';
import { RenewalPreview } from './RenewalPreview';
import { InactiveNote } from './SubscriptionForm';
import { useRenewalPreview } from './useRenewalPreview';

const PERIODS = { WEEKLY: 'week', MONTHLY: 'month', QUARTERLY: 'quarter', YEARLY: 'year' };

/**
 * One subscription, read only: what a click on its name, a calendar chip, a Next up row or the
 * email's "View subscription" link opens. Edit switches the same drawer to the form.
 * An active one shows its next renewal dates and reminder times from GET /renewals/preview, the
 * same as the form; a paused, cancelled or archived one shows when that happened, with Resume or Restore.
 */
export function SubscriptionView({ subscription, onEdit, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const statusActions = useStatusActions();
  const isActive = subscription.status === 'ACTIVE';
  const preview = useRenewalPreview({
    billingCycle: subscription.billingCycle,
    startDate: subscription.startDate,
    nextRenewalDate: subscription.nextRenewalDate,
    reminderDays: subscription.reminderDays,
    enabled: isActive,
  });
  const reminders = REMINDER_CHIPS.filter((chip) => subscription.reminderDays.includes(chip.value));

  function openSettings() {
    onClose();
    navigate('/settings');
  }

  return (
    <>
      <DrawerHeader title="Subscription" onClose={onClose}>
        <Pill tone={statusTone(subscription.status)}>{statusLabel(subscription.status)}</Pill>
      </DrawerHeader>

      <div className="mb-4 flex items-center gap-3">
        <ServiceTile name={subscription.name} />
        <div className="min-w-0">
          <h3 className="text-lg [overflow-wrap:anywhere]">{subscription.name}</h3>
          <p className="text-sm text-muted">
            <b className="amt text-base">{formatMoney(subscription.amount, subscription.currency)}</b> /{' '}
            {PERIODS[subscription.billingCycle]}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 rounded-[14px] border border-line px-4 py-3.5 text-sm">
        <Detail name="Category">{categoryLabel(subscription.category)}</Detail>
        <Detail name="Billing cycle">{cycleLabel(subscription.billingCycle)}</Detail>
        <Detail name="Started">{formatDate(subscription.startDate)}</Detail>
        {isActive && (
          <Detail name="Next renewal">
            {formatDate(subscription.nextRenewalDate)}
            {subscription.monthEndAdjusted ? (
              <span className="block text-xs text-amber">last day of {formatMonthShort(subscription.nextRenewalDate)}</span>
            ) : (
              <span className="block text-xs font-normal text-muted">{daysText(subscription.daysUntilRenewal)}</span>
            )}
          </Detail>
        )}
        <Detail name="Paid with">{subscription.paymentMethod || '—'}</Detail>
        <Detail name="Reminders">
          {reminders.length > 0 ? (
            <span className="flex flex-wrap gap-1.5">
              {reminders.map((chip) => (
                <Pill key={chip.value} tone="blue">
                  {chip.label}
                </Pill>
              ))}
            </span>
          ) : (
            'None'
          )}
        </Detail>
        <Detail name="Notes">
          <span className="font-normal whitespace-pre-line [overflow-wrap:anywhere]">{subscription.notes || '—'}</span>
        </Detail>
      </dl>

      {isActive ? (
        <RenewalPreview
          preview={preview}
          amount={subscription.amount}
          currency={subscription.currency}
          remindersEnabled={user.remindersEnabled}
          onOpenSettings={openSettings}
        />
      ) : (
        <div className="mt-4">
          <InactiveNote subscription={subscription} timeZone={user.timeZone} statusActions={statusActions} />
        </div>
      )}

      <div className="mt-[18px] flex justify-end gap-2.5">
        <button type="button" className="btn btn-line" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          <IconPencil size={18} aria-hidden="true" /> Edit
        </button>
      </div>
    </>
  );
}

/** One label and value pair; the list reads as "Category, Entertainment" to a screen reader. */
function Detail({ name, children }) {
  return (
    <>
      <dt className="text-muted">{name}</dt>
      <dd className="font-medium text-navy">{children}</dd>
    </>
  );
}
