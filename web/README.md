# Hey — web

Responsive web port of the Hey iOS prototype. Same design DNA, same
animations, same feature surface — running against the Nest backend in
`../backend`.

## Run it

```bash
# 1. In one terminal, start the backend (from repo root)
cd backend
docker compose up -d
npm install
cp .env.example .env
npx prisma migrate deploy && npm run db:seed
npm run start:dev
# → http://localhost:3000/api/v1

# 2. In another terminal, start the web app
cd web
npm install
npm run dev
# → http://localhost:5173

# The Vite dev server proxies /api and /rt to the backend so you avoid
# CORS pain during development.
```

## Layout

```
web/
├── src/
│   ├── main.tsx            — Vite entry (mounts <App /> with router)
│   ├── App.tsx             — top-level router + auth guards
│   ├── styles/globals.css  — design tokens, keyframes, layout classes
│   ├── stores/auth.ts      — zustand + persist for access/refresh tokens
│   ├── api/client.ts       — fetch wrapper with token refresh
│   ├── hooks/useSocket.ts  — Socket.IO singleton on /rt namespace
│   ├── components/
│   │   ├── AppShell.tsx    — side nav (desktop) + bottom tabs (mobile)
│   │   ├── Icon.tsx        — full icon set from the prototype
│   │   ├── Photo.tsx       — abstract painter (falls back to signed URL)
│   │   ├── Avatar.tsx      — round variant
│   │   ├── PhotoCarousel.tsx — drag/tap through a photo deck
│   │   ├── Sheet.tsx       — bottom-sheet modal (centered on desktop)
│   │   └── tone.ts         — deterministic pastel picker
│   └── screens/
│       ├── auth/           — Splash, Phone, OTP, EmailLogin
│       ├── onboarding/     — QShell + 15 steps + OnboardingFlow
│       └── main/           — Discover, ProfileDetail, Places, PlaceDetail,
│                             Events, EventDetail, Chats, Chat, Me, Settings,
│                             LikeSheet, MatchMoment
├── index.html              — Bricolage + Jakarta + JetBrains Mono fonts
├── vite.config.ts          — proxies /api + /rt to :3000
└── package.json
```

## Design fidelity vs the prototype

- **Colors + typography identical** — the `:root` CSS variables in
  `styles/globals.css` are copied verbatim from `../styles.css`.
- **All keyframes ported** — `letter-drop`, `dot-pop`, `orb-drift`,
  `shake`, `float-up`, `pop-in`, `confetti-fall`, `heart-rise`,
  `pulse-glow`, `fold-spin`, `typing`, `pulse-loc`, `shimmer`. Match
  moment supports all three animation variants.
- **PhotoCarousel gestures work identically** — tap left third → prev,
  center → open, right third → next; horizontal drag → swipe. Works on
  mouse + touch alike (pointer events).
- **Sheets slide up from the bottom on mobile, center on desktop** —
  the `.sheet` class inherits the same `sheet-in` keyframe animation.

## What "responsive" means here

- **≥1024px:** side nav (Discover / Places / Events / Chats / Me) on the
  left, main content 900px max-width centered, cards render as a
  responsive grid (`repeat(auto-fill, minmax(320px, 1fr))`).
- **<1024px:** bottom tab bar, main content full-width, single-column
  cards.

## Backend contract

Requires the backend to have the **verification gate removed** (done in
the same pass — see `../backend/src/modules/onboarding/onboarding.service.ts`
and `../backend/src/modules/discovery/discovery.service.ts`). Photos are
still required (≥2 to complete onboarding); verification is optional /
disabled entirely for this web build.

New backend endpoints added for the web flow:
- `POST /onboarding/complete` — flips `onboarding → active`
- `GET /onboarding/interests-catalog` — list interests (no admin auth)
- `GET /onboarding/prompts-catalog` — list active prompts

## Known limits vs. the iOS prototype

- **No native map view** on Places — uses the list view. Add Mapbox GL
  JS or Leaflet later if you want the pin canvas.
- **Photo drag-to-reorder** in onboarding is not wired — order comes
  from upload order. Add react-dnd if needed.
- **In-app notification centre** (activity feed) not built as a
  separate screen — badge count updates live via the WS `notification:new`
  event but there's no dedicated `/activity` page yet.
