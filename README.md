# Meet & Eat

Meet & Eat introduces members to one new person at a time for a 30-minute conversation. Visitors see a concise landing page and sign up with LinkedIn. After authentication, members complete their profile, then use a dashboard to reveal matches, browse past introductions, and change matching cadence or email reminders.

The profile collects first and last name, one of four gender identities, a preferred email address, and interests. Matches are limited to the same gender identity group, and a pair is never repeated. Members may participate monthly, every two months, every three months, or pause.

## Project layout

- `frontend/` — responsive Next.js site, deployed from the `frontend` root on Vercel.
- `backend/` — Express API, Passport LinkedIn OpenID Connect, PostgreSQL schema, pairing and email jobs, deployed on Railway.
- `PRD.txt` — complete product requirements.
- `assets/meet-and-eat-hero.png` — source artwork, copied into `frontend/public/`.
- Root `index.html`, `styles.css`, and `script.js` are the original static concept and are not used by the Next.js deployment.

## Run locally

Use Node.js 20 or newer and a local PostgreSQL database.

1. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` and a long random `SESSION_SECRET`.
2. In `backend/`, run `npm install`, then `npm run dev`.
3. Copy `frontend/.env.example` to `frontend/.env.local`. Set `API_ORIGIN=http://localhost:4000`.
4. In `frontend/`, run `npm install`, then `npm run dev`.
5. Open `http://localhost:3000`.

The Express service creates and updates its tables when it starts. LinkedIn sign-in stays disabled until client credentials are configured.

## LinkedIn app setup

Create a LinkedIn Developer app and enable **Sign In with LinkedIn using OpenID Connect**. Request the `openid`, `profile`, and `email` scopes. Add the exact redirect URI below to the app’s authorized redirect URLs:

```text
https://YOUR-VERCEL-DOMAIN/api/auth/linkedin/callback
```

The Next.js rewrite proxies `/api/*` to Railway while keeping the browser and session cookie on the Vercel origin. Set `LINKEDIN_CALLBACK_URL` to the same URL in Railway and `FRONTEND_URL` to the Vercel site origin. For local development, add `http://localhost:3000/api/auth/linkedin/callback` as another redirect URI.

LinkedIn email is not the match-email destination. Members select their preferred email after sign-in. The app does not post or request connections on their behalf. Add a LinkedIn profile URL in the member profile if they want their match to have a direct link.

## Deploy the web app to Vercel

Import the repository into Vercel and set **Root Directory** to `frontend`. Vercel detects Next.js automatically. Add this environment variable before deploying:

| Variable | Value |
| --- | --- |
| `API_ORIGIN` | Public HTTPS origin for the Railway Express service, without a trailing slash |

The rewrite target is read from `API_ORIGIN` during the Next.js build, so redeploy after changing it.

## Deploy the API and database to Railway

1. Create a Railway project and add a PostgreSQL service.
2. Add a service from this repository. Set its **Root Directory** to `/backend` and, if needed, Config-as-Code file to `/backend/railway.json`.
3. Generate a public domain for the API. The service listens on Railway’s `PORT` and has a `/health` health check.
4. Set these variables on the API service:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Railway Postgres service `DATABASE_URL` reference |
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | A unique random secret of at least 32 characters |
| `FRONTEND_URL` | Vercel site origin, for example `https://meet-and-eat.vercel.app` |
| `LINKEDIN_CLIENT_ID` | Client ID from the LinkedIn app |
| `LINKEDIN_CLIENT_SECRET` | Client secret from the LinkedIn app |
| `LINKEDIN_CALLBACK_URL` | `${FRONTEND_URL}/api/auth/linkedin/callback` using the actual public URL |
| `RESEND_API_KEY` | Resend API key for match emails |
| `EMAIL_FROM` | Sender address on a domain verified with Resend |
| `PUBLIC_SITE_URL` | Same public Vercel site origin |

The API creates a PostgreSQL-backed session store. Keep LinkedIn credentials, session secret, database credentials, and email API key out of Vercel public `NEXT_PUBLIC_*` variables.

## Matching and monthly email job

The Railway cron pairs eligible members on the first of each month. Members who finish registration during a month are queued for the next period. Members must have a complete profile, an active cadence, no match already in that period, and enough time since their prior match to meet their chosen cadence.

Pairing happens independently within each of the four gender identity groups. It computes the largest feasible set of pairs whose partners have never previously been matched, and it never falls back to repeat pairs. With an odd group size, at least one person must wait; members can also wait when all fresh partner combinations have already been used. The job reports unmatched counts by group in Railway logs.

After pairing, the job emails each matched member who enabled reminders, using their preferred email address. Delivery is idempotent per member and match. Create a second Railway service from this repository with root directory `/backend`, Config-as-Code file `/backend/railway-cron.json`, and the same database, Resend, sender, and public-site variables. Set its **Cron Schedule** to `0 9 1 * *` (09:00 UTC on the first day of each month). The cron command pairs members, sends eligible email, then exits.

For a manual run, execute `npm run monthly:run` in the backend. `npm run pair:monthly` only runs the pairing task.
