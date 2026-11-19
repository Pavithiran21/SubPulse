import { IconWorld } from '@tabler/icons-react';
import { useId, useState } from 'react';
import { findTimeZone, listTimeZones, utcOffsetLabel } from '../lib/timeZones';
import { TextField } from './TextField';

/**
 * The time zone field on Create account and Settings: SubPulse's text field with the browser's
 * own suggestion list (<datalist>). Typing "kolk" suggests Asia/Kolkata, and the browser does the
 * filtering and the arrow keys. With showOffset (Settings, which has the width for it) the zone's
 * UTC offset sits at the right of the box, like the currency code on Amount; Create account's
 * half-width box shows the name only, as in the design.
 *
 * onChange only ever gets a zone from the list. A datalist only suggests entries that match what
 * is already in the box, so the box is emptied while it has focus (the saved zone stays visible as
 * the placeholder), and leaving without picking a zone puts the saved one back.
 */
export function TimeZoneField({ id, label, value, onChange, onBlur, error, hint, ref, showOffset = false }) {
  const listId = useId();
  const [typed, setTyped] = useState(null); // null while the box isn't being edited

  function handleChange(event) {
    const text = event.target.value;
    setTyped(text);
    const zone = findTimeZone(text);
    if (zone && zone !== value) {
      onChange(zone);
    }
  }

  return (
    <>
      <TextField
        id={id}
        ref={ref}
        label={label}
        icon={IconWorld}
        suffix={showOffset && typed === null && value ? utcOffsetLabel(value) : undefined}
        list={listId}
        autoComplete="off"
        spellCheck={false}
        value={typed ?? value}
        placeholder={value || 'Type a city, like Kolkata'}
        error={error}
        hint={hint}
        onFocus={() => setTyped('')}
        onChange={handleChange}
        onBlur={() => {
          setTyped(null);
          onBlur?.();
        }}
      />
      <datalist id={listId}>
        {listTimeZones().map((zone) => (
          <option key={zone.name} value={zone.name}>
            {zone.offset}
          </option>
        ))}
      </datalist>
    </>
  );
}
