import { IconAlertCircle, IconEye, IconEyeOff } from '@tabler/icons-react';
import { useId, useState } from 'react';

/**
 * Label, icon, input, error and hint, wired for screen readers: the error and hint
 * are linked with aria-describedby and an error sets aria-invalid (UI-UX.md "Labels").
 * Works with React Hook Form: spread register('field') into it (ref is a normal prop in React 19).
 * suffix goes inside the box on the right (the currency code); trailing is a button there.
 */
export function TextField({
  label,
  icon: Icon,
  error,
  hint,
  id,
  suffix,
  trailing,
  labelExtra,
  className = 'mb-4',
  ...inputProps
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  // Room on the right for what sits inside the box: a 3-letter currency code or a button fits in
  // pr-12; a longer suffix such as the time zone's "UTC+05:30" needs pr-24.
  let paddingRight = '';
  if (suffix) {
    paddingRight = String(suffix).length > 3 ? 'pr-24' : 'pr-12';
  } else if (trailing) {
    paddingRight = 'pr-12';
  }

  return (
    <div className={className}>
      <label htmlFor={inputId} className="field-label">
        {label} {labelExtra}
      </label>
      <div className="input-wrap">
        {Icon && <Icon size={18} className="input-icon" aria-hidden="true" />}
        <input
          id={inputId}
          className={`input ${paddingRight}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
        {trailing && <span className="absolute top-1/2 right-1.5 -translate-y-1/2">{trailing}</span>}
      </div>
      <FieldMessages errorId={errorId} error={error} hintId={hintId} hint={hint} />
    </div>
  );
}

/** A password field with a show/hide button inside the box. */
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? IconEyeOff : IconEye;
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className="grid size-9 place-items-center rounded-lg text-icon"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          <Icon size={18} aria-hidden="true" />
        </button>
      }
    />
  );
}

/** The error (red, with an icon) and the hint under a field. */
export function FieldMessages({ errorId, error, hintId, hint }) {
  return (
    <>
      {error && (
        <p id={errorId} className="field-error">
          <IconAlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}
      {hint && (
        <div id={hintId} className="hint">
          {hint}
        </div>
      )}
    </>
  );
}
