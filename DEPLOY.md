# Deploy Hey to Hostinger

Single Node.js process serves everything: the React frontend, the REST API,
and the WebSocket gateway. Database + Redis live on external free tiers.

## What you need

- [ ] A Hostinger plan with **Node.js hosting** (Cloud Startup / Business / Cloud Professional / VPS)
- [ ] A domain (Hostinger sells them, or use one you already own)
- [ ] A GitHub account
- [ ] ~30 minutes for the first deploy; ~30 seconds for every subsequent push

## Architecture

```
GitHub  ── push ──▶  Hostinger Node.js app  ──▶  visitors
                            │
                            ├── talks to ──▶  Supabase Postgres (with PostGIS)
                            └── talks to ──▶  Upstash Redis
```

---

## Step 1 — free managed database (Supabase, 5 min)

Supabase gives you Postgres with PostGIS built in on the free tier.

1. Go to https://supabase.com and sign up (GitHub login is fine).
2. Click **New Project**. Name it `hey`. Pick a region close to your users. Set a strong DB password and save it.
3. Wait ~2 minutes for the DB to spin up.
4. **Enable PostGIS:** in the left sidebar → **Database** → **Extensions** → search `postgis` → toggle it on.
5. **Grab the connection string:** left sidebar → **Project Settings** → **Database** → scroll to **Connection string** → tab **URI** → copy the value (looks like `postgresql://postgres.abcd:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres`).
6. Save it somewhere — you'll paste it into Hostinger as `DATABASE_URL`.

## Step 2 — free managed Redis (Upstash, 3 min)

1. Go to https://upstash.com, sign up.
2. Click **Create Database**. Name it `hey-redis`. Region close to your Hostinger data centre. Type: **Regional** (free tier).
3. Once created, scroll to **REST** and switch to **Connect your client** or just find the section labeled **`redis://` URL** — copy that value (looks like `rediss://default:xyz@moving-koala-12345.upstash.io:6379`).
4. Save it — you'll paste it as `REDIS_URL`.

## Step 3 — push the code to GitHub (5 min)

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

## Step 4 — Hostinger Node.js app (10 min)

1. Log in to Hostinger → **hPanel**.
2. Click **Websites** → **Add website** → pick your domain.
3. Once the site is created, click **Manage** → in the left sidebar find **Advanced** → **Node.js** (some plans call this **Setup Node.js App**).
4. Click **Create Application** and fill in:

   | Field | Value |
   |---|---|
   | **Node.js version** | 20.x (or highest available) |
   | **Application mode** | Production |
   | **Application root** | `/` (repo root — the folder containing `package.json`) |
   | **Application URL** | your domain, e.g. `https://yourdomain.com` |
   | **Application startup file** | `backend/dist/main.js` |

5. **Environment variables** (click Add):
   - `NODE_ENV` = `production`
   - `PORT` = whatever Hostinger requires (some plans set this automatically; if there's a "Application port" field, use that — otherwise `3000`)
   - `DATABASE_URL` = the Supabase URI from Step 1
   - `REDIS_URL` = the Upstash URI from Step 2
   - `JWT_ACCESS_SECRET` = generate a random 40+ char string (e.g. `openssl rand -hex 32` in Terminal)
   - `JWT_REFRESH_SECRET` = another random 40+ char string
   - `ADMIN_JWT_SECRET` = another random 40+ char string
   - `JWT_ACCESS_TTL` = `15m`
   - `JWT_REFRESH_TTL` = `60d`
   - `ADMIN_JWT_TTL` = `8h`
   - `PUBLIC_BASE_URL` = `https://yourdomain.com`
   - `TWILIO_PROVIDER` = `stub` (real SMS later)
   - `OTP_STUB_CODE` = `123456`
   - `S3_PROVIDER` = `stub` (real photo storage later)
   - `S3_STUB_DIR` = `./.local-s3`
   - `REKOGNITION_PROVIDER` = `stub`
   - `FCM_PROVIDER` = `stub`
   - `MAPBOX_PROVIDER` = `stub`
   - `CHECKIN_RADIUS_M` = `100`
   - `CHECKIN_TTL_HOURS` = `2`

6. **Git integration:** find the **Git** section on the Node.js app screen (or the general Hostinger Git tool). Connect your GitHub repo. Set:
   - Repository: `YOU/hey`
   - Branch: `main`
   - Deploy path: your app root
   - **Auto-deploy on push: ON**

7. Click **Deploy Now**. Hostinger will:
   - `git pull`
   - `npm install`   (this triggers our `postinstall` which installs backend + web deps)
   - `npm run build` (builds web → copies to `backend/public/` → builds backend)
   - Start `node backend/dist/main.js`

   First deploy takes ~4-6 min. Watch the log for errors.

## Step 5 — run the initial migration (one-time, 2 min)

Your DB is empty — you need to create the tables and seed the catalog. Hostinger's Node.js Terminal (in hPanel) or SSH:

```bash
cd ~/domains/yourdomain.com/public_html   # or wherever your app root is
# Point Prisma at the Supabase URL. Use the SAME string you set as DATABASE_URL in Hostinger.
export DATABASE_URL="postgresql://postgres.abcd:PW@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
cd backend
npx prisma migrate deploy
npm run db:seed
```

You should see:
```
✓ 50 interests
✓ 12 prompts
✓ 8 cities
✓ 8 places
✓ 6 events
✓ admin user admin@hey.app / admin
```

## Step 6 — HTTPS + domain

Hostinger auto-provisions Let's Encrypt certs for domains hosted on their DNS. If you're using an external domain, follow their DNS instructions and enable HTTPS in **Websites → Manage → SSL**.

## Step 7 — try it

Open `https://yourdomain.com` in a browser.

- Splash → tap → phone screen
- Enter your number (any format, we're on stub OTP)
- Enter `123456`
- Walk through onboarding
- Land on Discover

## Future deploys

Just push:
```bash
git add .
git commit -m "small tweak"
git push
```

Hostinger picks it up in ~30 seconds. `npm install` + `npm run build` re-runs; the app restarts.

## When you're ready to go from stub → real

Set these env vars in hPanel (Node.js app → Environment variables → Edit):

| Toggle | Vars to set | Cost |
|---|---|---|
| Real SMS via Twilio | `TWILIO_PROVIDER=real`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SID`, blank `OTP_STUB_CODE` | ~$0.05/SMS |
| Real photo storage (AWS S3 or Cloudflare R2) | `S3_PROVIDER=real`, `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | ~$1-5/mo |
| Real push notifications (Firebase) | `FCM_PROVIDER=real`, `FCM_PROJECT_ID`, `FCM_CREDENTIALS_JSON` | free |
| Real geocoding for admin | `MAPBOX_PROVIDER=real`, `MAPBOX_TOKEN` | free tier plenty |

Restart the app after any env var change (Node.js app page → **Restart**).

## Troubleshooting

**"Frontend build not found"** in the browser → the `npm run build` step failed. In hPanel, open the Node.js app → **Log** → look for the error. Usually a missing dependency or a TypeScript error. Fix locally, `git push`, redeploy.

**"Cannot connect to database"** → Double-check `DATABASE_URL`. Supabase's pooler port is `6543` (not `5432`) — make sure you copied the URI (pooler) string, not the direct one.

**WebSockets don't connect** → Some Hostinger plans require WebSocket support to be toggled on. hPanel → Websites → Manage → Advanced → look for "WebSocket" or "HTTP/2". If your plan doesn't support WS, the app still works — realtime just falls back to REST polling for chat updates (you'd need a small code change to add polling).

**App keeps crashing after deploy** → Check `LOG_LEVEL=error` in env vars, restart, view logs. Common cause: `DATABASE_URL` or `REDIS_URL` typo.

**Env var change doesn't take effect** → Hostinger Node.js apps must be restarted after env changes. Click **Restart Application** in the Node.js panel.
