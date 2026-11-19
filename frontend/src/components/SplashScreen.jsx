import { Logo } from './Logo';

export function SplashScreen() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <div className="flex flex-col items-center gap-3">
        <Logo size={64} />
        <p className="font-display text-navy">Loading SubPulse…</p>
      </div>
    </div>
  );
}
