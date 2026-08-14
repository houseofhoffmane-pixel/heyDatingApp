import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon, IconName } from '../../components/Icon';
import { Avatar } from '../../components/Avatar';

interface PlaceRow {
  id: string; label: string; kind: string; vibe: string; address: string;
  icon: IconName; tone: string; hot: boolean;
  hereCount: number; distMi: number | null;
}

const KINDS: { v: string; l: string }[] = [
  { v: '', l: 'all' },
  { v: 'coffee', l: 'coffee' },
  { v: 'cocktail', l: 'cocktail' },
  { v: 'wine-bar', l: 'wine' },
  { v: 'gym', l: 'gym' },
  { v: 'park', l: 'park' },
  { v: 'live-music', l: 'music' },
  { v: 'bookshop', l: 'books' },
  { v: 'pizza', l: 'pizza' },
];

export function Places() {
  const nav = useNavigate();
  const [rows, setRows] = useState<PlaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function load(k: string) {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({ view: 'list', radiusKm: '25' });
      if (k) params.set('filters', k);
      const r = await api.get<{ data: PlaceRow[] }>(`/places?${params}`);
      setRows(r.data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not load spots.');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(kind); }, [kind]);

  return (
    <div className="page">
      <div className="top-bar">
        <div>
          <h1>out</h1>
          <div className="sub">people right here, right now</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {KINDS.map((k) => (
          <button key={k.v} onClick={() => setKind(k.v)}
            className={`chip ${kind === k.v ? 'solid' : ''}`}
            style={{ flexShrink: 0 }}>{k.l}</button>
        ))}
      </div>

      {err && <div style={{ color: 'var(--coral)', marginBottom: 12 }}>{err}</div>}

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>loading spots…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
          no spots match. try another kind.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {rows.map((p) => (
            <button key={p.id} onClick={() => nav(`/places/${p.id}`)}
              className="card"
              style={{ textAlign: 'left', border: '1px solid var(--line)', background: 'var(--card)', cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center', padding: 14 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 16, background: `var(--${p.tone})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative',
              }}>
                <Icon name={p.icon} size={28} />
                {p.hot && (
                  <div style={{ position: 'absolute', top: -4, right: -4, background: 'var(--coral)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 8, padding: '2px 5px', borderRadius: 999, letterSpacing: 0.06 }}>HOT</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{p.label}</div>
                  <div className="meta" style={{ fontSize: 11 }}>· {p.kind}</div>
                </div>
                <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.vibe}
                </div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex' }}>
                    {Array.from({ length: Math.min(3, Math.floor(p.hereCount / 6) + 1) }, (_, i) => (
                      <div key={i} style={{ marginLeft: i === 0 ? 0 : -6 }}>
                        <Avatar name={`${p.label}-${i}`} size={20} />
                      </div>
                    ))}
                  </div>
                  <span className="meta" style={{ fontSize: 11 }}>
                    {p.hereCount} here{p.distMi != null ? ` · ${p.distMi} mi` : ''}
                  </span>
                </div>
              </div>
              <Icon name="chevron" size={16} color="var(--ink-3)" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
