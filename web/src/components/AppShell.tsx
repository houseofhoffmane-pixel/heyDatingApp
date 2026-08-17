import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Icon, IconName } from './Icon';
import { Avatar } from './Avatar';
import { useAuthStore } from '../stores/auth';
import { api } from '../api/client';
import { useSocketEvent } from '../hooks/useSocket';

type TabId = 'discover' | 'chats' | 'me';

const TABS: { id: TabId; label: string; icon: IconName; iconActive: IconName; path: string }[] = [
  { id: 'discover', label: 'Discover', icon: 'flame', iconActive: 'flame',    path: '/discover' },
  { id: 'chats',    label: 'Chats',    icon: 'chat',  iconActive: 'chat',     path: '/chats' },
  { id: 'me',       label: 'Me',       icon: 'user',  iconActive: 'userFill', path: '/me' },
];

interface MePreview { name: string | null; mainPhotoUrl: string | null; }

/**
 * App shell — side nav on ≥1024px (Discover / Chats / Me), bottom tab
 * bar on narrower viewports. All auth-required pages render inside the
 * shell via <Outlet />.
 *
 * Places + Events tabs were removed with those modules in Sprint 1.
 *
 * Redirects unauthenticated users to /splash and onboarding-status users
 * to /onboarding. Unread badge count comes from GET /notifications
 * (unreadTotal in meta) + live `notification:new` WS bumps.
 */
export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [me, setMe] = useState<MePreview>({ name: null, mainPhotoUrl: null });

  useEffect(() => {
    if (!user) { navigate('/splash', { replace: true }); return; }
    if (user.status === 'onboarding') { navigate('/onboarding', { replace: true }); return; }
  }, [user, navigate]);

  // Initial badge counts.
  useEffect(() => {
    if (!user) return;
    api.get<{ data: unknown[]; meta: { unreadTotal: number } }>('/notifications?limit=1')
      .then((r) => setUnread(r.meta.unreadTotal))
      .catch(() => undefined);
    api.get<{ data: Array<{ unread: number }> }>('/matches')
      .then((r) => setChatUnread(r.data.reduce((s, m) => s + m.unread, 0)))
      .catch(() => undefined);
    api.get<{ name: string | null; photos?: Array<{ url: string; isMain: boolean }> }>('/me')
      .then((r) => setMe({
        name: r.name,
        mainPhotoUrl: r.photos?.find((p) => p.isMain)?.url ?? r.photos?.[0]?.url ?? null,
      }))
      .catch(() => undefined);
  }, [user?.id]);

  // Live bumps.
  useSocketEvent('notification:new', () => setUnread((n) => n + 1));
  useSocketEvent('message:new', (msg: { senderId: string }) => {
    if (user && msg.senderId !== user.id) setChatUnread((n) => n + 1);
  });
  useSocketEvent('match:new', () => setUnread((n) => n + 1));

  if (!user || user.status === 'onboarding') return null;

  return (
    <div className="app-shell">
      {/* Side nav — desktop */}
      <aside className="app-nav side-nav" aria-label="Primary">
        <div className="side-brand">hey<span className="dot" /></div>
        {TABS.map((t) => {
          const active = location.pathname.startsWith(t.path);
          const badge = t.id === 'chats' ? chatUnread : 0;
          return (
            <NavLink key={t.id} to={t.path} className={`side-link ${active ? 'active' : ''}`}>
              <Icon name={active ? t.iconActive : t.icon} size={20} />
              <span>{t.label}</span>
              {badge > 0 && <span className="badge">{badge}</span>}
            </NavLink>
          );
        })}
        <div style={{ flex: 1 }} />
        <NavLink to="/me" className="side-me">
          <Avatar src={me.mainPhotoUrl} name={me.name ?? 'me'} size={40} />
          <div className="who">
            <div className="name">{me.name ?? 'you'}</div>
            <div className="sub">{user.status}</div>
          </div>
          <Icon name="chevron" size={16} color="var(--ink-3)" />
        </NavLink>
      </aside>

      {/* Main content */}
      <main className="app-main">
        <Outlet />
      </main>

      {/* Bottom tab bar — mobile */}
      <nav className="app-nav bottom-nav" aria-label="Primary mobile">
        {TABS.map((t) => {
          const active = location.pathname.startsWith(t.path);
          const showBadge = t.id === 'chats' && chatUnread > 0;
          return (
            <button key={t.id} className={active ? 'active' : ''} onClick={() => navigate(t.path)}>
              {showBadge && <span className="badge-dot" />}
              <Icon name={active ? t.iconActive : t.icon} size={22} />
              <div>{t.label}</div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
