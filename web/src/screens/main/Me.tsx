import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Icon } from '../../components/Icon';
import { Photo } from '../../components/Photo';
import { useAuthStore } from '../../stores/auth';

interface Me {
  name: string | null; age: number | null; bio: string | null;
  photos: { id: string; url: string; position: number; isMain: boolean }[];
  interests: { id: string; label: string }[];
  prompts: { id: string; prompt: { text: string }; answer: string }[];
  account: { status: string; visibility: string };
  completeness: { percent: number };
}

/**
 * Me — owner-side profile view. Big hero photo, edit + status buttons,
 * completion ring, saved-spots / favourite-events strips. Uses the
 * ProfileShaper.toOwner shape from GET /me.
 */
export function Me() {
  const nav = useNavigate();
  const clear = useAuthStore((s) => s.clear);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => { api.get<Me>('/me').then(setMe).catch(() => undefined); }, []);

  if (!me) return <div className="page" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>loading…</div>;

  const mainPhoto = me.photos.find((p) => p.isMain) ?? me.photos[0];
  const pct = me.completeness?.percent ?? 100;

  return (
    <div className="page">
      <div className="top-bar">
        <div>
          <h1>me</h1>
          <div className="sub">{me.account.status}</div>
        </div>
        <div className="actions">
          <button className="btn soft" onClick={() => nav('/settings')} style={{ padding: '8px 14px' }}>
            <Icon name="settings" size={16} /> settings
          </button>
        </div>
      </div>

      <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', height: 400 }}>
        <Photo src={mainPhoto?.url} name={me.name ?? 'you'} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '80px 20px 20px', color: '#fff',
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55))',
        }}>
          <div className="h-display" style={{ color: '#fff', fontSize: 32, letterSpacing: '-0.03em' }}>
            {me.name}{me.age ? `, ${me.age}` : ''}
          </div>
        </div>

        <div style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.95)', borderRadius: 999,
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 600,
        }}>
          <svg width={22} height={22} viewBox="0 0 22 22">
            <circle cx="11" cy="11" r="9" stroke="rgba(0,0,0,0.1)" strokeWidth="2.5" fill="none" />
            <circle cx="11" cy="11" r="9" stroke="var(--coral)" strokeWidth="2.5" fill="none"
              strokeDasharray={`${(pct / 100) * 56.5} 100`} transform="rotate(-90 11 11)" strokeLinecap="round" />
          </svg>
          <span>{pct}% complete</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={() => nav('/settings')} className="btn soft" style={{ flex: 1 }}>
          <Icon name="edit" size={14} /> edit profile
        </button>
        <button onClick={() => nav('/settings')} className="btn soft" style={{ flex: 1 }}>
          <Icon name="clock" size={14} /> pause
        </button>
      </div>

      {me.bio && (
        <div className="card" style={{ marginTop: 16, background: 'var(--peach)', border: 'none' }}>
          <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>your bio</div>
          <div className="h-display" style={{ marginTop: 6, fontSize: 20, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
            "{me.bio}"
          </div>
        </div>
      )}

      {me.interests.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="eyebrow">into</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {me.interests.map((it, i) => (
              <span key={it.id} className={`chip ${['peach', 'mint', 'sky', 'butter', 'lilac'][i % 5]}`}>{it.label}</span>
            ))}
          </div>
        </div>
      )}

      {me.prompts.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {me.prompts.map((p, i) => (
            <div key={p.id} className="card" style={{ background: `var(--${['mint', 'lilac', 'butter'][i % 3]})`, border: 'none' }}>
              <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>{p.prompt.text}</div>
              <div className="h-display" style={{ marginTop: 6, fontSize: 18, lineHeight: 1.25, letterSpacing: '-0.015em' }}>
                {p.answer}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button onClick={() => { clear(); nav('/splash', { replace: true }); }} className="btn ghost"
          style={{ color: 'var(--coral)', fontSize: 14 }}>
          log out
        </button>
      </div>
    </div>
  );
}
