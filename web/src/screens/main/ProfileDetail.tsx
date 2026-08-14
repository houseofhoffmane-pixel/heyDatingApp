import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Icon } from '../../components/Icon';
import { Photo } from '../../components/Photo';
import { PhotoCarousel } from '../../components/PhotoCarousel';
import { LikeSheet, LikeAnchor } from './LikeSheet';
import { MatchMoment } from './MatchMoment';

interface DetailPhoto { id: string; url: string; position: number; isMain: boolean; }
interface DetailPrompt { id: string; position: number; prompt: { id: string; text: string }; answer: string; }
interface Profile {
  userId: string; name: string | null; age: number | null; bio: string | null;
  job?: string; school?: string; pronouns?: string; starSign?: string;
  drinks?: string; smokes?: string; exercise?: string; kids?: string;
  distanceMi?: number;
  photos: DetailPhoto[]; prompts: DetailPrompt[];
  interests: { id: string; label: string }[];
}

/**
 * Full-page profile — hero carousel, chips of basics, bio + prompts
 * with heart buttons (opens LikeSheet). Report action opens a sheet
 * with the same 10-char detail rule the backend enforces.
 */
export function ProfileDetail() {
  const { userId } = useParams();
  const nav = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [likeTarget, setLikeTarget] = useState<LikeAnchor | null>(null);
  const [match, setMatch] = useState<{ userId: string; name: string | null; mainPhotoUrl: string | null } | null>(null);

  useEffect(() => {
    if (!userId) return;
    setError(null);
    api.get<Profile>(`/discovery/profile/${userId}`)
      .then(setProfile)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load profile.'));
  }, [userId]);

  if (error) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ color: 'var(--ink-3)', fontSize: 15 }}>{error}</div>
        <button className="btn soft" style={{ marginTop: 16 }} onClick={() => nav(-1)}>go back</button>
      </div>
    );
  }
  if (!profile) return <div className="page" style={{ padding: '80px 0', textAlign: 'center', color: 'var(--ink-3)' }}>loading…</div>;

  async function send(comment: string) {
    if (!profile || !likeTarget) return;
    try {
      const r = await api.post<{ matched: boolean; matchId: string | null }>('/likes', {
        toUserId: profile.userId,
        anchorType: likeTarget.kind,
        anchorPhotoId: likeTarget.kind === 'photo' ? likeTarget.photoId : undefined,
        anchorPromptId: likeTarget.kind === 'prompt' ? likeTarget.promptId : undefined,
        comment: comment || undefined,
      });
      setLikeTarget(null);
      if (r.matched) {
        setMatch({
          userId: profile.userId,
          name: profile.name,
          mainPhotoUrl: profile.photos.find((p) => p.isMain)?.url ?? profile.photos[0]?.url ?? null,
        });
      } else {
        nav(-1);
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Like failed.');
    }
  }

  const basics = [
    profile.pronouns && ['pronouns', profile.pronouns],
    profile.starSign && ['★ sign', profile.starSign],
    profile.job && ['job', profile.job],
    profile.school && ['school', profile.school],
    profile.drinks && ['drinks', profile.drinks],
    profile.smokes && ['smokes', profile.smokes],
    profile.exercise && ['exercise', profile.exercise],
    profile.kids && ['kids', profile.kids],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="page" style={{ maxWidth: 720, padding: '0 0 100px' }}>
      {/* Hero carousel */}
      <div style={{ position: 'relative', height: 520 }}>
        <PhotoCarousel
          photos={profile.photos.map((p) => ({ id: p.id, url: p.url, seed: `${profile.name}-${p.position}` }))}
          name={profile.name ?? 'user'}
          photoIdx={photoIdx}
          setPhotoIdx={setPhotoIdx}
        />
        <button onClick={() => nav(-1)} style={{
          position: 'absolute', top: 20, left: 20, zIndex: 5,
          width: 44, height: 44, borderRadius: 999,
          background: 'rgba(255,255,255,0.92)', border: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="back" size={20} />
        </button>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '120px 22px 22px',
          background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.65))',
          color: '#fff', pointerEvents: 'none',
        }}>
          <div className="h-display" style={{ color: '#fff', fontSize: 40, letterSpacing: '-0.035em' }}>
            {profile.name}{profile.age && `, ${profile.age}`}
          </div>
          {profile.job && <div style={{ marginTop: 6, fontSize: 14.5, opacity: 0.9, lineHeight: 1.4 }}>{profile.job}</div>}
          {profile.distanceMi != null && (
            <div style={{ marginTop: 6, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 0.06 }}>
              {profile.distanceMi} mi away
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {basics.length > 0 && (
          <div className="card">
            <div className="eyebrow">basics</div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {basics.map(([label, value], i) => (
                <span key={label} className={`chip ${['peach', 'mint', 'sky', 'butter', 'lilac', 'rose'][i % 6]}`} style={{ fontSize: 12.5 }}>
                  <span style={{ opacity: 0.55, marginRight: 5, fontSize: 11 }}>{label}</span>{value}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.bio && (
          <div className="card" style={{ background: 'var(--peach)', border: 'none' }}>
            <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>their bio</div>
            <div className="h-display" style={{ marginTop: 6, fontSize: 22, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
              "{profile.bio}"
            </div>
          </div>
        )}

        {profile.photos[1] && (
          <div style={{ aspectRatio: '4/5', borderRadius: 22, overflow: 'hidden', position: 'relative' }}>
            <Photo src={profile.photos[1].url} name={`${profile.name}-1`} />
            <button onClick={() => setLikeTarget({
              kind: 'photo', photoId: profile.photos[1].id, photoUrl: profile.photos[1].url,
              personName: profile.name ?? 'them', photoIdx: 1, photoCount: profile.photos.length,
            })} style={{
              position: 'absolute', bottom: 14, right: 14,
              width: 48, height: 48, borderRadius: 999, background: '#fff', border: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
            }}>
              <Icon name="heartFill" size={20} color="var(--coral)" />
            </button>
          </div>
        )}

        {profile.prompts.slice(0, 1).map((p) => (
          <PromptCard key={p.id} prompt={p} tone="mint"
            onLike={() => setLikeTarget({ kind: 'prompt', promptId: p.id, question: p.prompt.text, answer: p.answer, personName: profile.name ?? 'them' })}
          />
        ))}

        {profile.interests.length > 0 && (
          <div className="card">
            <div className="eyebrow">into</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {profile.interests.map((it, i) => (
                <span key={it.id} className={`chip ${['peach', 'mint', 'sky', 'butter', 'lilac'][i % 5]}`}>{it.label}</span>
              ))}
            </div>
          </div>
        )}

        {profile.photos[2] && (
          <div style={{ aspectRatio: '4/5', borderRadius: 22, overflow: 'hidden', position: 'relative' }}>
            <Photo src={profile.photos[2].url} name={`${profile.name}-2`} />
            <button onClick={() => setLikeTarget({
              kind: 'photo', photoId: profile.photos[2].id, photoUrl: profile.photos[2].url,
              personName: profile.name ?? 'them', photoIdx: 2, photoCount: profile.photos.length,
            })} style={{
              position: 'absolute', bottom: 14, right: 14,
              width: 48, height: 48, borderRadius: 999, background: '#fff', border: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
            }}>
              <Icon name="heartFill" size={20} color="var(--coral)" />
            </button>
          </div>
        )}

        {profile.prompts.slice(1).map((p, i) => (
          <PromptCard key={p.id} prompt={p} tone={['lilac', 'butter'][i % 2]}
            onLike={() => setLikeTarget({ kind: 'prompt', promptId: p.id, question: p.prompt.text, answer: p.answer, personName: profile.name ?? 'them' })}
          />
        ))}
      </div>

      {likeTarget && (
        <LikeSheet anchor={likeTarget} onClose={() => setLikeTarget(null)} onSend={send} />
      )}

      {match && (
        <MatchMoment otherProfile={match} onChat={() => nav('/chats')} onClose={() => { setMatch(null); nav(-1); }} />
      )}
    </div>
  );
}

function PromptCard({ prompt, tone, onLike }: { prompt: DetailPrompt; tone: string; onLike: () => void }) {
  return (
    <div className="card" style={{ background: `var(--${tone})`, border: 'none', position: 'relative' }}>
      <div className="eyebrow" style={{ color: 'var(--ink-2)' }}>{prompt.prompt.text}</div>
      <div className="h-display" style={{ marginTop: 6, fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.02em', paddingRight: 50 }}>
        {prompt.answer}
      </div>
      <button onClick={onLike} style={{
        position: 'absolute', bottom: 14, right: 14,
        width: 44, height: 44, borderRadius: 999, background: '#fff', border: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
      }}>
        <Icon name="heartFill" size={18} color="var(--coral)" />
      </button>
    </div>
  );
}
