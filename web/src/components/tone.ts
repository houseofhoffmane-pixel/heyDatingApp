/**
 * Deterministic pastel palette lookup for the abstract photo/avatar
 * painter. Same seed → same tone across mounts and reloads.
 */
export const PHOTO_TONES = [
  { bg: 'var(--peach)',  accent: '#F8C4A8' },
  { bg: 'var(--mint)',   accent: '#A8D6B0' },
  { bg: 'var(--sky)',    accent: '#B5CDE5' },
  { bg: 'var(--butter)', accent: '#F4D784' },
  { bg: 'var(--lilac)',  accent: '#C8B8E0' },
  { bg: 'var(--rose)',   accent: '#F0A9B5' },
];

export function toneFor(seed: string | number | undefined | null) {
  const s = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PHOTO_TONES[h % PHOTO_TONES.length];
}
