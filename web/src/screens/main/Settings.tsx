import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth';

interface Settings {
  notifyMatches: boolean; notifyMessages: boolean; notifyLikes: boolean;
  notifyPlaces: boolean; notifyEvents: boolean;
  readReceipts: boolean; activeStatus: boolean;
  showMeOnPlaces: boolean;
  visibility: 'everyone' | 'liked_only' | 'spot_only';
}

/**
 * Settings — account status controls, notification toggles, visibility.
 * All flips PUT to /settings or PUT /account/status right away.
 */
export function Settings() {
  const nav = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const [s, setS] = useState<Settings | null>(null);

  useEffect(() => { api.get<Settings>('/settings').then(setS).catch(() => undefined); }, []);

  async function toggle(key: keyof Settings) {
    if (!s) return;
    const next = { ...s, [key]: !s[key] } as Settings;
    setS(next);
    await api.put('/settings', { [key]: next[key] });
  }
  async function setVisibility(v: Settings['visibility']) {
    if (!s) return;
    setS({ ...s, visibility: v });
    await api.put('/settings', { visibility: v });
  }
  async function setStatus(status: 'active' | 'paused' | 'hidden') {
    await api.put('/account/status', { status });
    if (user) setUser({ ...user, status });
  }
  async function del() {
    if (!confirm('Delete your account? You can undo within 30 days by signing in.')) return;
    await api.delete('/account');
    useAuthStore.getState().clear();
    nav('/splash', { replace: true });
  }

  if (!s) return <div className="page" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>loading…</div>;

  return (
    <div className="page">
      <div className="top-bar">
        <div><h1>settings</h1></div>
        <div className="actions">
          <button className="btn soft" onClick={() => nav('/me')} style={{ padding: '8px 14px' }}>
            <Icon name="back" size={16} /> back
          </button>
        </div>
      </div>

      <Section label="account">
        <Row label="status" value={user?.status ?? '—'} />
        <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--line)' }}>
          <button onClick={() => setStatus('active')} className={`chip ${user?.status === 'active' ? 'solid' : ''}`}>active</button>
          <button onClick={() => setStatus('paused')} className={`chip ${user?.status === 'paused' ? 'solid' : ''}`}>paused</button>
          <button onClick={() => setStatus('hidden')} className={`chip ${user?.status === 'hidden' ? 'solid' : ''}`}>hidden</button>
        </div>
      </Section>

      <Section label="who sees me">
        <ToggleRow label="everyone" sub="standard. most matches." on={s.visibility === 'everyone'} onClick={() => setVisibility('everyone')} />
        <ToggleRow label="only people i've liked" sub="i swipe first." on={s.visibility === 'liked_only'} onClick={() => setVisibility('liked_only')} />
        <ToggleRow label="only people at my spot" sub="hyper-local." on={s.visibility === 'spot_only'} onClick={() => setVisibility('spot_only')} last />
      </Section>

      <Section label="notifications">
        <Switch label="new matches" on={s.notifyMatches} onToggle={() => toggle('notifyMatches')} />
        <Switch label="new messages" on={s.notifyMessages} onToggle={() => toggle('notifyMessages')} />
        <Switch label="new likes" on={s.notifyLikes} onToggle={() => toggle('notifyLikes')} />
        <Switch label="people at my spot" on={s.notifyPlaces} onToggle={() => toggle('notifyPlaces')} />
        <Switch label="event reminders" on={s.notifyEvents} onToggle={() => toggle('notifyEvents')} last />
      </Section>

      <Section label="privacy">
        <Switch label="read receipts" on={s.readReceipts} onToggle={() => toggle('readReceipts')} />
        <Switch label="active status" on={s.activeStatus} onToggle={() => toggle('activeStatus')} />
        <Switch label="show me on Places" on={s.showMeOnPlaces} onToggle={() => toggle('showMeOnPlaces')} last />
      </Section>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={del} className="btn ghost" style={{ color: 'var(--coral)', fontSize: 14 }}>delete account</button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="eyebrow" style={{ marginTop: 20, marginBottom: 8 }}>{label}</div>
      <div className="card" style={{ padding: 0 }}>{children}</div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
      <div style={{ color: 'var(--ink-3)', fontSize: 13.5 }}>{value}</div>
    </div>
  );
}

function ToggleRow({ label, sub, on, onClick, last }: { label: string; sub?: string; on: boolean; onClick: () => void; last?: boolean }) {
  return (
    <div onClick={onClick} style={{
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: last ? 'none' : '1px solid var(--line)', cursor: 'pointer',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500 }}>{label}</div>
        {sub && <div className="meta" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{
        width: 22, height: 22, borderRadius: 999,
        border: `2px solid ${on ? 'var(--coral)' : 'var(--line-2)'}`,
        background: on ? 'var(--coral)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {on && <i style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }} />}
      </div>
    </div>
  );
}

function Switch({ label, on, onToggle, last }: { label: string; on: boolean; onToggle: () => void; last?: boolean }) {
  return (
    <div onClick={onToggle} style={{
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: last ? 'none' : '1px solid var(--line)', cursor: 'pointer',
    }}>
      <div style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>{label}</div>
      <div style={{
        width: 46, height: 28, borderRadius: 999,
        background: on ? 'var(--coral)' : 'rgba(0,0,0,0.12)',
        position: 'relative', transition: 'background 150ms',
      }}>
        <div style={{
          position: 'absolute', top: 3, left: on ? 21 : 3,
          width: 22, height: 22, borderRadius: 999, background: '#fff',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)', transition: 'left 150ms',
        }} />
      </div>
    </div>
  );
}
