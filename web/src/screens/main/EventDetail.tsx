import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon, IconName } from '../../components/Icon';
import { Avatar } from '../../components/Avatar';

interface EventDetail {
  id: string; title: string; host: string; vibe: string;
  startsAt: string; endsAt: string; doorText: string; coverText: string;
  tags: string[]; icon: IconName; tone: string; hot: boolean;
  goingCount: number; iRsvpd: boolean; iSaved: boolean; checkinOpen: boolean;
  matchesGoing: { userId: string; name: string | null; age: number | null; mainPhotoUrl: string | null; relationship: string }[];
  place?: { id: string; label: string } | null;
}

export function EventDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try { setEvent(await api.get<EventDetail>(`/events/${id}`)); }
    catch (e) { setErr(e instanceof ApiError ? e.message : 'Could not load event.'); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function rsvp() {
    setBusy(true);
    try {
      if (event?.iRsvpd) await api.delete(`/events/${id}/rsvp`);
      else await api.post(`/events/${id}/rsvp`);
      await load();
    } finally { setBusy(false); }
  }
  async function toggleSave() {
    if (!event) return;
    if (event.iSaved) await api.delete(`/events/${id}/save`);
    else await api.post(`/events/${id}/save`);
    await load();
  }
  async function checkIn() {
    if (!navigator.geolocation) return alert('Location not available.');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await api.post(`/events/${id}/checkin`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        await load();
      } catch (e) {
        alert(e instanceof ApiError ? e.message : 'Check-in failed.');
      } finally { setBusy(false); }
    }, () => { alert('Could not get your location.'); setBusy(false); });
  }

  if (err) return <div className="page" style={{ padding: 40, textAlign: 'center' }}>{err}</div>;
  if (!event) return <div className="page" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>loading…</div>;

  const startsAt = new Date(event.startsAt);
  const timeFmt = startsAt.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="page" style={{ maxWidth: 720, padding: 0 }}>
      <div style={{ position: 'relative', height: 320, background: `var(--${event.tone})`, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '-20%',
          width: '120%', height: '60%', borderRadius: '50%',
          background: `var(--${event.tone}-deep)`, opacity: 0.6, transform: 'rotate(-12deg)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-30%', right: '-20%',
          width: '90%', height: '80%', borderRadius: '50%',
          background: `var(--${event.tone}-deep)`, opacity: 0.5,
        }} />
        <button onClick={() => nav(-1)} style={{
          position: 'absolute', top: 20, left: 20, zIndex: 5,
          width: 44, height: 44, borderRadius: 999, background: 'rgba(255,255,255,0.92)', border: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="back" size={20} />
        </button>
        <button onClick={toggleSave} style={{
          position: 'absolute', top: 20, right: 20, zIndex: 5,
          width: 44, height: 44, borderRadius: 999, background: 'rgba(255,255,255,0.92)', border: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={event.iSaved ? 'heartFill' : 'heart'} size={18} color={event.iSaved ? 'var(--coral)' : 'var(--ink)'} />
        </button>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div className="eyebrow">{event.host} · {event.coverText}</div>
            <div className="h-display" style={{ fontSize: 36, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 6 }}>
              {event.title}
            </div>
          </div>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '8px 11px',
            fontFamily: 'var(--display)', fontWeight: 700, lineHeight: 0.95,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: 0.1, textTransform: 'uppercase' }}>
              {startsAt.toLocaleDateString(undefined, { weekday: 'short' })}
            </div>
            <div style={{ fontSize: 22, letterSpacing: '-0.02em' }}>
              {startsAt.toLocaleTimeString(undefined, { hour: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="card" style={{ flex: 1, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="clock" size={15} />
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 9 }}>when</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{event.doorText || timeFmt}</div>
            </div>
          </div>
          <div className="card" style={{ flex: 1, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="pin" size={15} />
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 9 }}>where</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{event.place?.label ?? 'event venue'}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: `var(--${event.tone})`, border: 'none' }}>
          <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>the vibe</div>
          <div className="h-display" style={{ marginTop: 6, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.02em' }}>{event.vibe}</div>
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {event.tags.map((t) => (
              <span key={t} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>{t}</span>
            ))}
          </div>
        </div>

        {!event.iRsvpd ? (
          <button onClick={rsvp} disabled={busy} className="btn coral lg full">
            <Icon name="check" size={16} color="#fff" /> i'm going
          </button>
        ) : (
          <div style={{ background: 'var(--mint)', borderRadius: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>you're going</div>
              <div className="meta" style={{ fontSize: 11 }}>others can see you. cancel anytime.</div>
            </div>
            <button onClick={rsvp} className="btn soft" style={{ padding: '6px 12px', fontSize: 12 }}>cancel</button>
          </div>
        )}

        {event.iRsvpd && event.checkinOpen && (
          <button onClick={checkIn} disabled={busy} className="btn full" style={{ background: 'var(--ink)', color: '#fff' }}>
            <Icon name="pinFill" size={14} color="#fff" /> i'm here · check in
          </button>
        )}

        {event.matchesGoing.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="eyebrow">going · {event.goingCount}</div>
              <span className="meta" style={{ fontSize: 10, color: 'var(--coral)' }}>{event.matchesGoing.length} are matches/likes</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {event.matchesGoing.map((p) => (
                <button key={p.userId} onClick={() => nav(`/profile/${p.userId}`)}
                  style={{ background: 'transparent', border: 0, textAlign: 'center' }}>
                  <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden' }}>
                    <Avatar src={p.mainPhotoUrl} name={p.name ?? 'x'} size={90} />
                    <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--coral)', color: '#fff', borderRadius: 999, padding: '2px 5px', fontSize: 9, fontFamily: 'var(--mono)' }}>♥</div>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 600 }}>{p.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
