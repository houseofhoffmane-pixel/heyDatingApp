import { toneFor } from './tone';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: number;
  ring?: boolean;
  ringColor?: string;
}

export function Avatar({ src, name = 'A', size = 44, ring = false, ringColor = 'var(--coral)' }: AvatarProps) {
  const tone = toneFor(name);
  const initial = (name || 'A').trim()[0]?.toUpperCase() ?? 'A';
  const ringShadow = ring ? `0 0 0 2.5px var(--bg), 0 0 0 5px ${ringColor}` : undefined;

  const wrapper: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%',
    background: tone.bg, position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: ringShadow,
  };

  if (src) {
    return (
      <div style={wrapper}>
        <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, 0)',
        width: '55%', aspectRatio: '1', borderRadius: '50%',
        background: tone.accent, opacity: 0.7,
      }} />
      <div style={{
        position: 'absolute', bottom: '-40%', left: '50%', transform: 'translateX(-50%)',
        width: '130%', height: '70%', borderRadius: '50%',
        background: tone.accent, opacity: 0.55,
      }} />
      <span style={{
        position: 'relative',
        fontFamily: 'var(--display)', fontWeight: 700,
        fontSize: size * 0.42, color: 'rgba(0,0,0,0.32)',
      }}>{initial}</span>
    </div>
  );
}
