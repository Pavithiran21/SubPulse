import { IconCheck, IconLock, IconMail, IconUser } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getMe, updateProfile } from '../../api/profile';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { SelectField } from '../../components/SelectField';
import { ErrorPanel, LoadingCard } from '../../components/StatePanels';
import { Switch } from '../../components/Switch';
import { FieldMessages, TextField } from '../../components/TextField';
import { TimeZoneField } from '../../components/TimeZoneField';
import { errorMessage } from '../../lib/apiErrors';
import { CURRENCIES, currencyIcon, REMINDER_CHIPS } from '../../lib/enums';
import { joinWithAnd } from '../../lib/format';
import { useToast } from '../../toast/ToastContext';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { DeleteAccountDialog } from './DeleteAccountDialog';

const CURRENCY_LOCKED = 'Locked after your first subscription.';

/** [7, 3, 1] → "7, 3 and 1 days before"; [7, 0] → "7 days before and on the day". */
function reminderSummary(days) {
  const before = days.filter((day) => day > 0).sort((a, b) => b - a);
  const parts = [];
  if (before.length > 0) {
    parts.push(`${joinWithAnd(before.map(String))} ${before.length === 1 && before[0] === 1 ? 'day' : 'days'} before`);
  }
  if (days.includes(0)) {
    parts.push(parts.length > 0 ? 'on the day' : 'On the day');
  }
  return parts.join(' and ');
}

/**
 * Screen 9. Each setting is saved as soon as it changes (the approved design has no Save
 * button): the name when the field is left, the time zone and currency when picked, the switch
 * when flipped, and the default reminders with their own Save. Each save shows "Changes saved".
 */
export function SettingsPage() {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: getMe });

  if (me.isPending) {
    return <LoadingCard label="Loading your settings…" className="max-w-[640px]" />;
  }
  if (me.isError) {
    return <ErrorPanel title="Couldn't load your settings" className="max-w-[640px]" onRetry={() => me.refetch()} />;
  }
  return <SettingsForm user={me.data} />;
}

function SettingsForm({ user }) {
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [nameError, setNameError] = useState(null);
  const [currencyError, setCurrencyError] = useState(null);
  const [saving, setSaving] = useState(null); // the field being saved
  const [editingReminders, setEditingReminders] = useState(false);
  const [dialog, setDialog] = useState(null); // 'password' or 'delete'

  /** PATCH /me with one change. Returns true when it was saved. */
  async function save(field, changes) {
    setSaving(field);
    try {
      const updated = await updateProfile(changes);
      queryClient.setQueryData(queryKeys.me, updated);
      updateUser(updated);
      toast.success('Changes saved');
      return true;
    } catch (error) {
      if (error.code === 'CURRENCY_LOCKED') {
        setCurrencyError(CURRENCY_LOCKED);
        queryClient.invalidateQueries({ queryKey: queryKeys.me });
      } else if (field === 'name' && error.details?.some((detail) => detail.field === 'name')) {
        setNameError(error.details.find((detail) => detail.field === 'name').message);
      } else {
        toast.error(errorMessage(error));
      }
      return false;
    } finally {
      setSaving(null);
    }
  }

  function saveName() {
    const trimmed = name.trim();
    if (trimmed === '') {
      setNameError('Enter your name.');
    } else if (trimmed.length > 80) {
      setNameError('Use 1 to 80 characters.');
    } else {
      setNameError(null);
      if (trimmed !== user.name) {
        save('name', { name: trimmed });
      }
    }
  }

  const CurrencyIcon = currencyIcon(user.currency);
  const currency = CURRENCIES.find((item) => item.value === user.currency);

  return (
    <section className="card max-w-[640px] p-[22px]" aria-label="Settings">
      <TextField
        label="Name"
        icon={IconUser}
        autoComplete="name"
        value={name}
        error={nameError}
        onChange={(event) => setName(event.target.value)}
        onBlur={saveName}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
      <TextField label="Email" icon={IconMail} value={user.email} readOnly hint="Your login. It can't be changed." />
      <TimeZoneField
        id="settings-time-zone"
        label="Time zone"
        value={user.timeZone}
        onChange={(timeZone) => save('timeZone', { timeZone })}
        showOffset
        hint="Sets what “today” is for reminders."
      />
      {user.currencyLocked ? (
        <TextField
          label="Currency"
          icon={CurrencyIcon}
          value={`${currency.value} · ${currency.label}`}
          disabled
          hint={CURRENCY_LOCKED}
        />
      ) : (
        <SelectField
          id="settings-currency"
          label="Currency"
          icon={CurrencyIcon}
          value={user.currency}
          error={currencyError}
          disabled={saving === 'currency'}
          onChange={(event) => save('currency', { currency: event.target.value })}
        >
          {CURRENCIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.value} · {item.label}
            </option>
          ))}
        </SelectField>
      )}

      {editingReminders ? (
        <DefaultRemindersEditor
          initial={user.defaultReminderDays}
          saving={saving === 'reminders'}
          onCancel={() => setEditingReminders(false)}
          onSave={async (days) => {
            if (await save('reminders', { defaultReminderDays: days })) {
              setEditingReminders(false);
            }
          }}
        />
      ) : (
        <SettingRow title="Default reminders" detail={reminderSummary(user.defaultReminderDays)}>
          <button type="button" className="link" onClick={() => setEditingReminders(true)} aria-label="Edit default reminders">
            Edit
          </button>
        </SettingRow>
      )}
      <SettingRow title="Reminder emails" titleId="reminder-emails-title" detail={user.remindersEnabled ? 'On' : 'Off'}>
        <Switch
          checked={user.remindersEnabled}
          labelledBy="reminder-emails-title"
          busy={saving === 'remindersEnabled'}
          onChange={(checked) => save('remindersEnabled', { remindersEnabled: checked })}
        />
      </SettingRow>
      <SettingRow title="Password" detail="Needs your current password">
        <button type="button" className="btn btn-line btn-sm" disabled={user.isDemo} onClick={() => setDialog('password')}>
          Change
        </button>
      </SettingRow>
      <SettingRow title="Delete account" detail="Removes all your data" danger>
        <button
          type="button"
          className="btn btn-line px-3 py-[7px] text-red"
          disabled={user.isDemo}
          onClick={() => setDialog('delete')}
        >
          Delete
        </button>
      </SettingRow>
      {user.isDemo && (
        <div className="note note-gray mt-3">
          <IconLock size={19} aria-hidden="true" />
          <div>Demo accounts can't change the password or be deleted. Everything else works as usual.</div>
        </div>
      )}

      <ChangePasswordDialog open={dialog === 'password'} onClose={() => setDialog(null)} />
      <DeleteAccountDialog open={dialog === 'delete'} onClose={() => setDialog(null)} />
    </section>
  );
}

/** One Settings row: title and detail on the left, the control on the right. titleId lets a control without text (the switch) be named by the title. */
function SettingRow({ title, titleId, detail, danger = false, children }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-[13px]">
      <div className="flex-1">
        <b id={titleId} className={`block font-semibold ${danger ? 'text-red' : 'text-navy'}`}>
          {title}
        </b>
        <span className="text-[13px] text-muted">{detail}</span>
      </div>
      {children}
    </div>
  );
}

/** "Edit" on Default reminders: the same chips as the drawer, with Save and Cancel. */
function DefaultRemindersEditor({ initial, saving, onCancel, onSave }) {
  const [days, setDays] = useState(initial);
  const [error, setError] = useState(null);

  function submit() {
    if (days.length === 0) {
      setError('Pick at least one reminder, or turn reminders off in Settings.');
      return;
    }
    onSave(days);
  }

  return (
    <fieldset className="border-t border-line py-[13px]" aria-describedby={error ? 'default-reminders-error' : undefined}>
      <legend className="sr-only">Default reminders</legend>
      <b className="mb-2 block font-semibold text-navy" aria-hidden="true">
        Default reminders
      </b>
      <div className="flex flex-wrap gap-2">
        {REMINDER_CHIPS.map((chip) => {
          const on = days.includes(chip.value);
          return (
            <button
              key={chip.value}
              type="button"
              className="chip"
              aria-pressed={on}
              onClick={() => {
                setError(null);
                setDays(on ? days.filter((day) => day !== chip.value) : [...days, chip.value]);
              }}
            >
              {on && <IconCheck size={15} aria-hidden="true" />} {chip.label}
            </button>
          );
        })}
      </div>
      <FieldMessages errorId="default-reminders-error" error={error} hintId="default-reminders-hint" hint="New subscriptions start with these." />
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={submit}>
          Save
        </button>
        <button type="button" className="btn btn-line btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </fieldset>
  );
}
