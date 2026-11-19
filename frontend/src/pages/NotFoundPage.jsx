import { IconSearchOff } from '@tabler/icons-react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="card max-w-[420px] p-[30px] text-center">
        <Logo size={56} className="mx-auto" />
        <h1 className="mt-3 mb-1 flex items-center justify-center gap-2 text-2xl">
          <IconSearchOff size={24} className="text-muted" aria-hidden="true" /> Page not found
        </h1>
        <p className="mb-5 text-muted">That page doesn't exist. It may have moved.</p>
        <Link to="/" className="btn btn-primary">
          Go to your calendar
        </Link>
      </div>
    </main>
  );
}
