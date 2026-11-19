import { serviceColor, serviceInitial } from '../lib/serviceColor';

/** The rounded tile in the service's colour with its initial. Decorative: the name is always next to it. */
export function ServiceTile({ name, className = '' }) {
  return (
    <span className={`svc ${className}`} style={{ background: serviceColor(name) }} aria-hidden="true">
      {serviceInitial(name)}
    </span>
  );
}

/** "red", "amber", "green", "blue" or "gray". */
export function Pill({ tone, className = '', children }) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>;
}
