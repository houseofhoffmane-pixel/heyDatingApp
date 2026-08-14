import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon, IconName } from '../../components/Icon';
import { Photo } from '../../components/Photo';

interface PersonHere {
  userId: string; name: string | null; age: number | null;
  mainPhotoUrl: string | null; checkedInAt: string;
  relationship: 'match' | 'i-liked' | 'liked-me' | null;
}
interface PlaceDetail {
  id: string; label: string; kind: string; vibe: string; address: string;
  icon: IconName; tone: string; hot: boolean;
  hereCount: number; distMi: number | null; saved: boolean;
  peopleHere: PersonHere[] | null; locked: boolean;
}

export function PlaceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.get<PlaceDetail>(`/places/${id}`);
      setPlace(r); setErr(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not load place.');
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function checkIn() {
    if (!navigator.geolocation) return alert('Location not available.');
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await api.post(`/places/${id}/checkin`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        await load();
      } catch (e) {
        alert(e instanceof ApiError ? e.message : 'Check-in failed.');
      } finally { setBusy(false); }
    }, () => { alert('Could not get your location.'); setBusy(false); });
  }

  async function leave() {
    setBusy(true);
    try { await api.post(`/places/${id}/leave`); await load(); }
    finally { setBusy(false); }
  }

  async function toggleSave() {
    if (!place) return;
    if (place.saved) await api.delete(`/places/${id}/save`);
    else await api.post(`/places/${id}/save`);
    await load();
  }

  if (err) return <div className="page" style={{ padding: 40, textAlign: 'center' }}>{err}</div>;
  if (!place) return <div className="page" style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>loading…</div>;

  return (
    <div className="page" style={{ maxWidth: 720, padding: 0 }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 280, background: `var(--${place.tone})` }}>
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
          <Icon name={place.saved ? 'heartFill' : 'bookmark'} size={18} color={place.saved ? 'var(--coral)' : 'var(--ink)'} />
        </button>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <Icon name={place.icon} size={44} />
          </div>
        </div>
      </div>

      <div style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div className="eyebrow">{place.kind}{place.distMi != null ? ` · ${place.distMi} mi` : ''}</div>
          <h1 className="h-display h-2" style={{ marginTop: 4, letterSpacing: '-0.035em' }}>{place.label}</h1>
          <div style={{ marginTop: 6, fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>{place.vibe}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-3)' }}>
            <Icon name="pin" size={13} /> {place.address}
          </div>
        </div>

        {place.locked ? (
          <button onClick={checkIn} disabled={busy} className="btn coral lg full">
            <Icon name="pinFill" size={16} color="#fff" />
            {busy ? 'checking in…' : 'check in here'}
          </button>
        ) : (
          <div style={{ background: 'var(--mint)', borderRadius: 18, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>you're checked in</div>
              <div className="meta" style={{ fontSize: 11 }}>auto-out in 2h</div>
            </div>
            <button onClick={leave} className="btn soft" style={{ padding: '6px 12px', fontSize: 12 }}>leave</button>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="eyebrow">here right now · {place.hereCount}</div>
            <span className="meta" style={{ fontSize: 10 }}>{place.locked ? '🔒 check in to see who' : 'visible to people here'}</span>
          </div>

          {place.locked ? (
            <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
                filter: 'blur(14px) saturate(140%)', opacity: 0.55, pointerEvents: 'none',
              }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden' }}>
                    <Photo name={`hidden-${i}`} />
                  </div>
                ))}
              </div>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: 22, textAlign: 'center',
                background: 'linear-gradient(180deg, rgba(250,247,242,0.4), rgba(250,247,242,0.9))',
              }}>
                <div style={{ width: 52, height: 52, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 18px rgba(0,0,0,0.12)', marginBottom: 10 }}>
                  <Icon name="shield" size={24} color="var(--coral)" />
                </div>
                <div className="h-display" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.025em', maxWidth: 240 }}>
                  {place.hereCount} people are here.
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4, maxWidth: 320 }}>
                  you can only see who when you're <b>actually at {place.label}</b>.
                </div>
              </div>
            </div>
          ) : place.peopleHere && place.peopleHere.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {place.peopleHere.map((per) => (
                <button key={per.userId} onClick={() => nav(`/profile/${per.userId}`)}
                  style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', border: 0, padding: 0 }}>
                  <Photo src={per.mainPhotoUrl} name={per.name ?? per.userId} />
                  {per.relationship && (
                    <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--coral)', color: '#fff', borderRadius: 999, padding: '2px 5px', fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)' }}>♥</div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '24px 8px 6px', color: '#fff', fontSize: 11.5, fontWeight: 600,
                    background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
                    textAlign: 'left',
                  }}>
                    {per.name}{per.age ? `, ${per.age}` : ''}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)' }}>nobody's checked in right now.</div>
          )}
        </div>
      </div>
    </div>
  );
}
