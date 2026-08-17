# hey

A responsive web dating app. Single Node.js process serves the React SPA,
the REST API, and the WebSocket gateway. Only external dependency is one
managed MySQL database.

```
├── backend/          Nest.js API + WebSocket + serves the built SPA
├── web/              Vite + React responsive frontend
├── prototype-ios/    Original iOS-styled prototype (frozen reference, not deployed)
├── scripts/          Cross-platform build helpers
├── package.json      Orchestrates the whole build for single-process deploy
├── DEPLOY.md         Step-by-step Hostinger + MySQL 8 guide
└── BACKEND_SPEC.md   Original backend spec document (pre-ship-scope)
```

## Two-process local dev

```bash
# One-time setup
docker compose -f backend/docker-compose.yml up -d      # MySQL 8
cd backend && npm install && cp .env.example .env
npx prisma migrate deploy && npm run db:seed
cd ../web && npm install
cd ..

# Terminal 1 — backend on :3000
npm run dev:backend

# Terminal 2 — web on :5173 (proxies /api and /rt to :3000)
npm run dev:web
```

Open `http://localhost:5173` → splash → phone → OTP `123456` (stub
default) → onboarding → discover.

## One-process production build

```bash
# From repo root
npm run build            # installs backend + web deps, builds web →
                         # copies to backend/public/, builds backend
npm start                # single Node process serves API + WS + SPA at :3000
```

This is the shape Hostinger runs. See [DEPLOY.md](DEPLOY.md) for the
full walk-through.

## Golden-path smoke test

Once the backend is running (`npm run dev:backend` or `npm start`),
verify end-to-end wiring in ~5 seconds:

```bash
npm run smoke
```

The [smoke script](scripts/smoke.sh) onboards two users, sets their
locations, and drives them through the like → match → chat flow via
`curl`. Exits non-zero on the first failed step and prints the offending
response body. Requires `jq`.

## Ship scope

Removed in Sprints 1–3, not part of the launch:

- Face verification (photos still required, no selfie step)
- Spots + check-ins
- Events + RSVP
- Admin console (post-launch)
- Redis, BullMQ (in-process everything, single Node process)
- Postgres/PostGIS (MySQL 8 with `POINT` + `ST_Distance_Sphere` instead)

Kept: auth + OTP, onboarding + photos, discovery/filters/ranking, likes
+ matches, chat (REST + WS + presence + read receipts), safety (reports
+ blocks + account status/delete), notifications (FCM/stub).

## Design system

Same palette, fonts, and animations across the iOS prototype and the
web build. The `:root` CSS variables in `web/src/styles/globals.css`
were copied verbatim from `prototype-ios/styles.css`. To visually diff
against the original iPhone mocks, open `prototype-ios/index.html` via
any static server.

## Docs

- **[DEPLOY.md](DEPLOY.md)** — Hostinger MySQL deploy
- **[backend/README.md](backend/README.md)** — API surface + module map
- **[web/README.md](web/README.md)** — screen + component map
- **[BACKEND_SPEC.md](BACKEND_SPEC.md)** — original pre-trim spec
- **[prototype-ios/README.md](prototype-ios/README.md)** — frozen iOS prototype
