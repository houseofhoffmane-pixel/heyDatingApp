import { Icon } from '../../components/Icon';
import { Photo } from '../../components/Photo';

interface Props {
  otherProfile: { userId: string; name: string | null; mainPhotoUrl: string | null };
  animation?: 'confetti' | 'hearts' | 'paper' | 'minimal';
  onChat: () => void;
  onClose: () => void;
}

/**
 * Full-viewport "it's a match" moment. Same three animation variants as
 * the prototype — Confetti, HeartsFloat, PaperFold — all keyframe based
 * (defined in globals.css).
 */
export function MatchMoment({ otherProfile, animation = 'hearts', onChat, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'radial-gradient(110% 80% at 50% 30%, var(--rose), var(--peach) 50%, var(--bg) 100%)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {animation === 'confetti' && <Confetti />}
      {animation === 'hearts' && <HeartsFloat />}
      {animation === 'paper' && <PaperFold />}

      <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{
          width: 42, height: 42, borderRadius: 999,
          background: 'var(--card)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="x" size={18} />
        </button>
      </div>

      <div style={{
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 2,
      }}>
        <div className="eyebrow pop-in" style={{ color: 'var(--coral)' }}>it's a match</div>
        <div className="h-display pop-in" style={{ fontSize: 'clamp(48px, 10vw, 72px)', letterSpacing: '-0.045em', marginTop: 6, lineHeight: 0.95 }}>
          okay,<br />okay.
        </div>
        <div className="pop-in" style={{ marginTop: 14, fontSize: 16, color: 'var(--ink-2)', maxWidth: 380, lineHeight: 1.4, animationDelay: '120ms' }}>
          you and <b style={{ color: 'var(--ink)' }}>{otherProfile.name}</b> both said hey. nice taste, both of you.
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 32, alignItems: 'center' }}>
          <div className="pop-in" style={{ width: 150, height: 190, borderRadius: 24, overflow: 'hidden', transform: 'rotate(-7deg)' }}>
            <Photo name="you" />
          </div>
          <div className="pop-in" style={{ width: 150, height: 190, borderRadius: 24, overflow: 'hidden', transform: 'rotate(7deg)', animationDelay: '100ms' }}>
            <Photo src={otherProfile.mainPhotoUrl} name={otherProfile.name ?? 'match'} />
          </div>
        </div>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360 }}>
          <button className="btn coral lg full" onClick={onChat}>
            <Icon name="chat" size={18} color="#fff" /> send a message
          </button>
          <button className="btn ghost full" onClick={onClose} style={{ fontSize: 14 }}>keep swiping</button>
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const colors = ['#FF5A5F', '#F4D784', '#A8D6B0', '#B5CDE5', '#C8B8E0', '#F0A9B5'];
  return (
    <>
      {Array.from({ length: 40 }, (_, i) => {
        const left = (i * 263) % 100;
        const delay = (i * 73) % 600;
        const color = colors[i % colors.length];
        const rotate = (i * 47) % 360;
        return (
          <div key={i} className="confetti" style={{
            top: '20%', left: `${left}%`, background: color,
            transform: `rotate(${rotate}deg)`,
            animation: `confetti-fall 2.2s ${delay}ms cubic-bezier(.3,.7,.4,1) forwards`,
          }} />
        );
      })}
    </>
  );
}

function HeartsFloat() {
  const items = Array.from({ length: 30 }, (_, i) => {
    const left = (i * 173 + 37) % 96 + 2;
    const delay = (i * 91) % 1800;
    const size = 14 + ((i * 11) % 30);
    const dur = 3.6 + ((i * 37) % 22) / 10;
    const driftX = (((i * 211) % 80) - 40);
    const colors = ['var(--coral)', '#FF8B8E', 'var(--rose-deep)', '#FFB4BA'];
    return { left, delay, size, dur, driftX, color: colors[i % 4], i };
  });
  return (
    <>
      {items.map((h) => (
        <div key={h.i} style={{
          position: 'absolute', left: `${h.left}%`, bottom: -30,
          color: h.color, opacity: 0,
          ['--dx' as any]: `${h.driftX}px`,
          animation: `heart-rise ${h.dur}s ${h.delay}ms cubic-bezier(.42,0,.58,1) infinite`,
          filter: 'drop-shadow(0 2px 6px rgba(255,90,95,0.25))',
        }}>
          <Icon name="heartFill" size={h.size} color="currentColor" />
        </div>
      ))}
      <div style={{
        position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 320, height: 320, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(255,90,95,0.18), transparent 70%)',
        pointerEvents: 'none',
        animation: 'pulse-glow 2.2s ease-in-out infinite',
      }} />
    </>
  );
}

function PaperFold() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: 'conic-gradient(from 90deg at 50% 50%, transparent 0deg, rgba(255,90,95,0.06) 60deg, transparent 120deg, rgba(168,214,176,0.07) 180deg, transparent 240deg, rgba(255,90,95,0.06) 300deg, transparent 360deg)',
      animation: 'fold-spin 8s linear infinite',
    }} />
  );
}
