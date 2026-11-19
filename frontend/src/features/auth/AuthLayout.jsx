import { IconBuildingBank, IconBellRinging, IconCalendarCheck } from '@tabler/icons-react';
import { Outlet } from 'react-router';
import { BandLogo } from '../../components/Logo';

/** Guest pages (screen 1): blue band with the centred logo and headline, the card over its edge, the trust line below. */
export function AuthLayout() {
  return (
    <div className="min-h-dvh">
      <header className="band px-4 pt-[34px] pb-[150px] text-center">
        <div className="inline-flex items-center gap-2.5 font-display text-[22px] font-bold">
          <BandLogo size={36} large /> SubPulse
        </div>
        <h1 className="mt-[18px] mb-1.5 text-[28px] text-white tab:text-[34px]">Every renewal, on your calendar.</h1>
        <p className="text-base text-band-text">Track what you pay for and get reminded before it renews.</p>
      </header>
      <main className="relative z-10 -mt-[118px] px-4 pb-12">
        <Outlet />
        <ul className="mt-6 flex flex-wrap justify-center gap-x-[22px] gap-y-2 text-sm text-muted">
          <TrustItem icon={IconBuildingBank}>No bank linking</TrustItem>
          <TrustItem icon={IconBellRinging}>Reminders 7, 3, 1 day before</TrustItem>
          <TrustItem icon={IconCalendarCheck}>Month-end safe dates</TrustItem>
        </ul>
      </main>
    </div>
  );
}

function TrustItem({ icon: Icon, children }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon size={18} className="text-brand" aria-hidden="true" /> {children}
    </li>
  );
}

/** The white card on the band. banner is an optional note shown above it (Log in's banners). */
export function AuthCard({ banner, children }) {
  return (
    <div className="mx-auto max-w-[420px]">
      {banner && <div className="mb-3">{banner}</div>}
      <div className="card p-[22px] tab:p-[30px]">{children}</div>
    </div>
  );
}
