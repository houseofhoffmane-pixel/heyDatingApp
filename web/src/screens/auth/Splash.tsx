import { useNavigate } from 'react-router-dom';

/**
 * Splash — letters drop in, coral dot pops, tagline fades in.
 * Tap/click anywhere to advance to /phone. Full-viewport, subtle
 * coral-and-mint orb backdrop.
 */
export function Splash() {
  const nav = useNavigate();
  const letters = ['h', 'e', 'y'];

  return (
    <div
      onClick={() => nav('/signup')}
      style={{
        minHeight: '100vh', width: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer',
        background: 'radial-gradient(120% 80% at 50% 40%, var(--peach), var(--bg) 70%)',
      }}
    >
      <div style={{
        position: 'absolute', top: '20%', left: '10%',
        width: 180, height: 180, borderRadius: '50%',
        background: 'var(--coral-soft)', opacity: 0.6, filter: 'blur(40px)',
        animation: 'orb-drift 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '10%',
        width: 220, height: 220, borderRadius: '50%',
        background: 'var(--mint)', opacity: 0.5, filter: 'blur(50px)',
        animation: 'orb-drift 10s ease-in-out 1.5s infinite reverse',
      }} />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, animation: 'logo-idle 5s ease-in-out 1.4s infinite' }}>
        {letters.map((ch, i) => (
          <span key={i} style={{
            display: 'inline-block',
            fontFamily: 'var(--display)', fontWeight: 800,
            fontSize: 'clamp(96px, 22vw, 180px)',
            letterSpacing: '-0.06em', lineHeight: 0.85,
            color: 'var(--ink)', opacity: 0,
            animation: `letter-drop 700ms cubic-bezier(.34,1.56,.64,1) ${120 + i * 110}ms forwards`,
          }}>{ch}</span>
        ))}
        <span style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'var(--coral)',
          transform: 'translateY(-12px) scale(0)',
          boxShadow: '0 6px 20px rgba(255,90,95,0.4)',
          animation: 'dot-pop 600ms cubic-bezier(.34,1.56,.64,1) 580ms forwards, dot-pulse 2.4s ease-in-out 1.4s infinite',
          display: 'inline-block',
        }} />
      </div>

      <div style={{
        marginTop: 28, fontSize: 16, color: 'var(--ink-2)', opacity: 0,
        animation: 'fade-up 600ms cubic-bezier(.2,.7,.3,1) 900ms forwards',
      }}>
        say hey to people nearby.
      </div>

      <div style={{
        position: 'absolute', bottom: 40, textAlign: 'center',
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)',
        letterSpacing: 0.16, textTransform: 'uppercase',
        opacity: 0, animation: 'fade-blink 2.2s ease-in-out 1400ms infinite',
      }}>
        tap anywhere
      </div>
    </div>
  );
}
