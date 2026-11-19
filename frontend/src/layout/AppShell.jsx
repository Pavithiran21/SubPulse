import {
  IconCalendarMonth,
  IconHistory,
  IconListDetails,
  IconLogout,
  IconMenu2,
  IconPlus,
  IconSettings,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { BandLogo } from '../components/Logo';
import { Menu } from '../components/Menu';
import { PhoneCalendarHeader } from '../features/calendar/PhoneCalendarHeader';
import { SummaryRow } from '../features/calendar/SummaryRow';
import { SubscriptionDrawer } from '../features/drawer/SubscriptionDrawer';
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { DrawerContext } from './DrawerContext';

const TABS = [
  { to: '/', label: 'Calendar', icon: IconCalendarMonth, end: true },
  { to: '/subscriptions', label: 'Subscriptions', icon: IconListDetails },
  { to: '/history', label: 'History', icon: IconHistory },
  { to: '/settings', label: 'Settings', icon: IconSettings },
];

const PAGE_TITLES = { '/subscriptions': 'Subscriptions', '/history': 'History', '/settings': 'Settings' };

/**
 * The logged-in layout (UI-UX.md screen 5 and 13): the gradient band holds the navigation and
 * the page's summary; the page's cards overlap the band's wave edge.
 * - Desktop: logo, four tabs, "Add subscription" and the avatar menu. Tablet keeps the first three tabs.
 * - Phone: logo, title, "+" and a menu sheet with the four tabs and Log out; no tab bar.
 *
 * The shell owns the one subscription drawer. /subscriptions/:id (the "View subscription" link in
 * reminder emails) opens it from the URL, read only; closing it goes back to /subscriptions.
 */
export function AppShell() {
  const isPhone = useMediaQuery(PHONE_QUERY);
  const location = useLocation();
  const navigate = useNavigate();
  const linkMatch = useMatch('/subscriptions/:id');
  const [drawer, setDrawer] = useState(null); // null, { mode: 'add' }, or { mode: 'view' | 'edit', id }

  const linkedId = linkMatch?.params.id;
  const openDrawer = linkedId ? { mode: 'view', id: linkedId, fromLink: true } : drawer;

  const drawerApi = useMemo(
    () => ({
      openAdd: () => setDrawer({ mode: 'add' }),
      openView: (id) => setDrawer({ mode: 'view', id: String(id) }),
      openEdit: (id) => setDrawer({ mode: 'edit', id: String(id) }),
    }),
    [],
  );

  function closeDrawer() {
    if (linkedId) {
      navigate('/subscriptions');
    } else {
      setDrawer(null);
    }
  }

  const isCalendar = location.pathname === '/';
  const title = PAGE_TITLES[location.pathname] ?? (linkedId ? 'Subscriptions' : '');

  return (
    <DrawerContext value={drawerApi}>
      <div className="min-h-dvh">
        <header className="band pb-[70px]">
          <div className="mx-auto max-w-[1240px]">
            {isPhone ? (
              <PhoneTopRow title={isCalendar ? null : title} onAdd={drawerApi.openAdd} />
            ) : (
              <TopNav onAdd={drawerApi.openAdd} />
            )}
            {isCalendar && (isPhone ? <PhoneCalendarHeader /> : <SummaryRow />)}
            {!isCalendar && title && <h1 className="px-[14px] pt-1.5 pb-2 text-[26px] text-white tab:px-[26px]">{title}</h1>}
          </div>
        </header>
        <main className="relative z-10 mx-auto -mt-[50px] max-w-[1240px] px-[14px] pb-12 tab:px-[26px]">
          <Outlet />
        </main>
      </div>
      {openDrawer && (
        <SubscriptionDrawer
          key={openDrawer.mode === 'add' ? 'add' : `${openDrawer.mode}-${openDrawer.id}`}
          mode={openDrawer.mode}
          subscriptionId={openDrawer.id}
          fromLink={openDrawer.fromLink}
          onClose={closeDrawer}
        />
      )}
    </DrawerContext>
  );
}

function TopNav({ onAdd }) {
  return (
    <div className="flex items-center gap-[18px] px-[26px] py-4">
      <div className="flex items-center gap-2.5 font-display text-xl font-bold">
        <BandLogo size={30} /> SubPulse
      </div>
      <nav aria-label="Main" className="mr-auto ml-3 flex gap-1">
        {TABS.map((tab, index) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            // Tablet keeps the first three tabs; Settings stays in the avatar menu.
            className={({ isActive }) =>
              `items-center gap-[7px] rounded-[10px] px-[13px] py-2 text-sm font-semibold whitespace-nowrap ${
                index >= 3 ? 'hidden desk:flex' : 'flex'
              } ${isActive ? 'bg-white/16 text-white' : 'text-band-text hover:text-white'}`
            }
          >
            <tab.icon size={18} aria-hidden="true" /> {tab.label}
          </NavLink>
        ))}
      </nav>
      <button type="button" className="btn btn-white px-3.5 py-[9px]" onClick={onAdd}>
        <IconPlus size={18} aria-hidden="true" /> Add subscription
      </button>
      <AvatarMenu />
    </div>
  );
}

function AvatarMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Menu
      label="Account"
      buttonClassName="grid size-[38px] place-items-center rounded-full bg-white font-display text-[15px] font-bold text-brand-d"
      buttonContent={<span aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</span>}
      header={
        <>
          <div className="px-2.5 pt-1.5 pb-1">
            <div className="font-display text-sm font-semibold text-navy">{user.name}</div>
            <div className="text-[13px] text-muted">{user.email}</div>
          </div>
          <hr className="mx-1 my-[5px] border-line" />
        </>
      }
      items={[
        { key: 'settings', label: 'Settings', icon: IconSettings, onSelect: () => navigate('/settings') },
        { key: 'logout', label: 'Log out', icon: IconLogout, onSelect: logout },
      ]}
    />
  );
}

/** Phone: logo, the page title (the month on the calendar), "+" and the menu sheet. */
function PhoneTopRow({ title, onAdd }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 px-4 pt-3">
      <BandLogo size={24} />
      <span className="flex-1 truncate font-display font-semibold">{title ?? <CalendarMonthTitle />}</span>
      <button type="button" className="icon-btn-band" aria-label="Add subscription" onClick={onAdd}>
        <IconPlus size={22} aria-hidden="true" />
      </button>
      <Menu
        label="Menu"
        buttonClassName="icon-btn-band"
        buttonContent={<IconMenu2 size={22} aria-hidden="true" />}
        items={[
          ...TABS.map((tab) => ({ key: tab.to, label: tab.label, icon: tab.icon, onSelect: () => navigate(tab.to) })),
          { key: 'logout', label: 'Log out', icon: IconLogout, onSelect: logout, separatorBefore: true },
        ]}
      />
    </div>
  );
}

/** "October": this month in the user's time zone. */
function CalendarMonthTitle() {
  const { user } = useAuth();
  return new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: user.timeZone }).format(new Date());
}
