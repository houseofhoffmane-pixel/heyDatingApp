# Deploy Hey to Hostinger

Single Node.js process serves everything: the React SPA, the REST API,
and the WebSocket gateway. The only external dependency is one managed
MySQL database — Hostinger's own is the easy pick.

Sprint 1 cut the ship-scope down (no verification, spots, events, admin,
BullMQ). Sprint 2 removed Redis (in-process presence + rate limits).
Sprint 3 swapped Postgres/PostGIS for MySQL 8. Sprint 4 wired up the
build pipeline documented here.

## What you need

- A Hostinger plan with **Node.js hosting** (Cloud Startup / Business /
  Cloud Professional / VPS)
- A domain (Hostinger sells them, or use one you already own)
- A GitHub account
- ~15 minutes for the first deploy; ~30 seconds per push after that

## Architecture

```
GitHub  ── push ──▶  Hostinger Node.js app  ──▶  visitors
                            │
                            └── talks to ──▶  Hostinger MySQL 8
```

No Redis, no separate worker, no external caches.

---

## Step 1 — MySQL database (2 min)

In hPanel → **Databases** → **MySQL databases** → **Create**. Give it a
name (`hey`), a user, and a password. Save the credentials — you'll need
them as `DATABASE_URL` in the next step.

Hostinger's connection string looks like:

```
mysql://<user>:<password>@<host>:3306/<db>
```

You can also use their remote host if you plan to run migrations from
your laptop — enable **Remote MySQL** and whitelist your IP.

## Step 2 — push the code to GitHub (5 min)

From this repo folder:

```bash
git init
git add .
git commit -m "initial commit"

# Create a new repo on github.com/new (keep it private if you want)
git remote add origin https://github.com/YOU/hey.git
git branch -M main
git push -u origin main
```

## Step 3 — Hostinger Node.js app (5 min)

1. hPanel → **Websites** → **Add website** → pick your domain.
2. Site created → **Manage** → **Advanced** → **Node.js** (some plans
   label it **Setup Node.js App**).
3. **Create Application** with:

   | Field | Value |
   |---|---|
   | **Node.js version** | 20.x or newer |
   | **Application mode** | Production |
   | **Application root** | `/` (the repo root — folder with `package.json`) |
   | **Application URL** | your domain, e.g. `https://yourdomain.com` |
   | **Application startup file** | `backend/dist/main.js` |

4. **Environment variables** (Add each):

   | Var | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | whatever Hostinger tells you (some plans set this automatically; otherwise `3000`) |
   | `DATABASE_URL` | the MySQL URI from Step 1 |
   | `JWT_ACCESS_SECRET` | `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | another `openssl rand -hex 32` |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL` | `60d` |
   | `PUBLIC_BASE_URL` | `https://yourdomain.com` |
   | `TWILIO_PROVIDER` | `stub` (real SMS later) |
   | `OTP_STUB_CODE` | `123456` |
   | `S3_PROVIDER` | `stub` (real photo storage later) |
   | `S3_STUB_DIR` | `./.local-s3` |
   | `FCM_PROVIDER` | `stub` |

5. **Git integration** — Hostinger's Git tool inside the Node.js panel.
   - Repository: `YOU/hey`
   - Branch: `main`
   - Deploy path: the app root
   - **Auto-deploy on push: ON**
   - **Build command**: `npm run build`
   - **Install command**: `npm install` (Hostinger runs this first;
     `npm run build` then installs backend + web deps and copies the
     built SPA into `backend/public/`)

6. Click **Deploy Now**. Hostinger will:
   - `git pull`
   - `npm install`  — root deps only (there aren't any beyond npm scripts)
   - `npm run build` — installs backend + web deps, builds the web
     bundle into `web/dist/`, copies it to `backend/public/`, compiles
     the Nest backend into `backend/dist/`
   - Starts `node backend/dist/main.js`

   First deploy takes ~3–5 min. Watch the log for errors.

## Step 4 — run the initial migration (one-time, 2 min)

Your database is empty. In hPanel open the Node.js app's **Terminal**
(or SSH in) and:

```bash
cd ~/domains/yourdomain.com/public_html   # or wherever your app root is

export DATABASE_URL="mysql://<user>:<password>@<host>:3306/<db>"
cd backend
npx prisma migrate deploy
npm run db:seed
```

You should see:

```
✓ 50+ interests
✓ 12 prompts
```

That's it — the catalog is seeded.

## Step 5 — HTTPS + domain

Hostinger auto-provisions Let's Encrypt certs on their DNS. External
domains: follow their DNS instructions and enable HTTPS under
**Websites → Manage → SSL**.

## Step 6 — try it

Open `https://yourdomain.com` in a browser.

- Splash → tap → phone screen
- Any phone number (stub OTP accepts anything)
- Enter `123456`
- Walk through onboarding
- Land on Discover

## Future deploys

```bash
git add .
git commit -m "small tweak"
git push
```

Hostinger picks it up in ~30 seconds. `npm run build` runs, the app
restarts. No manual step.

## Going from stub → real

Set these env vars in hPanel (Node.js app → **Environment variables** →
Edit) and **Restart Application**.

| Feature | Vars | Cost |
|---|---|---|
| Real SMS (Twilio Verify) | `TWILIO_PROVIDER=real`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`, blank `OTP_STUB_CODE` | ~$0.05/SMS |
| Real photo storage (S3 or Cloudflare R2) | `S3_PROVIDER=real`, `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | ~$1–5/mo |
| Real push (Firebase) | `FCM_PROVIDER=real`, `FCM_PROJECT_ID`, `FCM_CREDENTIALS_JSON` | free |

## Troubleshooting

**"Frontend build not found" / blank page** — the `npm run build` step
failed. Node.js app → **Log** → find the error. Common culprits: a TS
error in the web app, or Hostinger's Node version older than 18. Fix
locally, `git push`, redeploy.

**"Cannot connect to database"** — double-check `DATABASE_URL`. If you
copied Hostinger's phpMyAdmin URL by mistake, it won't work — you want
the plain `mysql://user:pass@host:3306/db` form. Also check that the
DB user has permission to read/write the DB (Hostinger creates them
scoped, not global).

**Prisma migrate fails: shadow database access** — Hostinger managed
MySQL doesn't let you `CREATE DATABASE`. On the server, use `prisma
migrate deploy` (not `migrate dev`) — deploy only applies existing
migrations and doesn't need a shadow DB. `migrate dev` stays local.

**WebSockets don't connect** — some Hostinger plans need WebSocket
support toggled on. hPanel → **Websites** → **Manage** → **Advanced**
→ look for "WebSocket" or "HTTP/2". If your plan can't do WS, the app
still boots but chat won't stream — the client falls back to REST reads.

**Deep-link URLs return 404** (e.g. reloading `/discover`) — this is
what the SPA fallback catches. If it 404s, the build didn't land in
`backend/public/` — check the Node.js log for `[copy-web-build]` output
during build.

**Env var change doesn't take effect** — restart the app. hPanel →
Node.js app → **Restart Application**.
