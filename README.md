# hey

A dating app where physical presence is the differentiator — real people at real spots, real events. Web-first build.

```
├── backend/          Nest.js API + WebSocket + serves the built frontend
├── web/              Vite + React responsive frontend
├── prototype-ios/    Original iOS-styled prototype (frozen reference, not deployed)
├── package.json      Orchestrates the whole build for single-process deploy
├── DEPLOY.md         Step-by-step Hostinger + Supabase + Upstash guide
└── BACKEND_SPEC.md   Original backend spec document
```

## Two-process local dev

```bash
# One-time setup
docker compose -f backend/docker-compose.yml up -d      # Postgres+PostGIS + Redis
cd backend && npm install && cp .env.example .env
npx prisma migrate deploy && npm run db:seed
cd ../web && npm install
cd ..

# Terminal 1 — backend on :3000
cd backend && npm run start:dev

# Terminal 2 — web on :5173 (proxies /api and /rt to :3000)
cd web && npm run dev
```

Open `http://localhost:5173` → tap the splash → phone → OTP `123456` (stub default) → onboarding → discover.

## One-process production build

```bash
# From repo root
npm install              # postinstall installs backend + web deps
npm run build            # builds web → copies to backend/public → builds backend
npm start                # single Node process serves API + WS + SPA at :3000
```

This is the shape Hostinger runs. See `DEPLOY.md` for the full walk-through.

## Design system

Same palette, fonts, and animations across the iOS prototype and the web build. The `:root` CSS variables in `web/src/styles/globals.css` were copied verbatim from `prototype-ios/styles.css`. If you want a visual diff against the original iPhone mocks, open `prototype-ios/index.html` via any static server.

## Docs

- **[DEPLOY.md](DEPLOY.md)** — Hostinger + Supabase (Postgres+PostGIS) + Upstash (Redis) deploy
- **[BACKEND_SPEC.md](BACKEND_SPEC.md)** — original backend spec the API was built from
- **[backend/README.md](backend/README.md)** — every endpoint + which spec step built it
- **[web/README.md](web/README.md)** — component + screen map
- **[prototype-ios/README.md](prototype-ios/README.md)** — what the iOS prototype files are
