# Security runbook

Short, actionable, per-incident. What to do when — not what threat
model looks like.

## What we do by default

- **HTTPS everywhere**: Hostinger terminates TLS at the edge (Let's
  Encrypt). All API traffic is `https://` in production.
- **Security headers**: `helmet` is wired in [main.ts](backend/src/main.ts).
  HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, etc.
  CSP is off for now (Vite's hashed assets need a nonce strategy we
  haven't wired yet — TODO before scaled traffic).
- **Passwords**: `argon2id` at default cost (m=64MiB, t=3, p=4). Never
  logged, never returned.
- **JWTs**: HS256, access 15m, refresh 60d, rotated on every use with
  reuse-detection (RefreshToken.family). Stored in the client's
  `localStorage`, not cookies.
- **Rate limits**: per-user quotas on OTP, likes/day, reports/day,
  messages/min, plus a global 300 req/min per-IP safety net for
  everything else.
- **DB**: MySQL user is scoped to one DB (Hostinger's default). All
  queries go through Prisma (parameterized) — no string concat.
- **Env boot check**: production refuses to start with dev/short JWT
  secrets or duplicated secrets. See `assertProductionSecrets` in
  [env.ts](backend/src/common/config/env.ts).

## Rotating JWT secrets

Rotating boots all users out (all refresh tokens signed with the old
secret get rejected). Do it if a secret was ever committed, pasted in
public, or an admin laptop was stolen.

```bash
# Generate two new 32-byte hex strings
openssl rand -hex 32   # ← paste into JWT_ACCESS_SECRET
openssl rand -hex 32   # ← paste into JWT_REFRESH_SECRET
```

Hostinger → Node.js app → **Environment variables** → replace both
values → **Restart Application**.

Users see one "Please sign in again" and continue.

## Rotating the MySQL password

```
hPanel → Databases → Management → [your DB] → Change Password
```

Copy the new password, URL-encode any special characters (see the
`Password gotchas` section below), then update `DATABASE_URL` in the
Node.js app's env vars. Restart.

## Deleting a user's data (right-to-erasure)

The API already supports soft-delete via `DELETE /api/v1/account`.
That flips `users.status='deleted'`, revokes refresh tokens, and
tears down active matches. The nightly `AccountPurgeProcessor`
hard-deletes 30 days later (`ACCOUNT_PURGE_DAYS`).

To hard-delete immediately (e.g. a subject-access request):

```sql
-- SSH into Hostinger, then mysql -u <user> -p <db>
DELETE FROM users WHERE id = 'the-uuid';
-- Cascade FKs remove profile, photos, matches, messages, blocks,
-- notifications, device tokens, refresh tokens, otp attempts.
```

Photos in S3 (or the local stub dir) referenced by that user's
`photos.s3Key` still need to be removed separately:

```bash
# Grab the s3_keys BEFORE the DELETE above, then:
rm ~/.local-s3/photos/<the-uuid>-*
# Or aws s3 rm s3://<bucket>/photos/<the-uuid>-* if real S3.
```

## Suspicious activity — where to look

- **Repeated OTP failures for the same phone**: `otp_attempts` table
  has one row per attempt with `success`, `ip`, `created_at`. Grep for
  `success=false` clusters by `phone_e164`.
- **Sudden spike in likes / messages from one user**: `likes.from_user_id`
  or `messages.sender_id` grouped by hour.
- **Auth churn**: `refresh_tokens.revoked_at` set en-masse for one
  user = someone hit the reuse-detection path (an old refresh token
  was replayed → all tokens for the family got revoked).
- **App-level**: hPanel → Node.js app → **Logs**. Grep for `ApiError`
  entries with `TOO_MANY_REQUESTS` or `AUTH_INVALID`.

## Password gotchas (env var setup)

If your MySQL password contains any of these, URL-encode them in
`DATABASE_URL`:

| char | replace with |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `/` | `%2F` |
| `?` | `%3F` |
| `%` | `%25` |
| `!` | `%21` |
| `:` | `%3A` |
| space | `%20` |

Simplest workaround: use only letters + digits in DB passwords, no
symbols. Then no encoding needed.

## Never commit these

The `.gitignore` covers `.env`, `.env.local`, `.env.*` (with an
exception for `.env.example`). Before any `git push`:

```bash
git diff --cached | grep -iE 'secret|password|api[_-]?key|token'
```

If that returns anything from a real value (not from `.env.example`
comments), stop and clean it up. If a secret was actually pushed,
**rotate it** — history-scrubbing tools don't help because the value
is already in someone's fork or GitHub's cache.
