# Rabbit Marketing House — Attendance & HR

Attendance, timesheets, leave approval (Employee → Manager → Admin), tasks, chat, holidays and reports.
Zero npm dependencies. Needs **Node 22.5+** (uses the built-in `node:sqlite`).

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

## Hosting
This is a long-running Node server with a SQLite file, so it needs a host with a **persistent disk**
(Railway, Render, Fly.io, a VPS, or an office PC). It cannot run on Vercel's serverless platform as-is.
Use HTTPS in production (passwords and GPS capture require it).

## Roles
Admin (everything) · Manager (own team: attendance, tasks, first-level leave approval, team reports) ·
Employee (own data). Permissions are enforced on the server, not just hidden in the menu. Each browser tab
keeps its own login (session token in `sessionStorage`).
