import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquare,
  Repeat,
  Settings,
  Star,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../auth/context';
import { useAddons, useTheme } from '../theme/context';
import { useClients } from '../data/queries';
import { IS_MOCK } from '../data';
import { Avatar } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/conversations', label: 'Conversations', icon: MessageSquare },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays, addon: 'booking' },
  { to: '/follow-ups', label: 'Follow-ups', icon: Repeat, addon: 'automated_followup' },
  { to: '/reviews', label: 'Reviews', icon: Star, addon: 'review_generation' },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function BrandMark() {
  const { brand } = useTheme();
  return (
    <div className="flex items-center gap-3">
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-1" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          {brand.name.slice(0, 1)}
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{brand.name}</p>
        <p className="text-[11px] text-white/60">Powered by Torem AI</p>
      </div>
    </div>
  );
}

function Nav({ onNavigate }) {
  const { isAdmin } = useAuth();
  const { enabled } = useAddons();
  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end, addon }) => (
        <NavLink key={to} to={to} end={end} className={link} onClick={onNavigate}>
          <Icon className="h-4 w-4" />
          <span className="flex-1">{label}</span>
          {addon && !enabled(addon) && <Lock className="h-3.5 w-3.5 text-white/40" />}
        </NavLink>
      ))}
      {isAdmin && (
        <>
          <p className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Agency</p>
          <NavLink to="/admin/clients" className={link} onClick={onNavigate}>
            <Building2 className="h-4 w-4" />
            <span className="flex-1">Clients</span>
          </NavLink>
        </>
      )}
    </nav>
  );
}

function ClientSwitcher() {
  const { isAdmin, activeClientId, setActiveClientId } = useAuth();
  const { data: clients } = useClients(isAdmin);
  const navigate = useNavigate();
  if (!isAdmin) return null;
  return (
    <label className="relative">
      <span className="sr-only">Viewing as</span>
      <select
        className="input appearance-none pr-8 sm:min-w-56"
        value={activeClientId ?? ''}
        onChange={(e) => {
          setActiveClientId(e.target.value || null);
          navigate('/');
        }}
      >
        <option value="">All clients (agency view)</option>
        {(clients ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.business_name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-muted" />
    </label>
  );
}

function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-3" onClick={() => setOpen((o) => !o)}>
        <Avatar name={profile?.full_name ?? user?.email} />
        <span className="hidden text-sm font-medium sm:block">{profile?.full_name ?? user?.email}</span>
        <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="card absolute right-0 z-20 mt-2 w-56 p-1">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{profile?.full_name}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{profile?.role}</p>
            </div>
            <button className="btn-ghost w-full justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-navy p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <BrandMark />
        <div className="mt-6 flex flex-1 flex-col">
          <Nav />
        </div>
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy p-4">
            <div className="flex items-center justify-between">
              <BrandMark />
              <button className="text-white/70" onClick={() => setDrawer(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 flex flex-1 flex-col">
              <Nav onNavigate={() => setDrawer(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6">
          <button className="btn-ghost -ml-2 px-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <ClientSwitcher />
          <div className="flex-1" />
          {IS_MOCK && (
            <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-warning-ink sm:inline">
              Demo data
            </span>
          )}
          <UserMenu />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
