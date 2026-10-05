# Rabbit Marketing House — Attendance & HR

Attendance, timesheets, leave approval (Employee → Manager → Admin), tasks, chat, holidays and reports.
Needs **Node 22.5+**. Local use has zero npm dependencies (built-in `node:sqlite`); the Postgres option uses the `pg` package.

## Run locally
```
npm run dev          # http://localhost:5173
```
On first start the page asks you to create the first **Admin** account. Data is stored in `data/rmh.db`
(ignored by git — back it up regularly).

## Useful commands
| Command | What it does |
|---|---|
| `npm run seed:demo` | Adds 3 demo accounts (Admin / Manager / Employee) for testing |
| `npm run seed:demo -- --remove` | Removes the demo accounts again |
| `npm run reset:password -- <email> <new-password>` | Emergency password reset on the server machine |

> ⚠️ The demo accounts use **public passwords** (see `seed-demo.js`). Use them only on a local/test machine and
> remove them before real staff use the system.

## Hosting (live link)

### Vercel + Neon Postgres (free tier friendly)
The API runs as a Vercel serverless function (`api/[...path].js`) and stores data in Postgres.
1. Import this repo into Vercel (Framework preset: *Other*; the included `vercel.json` sets the output folder to `public`).
2. Project → **Storage** → **Create Database** → **Neon** → connect it to the project. This adds `DATABASE_URL` / `POSTGRES_URL`.
3. Project → **Settings → Environment Variables**: add `SETUP_CODE` (any secret string).
4. Redeploy. Open the site, enter the setup code, and create the first Admin account.

Browsers check for updates every 20 s on Vercel (6 s when self-hosted) to stay inside free-plan limits.

### Self-hosting (office PC / VPS / Render / Railway)
`npm run dev` runs the same code with a local SQLite file (`data/rmh.db`); set `DATABASE_URL` to use Postgres instead
(run `npm install` first). A host with a persistent disk is required for SQLite — see `render.yaml`.

Environment variables: `DATABASE_URL` (Postgres), `DATA_DIR` (SQLite folder), `SETUP_CODE` (protects first-run Admin screen),
`TRUST_PROXY=1` (behind a proxy; automatic on Vercel), `PORT`.

## Roles
Admin (everything) · Manager (own team: attendance, tasks, first-level leave approval, team reports) ·
Employee (own data). Permissions are enforced on the server, not just hidden in the menu. Each browser tab
keeps its own login (session token in `sessionStorage`).
