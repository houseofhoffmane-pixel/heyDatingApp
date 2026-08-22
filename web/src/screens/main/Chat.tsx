import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon } from '../../components/Icon';
import { Avatar } from '../../components/Avatar';
import { useAuthStore } from '../../stores/auth';
import { useSocket, useSocketEvent } from '../../hooks/useSocket';

interface Message {
  id: string; matchId: string; senderId: string;
  body: string; kind: string; status: string; clientId: string;
  readAt: string | null; createdAt: string;
  fromMe?: boolean | null;
}
interface MatchSummary {
  id: string; otherProfile: { userId: string; name: string | null; age: number | null; mainPhotoUrl: string | null };
}

/**
 * Chat detail — history via REST, live via WS. Sends go through the WS
 * with a stable clientId; if the WS is down we fall back to POST. Same
 * offline retry contract as the iOS prototype.
 */
export function Chat() {
  const { matchId } = useParams();
  const nav = useNavigate();
  const me = useAuthStore((s) => s.user);
  const sock = useSocket();
  const [meta, setMeta] = useState<MatchSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!matchId) return;
    api.get<{ data: MatchSummary[] }>('/matches').then((r) => {
      const found = r.data.find((m) => m.id === matchId);
      if (found) setMeta(found);
    });
    api.get<{ data: Message[] }>(`/matches/${matchId}/messages?limit=100`).then((r) => {
      setMessages(r.data.slice().reverse());
    });
    api.post(`/matches/${matchId}/read`, {}).catch(() => undefined);
  }, [matchId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  useSocketEvent<Message>('message:new', (msg) => {
    if (msg.matchId !== matchId) return;
    setMessages((ms) => {
      // Dedupe by either real id OR clientId — the sender's optimistic
      // row is keyed by clientId until the ACK swaps it out; if the WS
      // broadcast arrives first, this check prevents the duplicate.
      // If we DO find an optimistic match, upgrade it to the real row.
      const idx = ms.findIndex((m) => m.id === msg.id || m.clientId === msg.clientId);
      if (idx >= 0) {
        const next = ms.slice();
        next[idx] = { ...msg, fromMe: me ? msg.senderId === me.id : msg.fromMe };
        return next;
      }
      return [...ms, msg];
    });
    if (me && msg.senderId !== me.id) {
      api.post(`/matches/${matchId}/read`, {}).catch(() => undefined);
    }
  }, [matchId, me?.id]);

  useSocketEvent<{ matchId: string; userId: string; state: 'start' | 'stop' }>(
    'typing', (evt) => {
      if (evt.matchId !== matchId || evt.userId === me?.id) return;
      setTyping(evt.state === 'start');
    }, [matchId, me?.id],
  );

  async function send() {
    const text = draft.trim();
    if (!text || !matchId) return;
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const optimistic: Message = {
      id: clientId, matchId, senderId: me!.id,
      body: text, kind: 'text', status: 'sent', clientId,
      readAt: null, createdAt: new Date().toISOString(),
      fromMe: true,
    };
    setMessages((ms) => [...ms, optimistic]);
    setDraft('');
    try {
      if (sock && sock.connected) {
        sock.emit('message:send', { matchId, clientId, body: text, kind: 'text' }, (ack: any) => {
          if (ack?.ok && ack.message) {
            setMessages((ms) => ms.map((m) => m.id === clientId ? ack.message : m));
          } else {
            markFailed(clientId);
          }
        });
      } else {
        const r = await api.post<{ message: Message }>(`/matches/${matchId}/messages`, { clientId, body: text, kind: 'text' });
        setMessages((ms) => ms.map((m) => m.id === clientId ? r.message : m));
      }
    } catch {
      markFailed(clientId);
    }
  }

  function markFailed(clientId: string) {
    setMessages((ms) => ms.map((m) => m.clientId === clientId ? { ...m, status: 'failed' } : m));
  }

  async function retry(msg: Message) {
    try {
      if (sock && sock.connected) {
        sock.emit('message:send', { matchId, clientId: msg.clientId, body: msg.body, kind: msg.kind }, (ack: any) => {
          if (ack?.ok && ack.message) setMessages((ms) => ms.map((m) => m.clientId === msg.clientId ? ack.message : m));
        });
      } else {
        const r = await api.post<{ message: Message }>(`/matches/${matchId}/messages`,
          { clientId: msg.clientId, body: msg.body, kind: msg.kind });
        setMessages((ms) => ms.map((m) => m.clientId === msg.clientId ? r.message : m));
      }
    } catch { /* stays failed */ }
  }

  function onDraftChange(v: string) {
    setDraft(v);
    if (!sock || !matchId) return;
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    sock.emit('typing:start', { matchId });
    typingTimer.current = window.setTimeout(() => {
      sock.emit('typing:stop', { matchId });
    }, 1200);
  }

  if (!matchId) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
      }}>
        <button onClick={() => nav('/chats')} className="btn soft" style={{ padding: '8px 12px', fontSize: 12 }}>
          <Icon name="back" size={16} /> back
        </button>
        {meta && (
          <button onClick={() => nav(`/profile/${meta.otherProfile.userId}`)}
            style={{ flex: 1, background: 'transparent', border: 0, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', padding: 0 }}>
            <Avatar src={meta.otherProfile.mainPhotoUrl} name={meta.otherProfile.name ?? 'x'} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{meta.otherProfile.name}</div>
              <div className="meta" style={{ fontSize: 10.5 }}>tap to view profile</div>
            </div>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '18px 20px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 720, margin: '0 auto' }}>
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const sameSender = prev && prev.senderId === m.senderId;
            const failed = m.status === 'failed';
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className={`bubble ${m.fromMe ?? (m.senderId === me?.id) ? 'mine' : 'theirs'}`} style={{
                  marginTop: sameSender ? 2 : 8,
                  background: failed ? '#FF9DA1' : undefined,
                }}>
                  {m.body}
                </div>
                {(!messages[i + 1] || messages[i + 1].senderId !== m.senderId || failed) && (
                  <div style={{
                    fontSize: 10, color: failed ? 'var(--coral)' : 'var(--ink-3)',
                    textAlign: (m.fromMe ?? (m.senderId === me?.id)) ? 'right' : 'left',
                    marginTop: 4, fontFamily: 'var(--mono)', letterSpacing: 0.04,
                    display: 'flex', gap: 6, justifyContent: (m.fromMe ?? (m.senderId === me?.id)) ? 'flex-end' : 'flex-start',
                  }}>
                    {failed ? (
                      <>
                        <span style={{ fontWeight: 700 }}>! not sent</span>
                        <button onClick={() => retry(m)} style={{ background: 'transparent', border: 0, color: 'var(--coral)', textDecoration: 'underline', fontSize: 10, padding: 0, fontWeight: 700 }}>retry</button>
                      </>
                    ) : (m.readAt ? 'read' : timeShort(m.createdAt))}
                  </div>
                )}
              </div>
            );
          })}

          {typing && (
            <div style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              <div className="bubble theirs" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 14px' }}>
                <i style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', animation: 'typing 1.4s ease-in-out infinite' }} />
                <i style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', animation: 'typing 1.4s ease-in-out 0.2s infinite' }} />
                <i style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', animation: 'typing 1.4s ease-in-out 0.4s infinite' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div style={{ padding: '10px 20px 20px', borderTop: '1px solid var(--line)', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
          {['grab a drink later this week?', 'thursday work for you?', "what's your fav spot?"].map((s) => (
            <button key={s} onClick={() => setDraft((d) => d || s)} className="chip mint" style={{ flexShrink: 0, fontSize: 12 }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, background: 'var(--card)', borderRadius: 22, padding: '4px 6px 4px 14px', display: 'flex', alignItems: 'center', border: '1px solid var(--line)' }}>
            <input
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="message…"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 15, padding: '10px 0', minWidth: 0 }}
            />
          </div>
          <button onClick={send} disabled={!draft.trim()} style={{
            width: 40, height: 40, borderRadius: 999,
            background: draft.trim() ? 'var(--coral)' : 'var(--card)',
            border: draft.trim() ? 'none' : '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: draft.trim() ? 1 : 0.7,
          }}>
            <Icon name="send" size={16} color={draft.trim() ? '#fff' : 'var(--ink-3)'} />
          </button>
        </div>
      </div>
    </div>
  );
}

function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
