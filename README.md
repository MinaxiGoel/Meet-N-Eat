# Meet-N-Eat

Meet-N-Eat pairs people across the globe with one new person a month (same gender only, never the same pair twice) for a relaxed 30-minute coffee call. Members join with LinkedIn, get a check-in email from the 3rd, can reveal their match on the site from the 8th, and get their match’s details by email from the 10th. See `PRD.txt` for the full product spec.

## Project layout

- `frontend/` — the whole app: Next.js website + API, deployed on **Vercel**, data in **Neon Postgres**.
  - `app/` — pages (landing, register, login, member app, profile, email-choice page) and API routes under `app/api/`.
  - `lib/` — server logic: database schema, pairing, monthly schedule, emails, LinkedIn sign-in.
  - `tests/` — unit tests (`npm test`).
- `PRD.txt` — product requirements.
- `assets/` — source artwork.
- `backend/`, root `index.html`, `styles.css`, `script.js` — old versions, no longer used.

## Run it on your computer

You need Node.js 20.6 or newer.

1. `cd frontend`
2. Copy `.env.example` to `.env.local` and fill in at least `DATABASE_URL` and `SESSION_SECRET`. Keep `EMAIL_DRY_RUN=1` so emails print in the terminal instead of being sent.
3. `npm install`
4. `npm run db:setup` (creates the tables in Neon; safe to run again)
5. `npm run dev` and open http://localhost:3000
6. `npm test` runs the unit tests.

LinkedIn sign-in needs `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`, and `http://localhost:3000/api/auth/linkedin/callback` added as a redirect URL in the LinkedIn app.

## Deploy

**Neon:** create a project and copy the *pooled* connection string. Run `npm run db:setup` once with it.

**Vercel:** import the GitHub repo, set **Root Directory** to `frontend`, and add these environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `SESSION_SECRET` | A random string, 32+ characters |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | From the LinkedIn Developer app |
| `SMTP_USER` / `SMTP_PASS` | Gmail address and its 16-character App Password |
| `EMAIL_FROM_NAME` | `Meet-N-Eat` |
| `CRON_SECRET` | Another random string, 16+ characters |

Don’t set `EMAIL_DRY_RUN` on Vercel.

**LinkedIn:** in the Developer app’s Auth tab, add `https://<your-site>/api/auth/linkedin/callback`.

**Scheduler (free):** create a job on [cron-job.org](https://cron-job.org) that calls
`https://<your-site>/api/cron` every **15 minutes**, with the request header
`Authorization: Bearer <CRON_SECRET>`. Each call runs pairing when it’s due and sends whatever emails are due. You can open the URL with `?key=<CRON_SECRET>` in a browser to see what it did.

## The monthly rhythm

| When (member’s local time) | What happens |
| --- | --- |
| From the 3rd, 09:00 | Check-in email to everyone except opted-out members (max 480/day, the rest roll over) |
| 7th, 10:00 UTC | Pairing round 1 |
| From the 8th, 00:00 | Reveal opens on the site |
| From the 10th, 09:00 | Match email (or a “no match this month” note) to members who are in |
| 11th, 10:00 UTC | Pairing round 2, only if some check-ins went out after round 1 |
