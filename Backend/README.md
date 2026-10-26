# CivicConnect Backend — Node.js + Express + PostgreSQL

Production-oriented REST API for the CivicConnect Citizen, Authority and Worker portals.

## Requirements

- Node.js 20+
- PostgreSQL 14+ (16 recommended)
- Docker is optional.

## Important: the npm timeout you saw

If `npm install` appears to hang or time out, that is normally a network/DNS problem reaching the npm registry, not a PostgreSQL problem. Test it with:

```bash
npm ping
```

You can also test:

```bash
nslookup registry.npmjs.org
```

If DNS cannot resolve `registry.npmjs.org`, fix the machine/network DNS connection and rerun `npm install`. Do not repeatedly reinstall PostgreSQL to solve an npm registry timeout.

## Option A — Local PostgreSQL (no Docker)

Create the database:

```sql
CREATE DATABASE civicconnect;
```

Copy `.env.example` to `.env` and set:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/civicconnect
```

Then:

```bash
npm install
npm run db:check
npm run migrate
npm run seed
npm run dev
```

Health endpoint:

```text
http://localhost:4000/api/health
```

## Option B — PostgreSQL with Docker

Docker is optional, but this is the easiest way to run PostgreSQL without installing it directly:

```bash
docker compose up -d postgres
```

Use this local connection string:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/civicconnect
```

Then run the Node backend normally:

```bash
npm install
npm run db:check
npm run migrate
npm run seed
npm run dev
```

To stop PostgreSQL:

```bash
docker compose down
```

To remove its stored database data too:

```bash
docker compose down -v
```

## Full Docker mode

After installing dependencies once, you can build the API container:

```bash
docker build -t civicconnect-api .
docker run --rm --name civicconnect-api --env-file .env -p 4000:4000 --network host civicconnect-api
```

For Windows/macOS Docker Desktop, prefer running the Node backend directly and use Docker only for PostgreSQL unless you specifically want both containers.

## Database commands

```bash
npm run db:check
npm run migrate
npm run seed
npm run reset
```

`reset` deletes the CivicConnect tables and all their data. It is for development only.

## Demo accounts

- Authority: `authority@civicconnect.com` / `authority@1234`
- Citizen: `citizen@civicconnect.com` / `citizen@1234`
- Workers: `wk-101` through `wk-112` / `worker@1234`
- Ongole citizen: `citizen.ongole@civicconnect.com` or `9876543211` / `citizen@1234`
- Ongole authority: `AUTH-003` / `authority@1234`
- Ongole workers: `wk-301` through `wk-308` / `worker@1234`

## API groups

- `/api/auth` — registration, login, profile, password, account, forgot / reset password (emailed one-time link; see `SMTP_*` in `.env.example`, test with `npm run mail:test`)
- `/api/citizen` — citizen dashboard, complaints, notifications
- `/api/authority` — complaint review, worker ranking, assignment, tracking
- `/api/worker` — assigned tasks, progress, photos, completion, notifications

Protected routes use:

```http
Authorization: Bearer <JWT>
```

## File uploads

Images are stored in `UPLOAD_DIR` (default `./uploads`) and served under `/uploads/...`.

Allowed formats: JPEG, PNG, WebP (checked by file content, not just the name). Default maximum image size: 25 MB (`MAX_UPLOAD_MB`). The web app shrinks large photos before uploading.

## PostgreSQL architecture

The API uses `pg.Pool`, parameterized SQL, PostgreSQL foreign keys, checks, indexes, and transactions. SQLite and `better-sqlite3` are not used.

Migrations are transactional: if a migration fails, PostgreSQL rolls it back instead of leaving a half-created schema.

Demo seeding is intentionally **not automatic on server startup**. Run `npm run seed` explicitly so production startup never unexpectedly inserts demo data.
