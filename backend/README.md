# Hey — backend

Node.js + NestJS + Prisma + PostgreSQL (PostGIS) + Redis.
Built top-down from `../BACKEND_SPEC.md`. Each §11 step lands in a follow-up
commit; current state is documented under **Status** below.

## Quick start

```bash
# 1. infra (Postgres+PostGIS, Redis) in Docker
docker compose up -d

# 2. install
npm install

# 3. env
cp .env.example .env
# (defaults already point at the compose stack)

# 4. apply the initial migration + seed catalog data
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

## Status

| Step (§11) | Status |
|---|---|
| 1 — Schema + migrations (PostGIS) | ✅ |
| 2 — Auth + OTP | ✅ |
| 3 — Onboarding / profile / photos | ✅ |
| 4 — Verification worker | ✅ |
| 5 — Discovery / filters / ranking | ✅ |
| 6 — Likes + matches | ✅ |
| 7 — Chat (REST + WS) | ✅ |
| 8 — Places + check-in geo | ✅ |
| 9 — Events + RSVP | ✅ |
| 10 — Notifications (FCM) | ✅ |
| 11 — Safety + settings | ✅ |
| 12 — Admin | ✅ |
| 13 — Integration tests | ✅ |

## Auth endpoints (Step 2)

All routes are `/api/v1/*`. Public unless noted.

```
POST /auth/otp/request   { phone_e164 }                        — sends code (stub logs it)
POST /auth/otp/verify    { phone_e164, code }                  — returns { accessToken, refreshToken, user, isNewUser }
POST /auth/refresh       { refreshToken }                      — rotates the pair, revokes the old refresh
POST /auth/login/email   { email, password }                   — backup login (set during onboarding)
POST /auth/logout        { refreshToken? }   (Authorization)   — revoke one or all of caller's refresh tokens
GET  /health                                                   — readiness probe (db+redis)
```

Stub OTP: any phone, code is `OTP_STUB_CODE` (`123456` by default). Set blank to accept anything.

Try it once the app boots:

```bash
curl -s localhost:3000/api/v1/auth/otp/request -H 'content-type: application/json' \
  -d '{"phone_e164":"+15550104242"}'
curl -s localhost:3000/api/v1/auth/otp/verify  -H 'content-type: application/json' \
  -d '{"phone_e164":"+15550104242","code":"123456"}'
```

## Onboarding + photos (Step 3)

All routes require `Authorization: Bearer <accessToken>` from Step 2.

```
PATCH /onboarding/profile     partial upsert of any field (name, dob, ageConfirmed, gender, lookingFor[],
                              relationshipIntent, heightCm, bio, job, school, pronouns, starSign,
                              lifestyle{drinks,smokes,exercise,weed420}, values{kids,politics,religion,monogamy})
                              → server rejects dob < 18 with 422 UNDERAGE
POST  /onboarding/interests   { interest_ids: [uuid x3..6] }   (replace-all)
POST  /onboarding/prompts     { items: [{prompt_id, answer<=140}] x1..3 }
POST  /onboarding/email-pass  { email, password (8+) }         (sets backup login)
GET   /onboarding/state       → { status, canSubmitForVerification, completeness{satisfied,missing,percent}, profile{...}, account{...} }

POST   /photos/upload-url     { contentType: image/jpeg|png|webp|heic }
                              → { uploadUrl, s3Key, headers, expiresAt }   client PUTs file to uploadUrl
POST   /photos/confirm        { s3Key, position? }             → moderates, inserts row, returns photo + read URL
DELETE /photos/:id            → removes row + best-effort object delete
PATCH  /photos/reorder        { orderedIds: [uuid x2..6] }     → position 0 becomes main
```

Local-storage stub: upload URLs point at the in-process `/api/v1/_storage/upload/<key>?token=...`, signed
with HMAC-SHA256. Files land under `S3_STUB_DIR` (default `./.local-s3`). Flip `S3_PROVIDER=real` to hit AWS
directly (no proxy through the API).

Onboarding rules (server-enforced, mirroring §7.1):
- dob → age must be ≥ 18 (`422 UNDERAGE`)
- bio ≤ 180 chars
- 3–6 interests, 1–3 prompts (each answer ≤ 140), ≥ 2 photos
- `completionPct` recomputed on every PATCH/Post

## Verification (Step 4)

```
POST /verification/upload-url   { contentType }                → { uploadUrl, s3Key, ... }
POST /verification/submit       { selfieS3Key }                → 202; { status:'pending', attempt, createdAt }
GET  /verification/status                                       → { status, attempt, rejectReason?, matchConfidence?, isVerified }
```

Submit does three things in order: (1) calls onboarding completeness check — 422 `ONBOARDING_INCOMPLETE`
if any mandatory field is missing; flips `users.status` to `pending_verification` once it passes.
(2) inserts a `verifications` row at `status='pending'`, attempt counter from prior rejections.
(3) enqueues a `face-match` BullMQ job, deduped by `verification.id`.

A worker (`FaceMatchProcessor`) consumes the queue in-process (concurrency 2, 3 retries with exponential
backoff). It calls the face-match provider (stub returns `REKOGNITION_STUB_CONFIDENCE`, real Rekognition
runs `CompareFaces` selfie vs each profile photo, taking the max). On approval: `users.status` flips to
`active`, the selfie object is purged (§10 retention), an in-app notification is created. On rejection:
`verifications.rejectReason` is set (`face_out_of_frame` / `low_quality` / `low_similarity` / etc.) and a
rejection notification is created. After 3 rejections, `/submit` 422s and the row sits in the admin
manual-review queue (Step 12).

Set `REKOGNITION_STUB_CONFIDENCE` below `FACE_MATCH_THRESHOLD` (default 90) in `.env` to exercise the
rejection path locally — no AWS account needed.

## Discovery + filters (Step 5)

```
PUT  /me/location           { lat, lng }                       — caller must do this once before /feed works
GET  /discovery/feed?cursor=&limit=20                          — filtered + ranked candidate list
GET  /discovery/profile/:userId                                — full profile (verified + visibility + blocks gate)
GET  /filters                                                  — current filter row (auto-created on first read)
PUT  /filters                {...partial...}                   — update any subset
```

Empty-feed shapes — `meta.reason` distinguishes:
- `no_location` — viewer hasn't sent /me/location yet
- `profile_incomplete` — viewer has no gender set yet
- `out_of_radius` — distance filter ate everyone (matches §8 test 12)
- `no_matches` — distance OK but other filters left zero

Hard filters (SQL) apply in one shot per request:
1. `users.status = active` + has an approved verification (verified-only gate)
2. PostGIS `ST_DWithin` distance ≤ `filters.distanceMi` (miles → meters inline)
3. Age `EXTRACT(YEAR FROM AGE(dob))` ∈ `[ageMin, ageMax]`
4. Height `BETWEEN heightMinCm AND heightMaxCm` (NULL height passes)
5. Mutual gender ↔ `lookingFor` (gender enum collapses `woman/trans_woman → women`, etc.; `everyone` opts out)
6. No `blocks` row in either direction
7. Not in `likes` or `passes` from the viewer
8. Candidate `visibility` rules:
   - `everyone` — pass
   - `liked_only` — pass iff candidate already liked viewer
   - `spot_only` — pass iff both are active-checked-in to the same place/event

Ranking (in-process, weights tunable via the `feed_config` singleton):
```
score = w_recency      * recency(last_active)         // 1.0 ≤1h, linear decay to 0 by 30d
      + w_mutual_int   * min(shared_interests / 6, 1)
      + w_same_spot    * (co-present-now ? 1 : 0)
      + w_distance     * max(0, 1 - dist / radius)
      + w_reciprocal   * (they_liked_me ? 1 : 0)
      - w_shown_pen    * min(times_shown_24h / 5, 1)   // Redis-backed
```

`feed_config` defaults (0.25/0.20/0.20/0.15/0.15/0.05) come from migration 0_init; tunable at runtime
once Step 12 (`/admin/config/feed-weights`) lands.

## Likes + matches + realtime (Step 6)

```
POST   /likes              { toUserId, anchorType, anchorPhotoId?, anchorPromptId?, comment? }
                                                                → { matched, matchId, alreadyLiked }
POST   /passes             { toUserId }                         → idempotent
GET    /likes/received                                           → [{ id, anchor:{kind,...}, comment, sender:{name,age,photo} }]
GET    /matches                                                  → chat list (sorted by lastMessageAt desc; isNew if no msg yet)
DELETE /matches/:id                                              → unmatch (other side not notified)
```

Match formation:
- `POST /likes` validates target is active+verified, anchor belongs to target, no blocks, not self.
- Rate-limited at `RL_LIKES_PER_DAY` per user (default 200, sliding 24h window).
- Idempotent — re-liking returns the existing like + the current match status.
- Reciprocal-like detection runs in the same request; on match, a `matches` row is created
  with sorted-pair invariant (`userAId < userBId`), and a `match:new` event fires to each
  user's personal room with the OTHER person's profile + THEIR OWN like (the anchor pinned
  at the top of the chat).
- `notifications` row dropped for each side (FCM delivery wires up in Step 10).

Realtime layer — Socket.IO namespace `/rt`:
```js
// Browser:
const sock = io('http://localhost:3000/rt', {
  auth: { token: accessToken },          // JWT from /auth/otp/verify or /auth/refresh
  transports: ['websocket'],
});
sock.on('match:new', ({ match, otherProfile, myAnchor }) => { /* show "it's a match" */ });
```
- Handshake auth via `auth.token` (or `Authorization: Bearer` header for non-browser clients);
  bad token → connection refused before any room work.
- On connect every socket joins `user:<id>` and one room per active match (`match:<id>`).
- Redis adapter (pub+sub clients duplicated off the main connection) so events fan out across
  multiple gateway instances behind a load balancer.
- Presence: a Redis SET `presence:<userId>` of live socket IDs. `RealtimeService.isUserOnline()`
  reads it — used in Step 7 to decide between WS push and FCM fallback.

## Chat (Step 7)

REST (durable history + fallback for offline sends):
```
GET  /matches/:matchId/messages?cursor=&limit=50    — newest-first, cursor = ISO of oldest in prev page
POST /matches/:matchId/messages   { clientId, body, kind: text|place_share|location_share }
                                                     — 201; { message, duplicate }
POST /matches/:matchId/read       { upToMessageId? } — marks all unread inbound up to that message read
```

WS (live updates) — same `/rt` namespace, JWT-authed handshake from Step 6:
```js
// Client → server (each takes an ack callback)
sock.emit('message:send', { matchId, clientId, body, kind: 'text' }, ack => ack.message);
sock.emit('message:read', { matchId, upToMessageId }, ack => /* ... */);
sock.emit('typing:start', { matchId });
sock.emit('typing:stop',  { matchId });

// Server → client
sock.on('message:new',  msg => /* { id, matchId, senderId, body, kind, createdAt, readAt } */);
sock.on('message:read', evt => /* { matchId, upToMessageId, readAt, readBy } */);
sock.on('typing',       evt => /* { matchId, userId, state: 'start'|'stop' } */);
```

Key guarantees:
- **Idempotent send** — `(match_id, sender_id, client_id)` is unique at the DB; re-sending the
  same `clientId` returns the original row with `duplicate: true`. Offline-retry safe.
- **Block-aware** — blocked-by-either-side gets `404 MATCH_NOT_FOUND` on send + list (we never
  leak that the block happened).
- **Unmatched** — `403 UNMATCHED` on send.
- **Rate limited** — `RL_MESSAGES_PER_MIN` per user (default 60/min).
- **lastMessageAt** — bumped on each send so `/matches` re-sorts in real time.
- **Push fallback** — `RealtimeService.isUserOnline()` checks the presence SET; if the
  recipient has no live socket we drop a `notifications` row + ask `PushService` to send.
  Push provider is stubbed for now (logs the payload); Step 10 wires FCM + the full
  preference / quiet-hours matrix.

## Places + check-in (Step 8)

```
GET    /places?view=map|list&near=lat,lng&filters=coffee,cocktail&radiusKm=25
                                                   — list (faces never included)
GET    /places/:id                                 — detail; peopleHere[] ONLY if requester is checked in here
POST   /places/:id/checkin   { lat, lng }          — 100m gate, 2h TTL, anti-spoof
POST   /places/:id/leave                            — drop checkin, broadcast new count
POST   /places/:id/save / DELETE /places/:id/save  — toggle saved_spots
POST   /places/requests      { label, address?, detail }
                                                   — user-suggested venue → place_requests queue
```

Check-in pipeline (`checkin.service.ts`):
1. Place must be `active` and have a `location`
2. `ST_Distance` ≤ `CHECKIN_RADIUS_M` (default 100m). Otherwise `422 TOO_FAR` with the actual distance
3. **Anti-spoof**: haversine from the user's previous checkin coords — if implied speed > 300 km/h, `422 SPOOF_DETECTED`
4. Per-user rate limit (`RL_CHECKINS_PER_5MIN`, default 1)
5. Idempotent — already-active here returns the existing row
6. Silent leave from any other active spot/event so the user is in exactly one place
7. Insert with `expiresAt = now + CHECKIN_TTL_HOURS` (default 2h)
8. Update `profiles.location` to checkin coords (feeds discovery)
9. Join all the user's sockets to `place:<id>`
10. Emit `place:count` to that room

Privacy gate on `GET /places/:id`:
- Not checked in here → `{ hereCount, locked: true, peopleHere: null }`
- Checked in here → `peopleHere: [{ userId, name, age, mainPhotoUrl, isVerified, checkedInAt, relationship: 'match'|'i-liked'|'liked-me'|null }]`. Blocks + the `show_me_on_places` opt-out filter the list.

Background expiry:
- `CheckinExpiryProcessor` runs every minute (`@Cron`). Single-leader lock in Redis (`SET NX EX 90`) so multi-instance deployments fire once.
- For each touched place, recounts and emits `place:count`. Per-user `checkin:expired` event + room leave so the client UI updates without a refresh.

WS additions on `/rt`:
```js
// Map viewers can opt into per-pin counts without being checked in:
sock.emit('subscribe:places',   { placeIds: [...] });
sock.emit('unsubscribe:places', { placeIds: [...] });

sock.on('place:count',     ({ placeId, count }) => /* tick pin */);
sock.on('checkin:expired', ({ placeId, eventId }) => /* refresh */);
```
RealtimeGateway re-joins active checkin rooms on reconnect so a flaky connection doesn't drop the live count.

## Events + RSVP (Step 9)

```
GET    /events?cityId=&filter=tonight|this-week|free|saved|rsvpd&limit=&cursor=
                                                       — paginated; filters are spec-defined + a useful `rsvpd`
GET    /events/:id                                     — detail + goingCount + matchesGoing[8] + checkinOpen bool
GET    /events/:id/going?cursor=&limit=                — all attendees, paginated, with `relationship` per row
POST   /events/:id/rsvp / DELETE /events/:id/rsvp      — upsert event_rsvps; cancelled rows kept for audit
POST   /events/:id/checkin   { lat, lng }              — day-of: window + 100m
POST   /events/:id/leave
POST   /events/:id/save / DELETE /events/:id/save      — toggle saved_events
```

`matchesGoing` per spec §7.6 = intersection of RSVPs with `(my matches ∪ likes either direction)`. The
detail endpoint returns the first 8 (matches first, then liked-me, then i-liked); the list endpoint
returns just the count per event for the cards.

`/events/:id/going` excludes the viewer + active-status candidates + blocks both ways, and tags each row
with `relationship: 'match' | 'i-liked' | 'liked-me' | null` for the heart-badge UI.

Day-of check-in piggy-backs on `CheckinService` (same table, keyed on `event_id`):
- `now` must be `∈ [startsAt, endsAt]` → `422 EVENT_NOT_STARTED` / `EVENT_ENDED`
- Same 100m + anti-spoof + rate-limit guarantees as places
- `expiresAt = min(now + CHECKIN_TTL_HOURS, event.endsAt)` so check-ins die when the event does
- Emits `event:count` to `event:<id>` room on check-in / leave / expiry
- `CheckinExpiryProcessor` already handles event_id rows alongside place_id rows

## Notifications + FCM (Step 10)

```
POST   /devices                  { fcmToken, platform: ios|android|web }
DELETE /devices/:token

GET    /notifications?cursor=&limit=&unreadOnly=  → activity feed, newest first
POST   /notifications/read       { upToId? }      → mark up to that id (omit = mark all)

WS:    sock.on('notification:new', ({ id, type, payload, createdAt }) => /* badge */)
```

**Triggers (the spec's §7.10 surface), wired through `NotificationsService.fanOut`:**

| Trigger | type | pref-key | quiet-hours |
|---|---|---|---|
| New like (no reciprocal) | `like.new` | `notifyLikes` | yes |
| New match (both sides) | `match.new` | `notifyMatches` | yes |
| New message (recipient offline) | `message.new` | `notifyMessages` | yes |
| Match checks into your spot | `place.match-here` | `notifyPlaces` | yes |
| Verification approved/rejected | `verification.{approved,rejected}` | — | no (status-critical) |
| Event reminder, 2h prior | `event.reminder` | `notifyEvents` | yes |

Each call: (1) drops the `notifications` row, (2) emits `notification:new` to the user's WS room
(unless `skipRealtime` — chat does this since it already emitted `message:new`), (3) calls
`PushService.sendToUser` with the right pref + quiet-hours flags.

`PushService` looks up `device_tokens`, enforces `user_settings.notify*` toggles, and gates by
`quietHoursStart..End` (timezone caveat: server-local for v1). After each send it purges any
tokens FCM reports as `UNREGISTERED` / `INVALID_ARGUMENT`.

**Real FCM provider** ([push.fcm.provider.ts](backend/src/modules/push/providers/push.fcm.provider.ts)):
- HTTP v1 (`https://fcm.googleapis.com/v1/projects/$id/messages:send`)
- Mints an OAuth2 access token from the service-account JSON via RS256-signed JWT (uses the
  existing `jsonwebtoken` dep — no `firebase-admin` SDK). Token cached until 5 min before expiry.
- Flip `FCM_PROVIDER=real` and set `FCM_PROJECT_ID` + `FCM_CREDENTIALS_JSON`.

**Event reminder cron** ([event-reminder.processor.ts](backend/src/modules/notifications/jobs/event-reminder.processor.ts)):
- `@Cron(EVERY_5_MINUTES)` with the same Redis `SET NX EX` leader lock as the check-in expiry.
- Picks events with `startsAt ∈ [now+1h55m, now+2h05m]`.
- For each event finds the union of RSVP'd + saved users, skips those who already have a
  `notifications` row of `type='event.reminder'` for this `eventId` (JSONB query, idempotent
  across reruns).

## Safety + settings (Step 11)

```
# Self
GET    /me                                      → full owner profile (uses ProfileShaper.toOwner)
PATCH  /me/profile                              → reuses OnboardingService.patchProfile (same DTO)
GET    /settings        / PUT /settings         → user_settings + users.visibility
PUT    /account/status     { status: active|paused|hidden, autoResumeAt? }
DELETE /account                                  → soft-delete, kicks every active session + match
GET    /emergency-contact / POST /emergency-contact / DELETE /emergency-contact
POST   /linked-accounts/:provider/connect       → instagram | spotify (stubbed OAuth)
DELETE /linked-accounts/:provider

# Safety
POST   /reports             { targetType, targetId, reason, detail (≥10) }
GET    /reports/mine                             → user's own history
POST   /blocks              { userId }           → also flips active match to `unmatched`
DELETE /blocks/:userId
GET    /blocks                                   → who I've blocked
```

Account status transitions are guarded:
- `active` is only allowed from `paused` / `hidden`. Onboarding / pending_verification can't skip the flow.
- `hidden` triggers a silent leave from every active spot/event check-in (CheckinService) so the spot rosters update immediately.
- `DELETE /account` soft-deletes, sets `deleted_at`, revokes every refresh token (instant logout across devices), unmatches every active match, leaves every spot. The hard delete happens 30 days later via the purge cron.

Three new cron jobs join check-in expiry and event reminders:

| Job | Schedule | What it does |
|---|---|---|
| `auto-resume` | every 30 min | Flips paused/hidden → active when `autoResumeAt ≤ now` |
| `account-purge` | daily 03:00 | Hard-deletes users soft-deleted > `ACCOUNT_PURGE_DAYS` ago. Cascade FKs clear the related rows; storage objects (profile photos, leftover selfies) are purged best-effort |
| `unmatch-fairy` | daily 04:00 | Flips active matches with no `lastMessageAt` and `createdAt < now − UNMATCH_SILENCE_DAYS` to `expired`. Silent — no notification |

All three use the same `SET NX EX` Redis leader lock as the check-in expiry, so a multi-instance deployment fires each job exactly once per tick.

`POST /reports` enforces detail ≥ 10 chars at three layers: DTO, service trim+check, and the DB `CHECK (CHAR_LENGTH(TRIM(detail)) >= 10)` constraint from migration 0_init. Target existence is validated against the right table (`users` / `places` / `events`) so the admin queue never sees ghosts.

## Admin (Step 12)

All endpoints under `/api/v1/admin/*`. **Separate JWT signing key** (`ADMIN_JWT_SECRET`) so a stolen
user access token can't authenticate against the admin surface and vice versa. Login returns a single
8h access token — no refresh; staff re-auth when it expires.

```
POST /admin/auth/login                            { email, password }     → { accessToken, admin }

# Catalog-management
GET    /admin/places                              list (with current here_count)
POST   /admin/places                              { label, kind, vibe, address, ... } → geocode → store
PATCH  /admin/places/:id                          (address change re-geocodes)
DELETE /admin/places/:id                          (admin role)
GET    /admin/places/requests                     user-suggested venues queue
POST   /admin/places/requests/:id/action          { action: approve|dismiss }

GET    /admin/events
POST   /admin/events                              { placeId? | address required when placeId absent }
PATCH  /admin/events/:id  /  DELETE :id (admin)
GET    /admin/events/:id/attendees                 full RSVP list with PII (admin surface)

# Moderation
GET    /admin/reports?status=pending&limit=&cursor=
POST   /admin/reports/:id/action                  { action: warn|ban|remove|dismiss, note? }
GET    /admin/verifications                       rejected attempt≥3 not yet reviewed
POST   /admin/verifications/:id                   { action: approve|reject, reason? }
GET    /admin/users/:id                           profile + counts + verification history
POST   /admin/users/:id/ban  / unban              (admin role)

# Catalogs
GET / POST / PATCH / DELETE  /admin/prompts
GET / PUT / DELETE           /admin/interests     (PUT upserts by slug)
GET / POST / PATCH           /admin/cities

# Tuning + metrics
GET / PUT (admin)            /admin/config/feed-weights
GET                          /admin/metrics       DAU/WAU/MAU + matches/checkins per day + reports backlog + top spots
```

**Role gating:** `@AdminAuth()` (moderator+) is the default. `@AdminAuth({ role: 'admin' })` on
destructive actions: DELETE place/event, ban/unban user, tune feed weights.

**Audit log** ([audit.service.ts](backend/src/modules/admin/audit.service.ts)) — every mutating call
records to `admin_audit` with the action, target string (`place:<uuid>`, `report:<uuid>`, etc.),
and the before/after JSON. Append-only; queries via `admin_audit_target_idx` are fast.

**Geocoder** — new provider pattern matching OTP / S3 / Rekognition / FCM. Stub returns the
city's `center` (seeded in Step 1) with a deterministic per-address jitter so two stub
addresses in the same city don't collide. Real Mapbox provider hits Forward Geocoding v5,
passing the city center as `proximity` to disambiguate.

**Action side effects:**
- `reports.warn` on a profile → drops a `admin.warning` notification + push (status-critical, bypasses quiet hours)
- `reports.ban` / `users.ban` → flips `users.status='banned'`, revokes every refresh token, unmatches every active match
- `reports.remove` on a spot/event → sets `active=false` (soft remove keeps history); on a profile → ban
- `verifications.approve` (manual) → flips `users.status='active'` if still pending_verification, notifies the user
- Feed-weights PUT propagates immediately — DiscoveryService re-reads on every feed call

**Bootstrap credentials:** seed creates `admin@hey.app` / `admin` (argon2). Change in production.

## Integration tests (Step 13)

```bash
# 1. Ensure the Docker stack is up — the test DB lives alongside `hey`.
docker compose up -d

# 2. First-time setup (apply migrations + seed catalogs into hey_test).
npm install
npm run test:e2e:setup

# 3. Run the suite.
npm run test:e2e
```

The suite covers every scenario from spec §8:

| File | §8 scenarios |
|---|---|
| `test/integration/auth-onboarding.spec.ts` | #1 UNDERAGE · #2 age_confirmed · #3 OTP_INVALID + lockout · #4 null-omit rule · #5 NOT_VERIFIED on profile detail |
| `test/integration/verification.spec.ts`     | #6 auto-approve · #7 max-attempts lockout |
| `test/integration/discovery-likes.spec.ts`  | #8 like + comment stored · #9 reciprocal match + `match:new` WS · #10 block hides both sides · #11 distance filter · #12 `out_of_radius` |
| `test/integration/spots.spec.ts`            | #13 80m check-in succeeds · #14 250m TOO_FAR · #15 peopleHere privacy gate · #16 SPOOF_DETECTED · #17 auto-expiry · #18 live `place:count` |
| `test/integration/events.spec.ts`           | #19 RSVP early + EVENT_NOT_STARTED · #20 window+100m check-in · #21 `matchesGoing` intersection |
| `test/integration/chat.spec.ts`             | #22 live `message:new` · #23 offline push fallback · #24 clientId dedupe · #25 typing relay only to the other |
| `test/integration/safety-account.spec.ts`   | #26 DETAIL_REQUIRED · #27 paused/hidden visibility · #28 soft-delete + token revoke · #29 auto-resume cron |

The framework boots a **real Nest app** on a random port per spec file
(`bootTestApp()` in `test/setup/test-app.ts`) so every test hits the actual
HTTP + WebSocket + BullMQ + Prisma surface. A separate `hey_test` Postgres
database is created by the compose init script; `cleanDb()` truncates the
mutable tables before each test while keeping the seeded catalogs intact.
Redis runs on DB 1 (the dev stack is DB 0) so tests don't trample the
dev presence/rate-limit state.

Helpers worth knowing:
- `createUser(t, opts)` — walks the real onboarding API end-to-end, then
  bypasses the BullMQ face-match queue with a direct DB flip so tests
  don't race the worker. Returns `{ userId, token, refreshToken, … }`.
- `makeTestPlace(coords)` / `makeTestEvent(window+coords)` — seed
  geo-located fixtures via raw SQL (PostGIS geography).
- `connectWs(t, token)` + `waitFor(sock, event)` + `emit(sock, event, payload)` —
  Socket.IO-client wrappers that fail fast on connection / event timeouts.

## Layout

```
backend/
├── prisma/
│   ├── schema.prisma        — every entity from spec §3 (+ refresh tokens, admin)
│   ├── migrations/0_init/   — hand-written SQL: PostGIS + tables + indexes + triggers
│   └── seed.ts              — interests catalog, prompts, 8 cities, sample NYC spots/events
├── src/
│   ├── main.ts              — Nest bootstrap, /api/v1 prefix
│   ├── app.module.ts        — root module; feature modules registered here
│   ├── prisma/              — PrismaService (Global)
│   └── common/
│       ├── geo/             — PostGIS raw-SQL helpers (ST_DWithin, ST_Distance, ST_MakePoint)
│       └── config/env.ts    — Zod-validated env parser
├── docker-compose.yml       — Postgres+PostGIS, Redis
├── .env.example             — annotated env reference
└── package.json
```

## Why PostGIS columns are hand-written in the migration

Prisma 5 doesn't generate `CREATE EXTENSION postgis` or `geography(Point, 4326)`
column types from `schema.prisma`. We declare the columns with
`Unsupported(...)` in the schema so the generated client knows they exist,
and the actual `ADD COLUMN`, `ST_*` index, and `ST_DWithin` query all live
in `prisma/migrations/0_init/migration.sql` + `src/common/geo/geo.service.ts`.

If you change a non-geo column in `schema.prisma`, generate a follow-up
migration with `npx prisma migrate dev --create-only --name <name>`, edit
the generated `migration.sql` to add any geo / index / trigger pieces by
hand, then `npx prisma migrate deploy`.

## External services are stubbed by default

Every external dependency (Twilio Verify, AWS S3, Rekognition CompareFaces,
FCM, Mapbox Geocoding) ships behind an interface with a local stub. The app
boots and runs end-to-end with no credentials. Flip `*_PROVIDER=real` in
`.env` and fill in the matching keys to use the production providers when
those modules land (Step 2+).
