import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { useSocketEvent } from '../../hooks/useSocket';

interface Match {
  id: string; createdAt: string; isNew: boolean; lastMessageAt: string | null;
  otherProfile: { userId: string; name: string | null; age: number | null; mainPhotoUrl: string | null };
  lastMessage: { id: string; body: string; kind: string; fromMe: boolean; createdAt: string } | null;
  unread: number;
}

/**
 * Chats — "new matches" strip on top, threaded conversation list below.
 * Live-updates on `match:new` (prepends) and `message:new` (re-sort + bump
 * unread if the message is from the other party).
 */
export function Chats() {
  const nav = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => api.get<{ data: Match[] }>('/matches').then((r) => setMatches(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  useSocketEvent('match:new', () => { load(); });
  useSocketEvent('message:new', () => { load(); });

  const newOnes = matches.filter((m) => m.isNew);
  const convos = matches.filter((m) => !m.isNew);

  return (
    <div className="page">
      <div className="top-bar">
        <div>
          <h1>chats</h1>
          <div className="sub">{matches.length} matches · {matches.filter((m) => m.unread > 0).length} unread</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>loading chats…</div>
      ) : matches.length === 0 ? (
        <EmptyState onDiscover={() => nav('/discover')} />
      ) : (
        <>
          {newOnes.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>new matches · {newOnes.length}</div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
                {newOnes.map((m) => (
                  <button key={m.id} onClick={() => nav(`/chats/${m.id}`)}
                    style={{ flexShrink: 0, textAlign: 'center', width: 84, background: 'transparent', border: 0 }}>
                    <Avatar src={m.otherProfile.mainPhotoUrl} name={m.otherProfile.name ?? 'x'} size={72} ring />
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.otherProfile.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="eyebrow" style={{ marginBottom: 10 }}>conversations</div>
          <div style={{ background: 'var(--card)', borderRadius: 20, border: '1px solid var(--line)', overflow: 'hidden' }}>
            {convos.map((m, i) => (
              <button key={m.id} onClick={() => nav(`/chats/${m.id}`)} style={{
                background: 'transparent', border: 0, padding: '14px 16px', width: '100%',
                display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i === convos.length - 1 ? 'none' : '1px solid var(--line)', textAlign: 'left',
              }}>
                <Avatar src={m.otherProfile.mainPhotoUrl} name={m.otherProfile.name ?? 'x'} size={50} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{m.otherProfile.name}</div>
                    <div style={{ flex: 1 }} />
                    <div className="meta" style={{ fontSize: 11 }}>
                      {m.lastMessage ? timeAgo(m.lastMessage.createdAt) : timeAgo(m.createdAt)}
                    </div>
                  </div>
                  <div style={{
                    marginTop: 2, fontSize: 13.5,
                    color: m.unread ? 'var(--ink)' : 'var(--ink-3)',
                    fontWeight: m.unread ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.lastMessage?.body ?? 'say hi'}
                  </div>
                </div>
                {m.unread > 0 && (
                  <div style={{
                    background: 'var(--coral)', color: '#fff',
                    fontFamily: 'var(--mono)', fontSize: 10,
                    minWidth: 20, height: 20, borderRadius: 999, padding: '0 6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{m.unread}</div>
                )}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)' }}>
            unmatch fairy ✨ keeps things tidy after 14 days of silence.
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ onDiscover }: { onDiscover: () => void }) {
  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 22 }}>
        <div style={{ width: 84, height: 84, borderRadius: 999, background: 'var(--rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-8deg)' }}>
          <Icon name="chat" size={36} />
        </div>
        <div style={{ position: 'absolute', top: -8, right: -14, width: 38, height: 38, borderRadius: 999, background: 'var(--butter)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(12deg)' }}>
          <Icon name="heartFill" size={16} color="var(--coral)" />
        </div>
      </div>
      <h2 className="h-display h-3">nothing yet. that's okay.</h2>
      <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5, maxWidth: 340, margin: '8px auto 0' }}>
        your chats land here when you both say hey.
      </p>
      <button className="btn coral lg" style={{ marginTop: 22 }} onClick={onDiscover}>start discovering</button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
