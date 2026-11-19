import { IconCircleCheck, IconClock, IconHandStop, IconUserX } from '@tabler/icons-react';

// The banners Log in can show above its card (UI-UX.md screen 1).
const BANNERS = {
  'password-reset': {
    tone: 'green',
    icon: IconCircleCheck,
    text: (
      <>
        <b>Password changed.</b> Log in with your new password.
      </>
    ),
  },
  'session-ended': { tone: 'blue', icon: IconClock, text: 'Your session has ended. Log in again.' },
  'account-deleted': { tone: 'gray', icon: IconUserX, text: 'Your account was deleted.' },
  'too-many-attempts': {
    tone: 'red',
    icon: IconHandStop,
    text: 'Too many attempts. Please wait a few minutes and try again.',
    alert: true,
  },
};

export function LoginBanner({ kind }) {
  const banner = BANNERS[kind];
  if (!banner) {
    return null;
  }
  const Icon = banner.icon;
  return (
    <div className={`note note-${banner.tone}`} role={banner.alert ? 'alert' : 'status'}>
      <Icon size={19} aria-hidden="true" />
      <div>{banner.text}</div>
    </div>
  );
}
