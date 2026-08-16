# Hey — backend

Node.js + NestJS + Prisma. Currently Postgres + PostGIS; Sprint 3 swaps
in MySQL 8 (JSON columns + `POINT SRID 4326`) so the app runs on
Hostinger's managed MySQL and one Node process serves API + WebSockets +
the built SPA.

Originally scaffolded from `../BACKEND_SPEC.md`. Sprint 1 stripped the
schema and modules down to the ship-scope feature set — face
verification, spots, events, admin console, and the BullMQ queue are
gone; profile discovery, likes/matches, chat, and account safety remain.
Sprint 2 removed Redis — presence, rate limits, the feed-shown cache,
and cron locks all live in-process now (single-Node deploy).

## Quick start

```bash
# 1. infra (Postgres+PostGIS) in Docker
docker compose up -d

# 2. install
npm install

# 3. env
cp .env.example .env
# (defaults already point at the compose stack)

# 4. apply migrations + seed catalog data
npx prisma migrate deploy
npx prisma generate
npm run db:seed

# 5. run
npm run start:dev
# → http://localhost:3000/api/v1
```

To reset everything:

```bash
docker compose down -v && docker compose up -d
npx prisma migrate deploy && npm run db:seed
```

## Ship scope

| Feature | Status |
|---|---|
| Auth + OTP (Twilio Verify / stub) | ✅ |
| Onboarding: name, dob (18+), gender, lookingFor, interests, prompts, photos | ✅ |
| Profile photos (S3 or local stub) | ✅ |
| Discovery: filters + ranking + feed | ✅ |
| Likes + matches | ✅ |
| Chat: REST + Socket.IO (typing, read receipts, presence) | ✅ |
| Notifications (FCM / stub) | ✅ |
| Safety: reports (profile only), blocks, account status, delete | ✅ |
| Static SPA hosting via `@nestjs/serve-static` (`../public`) | ✅ |
| Face verification | ❌ removed (Sprint 1) |
| Spots / check-ins | ❌ removed |
| Events / RSVP | ❌ removed |
| Admin console | ❌ removed (deferred, post-launch) |
| BullMQ / face-match queue | ❌ removed |

## Endpoints (`/api/v1/*`)

### Auth
```
POST /auth/otp/request   { phone_e164 }
POST /auth/otp/verify    { phone_e164, code }
POST /auth/refresh       { refreshToken }
POST /auth/login/email   { email, password }
POST /auth/logout        { refreshToken? }
GET  /health
```

Stub OTP: any phone, code is `OTP_STUB_CODE` (`123456`).

### Onboarding + photos
```
PATCH /onboarding/profile       partial profile upsert (18+ enforced)
POST  /onboarding/interests     3–6 interests
POST  /onboarding/prompts       1–3 prompts (answer ≤ 140 chars)
POST  /onboarding/email-pass    backup email/password login
GET   /onboarding/state         { status, canActivate, completeness{...}, profile, account }

POST   /photos/upload-url       → { uploadUrl, s3Key, ... }
POST   /photos/confirm          → moderates, inserts photo
DELETE /photos/:id
PATCH  /photos/reorder          orderedIds[] (position 0 becomes main)
```

Onboarding rules:
- dob → age ≥ 18 (`422 UNDERAGE`)
- bio ≤ 180 chars
- 3–6 interests, 1–3 prompts (each answer ≤ 140), ≥ 2 photos

### Me / filters
```
GET  /me                        current profile (null-omit optional fields)
PUT  /me/location               { lat, lng }
PUT  /me/settings               { visibility: 'everyone'|'liked_only', ... }
PUT  /account/status            { status: 'active'|'paused'|'hidden', autoResumeAt? }
DELETE /account                 soft-delete, revokes refresh tokens

GET  /filters
PUT  /filters                   partial: distanceMi, ageMin/Max, heightMinCm/MaxCm, ...
```

### Discovery
```
GET /discovery/feed?cursor=&limit=20
GET /discovery/profile/:userId
```

Hard filters (SQL):
1. `users.status = active`
2. Distance ≤ `filters.distanceMi` (PostGIS `ST_DWithin`; Sprint 3 swaps to MySQL `ST_Distance_Sphere`)
3. Age ∈ `[ageMin, ageMax]`
4. Height ∈ `[heightMinCm, heightMaxCm]` (NULL passes)
5. Mutual gender ↔ lookingFor
6. No `blocks` in either direction
7. Not already in viewer's `likes` or `passes`
8. Candidate `visibility`: `everyone`, or `liked_only` iff candidate already liked viewer

Ranking (in-process, weights in `feed_config` singleton):
```
score = w_recency        * recency(last_active)         // 1.0 ≤1h, linear decay to 0 by 30d
      + w_mutual_int     * min(shared_interests / 6, 1)
      + w_distance       * max(0, 1 - dist / radius)
      + w_reciprocal     * (they_liked_me ? 1 : 0)
      - w_recent_shown   * (shown_recently ? 1 : 0)
```

### Likes + matches + chat
```
POST /likes                     { targetUserId, kind: 'like'|'super', note? }
POST /passes                    { targetUserId }
GET  /matches                   inbox

GET  /matches/:id/messages?cursor=&limit=50
POST /matches/:id/messages      { body, clientMsgId? }
POST /matches/:id/read          { upToMessageId }
```

WebSocket (Socket.IO, `/socket` namespace) — auth via `?token=<accessToken>`:
- `message:new`, `message:delivered`, `message:read`
- `typing:start`, `typing:stop`
- `presence:update` (per-match)
- `match:new` (on new match)

### Safety
```
POST /reports                   { targetType:'profile', targetId, reason, detail ≥ 10 chars }
GET  /reports                   caller's own report history
POST /blocks                    { targetUserId }
DELETE /blocks/:targetUserId
GET  /blocks
```

## Environment

See `.env.example`. All required vars have safe dev defaults matching
`docker-compose.yml`. Notable knobs:

- `FEED_W_*` — ranking weights; fallback if the `feed_config` DB row is missing
- `RL_*` — per-user rate limits (OTP, likes/day, reports/day, messages/min)
- `S3_PROVIDER=stub` — writes to `S3_STUB_DIR` and serves via `/api/v1/_storage/*`
- `TWILIO_PROVIDER=stub` — accepts `OTP_STUB_CODE` (or any code if blank)
- `FCM_PROVIDER=stub` — logs push payloads

## Tests

```bash
npm run test           # unit
npm run test:e2e       # integration (needs docker-compose infra)
```

Integration coverage:
- `auth-onboarding.spec.ts` — OTP + lockout, DOB validation, sparse profile shaping
- `discovery-likes.spec.ts` — feed filters, ranking, like → match, super-like note
- `chat.spec.ts` — REST + WS round-trip, typing, read receipts, presence
- `safety-account.spec.ts` — reports, block bidirection, paused/hidden exclusion, soft-delete

Each spec truncates mutable tables between tests and reseeds the
`feed_config` singleton, so specs are order-independent.

## Deploying to Hostinger

Sprint 3 rewrites the schema for MySQL 8 and moves the SPA under
`../public`. The single-process deploy runs `node backend/dist/main.js`
from the repo root — `@nestjs/serve-static` reads from `join(__dirname,
'..', 'public')` so the static assets resolve regardless of Hostinger's
working directory. Sprint 2 already removed Redis, so the deploy is one
Node process + one managed database — no other infra needed.
