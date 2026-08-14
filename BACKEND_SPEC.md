# Hey — Backend Specification & Integration Guide
### A build document for Claude Code

This document describes the complete backend for **Hey**, a Gen-Z, location-first dating app. The frontend (iOS-style prototype) is already built. Your job is to build the backend that powers it, plus an admin backend for the company team.

Read this top-to-bottom before generating anything. It is organized as:

1. Product vision & core loop
2. Chosen stack & infrastructure
3. Data model (entities + relationships)
4. The full API surface (REST endpoints)
5. Real-time layer (WebSocket events)
6. Background jobs & workers
7. Feature-by-feature wiring (how each screen calls the backend)
8. Real-life test cases & scenarios
9. Admin backend
10. Security, privacy & abuse rules
11. Environment & config

---

## 1. Product vision & core loop

Hey is a dating app where **physical presence is the differentiator**. Unlike swipe apps, Hey ties matching to *where people actually are right now*:

- **Spots** — real venues (bars, cafés, parks, gyms). Curated by the Hey team. A user can **check in** only if their GPS is within **100m** of the venue. Once checked in, they can see *who else is checked in there* — and others can see them. If you're NOT at the spot, you only see a **count** ("23 people here"), never faces.
- **Events** — time-boxed gatherings created by the Hey company (revenue model). Users **RSVP** ("I'm going"), and on the day-of can **check in** to the event. Attendees can see who's going (matches highlighted).
- **Discover** — the classic nearby feed, filtered by preferences. Liking is **photo-anchored or prompt-anchored**: you like a specific photo or prompt answer, optionally attaching a comment. The comment "sticks" to that photo/prompt and shows in chat after matching.

**Core loop:**
1. Sign up (phone + OTP) → onboarding (mandatory + optional fields) → **mandatory photo verification** (automated face-match).
2. Set preferences → browse Discover / Spots / Events.
3. Like (with optional comment anchored to a photo or prompt) → if mutual, **it's a match**.
4. Chat (real-time) → plan to meet (often at a Spot/Event).
5. Check in at the same Spot/Event → see each other live.

**Monetization is OFF for v1** — no boosts, no premium, no paywalls. Events may carry a venue cover charge (informational only; not processed by Hey).

---

## 2. Chosen stack & infrastructure

| Concern | Choice | Why |
|---|---|---|
| Language/Framework | **Node.js + NestJS (TypeScript)** | Modular, scalable, first-class WebSocket + REST, DI, easy to test |
| Database | **PostgreSQL 15+ with PostGIS** | Relational integrity + native geospatial (radius/distance queries) |
| ORM | **Prisma** (or TypeORM if PostGIS raw needed) | Type-safe; use raw SQL / `ST_DWithin` for geo |
| Cache / presence / pub-sub | **Redis** | Online presence, "people here now" counters, rate limits, socket fan-out |
| Real-time | **Socket.IO** (over WebSocket) on a dedicated gateway, Redis adapter for horizontal scale | Instant chat delivery, typing, live counts |
| Object storage | **AWS S3** | Photos, verification selfies. Pre-signed upload + read URLs |
| Push notifications | **Firebase Cloud Messaging (FCM)** | One SDK covers iOS (via APNs) + Android; free; scalable. (Recommended for first time — simpler than raw APNs.) |
| Face match | **AWS Rekognition `CompareFaces`** (selfie vs profile photos) | Managed, no ML ops; swap-able behind an interface |
| OTP / SMS | **Twilio Verify** | Handles OTP generation, retry, expiry, fraud checks |
| Auth tokens | **JWT access (15 min) + refresh (60 day) rotation** | Stateless API; refresh stored hashed in DB |
| Geocoding (admin) | **Mapbox / Google Geocoding** | Convert venue address → lat/lng when admin adds a Spot |
| Hosting | Containerized (Docker) → ECS/Fargate or Kubernetes; RDS Postgres; ElastiCache Redis | Horizontal scale |

**Service decomposition (modular monolith for v1, split later):**
- `auth` · `users` · `profiles` · `verification` · `discovery` · `likes-matches` · `chat` (WS) · `places` · `events` · `checkins` (geo) · `notifications` · `safety` · `admin`.

---

## 3. Data model

> Types are PostgreSQL. All tables have `id UUID PK DEFAULT gen_random_uuid()`, `created_at timestamptz`, `updated_at timestamptz` unless stated. Soft-delete via `deleted_at timestamptz NULL` where noted.

### 3.1 `users` (account/auth)
| col | type | notes |
|---|---|---|
| phone_e164 | text unique | `+15550104242`; primary login |
| country_code | text | `+1` etc. |
| email | text unique null | backup login (optional in onboarding) |
| password_hash | text null | argon2id; only if email set |
| dob | date | **mandatory**; server recomputes age, rejects < 18 |
| status | enum | `onboarding`, `pending_verification`, `active`, `paused`, `hidden`, `banned`, `deleted` |
| visibility | enum | `everyone`, `liked_only`, `spot_only` (who-sees-me) |
| auto_resume_at | timestamptz null | for paused accounts |
| last_active_at | timestamptz | |
| age_confirmed | bool | the mandatory 18+ checkbox |

### 3.2 `profiles` (1:1 with users)
| col | type | notes |
|---|---|---|
| user_id | uuid FK | |
| name | text | first name, **mandatory** |
| gender | enum | woman/man/non-binary/trans-woman/trans-man/genderfluid/other + `gender_custom text` |
| looking_for | text[] | mandatory; subset of {women, men, non-binary, everyone} |
| relationship_intent | enum | mandatory: longterm / longterm-open / short-open / short / figuring-out / friends |
| height_cm | int | mandatory (store cm; display ft/in client-side) |
| bio | text | mandatory, ≤180 chars |
| job | text null | optional |
| school | text null | optional |
| pronouns | text null | optional |
| star_sign | enum null | optional |
| drinks | enum null | often/socially/rarely/never |
| smokes | enum null | regularly/socially/trying-to-quit/never |
| exercise | enum null | daily/few-week/sometimes/never |
| weed_420 | enum null | yes/sometimes/never |
| kids | enum null | want/have-want-more/have-done/dont-want/open/not-sure |
| politics | enum null | left/moderate/right/not-political/rather-not-say |
| religion | enum null | … |
| monogamy | enum null | monogamous/monogamish/non-monogamous/figuring |
| completion_pct | int | computed; **never blocks** — UI hides empty fields, never shows "incomplete" |

> **Optional-field rule (critical):** Any optional field that is NULL must be **omitted** from the profile API response (not returned as empty). The client only renders chips/sections for present fields, so a sparse profile still looks complete.

### 3.3 `interests` & `profile_interests`
- `interests(id, slug, label, category)` — seeded catalog (art, matcha, hiking…).
- `profile_interests(profile_id, interest_id)` — **3–6 per user** (mandatory min 3, max 6). This is the profile "into" section.

### 3.4 `prompts` & `profile_prompts`
- `prompts(id, text, active)` — admin-managed catalog (the ~12 prompt questions).
- `profile_prompts(id, profile_id, prompt_id, answer text, position int)` — 1–3 per user, ≥1 mandatory.

### 3.5 `photos`
| col | type | notes |
|---|---|---|
| profile_id | uuid FK | |
| s3_key | text | |
| position | int | 0 = main; 2–6 photos, ≥2 mandatory |
| is_main | bool | |
| nsfw_score | float null | from moderation pass |
| status | enum | `pending`, `approved`, `rejected` |

### 3.6 `verifications`
| col | type | notes |
|---|---|---|
| user_id | uuid FK | |
| selfie_s3_key | text | |
| status | enum | `pending`, `approved`, `rejected` |
| match_confidence | float null | Rekognition similarity (0–100) |
| reject_reason | text null | e.g. face out of frame / too dim / pose |
| attempt | int | max 3 before manual review |
| reviewed_by | uuid null | admin id if manual |

> **Verification is mandatory.** A user's profile is **not discoverable and cannot be opened by others** until `status='approved'`. This replaces the old "photo verification check" toggle — it is now a hard gate.

### 3.7 `places` (Spots — admin-curated)
| col | type | notes |
|---|---|---|
| label | text | |
| kind | enum | coffee/cocktail/gym/wine-bar/live-music/park/bookshop/pizza/… |
| vibe | text | |
| address | text | |
| location | geography(Point,4326) | **lat/lng — used for 100m check-in** |
| icon | text | |
| tone | text | pastel color token |
| hot | bool | computed or admin-flag |
| city_id | uuid FK | |
| active | bool | |

### 3.8 `events` (admin/company-created)
| col | type | notes |
|---|---|---|
| title, host, vibe | text | |
| place_id | uuid FK null | linked Spot or standalone |
| location | geography(Point,4326) | for day-of check-in |
| starts_at, ends_at | timestamptz | |
| door_text | text | "10pm – 4am" |
| cover_text | text | "$12" / "free" / "donate" — informational only |
| city_id | uuid FK | events are city-scoped |
| tags | text[] | |
| icon, tone | text | |
| hot | bool | |
| active | bool | |

### 3.9 `checkins` (the geo-trust core)
| col | type | notes |
|---|---|---|
| user_id | uuid FK | |
| place_id | uuid FK null | |
| event_id | uuid FK null | (exactly one of place/event set) |
| checked_in_at | timestamptz | |
| expires_at | timestamptz | **2 hours** after check-in |
| device_lat, device_lng | double | the coords the server validated |
| left_at | timestamptz null | set when user taps "leave" or auto-expiry |
| active | bool | derived: `now < expires_at AND left_at IS NULL` |

### 3.10 `cities`
`cities(id, name, country, center geography, radius_km)` — events list is grouped by city (NYC, LA, SF, London, Mumbai, Bangalore, Singapore, Tokyo seeded).

### 3.11 `event_rsvps`
`event_rsvps(id, user_id, event_id, status enum[going,cancelled], created_at)`.

### 3.12 `saved_spots` & `saved_events`
Join tables: `(user_id, place_id)` / `(user_id, event_id)` — power the "Saved spots" / "Favourite events" strips on the Me profile.

### 3.13 `likes`
| col | type | notes |
|---|---|---|
| from_user_id | uuid FK | |
| to_user_id | uuid FK | |
| anchor_type | enum | `photo` or `prompt` |
| anchor_photo_id | uuid null | which photo was liked |
| anchor_prompt_id | uuid null | which prompt answer was liked |
| comment | text null | optional compliment, ≤140 chars |
| created_at | | |
| Unique | (from_user_id, to_user_id) | one active like per pair |

### 3.14 `matches`
| col | type | notes |
|---|---|---|
| user_a_id, user_b_id | uuid | store sorted (a < b) for uniqueness |
| like_a_id, like_b_id | uuid | the two likes that formed it |
| created_at | | |
| status | enum | `active`, `unmatched`, `expired` |
| last_message_at | timestamptz null | for sorting chat list, unmatch-fairy |
| unmatched_by | uuid null | |

### 3.15 `messages`
| col | type | notes |
|---|---|---|
| match_id | uuid FK | |
| sender_id | uuid FK | |
| body | text | |
| kind | enum | `text`, `place_share`, `location_share`, `system` |
| status | enum | `sent`, `delivered`, `read`, `failed` |
| client_id | text | idempotency key from client (offline retry) |
| created_at | | |

### 3.16 `blocks`, `reports`
- `blocks(blocker_id, blocked_id, created_at)` — bidirectional invisibility.
- `reports(id, reporter_id, target_type[profile,spot,event], target_id, reason enum, detail text NOT NULL, status[pending,reviewed,actioned,dismissed], created_at, reviewed_by)`.
  > **Report detail text is mandatory (min 10 chars)** — enforce server-side, reject otherwise.

### 3.17 `emergency_contacts`
`(user_id, name, phone_e164, auto_share_first_date bool, checkin_timer bool)`.

### 3.18 `notifications`
`(id, user_id, type, payload jsonb, read bool, created_at)` + `device_tokens(user_id, fcm_token, platform, last_seen)`.

### 3.19 `linked_accounts`
`(user_id, provider[instagram,spotify], handle, data jsonb, connected_at)`.

### 3.20 `user_settings`
Notification toggles (new matches / messages / likes / people-at-spot / event-reminders / news / email-digest / quiet-hours), privacy (read_receipts, active_status, blur_explicit), show_me_on_places bool.

---

## 4. REST API surface

Base: `/api/v1`. Auth: `Authorization: Bearer <accessToken>` except where noted. All list endpoints are cursor-paginated (`?cursor=&limit=`). All responses `{ data, meta }`; errors `{ error: { code, message, field? } }`.

### 4.1 Auth & onboarding
```
POST /auth/otp/request        { phone_e164 } → sends OTP (Twilio Verify). Rate-limited.
POST /auth/otp/verify         { phone_e164, code } → { accessToken, refreshToken, user, isNewUser }
POST /auth/refresh            { refreshToken } → rotates tokens
POST /auth/login/email        { email, password } → tokens (backup login)
POST /auth/logout             invalidates refresh token
PATCH /onboarding/profile     partial upserts during onboarding (name, gender, looking_for, relationship_intent, height_cm, job, school, pronouns, star_sign, lifestyle{}, values{}, bio)
POST /onboarding/interests    { interest_ids[] }  (validate 3–6)
POST /onboarding/prompts      { items:[{prompt_id, answer}] } (1–3)
POST /onboarding/email-pass   { email, password }  (optional step)
GET  /onboarding/state        → which steps complete / what's still required
```
> Server enforces: dob → age ≥ 18 (else 422 `UNDERAGE`), `age_confirmed=true`, all mandatory fields present before allowing `status` to advance to `pending_verification`.

### 4.2 Photos & verification
```
POST /photos/upload-url       { contentType } → { uploadUrl, s3Key }  (client PUTs to S3)
POST /photos/confirm          { s3Key, position } → runs moderation; returns photo
DELETE /photos/:id
PATCH /photos/reorder         { orderedIds[] }   (position 0 = main)

POST /verification/upload-url → pre-signed for selfie
POST /verification/submit     { selfieS3Key } → enqueues face-match job; status=pending
GET  /verification/status     → { status, reject_reason?, attempt }
```

### 4.3 Discovery feed
```
GET /discovery/feed?cursor=&limit=20
  → returns ranked, filtered candidate profiles (see §7.3 ranking)
GET /discovery/profile/:userId
  → full profile ONLY if viewer allowed (verified + not blocked + visibility rules)
GET /filters                  → current user's saved filters
PUT /filters                  { lookingFor[], ageMin, ageMax, heightMin, heightMax, distanceMi,
                                relationship[], drinks[], smokes[], exercise[], weed420[],
                                kids[], politics[], religion[], monogamy[], starSign[], interests[],
                                showMeOnPlaces }
```

### 4.4 Likes & matches
```
POST /likes                   { toUserId, anchorType, anchorPhotoId?, anchorPromptId?, comment? }
   → { matched: bool, matchId? }   (if reciprocal like exists → create match)
POST /passes                  { toUserId }   (records a skip; excluded from feed)
GET  /likes/received          → people who liked you (NO paywall — full list, with their anchor+comment)
GET  /matches                 → chat list (matches + last message + unread)
DELETE /matches/:id           → unmatch (both lose chat)
```

### 4.5 Chat (REST for history; WS for live — see §5)
```
GET  /matches/:id/messages?cursor=  → paginated history
POST /matches/:id/messages          { body, kind, clientId }  (idempotent on clientId)
POST /matches/:id/read              marks read up to latest
```

### 4.6 Places (Spots)
```
GET /places?view=map|list&filters=coffee,cocktail,gym,parks&near=lat,lng
   → list with { id, label, kind, vibe, dist, hereCount, hot }
   → hereCount = active check-ins; FACES NEVER included here
GET /places/:id
   → detail. Includes peopleHere[] ONLY IF requester has an active check-in at this place.
     Otherwise peopleHere is omitted and { hereCount, locked:true } returned.
POST /places/:id/checkin       { lat, lng } → validates 100m (see §7.5). 201 or 422 TOO_FAR
POST /places/:id/leave
POST /places/:id/save / DELETE /places/:id/save
POST /places/:id/request       { detail }   (user suggests a venue → admin queue)
```

### 4.7 Events
```
GET /events?cityId=&filter=tonight|this-week|free|saved
GET /events/:id                → detail + goingCount + matchesGoing[] (avatars)
POST /events/:id/rsvp / DELETE /events/:id/rsvp
POST /events/:id/checkin       { lat, lng }  (only when now within event window AND within 100m)
POST /events/:id/save / DELETE /events/:id/save
GET  /events/:id/going?cursor= → attendees (matches highlighted)
```

### 4.8 Search
```
GET /search/places?q=
GET /search/matches?q=         (searches match names + message bodies)
```

### 4.9 Safety, settings, profile mgmt
```
POST /reports                  { targetType, targetId, reason, detail }  (detail ≥10 chars REQUIRED)
POST /blocks                   { userId }   DELETE /blocks/:userId
GET/PUT /settings              notification + privacy toggles
PUT  /account/status           { status: paused|hidden|active, autoResumeAt? }
DELETE /account                soft-delete → purge job after 30 days
GET/POST/DELETE /emergency-contact
GET  /me                       full own profile
PATCH /me/profile              edit any field (optional fields settable/clearable)
POST /linked-accounts/:provider/connect  (OAuth) / DELETE disconnect
POST /devices                  { fcmToken, platform }   (register for push)
```

---

## 5. Real-time layer (Socket.IO)

Single namespace `/rt`, authenticated via JWT in the connection handshake. Redis adapter so multiple gateway instances share rooms.

**Rooms a socket joins on connect:** `user:<id>` (personal), one per active `match:<id>`, and `place:<id>` / `event:<id>` if currently checked in.

### 5.1 Presence & live counts (your requirement #1)
- On connect → mark `online:<userId>` in Redis (TTL refreshed by heartbeat every 25s). On disconnect/expiry → offline.
- **Live "people here right now"**: each Spot/Event maintains a Redis counter of active check-ins. On checkin/leave/expiry, increment/decrement and **broadcast** `place:count` to anyone viewing that place's map pin / detail, and `places:counts` (batched) to users on the Spots map.
- `presence:update` event pushes a match's online/last-active to the other person in `match:<id>`.

### 5.2 Chat events (instant delivery — requirement #1)
| event (client→server) | payload | effect |
|---|---|---|
| `message:send` | `{ matchId, body, kind, clientId }` | persist; emit `message:new` to `match:<id>`; push FCM if recipient offline |
| `message:read` | `{ matchId, upToMessageId }` | mark read; emit `message:read` to sender |
| `typing:start`/`typing:stop` | `{ matchId }` | relay to other participant |

| event (server→client) | payload |
|---|---|
| `message:new` | full message object |
| `message:delivered` | `{ messageId }` (recipient socket ack) |
| `message:read` | `{ matchId, upToMessageId }` |
| `match:new` | `{ match, otherProfile, anchor }` — fires the "it's a match" moment |
| `typing` | `{ matchId, userId, state }` |
| `place:count` / `places:counts` | live check-in counts |
| `presence:update` | `{ userId, online, lastActiveAt }` |

**Offline send (requirement: "can't send" + retry):** client posts with a `clientId`. If the socket is down, client queues locally and shows `failed`; on reconnect it replays via `message:send` (server dedupes on `clientId`). REST `POST /messages` is the fallback path with the same idempotency.

---

## 6. Background jobs & workers (BullMQ on Redis)

| job | trigger | does |
|---|---|---|
| `face-match` | verification submit | Rekognition CompareFaces(selfie, each profile photo). ≥ threshold (e.g. 90) → approve; else reject with reason; 3 fails → manual queue |
| `photo-moderation` | photo confirm | NSFW/【explicit】 detection → set status/nsfw_score |
| `checkin-expiry` | scheduled (every 1 min) | expire check-ins past `expires_at`; decrement counters; broadcast |
| `unmatch-fairy` | daily | flag matches with no messages for 14 days (client copy mentions this) |
| `event-reminder` | scheduled | push 2h before saved/RSVP'd events |
| `account-purge` | daily | hard-delete accounts soft-deleted > 30 days ago |
| `auto-resume` | scheduled | flip paused→active when `auto_resume_at` passes |
| `digest` | weekly | email digest if enabled |

---

## 7. Feature-by-feature wiring (screen → backend)

### 7.1 Onboarding (15 steps)
Each step PATCHes `/onboarding/profile` (or the interests/prompts endpoints). The client's Continue button is gated locally, but **the server re-validates**:
- **Name** required; **DOB** → server computes age, rejects < 18 (`UNDERAGE`), `age_confirmed` must be true.
- Gender, looking-for, relationship, height, interests (3–6), ≥1 prompt, bio, ≥2 photos → all required before `pending_verification`.
- Optional: job, school, pronouns, star sign, lifestyle, values, email/password. Stored only if provided; **omitted from responses when null**.
- Final step → `POST /verification/submit`. Until approved, `status='pending_verification'` and the user **cannot be discovered or opened**.

### 7.2 Phone & OTP
- Country picker sets `country_code`; client validates digit count, but server validates E.164 via Twilio Lookup.
- `POST /auth/otp/request` then `/verify`. Wrong code → `OTP_INVALID` (client shows the red shake state). Resend rate-limited (Twilio handles expiry).

### 7.3 Discover feed & ranking (your #6 — hybrid)
1. **Filter** (hard constraints): gender ∈ my looking_for AND I ∈ their looking_for; age & height in my range; within distance (PostGIS `ST_DWithin` on last-known location); `status='active'`; **verified only**; not blocked either way; not already liked/passed; respects their `visibility`.
2. **Rank** (score, descending) — documented weights, tunable via config:
   ```
   score = w1*recency(last_active)
         + w2*mutual_interest_count
         + w3*same_spot_or_event_now
         + w4*distance_proximity
         + w5*reciprocal_likelihood(they liked me already → boost)
         - w6*recently_shown_penalty
   ```
   Ship with defaults (e.g. 0.25/0.2/0.2/0.15/0.15/0.05); expose in admin config so you tune later without redeploy.
3. Return page of profiles. `GET /discovery/profile/:id` returns full detail with **only non-null optional fields**.

### 7.4 Likes, comments, match moment
- Heart on a **photo** or **prompt** → `POST /likes` with `anchorType` + the photo/prompt id + optional `comment`.
- If the target already liked the requester → create `match`, return `matched:true`, emit `match:new` to **both** users (the "it's a match" screen with floating hearts).
- The anchor (photo/prompt + comment) is stored on the like and surfaced at the **top of the chat** ("you ♥'d photo 3" + comment) — see `matches` join returning the originating like.
- `GET /likes/received` returns everyone who liked you, **no blur, no paywall** (monetization off).

### 7.5 Spots & the 100m check-in (your #2 — device GPS)
**Check-in validation (server-side, every time):**
```
distance = ST_Distance(place.location, ST_MakePoint(lng,lat)::geography)
if distance > 100m  → 422 TOO_FAR
else create checkin (expires_at = now + 2h), increment Redis counter, broadcast place:count
```
- Anti-abuse: rate-limit check-ins per user (e.g. max 1 new spot / 5 min), reject impossible jumps (distance/time implies > 300 km/h ⇒ flag), store device coords for audit. (We trust device GPS per your decision but still guard against obvious spoofing.)
- **Privacy gate (your rule):** `GET /places/:id` returns `peopleHere[]` **only if the requester has an active check-in there**. Otherwise return `{ hereCount, locked: true }` and the client shows the blurred/locked grid.
- "Leave" → `POST /leave` sets `left_at`, decrements counter, broadcasts.
- Auto-expiry after 2h via worker.

### 7.6 Events
- Admin-created only (users never create). Listed by city (`cityId`), filterable (tonight/this-week/free/saved).
- `POST /rsvp` → appears in goingCount + matchesGoing. `matchesGoing` = intersection of event RSVPs and the requester's matches/likes.
- **Day-of check-in**: allowed only when `now ∈ [starts_at, ends_at]` AND within 100m of event location.
- Save (♡) → favourites strip on Me profile.

### 7.7 Chat
- History via REST, live via WS (§5). Anchor pill from the originating like rendered at top.
- Composer sends through WS; offline → queue + retry with `clientId`. Smart-reply chips ("share my place", "thursday?") are client-side; "share my place" sends a `kind=place_share` message referencing the user's current active check-in.
- 3-dot menu: view profile, mute (writes `user_settings`/per-match mute), share location (`kind=location_share`, 1-hour TTL), unmatch (`DELETE /matches/:id`), block (`POST /blocks`), report (`POST /reports`).

### 7.8 Me / profile / settings
- Saved spots & favourite events strips → `saved_spots` / `saved_events`.
- Edit any field; optional fields can be set or cleared (cleared → omitted from responses).
- Pause/hide/ghost → `PUT /account/status`; hidden removes from all discovery + spot visibility; auto-resume via worker.
- Linked accounts → OAuth connect/disconnect (Instagram Basic Display, Spotify) storing handle/top-track.
- Settings toggles persist to `user_settings` and gate notification sends + presence visibility.

### 7.9 Safety
- Safety center is mostly static content + hotline tap-to-call (client `tel:` link; no backend).
- Emergency contact stored; "share location" generates a one-time signed location link (short TTL) and texts it (Twilio).
- Reports require `detail` ≥ 10 chars (server-enforced 422 `DETAIL_REQUIRED`).

### 7.10 Notifications (FCM)
- Register device token on login (`POST /devices`).
- Send on: new match, new message (if recipient offline/socket-down), new like, a match checks into your current spot, event reminder (2h prior). Each gated by `user_settings` + quiet hours.

---

## 8. Real-life test cases & scenarios

Write integration tests for each.

**Onboarding/auth**
1. User enters DOB making them 17 → `422 UNDERAGE`, cannot proceed.
2. `age_confirmed=false` → blocked even if 18+.
3. Wrong OTP → `OTP_INVALID`; 5 wrong tries → temp lockout.
4. Sparse profile (only required fields) → profile API returns no null optional keys; client renders complete-looking card.
5. User finishes all fields but verification pending → does NOT appear in anyone's feed; `GET /discovery/profile/:id` on them → `403 NOT_VERIFIED`.

**Verification**
6. Selfie matches profile photo (similarity ≥ 90) → auto-approve, status active.
7. No face / dim / low similarity → reject with reason; attempt counter increments; 3rd fail → manual review queue (admin).

**Discovery / likes / match**
8. A likes B's photo with comment; B has not liked A → no match, like stored, B sees it in `/likes/received` with the comment.
9. B then likes A → match created, `match:new` pushed to both sockets in real time, anchor+comment visible at top of chat.
10. A blocks B → B disappears from A's feed and vice-versa; existing match removed; B not told.
11. Filters: A sets distance 1 mi, B is 1.2 mi away → B excluded. A expands to 25 mi → B appears.
12. Out-of-radius: no candidates within distance → feed returns empty + `meta.reason=out_of_radius`.

**Spots / geo**
13. User 80m from Attaboy taps check-in → success, counter +1, broadcast to map viewers.
14. User 250m away → `422 TOO_FAR`, no check-in.
15. Not checked in → `GET /places/attaboy` returns `{ hereCount:23, locked:true }`, no faces. After check-in → `peopleHere[]` populated.
16. Two devices, same account, check-ins 1 min apart 400 km apart → flagged as impossible (spoof guard).
17. Check-in auto-expires at 2h → user removed from peopleHere, counter −1, live broadcast.
18. Live count: 3 users check in within seconds → every map viewer sees the pin count tick up in real time.

**Events**
19. RSVP to Friday event on Wednesday → in goingCount; "I'm here" check-in button disabled until event window.
20. During event window AND within 100m → event check-in succeeds.
21. matchesGoing shows only the requester's matches/likes among attendees.

**Chat / real-time**
22. Both online → message delivered instantly (`message:new`), read receipts update live.
23. Recipient offline → FCM push sent; message marked `sent`; on their reconnect, delivered.
24. Sender offline mid-send → client shows `failed`; on reconnect, auto-retry with same `clientId`, no duplicate persisted.
25. Typing indicator relays only to the one match, not broadcast.

**Safety / account**
26. Report with 4-char detail → `422 DETAIL_REQUIRED`. With ≥10 → accepted, enters admin queue.
27. Pause account → invisible to new people, existing chats still work. Hidden → invisible everywhere incl. spots.
28. Delete account → soft-deleted immediately, purged after 30 days; matches see "user unavailable".
29. Auto-resume date passes → account flips active automatically.

---

## 9. Admin backend (company tooling — your #8)

Separate admin app (same API, `/api/v1/admin`, role-gated `admin`/`moderator`). Build a minimal web dashboard or just secure endpoints.

**Spots management**
```
POST /admin/places            { label, kind, vibe, address, icon, tone, cityId }
   → geocode address → lat/lng → store location. 
PATCH /admin/places/:id  /  DELETE  /  PATCH active
GET  /admin/places/requests   (user-suggested venues queue) → approve→creates place / dismiss
```

**Events management (revenue model)**
```
POST /admin/events            { title, host, placeId?, address?, startsAt, endsAt, doorText, coverText, cityId, tags, icon, tone }
PATCH /admin/events/:id  /  DELETE  /  toggle hot/active
GET  /admin/events/:id/attendees
```

**Moderation**
```
GET  /admin/reports?status=pending           → review queue (profile/spot/event)
POST /admin/reports/:id/action  { action: warn|ban|remove|dismiss, note }
GET  /admin/verifications?status=manual       → 3-fail manual review
POST /admin/verifications/:id  { approve|reject, reason }
POST /admin/users/:id/ban  / unban
GET  /admin/users/:id        full record + audit
```

**Catalogs & config**
```
CRUD /admin/prompts          (the prompt question library)
CRUD /admin/interests        (interest catalog + categories)
CRUD /admin/cities
GET/PUT /admin/config/feed-weights   (the ranking weights from §7.3)
GET  /admin/metrics          DAU, matches/day, check-ins/day, reports backlog
```

**Admin auth:** separate `admin_users(id, email, password_hash, role)`, JWT, audit-log every mutation (`admin_audit(admin_id, action, target, before, after, at)`).

---

## 10. Security, privacy & abuse rules (must-enforce)

- **Verification gate**: unverified users are never returned in feeds, search, spot rosters, or event rosters, and their profile detail is 403 to others.
- **Phone/email never exposed** in any user-facing API.
- **Exact location never exposed** — only neighborhood label + rounded distance (e.g. "0.4 mi"). Never send raw lat/lng of other users.
- **Spot privacy**: faces only to co-present (checked-in) users.
- **Blocks** are bidirectional and filter every query (feed, search, spots, events, chat).
- **Rate limits**: OTP requests, likes/day, check-ins, reports, messages (anti-spam).
- **Idempotency** on messages (`clientId`) and likes (unique pair).
- **Input validation**: report detail ≥10 chars; bio ≤180; comment ≤140; interests 3–6; photos 2–6; age ≥18.
- **PII at rest**: encrypt selfies; auto-delete verification selfies after approval (keep only confidence score). 
- **GDPR/CCPA**: data export + delete endpoints; 30-day purge.
- **Audit** admin actions and moderation.

---

## 11. Environment & config

```
DATABASE_URL=postgres://…           (PostGIS enabled)
REDIS_URL=redis://…
JWT_ACCESS_SECRET= / JWT_REFRESH_SECRET=
AWS_REGION= / S3_BUCKET= / AWS_ACCESS_KEY_ID= / AWS_SECRET_ACCESS_KEY=
REKOGNITION_REGION= / FACE_MATCH_THRESHOLD=90
TWILIO_ACCOUNT_SID= / TWILIO_AUTH_TOKEN= / TWILIO_VERIFY_SID=
FCM_PROJECT_ID= / FCM_CREDENTIALS_JSON=
MAPBOX_TOKEN=  (admin geocoding)
CHECKIN_RADIUS_M=100
CHECKIN_TTL_HOURS=2
UNMATCH_SILENCE_DAYS=14
ACCOUNT_PURGE_DAYS=30
```

**Suggested build order for Claude Code:**
1. Schema + migrations (PostGIS) → 2. Auth/OTP → 3. Onboarding + profile + photos → 4. Verification worker → 5. Discovery + filters + ranking → 6. Likes/matches → 7. Chat (REST + WS) → 8. Places + check-in geo → 9. Events + RSVP → 10. Notifications → 11. Safety/settings → 12. Admin → 13. Tests from §8.

---

*End of spec. The frontend prototype (screen-by-screen reference for every flow described here) lives in the same project — open `index.html` and use the left rail to walk any screen state.*
