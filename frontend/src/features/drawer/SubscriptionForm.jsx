import { zodResolver } from '@hookform/resolvers/zod';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArchive,
  IconCalendar,
  IconCalendarRepeat,
  IconCategory,
  IconCheck,
  IconCircleX,
  IconCreditCard,
  IconLoader2,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconRestore,
  IconTag,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { getMe } from '../../api/profile';
import { queryKeys } from '../../api/queryKeys';
import { createSubscription, updateSubscription } from '../../api/subscriptions';
import { useAuth } from '../../auth/AuthContext';
import { Pill } from '../../components/ServiceTile';
import { SelectField } from '../../components/SelectField';
import { FieldMessages, TextField } from '../../components/TextField';
import { applyFieldErrors, errorMessage } from '../../lib/apiErrors';
import { CATEGORIES, currencyIcon, CYCLES, REMINDER_CHIPS, statusLabel, statusTone } from '../../lib/enums';
import { formatInstantDate } from '../../lib/format';
import { useToast } from '../../toast/ToastContext';
import { refreshSubscriptionData } from '../subscriptions/subscriptionCache';
import { useStatusActions } from '../subscriptions/useStatusActions';
import { todayIn } from '../calendar/calendarQueries';
import { DrawerHeader } from './DrawerHeader';
import { RenewalPreview } from './RenewalPreview';
import { cleanAmount, FORM_FIELDS, latestDate, subscriptionSchema } from './subscriptionSchema';
import { useRenewalPreview } from './useRenewalPreview';

function emptyValues(user) {
  return {
    name: '',
    category: '',
    amount: '',
    paymentMethod: '',
    billingCycle: 'MONTHLY',
    startDate: todayIn(user.timeZone).toISODate(),
    nextRenewalDate: '',
    reminderDays: user.defaultReminderDays,
    notes: '',
  };
}

function valuesOf(subscription) {
  return {
    name: subscription.name,
    category: subscription.category,
    amount: subscription.amount,
    paymentMethod: subscription.paymentMethod ?? '',
    billingCycle: subscription.billingCycle,
    startDate: subscription.startDate,
    nextRenewalDate: subscription.nextRenewalDate ?? '',
    reminderDays: subscription.reminderDays,
    notes: subscription.notes ?? '',
  };
}

/**
 * Add or edit one subscription (screen 7).
 *
 * Next renewal: on Add it shows the date the preview works out until the user changes it, and
 * it is only sent when the user changed it. Leaving it out lets the backend keep the billing day
 * on an edit that doesn't touch the schedule (BACKEND.md "Choosing the anchor").
 * Edit sends the version it loaded; a 409 means someone saved first, and Reload shows their values.
 * A paused, cancelled or archived subscription has no next renewal, so that field and the dates are hidden.
 * onCancel (optional): what Cancel does instead of closing, for example going back to the view.
 */
export function SubscriptionForm({ subscription, onClose, onCancel = onClose, onReload }) {
  const isEdit = Boolean(subscription);
  const isActive = !isEdit || subscription.status === 'ACTIVE';
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const statusActions = useStatusActions();
  const [nextEdited, setNextEdited] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [formError, setFormError] = useState(null);
  const conflictRef = useRef(null);
  const schema = useMemo(() => subscriptionSchema(user.timeZone), [user.timeZone]);

  // The 409 banner sits above the fields, but Save is at the bottom of a drawer that is usually
  // taller than the screen: bring the banner into view, or the user wouldn't see why nothing saved.
  useEffect(() => {
    if (conflict) {
      conflictRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [conflict]);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: isEdit ? valuesOf(subscription) : emptyValues(user),
  });
  const [billingCycle, startDate, nextRenewalDate, reminderDays, amount] = useWatch({
    control,
    name: ['billingCycle', 'startDate', 'nextRenewalDate', 'reminderDays', 'amount'],
  });

  // What the preview should assume for Next renewal: the user's date once they changed it; on an
  // edit with the same start date and cycle, the stored one; otherwise none (the backend picks).
  const scheduleChanged = isEdit && (startDate !== subscription.startDate || billingCycle !== subscription.billingCycle);
  let previewNext;
  if (nextEdited) previewNext = nextRenewalDate;
  else if (isEdit && !scheduleChanged) previewNext = subscription.nextRenewalDate;
  const preview = useRenewalPreview({ billingCycle, startDate, nextRenewalDate: previewNext, reminderDays, enabled: isActive });

  // Until the user changes Next renewal, it shows the date the preview works out.
  const previewNextDate = preview.data?.nextRenewalDate;
  useEffect(() => {
    if (!nextEdited && previewNextDate) {
      setValue('nextRenewalDate', previewNextDate);
    }
  }, [nextEdited, previewNextDate, setValue]);

  const cleanedAmount = cleanAmount(amount);
  const previewAmount = errors.amount || !/^\d*\.?\d+$/.test(cleanedAmount) ? null : cleanedAmount;

  async function onSubmit(values) {
    setFormError(null);
    setConflict(false);
    const body = {
      name: values.name.trim(),
      category: values.category,
      amount: cleanAmount(values.amount),
      billingCycle: values.billingCycle,
      startDate: values.startDate,
      nextRenewalDate: isActive && nextEdited && values.nextRenewalDate ? values.nextRenewalDate : undefined,
      paymentMethod: values.paymentMethod.trim() || undefined,
      notes: values.notes.trim() ? values.notes : undefined,
      reminderDays: values.reminderDays,
      version: isEdit ? subscription.version : undefined,
    };
    try {
      if (isEdit) {
        await updateSubscription(subscription.id, body);
      } else {
        await createSubscription(body);
      }
    } catch (error) {
      const versionDetail = error.details?.some((detail) => detail.field === 'version');
      if (error.code === 'CONCURRENT_UPDATE' || versionDetail) {
        setConflict(true);
      } else if (!applyFieldErrors(error, setError, FORM_FIELDS)) {
        // Toasts sit under the modal drawer, so the message is shown here instead.
        setFormError(errorMessage(error));
      }
      return;
    }

    onClose();
    toast.success('Subscription saved');
    await refreshSubscriptionData(queryClient);
    // The first subscription locks the currency (Settings shows it locked from now on).
    if (!user.currencyLocked) {
      const me = await getMe();
      queryClient.setQueryData(queryKeys.me, me);
      updateUser(me);
    }
  }

  function openSettings() {
    onClose();
    navigate('/settings');
  }

  const AmountIcon = currencyIcon(user.currency);
  const maxDate = latestDate(user.timeZone);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <DrawerHeader title={isEdit ? 'Edit subscription' : 'Add subscription'} onClose={onClose}>
        {isEdit && !isActive && <Pill tone={statusTone(subscription.status)}>{statusLabel(subscription.status)}</Pill>}
      </DrawerHeader>

      {conflict && (
        <div ref={conflictRef} className="note note-red mb-4" role="alert">
          <IconAlertTriangle size={19} aria-hidden="true" />
          <div>
            This subscription was changed somewhere else. Reload it and try again.
            <div className="mt-2.5">
              <button type="button" className="btn btn-line btn-sm text-[#a51d1d]" onClick={onReload}>
                <IconRefresh size={16} aria-hidden="true" /> Reload
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-x-3.5 tab:grid-cols-2">
        <TextField label="Name" icon={IconTag} autoComplete="off" error={errors.name?.message} {...register('name')} />
        <SelectField id="sub-category" label="Category" icon={IconCategory} error={errors.category?.message} {...register('category')}>
          <option value="" disabled>
            Pick a category
          </option>
          {CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-x-3.5 tab:grid-cols-2">
        <TextField
          label="Amount"
          icon={AmountIcon}
          suffix={user.currency}
          inputMode="decimal"
          autoComplete="off"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <TextField
          label="Paid with"
          icon={IconCreditCard}
          autoComplete="off"
          hint="A label only. No card details."
          error={errors.paymentMethod?.message}
          {...register('paymentMethod')}
        />
      </div>

      <fieldset className="mb-4">
        <legend className="field-label">Billing cycle</legend>
        <div className="grid grid-cols-2 gap-2 tab:grid-cols-4">
          {CYCLES.map((cycle) => (
            <label key={cycle.value} className="cycle">
              <input type="radio" className="sr-only" value={cycle.value} {...register('billingCycle')} />
              {cycle.label}
            </label>
          ))}
        </div>
        <FieldMessages errorId="sub-cycle-error" error={errors.billingCycle?.message} />
      </fieldset>

      <div className="grid gap-x-3.5 tab:grid-cols-2">
        <TextField
          label="Start date"
          icon={IconCalendar}
          type="date"
          min="2000-01-01"
          max={maxDate}
          error={errors.startDate?.message}
          {...register('startDate')}
        />
        {isActive && (
          <TextField
            label="Next renewal"
            icon={IconCalendarRepeat}
            type="date"
            min={startDate || '2000-01-01'}
            max={maxDate}
            error={errors.nextRenewalDate?.message}
            {...register('nextRenewalDate', { onChange: () => setNextEdited(true) })}
          />
        )}
      </div>

      <Controller
        control={control}
        name="reminderDays"
        render={({ field, fieldState }) => (
          <fieldset className="mb-4" aria-describedby={fieldState.error ? 'sub-reminders-error' : undefined}>
            <legend className="field-label">Remind me</legend>
            <div className="flex flex-wrap gap-2">
              {REMINDER_CHIPS.map((chip) => {
                const on = field.value.includes(chip.value);
                return (
                  <button
                    key={chip.value}
                    type="button"
                    className="chip"
                    aria-pressed={on}
                    onBlur={field.onBlur}
                    onClick={() =>
                      field.onChange(on ? field.value.filter((value) => value !== chip.value) : [...field.value, chip.value])
                    }
                  >
                    {on && <IconCheck size={15} aria-hidden="true" />} {chip.label}
                  </button>
                );
              })}
            </div>
            <FieldMessages errorId="sub-reminders-error" error={fieldState.error?.message} />
          </fieldset>
        )}
      />

      <div className="mb-4">
        <label htmlFor="sub-notes" className="field-label">
          Notes <span className="font-medium text-muted">(optional)</span>
        </label>
        <textarea
          id="sub-notes"
          rows={2}
          className="input"
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? 'sub-notes-error sub-notes-hint' : 'sub-notes-hint'}
          {...register('notes')}
        />
        <FieldMessages errorId="sub-notes-error" error={errors.notes?.message} hintId="sub-notes-hint" hint="Up to 500 characters." />
      </div>

      {isActive ? (
        <RenewalPreview
          preview={preview}
          amount={previewAmount}
          currency={user.currency}
          remindersEnabled={user.remindersEnabled}
          onOpenSettings={openSettings}
        />
      ) : (
        <InactiveNote subscription={subscription} timeZone={user.timeZone} statusActions={statusActions} />
      )}

      {formError && (
        <div className="note note-red mt-4" role="alert">
          <IconAlertCircle size={19} aria-hidden="true" />
          <div>{formError}</div>
        </div>
      )}

      <div className="mt-[18px] flex justify-end gap-2.5">
        <button type="button" className="btn btn-line" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />}
          Save subscription
        </button>
      </div>
    </form>
  );
}

// noteIcon is the status's own icon, the same one its row menu action uses.
const STATUS_SENTENCES = {
  PAUSED: { since: 'Paused since', verb: 'resume', action: 'resume', label: 'Resume', icon: IconPlayerPlay, noteIcon: IconPlayerPause },
  CANCELLED: { since: 'Cancelled', verb: 'restore it', action: 'restore', label: 'Restore', icon: IconRestore, noteIcon: IconCircleX },
  ARCHIVED: { since: 'Archived', verb: 'restore it', action: 'restore', label: 'Restore', icon: IconRestore, noteIcon: IconArchive },
};

/**
 * A paused, cancelled or archived subscription: when it changed, that the billing day is kept, and
 * Resume or Restore. Shown in the edit form and in the read-only view.
 */
export function InactiveNote({ subscription, timeZone, statusActions }) {
  const sentence = STATUS_SENTENCES[subscription.status];
  const busy = statusActions.pending?.id === subscription.id;
  const ActionIcon = sentence.icon;
  const NoteIcon = sentence.noteIcon;
  return (
    <div className="note note-amber">
      <NoteIcon size={19} aria-hidden="true" />
      <div>
        {sentence.since} {formatInstantDate(subscription.statusChangedAt, timeZone)}. Next renewal and reminders are worked out
        again when you {sentence.verb}; its billing day is kept.
        <div className="mt-2.5">
          <button
            type="button"
            className="btn btn-line btn-sm"
            disabled={busy}
            onClick={() => statusActions.run(subscription, sentence.action)}
          >
            {busy ? (
              <IconLoader2 size={16} className="motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <ActionIcon size={16} aria-hidden="true" />
            )}{' '}
            {sentence.label}
          </button>
        </div>
      </div>
    </div>
  );
}
