import { IconAlertCircle, IconExternalLink, IconLoader2, IconMailOpened, IconUserCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getDemo } from '../../api/demo';
import { queryKeys } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';

/**
 * The "Demo" block under the Log in form: one "Log in as <role>" button per demo account (SubPulse
 * has one role, User), the account's email and password, and the Ethereal inbox its emails go to.
 * The backend answers only when it runs with DEMO_MODE=true; otherwise the request is a 404 and
 * nothing is shown. The password and the inbox login are demo-only, so showing them is on purpose.
 */
export function DemoLogin() {
  const { demoLogin } = useAuth();
  const demo = useQuery({
    queryKey: queryKeys.demo,
    queryFn: getDemo,
    retry: false, // A 404 means "demo mode is off", not a failure to retry.
    staleTime: Infinity,
  });
  const [pendingRole, setPendingRole] = useState(null);
  const [failed, setFailed] = useState(false);

  if (!demo.isSuccess) {
    return null;
  }

  async function logInAs(role) {
    setFailed(false);
    setPendingRole(role);
    try {
      await demoLogin(role); // GuestOnly then opens the calendar.
    } catch {
      setFailed(true);
      setPendingRole(null);
    }
  }

  const { accounts, inbox } = demo.data;

  return (
    <section aria-labelledby="demo-title">
      <div className="mt-5 mb-3 flex items-center gap-2.5 font-display text-xs font-semibold tracking-[.08em] text-muted uppercase before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        <span id="demo-title">Demo</span>
      </div>
      {accounts.map((account) => (
        <button
          key={account.role}
          type="button"
          className="btn btn-line w-full"
          disabled={pendingRole !== null}
          onClick={() => logInAs(account.role)}
        >
          {pendingRole === account.role ? (
            <>
              <IconLoader2 size={18} className="text-brand motion-safe:animate-spin" aria-hidden="true" /> Logging in…
            </>
          ) : (
            <>
              <IconUserCircle size={18} className="text-brand" aria-hidden="true" /> Log in as {account.role}
            </>
          )}
        </button>
      ))}
      <p className="hint text-center">A demo account with sample subscriptions.</p>
      {failed && (
        <p className="field-error justify-center" role="alert">
          <IconAlertCircle size={16} aria-hidden="true" /> Couldn't start the demo. Try again.
        </p>
      )}

      <div className="mt-3 rounded-xl border border-line bg-subtle px-4 py-3 text-[13px]">
        {accounts.map((account) => (
          <DemoCredentials
            key={account.role}
            label={`${account.role} account`}
            rows={[
              ['Email', account.email],
              ['Password', account.password],
            ]}
          />
        ))}
        <div className="mt-3 border-t border-line pt-3">
          <p className="flex items-center gap-1.5 font-semibold text-navy">
            <IconMailOpened size={16} className="text-brand" aria-hidden="true" /> Demo emails
          </p>
          <p className="mt-0.5 text-muted">Reminders for the demo account arrive in this Ethereal test inbox.</p>
          <DemoCredentials
            label="Demo inbox"
            rows={[
              ['Inbox', inbox.user],
              ['Password', inbox.pass],
            ]}
          />
          <a href={inbox.url} target="_blank" rel="noreferrer" className="link mt-1.5 inline-flex items-center gap-1">
            Open the demo inbox <IconExternalLink size={14} aria-hidden="true" />
            <span className="sr-only">(opens ethereal.email in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/** Label and value pairs, as a description list so screen readers read "Email, user@…". */
function DemoCredentials({ label, rows }) {
  return (
    <dl aria-label={label} className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      {rows.map(([name, value]) => (
        <div key={name} className="contents">
          <dt className="text-muted">{name}</dt>
          <dd className="font-medium [overflow-wrap:anywhere] text-navy">
            <BreakAfterAt text={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * At 375 px a long inbox address doesn't fit on one line: let it wrap after the "@" rather than
 * mid-word. <wbr> only marks the break; copied text stays exactly the address.
 */
function BreakAfterAt({ text }) {
  const at = text.indexOf('@');
  if (at < 0) {
    return text;
  }
  return (
    <>
      {text.slice(0, at + 1)}
      <wbr />
      {text.slice(at + 1)}
    </>
  );
}
