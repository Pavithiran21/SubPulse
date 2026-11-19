/**
 * The on/off control at the right end of a Settings row (design section 06). It has no text of
 * its own: labelledBy points at the row's title ("Reminder emails"), and screen readers read the
 * state from aria-checked as "on" or "off".
 *
 * While the change is saving it stays focusable but ignores presses (aria-disabled), so a
 * keyboard user keeps their place; a disabled button would drop focus to the page.
 */
export function Switch({ checked, labelledBy, onChange, busy = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-disabled={busy || undefined}
      className="switch"
      onClick={() => {
        if (!busy) {
          onChange(!checked);
        }
      }}
    >
      <span className="switch-knob" aria-hidden="true" />
    </button>
  );
}
