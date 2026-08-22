import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon } from '../../components/Icon';
import { Photo } from '../../components/Photo';
import { PhotoCarousel } from '../../components/PhotoCarousel';
import { LikeSheet, LikeAnchor } from './LikeSheet';
import { MatchMoment } from './MatchMoment';
import { FilterSheet } from './FilterSheet';
import { markMatchShown } from './match-shown-store';

interface Photo { id: string; url: string; position: number; isMain: boolean; }
interface Prompt { id: string; position: number; prompt: { id: string; text: string }; answer: string; }
interface FeedProfile {
  userId: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  job?: string;
  distanceMi?: number;
  photos: Photo[];
  prompts: Prompt[];
  interests: { id: string; label: string }[];
  theyLikedYou?: boolean;
}

interface FeedResponse {
  data: FeedProfile[];
  meta: { cursor: string | null; total: number; reason?: string };
}

/**
 * Discover — grid of profile cards on desktop, big-card stack on mobile.
 * Every card renders a PhotoCarousel with the same swipe + tap zones as
 * the iOS prototype; heart button opens the LikeSheet; a mutual like
 * bursts the MatchMoment full-screen with confetti/hearts/paperfold.
 */
export function Discover() {
  const nav = useNavigate();
  const [feed, setFeed] = useState<FeedProfile[]>([]);
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdxMap, setPhotoIdxMap] = useState<Record<string, number>>({});
  const [likeTarget, setLikeTarget] = useState<{ profile: FeedProfile; anchor: LikeAnchor } | null>(null);
  const [match, setMatch] = useState<{ userId: string; name: string | null; mainPhotoUrl: string | null } | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<FeedResponse>('/discovery/feed?limit=20');
      setFeed(r.data); setReason(r.meta.reason ?? null);
      setNeedsLocation(r.meta.reason === 'no_location');
    } catch (err) {
      if (err instanceof ApiError) console.error(err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function useMyLocation() {
    if (!navigator.geolocation) return alert('Location not available in this browser.');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await api.put('/me/location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
      load();
    }, () => alert('Could not get your location.'));
  }

  const openLike = (profile: FeedProfile, anchor: LikeAnchor) => setLikeTarget({ profile, anchor });

  async function sendLike(comment: string) {
    if (!likeTarget) return;
    const { profile, anchor } = likeTarget;
    try {
      const res = await api.post<{ matched: boolean; matchId: string | null }>('/likes', {
        toUserId: profile.userId,
        anchorType: anchor.kind,
        anchorPhotoId: anchor.kind === 'photo' ? anchor.photoId : undefined,
        anchorPromptId: anchor.kind === 'prompt' ? anchor.promptId : undefined,
        comment: comment || undefined,
      });
      setLikeTarget(null);
      // Remove them from the visible feed either way (liked or matched).
      setFeed((fs) => fs.filter((f) => f.userId !== profile.userId));
      if (res.matched) {
        // Register the id so AppShell's WS handler skips its own popup
        // for the same match (initiator would otherwise see two).
        if (res.matchId) markMatchShown(res.matchId);
        setMatch({
          userId: profile.userId,
          name: profile.name,
          mainPhotoUrl: profile.photos.find((p) => p.isMain)?.url ?? profile.photos[0]?.url ?? null,
        });
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Like failed.');
    }
  }

  async function pass(userId: string) {
    try { await api.post('/passes', { toUserId: userId }); }
    catch (err) { /* ignore */ }
    setFeed((fs) => fs.filter((f) => f.userId !== userId));
  }

  return (
    <div className="page">
      <div className="top-bar">
        <div>
          <h1>discover</h1>
          <div className="sub">{feed.length} nearby</div>
        </div>
        <div className="actions">
          <button className="btn soft" onClick={() => setFiltersOpen(true)} style={{ padding: '8px 14px', fontSize: 13 }}>
            <Icon name="filter" size={16} /> filters
          </button>
        </div>
      </div>

      {needsLocation && (
        <div className="card" style={{ marginBottom: 20, background: 'var(--peach)', border: 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
          <Icon name="pinFill" size={22} color="var(--coral)" />
          <div style={{ flex: 1, fontSize: 13.5 }}>
            share your location so we can show people nearby.
          </div>
          <button className="btn coral" onClick={useMyLocation} style={{ padding: '10px 16px', fontSize: 13 }}>enable</button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>loading feed…</div>
      ) : feed.length === 0 ? (
        <EmptyState reason={reason} onOpenSettings={() => nav('/settings')} onEnableLocation={useMyLocation} />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {feed.map((p) => (
            <FeedCard
              key={p.userId}
              profile={p}
              photoIdx={photoIdxMap[p.userId] ?? 0}
              setPhotoIdx={(n) => setPhotoIdxMap((m) => ({ ...m, [p.userId]: n }))}
              onOpen={() => nav(`/profile/${p.userId}`)}
              onLikePhoto={(photoIdx) => {
                const ph = p.photos[photoIdx] ?? p.photos[0];
                openLike(p, {
                  kind: 'photo',
                  photoId: ph.id,
                  photoUrl: ph.url,
                  personName: p.name ?? 'them',
                  photoIdx,
                  photoCount: p.photos.length,
                });
              }}
              onLikePrompt={(prompt) => openLike(p, {
                kind: 'prompt',
                promptId: prompt.id,
                question: prompt.prompt.text,
                answer: prompt.answer,
                personName: p.name ?? 'them',
              })}
              onPass={() => pass(p.userId)}
            />
          ))}
        </div>
      )}

      {likeTarget && (
        <LikeSheet anchor={likeTarget.anchor} onClose={() => setLikeTarget(null)} onSend={sendLike} />
      )}

      {match && (
        <MatchMoment
          otherProfile={match}
          onChat={() => { nav('/chats'); setMatch(null); }}
          onClose={() => setMatch(null)}
        />
      )}

      {filtersOpen && (
        <FilterSheet onClose={() => setFiltersOpen(false)} onApplied={load} />
      )}
    </div>
  );
}

function FeedCard({
  profile, photoIdx, setPhotoIdx, onOpen, onLikePhoto, onLikePrompt, onPass,
}: {
  profile: FeedProfile;
  photoIdx: number; setPhotoIdx: (n: number) => void;
  onOpen: () => void;
  onLikePhoto: (photoIdx: number) => void;
  onLikePrompt: (prompt: Prompt) => void;
  onPass: () => void;
}) {
  return (
    <div style={{
      borderRadius: 24, overflow: 'hidden',
      background: 'var(--card)', border: '1px solid var(--line)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ position: 'relative', height: 420 }}>
        <PhotoCarousel
          photos={profile.photos.map((p) => ({ id: p.id, url: p.url, seed: `${profile.name}-${p.position}` }))}
          name={profile.name ?? 'user'}
          photoIdx={photoIdx}
          setPhotoIdx={setPhotoIdx}
          onOpen={onOpen}
          onLike={onLikePhoto}
        />
        <div onClick={onOpen} style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '60px 18px 16px',
          background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
          color: '#fff', cursor: 'pointer', pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="h-display" style={{ color: '#fff', fontSize: 30, letterSpacing: '-0.03em' }}>
              {profile.name}{profile.age && `, ${profile.age}`}
            </div>
            {profile.theyLikedYou && (
              <span style={{ background: 'var(--coral)', color: '#fff', fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: 0.06, padding: '3px 7px', borderRadius: 999 }}>♥ LIKED YOU</span>
            )}
          </div>
          {profile.job && <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>{profile.job}</div>}
        </div>
      </div>

      {profile.bio && (
        <div style={{ padding: '14px 16px 8px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          "{profile.bio}"
        </div>
      )}

      {profile.prompts[0] && (
        <div onClick={() => onLikePrompt(profile.prompts[0])} style={{
          margin: '4px 14px 14px', padding: '16px', borderRadius: 18,
          background: 'var(--peach)', cursor: 'pointer', position: 'relative',
        }}>
          <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>{profile.prompts[0].prompt.text}</div>
          <div className="h-display" style={{ fontSize: 18, lineHeight: 1.2, letterSpacing: '-0.015em', marginTop: 6, paddingRight: 40 }}>
            {profile.prompts[0].answer}
          </div>
          <button style={{
            position: 'absolute', bottom: 12, right: 12,
            width: 36, height: 36, borderRadius: 999, background: '#fff', border: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          }}>
            <Icon name="heartFill" size={16} color="var(--coral)" />
          </button>
        </div>
      )}

      <div style={{ padding: '0 14px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {profile.interests.slice(0, 5).map((it) => (
          <span key={it.id} className="chip peach" style={{ fontSize: 12 }}>{it.label}</span>
        ))}
      </div>

      <div style={{
        padding: '10px 14px 14px', borderTop: '1px solid var(--line)',
        display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button onClick={onPass} className="btn soft" style={{ flex: 1 }}>
          <Icon name="x" size={16} /> pass
        </button>
        <button onClick={onOpen} className="btn ghost" style={{ padding: '10px 14px', fontSize: 13 }}>
          view →
        </button>
      </div>
    </div>
  );
}

function EmptyState({ reason, onOpenSettings, onEnableLocation }: { reason: string | null; onOpenSettings: () => void; onEnableLocation: () => void }) {
  if (reason === 'no_location') {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: 'var(--peach)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon name="pinFill" size={42} color="var(--coral)" />
        </div>
        <h2 className="h-display h-3">tell us where you are.</h2>
        <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5, maxWidth: 340, margin: '8px auto 0' }}>
          we use your location to show people nearby. only rough distance is shared.
        </p>
        <button className="btn coral lg" style={{ marginTop: 22 }} onClick={onEnableLocation}>enable location</button>
      </div>
    );
  }
  if (reason === 'out_of_radius') {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: 28, background: 'var(--butter)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <Icon name="sparkle" size={42} />
        </div>
        <h2 className="h-display h-3">nobody in your radius rn.</h2>
        <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5, maxWidth: 340, margin: '8px auto 0' }}>
          try widening your distance filter — new people show up all the time.
        </p>
        <button className="btn coral lg" style={{ marginTop: 22 }} onClick={onOpenSettings}>adjust filters →</button>
      </div>
    );
  }
  return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: 'var(--peach)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
        <Icon name="sparkle" size={42} />
      </div>
      <h2 className="h-display h-3">you've seen everyone.</h2>
      <p style={{ marginTop: 8, color: 'var(--ink-2)', fontSize: 14.5, maxWidth: 340, margin: '8px auto 0' }}>
        touch grass for an hour — new people join every day. or try widening your filters.
      </p>
      <button className="btn coral lg" style={{ marginTop: 22 }} onClick={onOpenSettings}>adjust filters →</button>
    </div>
  );
}
