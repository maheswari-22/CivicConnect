# CivicConnect — frontend + backend, run together

```
CivicConnect/
├── F11/        React + Vite app: landing page + Citizen, Authority and Worker portals
└── Backend/    Express + PostgreSQL API (JWT auth, complaints, photo uploads)
```

The frontend now talks to the backend for **sign-up / login, profiles, complaints,
assigning workers, worker tasks, work photos and notifications**. The browser only keeps the
login token, a cached copy of the signed-in user's profile and the display name shown on the
Worker / Authority dashboards in `localStorage` — no complaint data.

## 1. One-time setup

You need Node 20+ and PostgreSQL (Docker is the easiest way).

```bash
# from this folder
npm run setup          # installs Backend/ and F11/ (and the root helper)
npm install            # installs "concurrently" for the one-command start

npm run db:up          # starts PostgreSQL in Docker  (skip if you have your own Postgres)
npm run db:init        # creates the tables and the demo data
```

Using your own PostgreSQL instead of Docker: create a database called `civicconnect`,
then edit `Backend/.env` → `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/civicconnect`.

## 2. Run both

```bash
npm run dev
```

| What | URL |
| --- | --- |
| Website (landing page + portals) | http://localhost:5173 |
| API health check | http://localhost:4000/api/health |

Or in two terminals: `npm run dev:api` and `npm run dev:web`.

Config files (already created for you):

- `Backend/.env`  — `PORT=4000`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` (must include the web URL)
- `F11/.env`      — `VITE_API_URL=http://localhost:4000`

## 3. Demo accounts (created by `npm run db:init`)

| Portal | Sign in with | Password |
| --- | --- | --- |
| Citizen | `citizen@civicconnect.com` or `9876543210` | `citizen@1234` |
| Authority | Employee ID `AUTH-001` | `authority@1234` |
| Authority (Amaravathi) | Employee ID `AUTH-002` | `authority@1234` |
| Worker | Username `wk-101` … `wk-112` | `worker@1234` |
| **Ongole** Citizen | `citizen.ongole@civicconnect.com` or `9876543211` | `citizen@1234` |
| **Ongole** Authority | Employee ID `AUTH-003` | `authority@1234` |
| **Ongole** Worker | Username `wk-301` … `wk-308` | `worker@1234` |

The Ongole set comes with six sample complaints (submitted, in review, assigned, in progress and resolved), so all three
portals open with data. Already have a database? Run `npm --prefix Backend run seed` again: it is safe to repeat and
adds the Ongole accounts without touching your existing data.

New sign-ups work in every portal. **Passwords need 10+ characters with upper and lower case, a number and a symbol.**

**Authority sign-up needs an invite code.**

- *Local development:* `npm run setup:env` writes a **random** `AUTHORITY_INVITE_CODE=CIVIC-DEV-…` into `Backend/.env` and prints it once (a shared dev code; the server **refuses to start in production** while it is set to the old public `CIVIC-AUTH-2026`). Never reuse a dev code on a server other people can reach.
- *Real use:* leave `AUTHORITY_INVITE_CODE` empty and make **single-use, area-locked, expiring** codes:
  `npm --prefix Backend run authority:invite -- --area Guntur --days 7`
  The officer types that code on the sign-up page (with that same area). Or skip sign-up and run
  `npm --prefix Backend run authority:create -- --employee-id AUTH-010 --name "Asha Rao" --email asha@city.gov.in --area Guntur`.

**Worker sign-up needs approval.** A new worker can't sign in until an authority of the same area opens
*Workers* in the Authority portal and presses *Approve*. Declined requests are removed and the details can be reused.

Create an officer from the command line (a random temporary password is printed once):

```bash
npm --prefix Backend run authority:create -- --employee-id AUTH-010 --name "Asha Rao" --email asha@city.gov.in --phone +919800000000 --area Visakhapatnam
```


## Location and AI photo check (Report Issue page)

**Use current location** uses the browser's Geolocation API. It keeps refining the GPS reading for up to ~12 seconds
(phones often start 100 m to 2 km off), then fills in the street address, picks your city / area, and shows a map preview
with a pin. Everything stays editable, and the page works without GPS (type the place instead). Notes:
- Browsers only give location on **https://** or **localhost**.
- The address lookup goes through the API (`GET /api/geo/reverse`, OpenStreetMap Nominatim, cached). The coordinates are
  therefore sent to the OpenStreetMap service. Set `GEOCODER_URL` to use your own geocoder.
- Optional strict check: `GEOFENCE_COMPLAINTS=true` (Backend/.env) rejects complaints whose GPS
  pin is far outside the chosen area.

**AI photo check** uses TensorFlow.js in the browser. When a photo is added, the app may suggest a different category
("This photo looks like Garbage - switch?"). The photo is analysed on the phone, nothing extra is uploaded, and it never
blocks a report. By default it uses MobileNet (general objects; it does not know potholes). For real accuracy, train your own
model in 10 minutes with Teachable Machine: see `F11/public/models/civic/README.md`.

## 4. How a complaint reaches the right authority

Every complaint, authority and worker belongs to **one area** (Amaravathi, Visakhapatnam, …).
The list lives in `Backend/src/config/areas.js` (and `F11/src/shared/areas.js` for the dropdowns).

- A **citizen** picks the city / area when reporting (it defaults to the area on their profile).
- An **authority** and a **worker** choose their area when they sign up.
- The backend sends the new-complaint notification **only to authorities of that area**, and an
  authority can list, open, rank workers for and assign **only complaints from their own area**
  (another area's complaint returns 404). Only workers of the same area can be assigned.
- An authority's and a worker's area is fixed at sign-up (not editable from the profile page).
- **Edit profile**: on the Profile page, Citizens, Authorities and Workers can change their name, email and mobile number with the *Edit* button (saved via `PATCH /api/auth/profile`). Employee ID / username / worker ID / area are read-only.

To add a city, add it to **both** `areas.js` files. Existing databases are upgraded automatically on the
next server start (complaints get the area of the citizen's profile, otherwise Visakhapatnam).

Try it: log in as `AUTH-001` (Visakhapatnam) and `AUTH-002` (Amaravathi) in two browsers — each sees
only its own complaints and workers.

## 5. Quick end-to-end test

1. Citizen → *Report an issue* (pick the city / area, add a photo) → note the complaint ID.
2. Authority of the **same area** → *Complaints* → open it → pick a worker (e.g. Visakhapatnam Roads: `WK-104`) → *Assign*.
3. Worker (`wk-104`) → *Assigned Tasks* → *Start* → add a progress photo → add a completion photo → *Complete*.
4. Citizen → *Track* the complaint: status, worker and photos are all there. Authority → *Notifications* shows each step.

## Notes

- Each portal keeps its **own** login, so you can be signed in as all three in one browser.
- Uploaded photos live in `Backend/uploads/` and are served by the API.
- **Large photos are fine**: the Citizen and Worker upload screens shrink any camera / gallery photo (up to 50 MB) in the browser to a ~1–2 MB JPEG before uploading. The API itself accepts files up to `MAX_UPLOAD_MB` (default 25) and only real JPG / PNG / WebP images (checked by content, not just by name). HEIC photos work on Safari; other browsers show a clear message.
- Production: set a long random `JWT_SECRET`, set `CORS_ORIGIN` to your site's URL, and build the web app
  with `VITE_API_URL` pointing at the deployed API (`npm --prefix F11 run build`).

## 6. Forgot password and email

All three portals use the same flow: **Forgot password?** -> enter the details -> an email with a one-time link
(valid 30 minutes, works once) -> the link opens the portal's page on the *Choose a new password* step.

| Portal | Details asked on the forgot step |
| --- | --- |
| Citizen | mobile number or email (the account must have an email on file to receive the link) |
| Authority | Employee ID + registered email (both must match) |
| Worker | username or email |

For privacy the screen always says "if an account matches, a link has been sent", whether or not it does.

**Sending real emails** - fill these in `Backend/.env` (Gmail example; use a Google *App password*, not your normal password):

```
APP_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-16-character-app-password
MAIL_FROM=CivicConnect <you@gmail.com>
```

Then check it works:

```bash
npm --prefix Backend install              # installs nodemailer (new dependency)
npm --prefix Backend run mail:test        # checks the SMTP login
npm --prefix Backend run mail:test you@example.com   # also sends a real test email
```

With `SMTP_HOST` left empty (the default) nothing is emailed: the reset link is printed in the API terminal
instead, so you can still test the whole flow locally. Existing databases get the new `password_resets`
table automatically on the next server start.

## 6. Tests and code formatting

```bash
npm run setup          # once, installs everything (includes Prettier)
npm run format         # one-time tidy-up of the backend source (Prettier); run it after pulling changes too
npm test               # unit tests always run; API tests run when the API is up
```

- `Backend/tests/validation.test.js` — unit tests for the request validation rules (no database needed).
- `Backend/tests/api.test.js` — end-to-end API tests (sign-up, login, roles, area isolation, search filters).
  Start the database and API first (`npm run db:up && npm run db:init`, then `npm run dev:api`);
  if the API is not running these tests are skipped instead of failing.
- Complaint filtering and search now run inside PostgreSQL. Login is limited to 10 failed attempts per
  15 minutes per IP, and sign-ups to 20 per hour.
- Before deploying: set a strong `JWT_SECRET` and `NODE_ENV=production` in `Backend/.env`, and do not commit `.env`.

## 7. Reject, rate and reopen

- **Authority → Reject**: on a complaint that has not been assigned yet, the officer can reject it with a reason
  (invalid, duplicate, outside limits). The citizen is notified and sees the reason on the Track page.
- **Citizen → Rate**: once resolved, the citizen can rate the fix 1-5 with an optional comment (once per resolution).
  The authority of that area is notified and sees the rating on the complaint.
- **Citizen → Reopen**: if the problem is still there, the citizen can reopen a resolved complaint (max twice).
  It returns to *Under Review* with High priority, the previous worker is notified, and the next worker starts a
  clean round: the old completion photo no longer counts, so a new one is required before closing it again.

## 8. Security notes

- Changing or resetting a password (or deleting the account) signs **every other session out** (`users.token_version`).
- The login form tells the server which portal it is, so the same text (e.g. a worker username equal to an employee ID)
  can never sign you into the wrong account.
- Worker codes (`CW-10001`, ...) come from a database sequence, so they cannot collide.
- **Photos are private.** `/uploads/...` only works with a signed, time-limited link that the API adds for people who may see that complaint (6 hours; reload the page for fresh links). The bare file path returns 403.
- **Logout really logs out**: the token is revoked on the server (`revoked_tokens`), not just forgotten by the browser.
- Complaint lists return at most 500 rows. Progress-photo limits are enforced under a row lock.
- The database upgrades itself on the next API start (migrations add the new columns and tables).
- More in **SECURITY.md** (what was hardened, the production checklist, and the risks that remain). Email setup is in **EMAIL_SETUP.md**.

## 9. v9 changes

**Unassigned complaints.** A new complaint that has no worker shows as a red alert at the top of the Authority dashboard
(oldest first, with an *Assign* button) and as a "No worker assigned yet" notification once it has waited 4 hours
(`UNASSIGNED_ALERT_HOURS`). The API also sends a reminder to that area's authorities every 4 hours until a worker is assigned
(a reopened complaint counts from the reopen). A worker who deletes their account no longer strands their open tasks: they return
to the authority as unassigned. If an area has no officer yet, the citizen is told so.

**Notifications.** In the Authority and Worker portals the bell opens the *Notifications* page directly, and clicking a notification
there marks it read and stays on that page.

**Fake-issue protection (Report Issue).** A photo is now required. TensorFlow.js checks it on the phone against the chosen category:
a photo that clearly shows something else (another problem, a selfie, a pet, food...) cannot be submitted, and the citizen can switch
the category or pick another photo. The server refuses reports the check rejected, and refuses a photo that was already used for any
complaint (a perceptual fingerprint, so re-saved or resized copies are caught too). Photos the AI could not confirm are accepted
but flagged for the officer ("photo could not be verified"). With the default MobileNet model (it does not know potholes) only
confident mismatches are refused; for strict checking train your own model (`F11/public/models/civic/README.md`) and set
`PHOTO_CHECK_STRICT=true`. Limits: the check runs in the browser, so someone calling the API directly can skip it; the photo
fingerprint, the daily cap and the duplicate rules still apply to them.

**Cities and villages.** 21 offices now (all main Andhra Pradesh cities). *Use current location* names the village / town / city and
picks the serving office; a village far from any headquarters goes to the nearest office within 120 km. Citizens can also search a
village or town by name (`GET /api/geo/search`, OpenStreetMap, limited to Andhra Pradesh). The place name is stored with the
complaint (`complaints.place`) and shown to the officer. To add an office, add it to **both** `areas.js` files (name and centre).
Existing databases upgrade themselves (migration 7).

**Other fixes.** Dashboard showed `NaN%` for an area with no complaints; a pin with only a latitude (or only a longitude) is refused;
a pin outside the region is refused.

## 9. AI severity, emergencies and escalation

- **AI severity (0-100 %)**: when a citizen adds a photo, the browser estimates how bad the problem looks (damaged area, debris,
  darkness, water) and shows an animated meter. The authority sees the score and a suggested priority (70+ High, 40+ Medium, else Low)
  and sets the real priority. It is an estimate from image statistics, not a trained damage model; for better accuracy train your own
  model (see `F11/public/models/civic/README.md`).
- **Emergency**: the citizen can tick *This is an emergency*. It is stored as High, shown in red to the authority and the worker, cannot be
  lowered on assignment, and is due within 6 hours.
- **Escalation**: unassigned complaints are chased after `EMERGENCY_ALERT_HOURS` (1), `SEVERE_ALERT_HOURS` (2) or `UNASSIGNED_ALERT_HOURS` (4),
  repeatedly, with sharper wording each time. The authority also gets a red alert bar, a pop-up with alarm tone and vibration, a pulsing sidebar
  badge and a flashing tab title (`GET /api/authority/attention`). Overdue assigned work reminds the worker and the authority.
- The database upgrades itself on the next API start (migration 8).

## 10. Photo AI, exact location and password-reset emails

- **Photo AI**: by default the Report page now uses a zero-shot model (CLIP, run in the browser through transformers.js). It is asked in plain
  words whether the photo shows a pothole / garbage pile / broken street light / water leak / none of these, and how severe it is.
  The first photo downloads about 90 MB (cached afterwards; needs internet access to huggingface.co). If that fails, is too slow, or
  the device is on Data Saver, the old MobileNet check is used. Control it with `VITE_AI_ENGINE` (`auto`, `clip`, `mobilenet`). A model trained
  on your own city's photos (see `F11/public/models/civic/README.md`) is still the most accurate option and takes priority when present.
- **Location**: the GPS fix is averaged over several readings, and the citizen can drag the pin (or tap the map) to the exact spot; the
  address, village/town and serving office are looked up again for the new pin. Addresses now include a named place and house number when known.
- **Emails**: all emails use one branded, mobile-friendly design with the logo attached inline and a plain-text version. After a
  password reset the owner also gets a "your password was changed" notice. `npm run mail:test you@example.com` sends the real reset design.
  Emails only leave your computer once `SMTP_*` is set in `Backend/.env` (see `EMAIL_SETUP.md`).

## 11. v18: fixes after the review

- **Officers can dismiss a false emergency** (Assign Worker page > "This is not an emergency"). The citizen sees why. Emergency flags are limited per citizen (see `.env.example`).
- **Severity is honest**: shown only when the zero-shot AI model answered; otherwise the citizen is told the officer will assess the photo.
- **AI accuracy checker**: run `npm run dev` in `F11` and open `http://localhost:5173/ai-lab.html`. Choose a folder with sub-folders `road`, `garbage`, `light`, `water`, `none`.
  It shows the real accuracy and a confusion matrix on your own photos, using the same engine as the Report page. Do this before trusting the AI.
- **Alert system**: no leftovers between officers, fresh data on every page change and sign-in, a keyboard-safe pop-up, and emails to every officer of the area for an emergency that still has no worker (at about 1 h, 3 h, 6 h, 12 h, 24 h).
- **Sign-up needs an email** (new accounts), and a citizen without one sees a reminder to add it.
- **Geocoder** shares identical lookups and caps its queue. Set `GEOCODER_EMAIL`.
- **Security headers** for production: `F11/deploy/`.
- Database migrations 8 and 9 run automatically on the next API start.
