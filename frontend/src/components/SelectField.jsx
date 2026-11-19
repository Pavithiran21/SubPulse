import { IconChevronDown } from '@tabler/icons-react';
import { FieldMessages } from './TextField';

/**
 * A native <select> in the same style as TextField: label, icon, error and hint.
 * Works with React Hook Form: spread register('field') into it.
 */
export function SelectField({ id, label, icon: Icon, error, hint, children, className = 'mb-4', ...selectProps }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="input-wrap">
        <Icon size={18} className="input-icon" aria-hidden="true" />
        <select
          id={id}
          className="input appearance-none pr-10"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...selectProps}
        >
          {children}
        </select>
        <IconChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
      </div>
      <FieldMessages errorId={errorId} error={error} hintId={hintId} hint={hint} />
    </div>
  );
}
