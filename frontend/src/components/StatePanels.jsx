import { IconRefresh, IconWifiOff } from '@tabler/icons-react';
import { Logo } from './Logo';

// The empty, loading and error panels from UI-UX.md "States".

/** "Loading your calendar…" with skeleton bars. */
export function LoadingCard({ label, className = '' }) {
  return (
    <section className={`card p-[22px] ${className}`} aria-busy="true">
      <p className="text-[13px] text-muted">{label}</p>
      <div className="skel w-[45%]" style={{ height: 20 }} />
      <div className="skel" />
      <div className="skel w-[70%]" />
    </section>
  );
}

/** Skeleton rows for a table or list that is loading. */
export function SkeletonRows({ rows = 3, label }) {
  return (
    <div className="px-5 py-3" aria-busy="true">
      {label && <p className="sr-only">{label}</p>}
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 py-2">
          <div className="skel my-0 size-9 shrink-0 rounded-[10px]" />
          <div className="flex-1">
            <div className="skel my-1 w-[40%]" />
            <div className="skel my-1 w-[25%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Red-edged card: "Couldn't load your subscriptions" with "Try again". */
export function ErrorPanel({ title = "Couldn't load your subscriptions", onRetry, className = '' }) {
  return (
    <section className={`card border-[#f5c2c2] p-[22px] ${className}`} role="alert">
      <div className="flex gap-3">
        <IconWifiOff size={24} className="shrink-0 text-red" aria-hidden="true" />
        <div>
          <b className="text-navy">{title}</b>
          <div className="text-sm text-muted">Check your connection and try again.</div>
          <button type="button" className="btn btn-line mt-2.5" onClick={onRetry}>
            <IconRefresh size={18} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    </section>
  );
}

/** Centred empty state with the logo, as on the empty calendar. */
export function EmptyPanel({ title, text, action, showLogo = true, className = '' }) {
  return (
    <div className={`px-5 py-10 text-center ${className}`}>
      {showLogo && <Logo size={64} className="mx-auto" />}
      <h3 className="mt-2 mb-1 text-lg">{title}</h3>
      {text && <p className="mb-3.5 text-sm text-muted">{text}</p>}
      {action}
    </div>
  );
}
