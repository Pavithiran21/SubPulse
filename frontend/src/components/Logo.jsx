import { useId } from 'react';

/**
 * The SubPulse logo from design/ui-sample.html: a blue calendar tile with binder rings, a white
 * page carrying a blue-to-green pulse line, and a green check badge ("reminded on time").
 * Gradient ids are made unique per instance, because two logos on a page would otherwise clash.
 */
export function Logo({ size = 32, className }) {
  const id = useId();
  const tile = `${id}-tile`;
  const pulse = `${id}-pulse`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4c6ef5" />
          <stop offset="1" stopColor="#1d39c4" />
        </linearGradient>
        <linearGradient id={pulse} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2f54eb" />
          <stop offset="1" stopColor="#0b8a5a" />
        </linearGradient>
      </defs>
      <rect x="4" y="9" width="56" height="51" rx="15" fill={`url(#${tile})`} />
      <rect x="9" y="22" width="46" height="33" rx="9" fill="#fff" />
      <rect x="17" y="4" width="7" height="13" rx="3.5" fill="#0b1736" />
      <rect x="40" y="4" width="7" height="13" rx="3.5" fill="#0b1736" />
      <circle cx="20.5" cy="15.5" r="1.6" fill="#fff" fillOpacity=".6" />
      <circle cx="43.5" cy="15.5" r="1.6" fill="#fff" fillOpacity=".6" />
      <path
        d="M13 40h7l3.5-7 5 14 4.5-17 4 10h14"
        fill="none"
        stroke={`url(#${pulse})`}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="53" cy="53" r="9" fill="#0b8a5a" stroke="#fff" strokeWidth="3" />
      <path d="M49 53l2.8 2.8 5-5.3" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** On the gradient band the logo sits on a small white rounded backing (a larger one on Log in). */
export function BandLogo({ size = 30, large = false }) {
  return (
    <span className={`grid shrink-0 bg-white ${large ? 'rounded-[14px] p-1' : 'rounded-[11px] p-[3px]'}`}>
      <Logo size={size} />
    </span>
  );
}
