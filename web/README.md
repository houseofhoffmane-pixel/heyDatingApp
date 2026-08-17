# Hey — web

Responsive web port of the Hey iOS prototype. Same design DNA, same
animations — running against the ship-scope Nest backend in
`../backend`.

## Run it

```bash
# From the repo root — one command per terminal.
npm run dev:backend    # boots the Nest API + WS on :3000
npm run dev:web        # boots Vite on :5173, proxies /api and /rt to :3000
```

The Vite dev server proxies `/api` and `/rt` to `localhost:3000` so
you avoid CORS pain during development.

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
│       └── main/           — Discover, ProfileDetail, Chats, Chat,
│                             Me, Settings, LikeSheet, MatchMoment
├── index.html              — Bricolage + Jakarta + JetBrains Mono fonts
├── vite.config.ts          — proxies /api + /rt to :3000
└── package.json
```

## Design fidelity vs the prototype

- **Colors + typography identical** — the `:root` CSS variables in
  `styles/globals.css` are copied verbatim from
  `../prototype-ios/styles.css`.
- **All keyframes ported** — `letter-drop`, `dot-pop`, `orb-drift`,
  `shake`, `float-up`, `pop-in`, `confetti-fall`, `heart-rise`,
  `pulse-glow`, `fold-spin`, `typing`, `pulse-loc`, `shimmer`.
- **PhotoCarousel gestures work identically** — tap left third → prev,
  center → open, right third → next; horizontal drag → swipe. Works on
  mouse + touch alike (pointer events).
- **Sheets slide up from the bottom on mobile, center on desktop** —
  the `.sheet` class inherits the same `sheet-in` keyframe.

## What "responsive" means here

- **≥1024px:** side nav (Discover / Chats / Me) on the left, main
  content 900px max-width centered, cards render as a responsive grid
  (`repeat(auto-fill, minmax(320px, 1fr))`).
- **<1024px:** bottom tab bar, main content full-width, single-column
  cards.

## Ship-scope

The Places, Events, and Verification screens from the iOS prototype
are **not part of the web launch** — those modules were removed from
the backend in Sprint 1 (see the root [README.md](../README.md) for
the full ship-scope summary). Onboarding requires ≥ 2 photos but has
no selfie / face-match step; completing onboarding flips the user to
`active` immediately.

Kept: auth + OTP, onboarding, discovery, likes/matches, chat, safety,
account status/delete.

## Backend contract

Endpoints the web app hits (all under `/api/v1`):

- `POST /auth/otp/{request,verify}`, `POST /auth/refresh`, `POST /auth/login/email`
- `PATCH /onboarding/profile`, `POST /onboarding/{interests,prompts,complete,email-pass}`
- `GET /onboarding/{state,interests-catalog,prompts-catalog}`
- `POST /photos/{upload-url,confirm}`, `DELETE /photos/:id`
- `GET /discovery/feed`, `GET /discovery/profile/:userId`, `PUT /me/location`
- `POST /likes`, `POST /passes`
- `GET /matches`, `GET /matches/:id/messages`, `POST /matches/:id/{messages,read}`
- `GET /me`, `PATCH /me/profile`, `GET/PUT /settings`
- `PUT /account/status`, `DELETE /account`
- `GET /notifications`

Realtime (`/rt` namespace, Socket.IO): `message:new`,
`message:delivered`, `message:read`, `typing:start`, `typing:stop`,
`match:new`, `notification:new`, `presence:update`.
