import { CSSProperties, JSX } from 'react';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export type IconName =
  | 'sparkle' | 'heart' | 'heartFill' | 'x' | 'chat' | 'pin' | 'pinFill'
  | 'user' | 'userFill' | 'settings' | 'chevron' | 'back' | 'chevronDown'
  | 'plus' | 'check' | 'photo' | 'filter' | 'bolt' | 'search' | 'send'
  | 'mic' | 'flame' | 'shield' | 'bookmark' | 'eye' | 'moreH' | 'moreV'
  | 'grid' | 'list' | 'stack' | 'edit' | 'arrowRight' | 'arrowDown'
  | 'locate' | 'clock' | 'bell' | 'instagram' | 'spotify' | 'refresh'
  | 'cocktail' | 'coffee' | 'book' | 'pizza' | 'music' | 'leaf' | 'park'
  | 'badgeCheck' | 'fire' | 'star' | 'info';

/**
 * All icons are hand-drawn 24×24 SVGs from the iOS prototype's Icon set —
 * ported verbatim so the web look-and-feel stays identical. `p` are the
 * shared stroke props, `paths` maps a name to a JSX fragment.
 */
export function Icon({ name, size = 22, color = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  const p = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  const paths: Record<IconName, JSX.Element> = {
    sparkle: <><path {...p} d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle {...p} cx="12" cy="12" r="2.6"/></>,
    heart: <path {...p} d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"/>,
    heartFill: <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" fill={color}/>,
    x: <path {...p} d="M6 6l12 12M18 6L6 18"/>,
    chat: <path {...p} d="M4 5h16v11H10l-4 4v-4H4z"/>,
    pin: <><path {...p} d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"/><circle {...p} cx="12" cy="9" r="2.5"/></>,
    pinFill: <><path d="M12 21s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" fill={color}/><circle cx="12" cy="9" r="2.5" fill="#fff"/></>,
    user: <><circle {...p} cx="12" cy="8" r="4"/><path {...p} d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7"/></>,
    userFill: <><circle cx="12" cy="8" r="4" fill={color}/><path d="M4 21c1-4.5 4.5-7 8-7s7 2.5 8 7" fill={color}/></>,
    settings: <><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.4H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>,
    chevron: <path {...p} d="M9 6l6 6-6 6"/>,
    back: <path {...p} d="M15 6l-6 6 6 6"/>,
    chevronDown: <path {...p} d="M6 9l6 6 6-6"/>,
    plus: <path {...p} d="M12 5v14M5 12h14"/>,
    check: <path {...p} d="M5 12l5 5L20 7"/>,
    photo: <><rect {...p} x="3" y="5" width="18" height="14" rx="2"/><circle {...p} cx="9" cy="11" r="2"/><path {...p} d="M21 17l-5-5-9 7"/></>,
    filter: <path {...p} d="M3 5h18M6 12h12M10 19h4"/>,
    bolt: <path {...p} d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"/>,
    search: <><circle {...p} cx="11" cy="11" r="7"/><path {...p} d="M20 20l-3.5-3.5"/></>,
    send: <path {...p} d="M3 12l18-9-7 18-2-7-9-2z"/>,
    mic: <><rect {...p} x="9" y="3" width="6" height="12" rx="3"/><path {...p} d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    flame: <path {...p} d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-3s-2 2-2 5a5 5 0 0 0 10 0c0-5-5-10-5-10z"/>,
    shield: <><path {...p} d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path {...p} d="M9 12l2 2 4-4"/></>,
    bookmark: <path {...p} d="M6 4h12v17l-6-4-6 4z"/>,
    eye: <><path {...p} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle {...p} cx="12" cy="12" r="3"/></>,
    moreH: <><circle cx="6" cy="12" r="1.6" fill={color}/><circle cx="12" cy="12" r="1.6" fill={color}/><circle cx="18" cy="12" r="1.6" fill={color}/></>,
    moreV: <><circle cx="12" cy="6" r="1.6" fill={color}/><circle cx="12" cy="12" r="1.6" fill={color}/><circle cx="12" cy="18" r="1.6" fill={color}/></>,
    grid: <><rect {...p} x="3" y="3" width="7" height="7" rx="1.5"/><rect {...p} x="14" y="3" width="7" height="7" rx="1.5"/><rect {...p} x="3" y="14" width="7" height="7" rx="1.5"/><rect {...p} x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list: <><path {...p} d="M8 6h13M8 12h13M8 18h13"/><circle {...p} cx="4" cy="6" r="1"/><circle {...p} cx="4" cy="12" r="1"/><circle {...p} cx="4" cy="18" r="1"/></>,
    stack: <><rect {...p} x="6" y="6" width="14" height="14" rx="2.5"/><path {...p} d="M3 9v9a3 3 0 0 0 3 3h9"/></>,
    edit: <path {...p} d="M4 20h4l10-10-4-4L4 16z"/>,
    arrowRight: <path {...p} d="M5 12h14M13 6l6 6-6 6"/>,
    arrowDown: <path {...p} d="M12 5v14M6 13l6 6 6-6"/>,
    locate: <><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    clock: <><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M12 7v5l3 2"/></>,
    bell: <><path {...p} d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path {...p} d="M10 21a2 2 0 0 0 4 0"/></>,
    instagram: <><rect {...p} x="3" y="3" width="18" height="18" rx="5"/><circle {...p} cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill={color}/></>,
    spotify: <><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M7 9c4-1 8 0 11 2M7.5 12.5c3-0.8 6-0.2 9 1.5M8 16c2.5-0.5 5 0 7 1.2"/></>,
    refresh: <><path {...p} d="M20 12a8 8 0 1 1-3-6.3L20 8"/><path {...p} d="M20 3v5h-5"/></>,
    cocktail: <path {...p} d="M4 4h16l-8 9v6M8 19h8"/>,
    coffee: <><path {...p} d="M5 8h12v6a4 4 0 0 1-8 0V8z"/><path {...p} d="M17 9h2a2 2 0 0 1 0 4h-2"/><path {...p} d="M7 4v2M11 4v2M15 4v2"/></>,
    book: <path {...p} d="M4 4h7v16H6a2 2 0 0 1-2-2zM13 4h7v14a2 2 0 0 0-2 2h-5z"/>,
    pizza: <><path {...p} d="M12 3l9 18H3z"/><circle cx="10" cy="13" r="1" fill={color}/><circle cx="14" cy="13" r="1" fill={color}/><circle cx="12" cy="17" r="1" fill={color}/></>,
    music: <><circle {...p} cx="6" cy="18" r="2.5"/><circle {...p} cx="18" cy="16" r="2.5"/><path {...p} d="M8.5 18V5l12-2v13"/></>,
    leaf: <path {...p} d="M5 19s.5-9 8-13c3.5 0 6.5 3 6.5 6.5C19.5 18 11 19 5 19zm0 0c4-3 8-7 12-9"/>,
    park: <><path {...p} d="M12 3l6 9h-3l3 5h-12l3-5H6z"/><path {...p} d="M12 17v5"/></>,
    badgeCheck: <><path {...p} d="M12 2l2.5 2 3.5-.5L19 7l2 3-2 3 .5 3.5L17 18l-2.5 2L12 22l-2.5-2L6 20l-1.5-3.5L2 13l2-3-2-3 2.5-3.5L9 4z"/><path {...p} d="M8 12l3 3 5-5"/></>,
    fire: <path {...p} d="M12 22a6 6 0 0 0 6-6c0-3-2.5-5.5-6-9-2 3-3 5-3 5s-1-1-1-3a8 8 0 0 0-4 7 8 8 0 0 0 8 6z"/>,
    star: <path {...p} d="M12 3l2.7 6 6.3.6-4.8 4.3 1.4 6.1L12 17l-5.6 3 1.4-6.1L3 9.6l6.3-.6z"/>,
    info: <><circle {...p} cx="12" cy="12" r="9"/><path {...p} d="M12 8h0M11 12h1v5h1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0, ...style }}>
      {paths[name] ?? null}
    </svg>
  );
}
