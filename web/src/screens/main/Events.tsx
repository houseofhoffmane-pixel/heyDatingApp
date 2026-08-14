import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon, IconName } from '../../components/Icon';
import { Avatar } from '../../components/Avatar';

interface EventRow {
  id: string; title: string; host: string; vibe: string;
  startsAt: string; endsAt: string; doorText: string; coverText: string;
  tags: string[]; icon: IconName; tone: string; hot: boolean;
  goingCount: number; matchesGoingCount: number;
  iRsvpd: boolean; iSaved: boolean;
}

const FILTERS = [
  { v: '', l: 'all' },
  { v: 'tonight', l: 'tonight' },
  { v: 'this-week', l: 'this week' },
  { v: 'free', l: 'free' },
  { v: 'saved', l: 'saved' },
  { v: 'rsvpd', l: 'going' },
];

export function Events() {
  const nav = useNavigate();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  async function load(f: string) {
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: '50' });
      if (f) q.set('filter', f);
      const r = await api.get<{ data: EventRow[] }>(`/events?${q}`);
      setRows(r.data);
    } catch (e) {
      /* ignore */
    } finally { setLoading(false); }
  }
  useEffect(() => { load(filter); }, [filter]);

  return (
    <div className="page">
      <div className="top-bar">
        <div>
          <h1>events</h1>
          <div className="sub">things to actually show up to</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`chip ${filter === f.v ? 'solid' : ''}`} style={{ flexShrink: 0 }}>{f.l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>loading events…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>
          nothing here yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {rows.map((e) => (
            <button key={e.id} onClick={() => nav(`/events/${e.id}`)}
              className="card"
              style={{ textAlign: 'left', background: 'var(--card)', display: 'flex', gap: 12, alignItems: 'stretch', padding: 12, cursor: 'pointer' }}>
              <div style={{
                width: 88, height: 88, borderRadius: 14, background: `var(--${e.tone})`,
                flexShrink: 0, position: 'relative', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={e.icon} size={32} />
                <div style={{
                  position: 'absolute', bottom: 4, left: 4,
                  background: '#fff', borderRadius: 8, padding: '3px 6px',
                  fontFamily: 'var(--display)', fontWeight: 700, lineHeight: 0.95,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 0.06, textTransform: 'uppercase' }}>
                    {new Date(e.startsAt).toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>{e.title}</div>
                  {e.hot && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--coral)', fontWeight: 700, letterSpacing: 0.08 }}>HOT</span>}
                </div>
                <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--ink-3)' }}>
                  {new Date(e.startsAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })} · {e.coverText}
                </div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {e.matchesGoingCount > 0 && (
                    <span style={{ color: 'var(--coral)', fontWeight: 600, fontSize: 11.5 }}>
                      {e.matchesGoingCount} matches
                    </span>
                  )}
                  <span className="meta" style={{ fontSize: 11 }}>{e.goingCount} going</span>
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
