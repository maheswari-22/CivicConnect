# Security notes (v7)

## What was hardened in this version

| Area | Before | Now |
|---|---|---|
| Worker sign-up | Anyone could join any area instantly | Needs approval from an authority of the **same area** (Authority → *Workers*) |
| Authority invite | One public shared code, any area | Single-use, **area-locked**, expiring codes (`npm run authority:invite`); shared code is dev-only and blocked in production |
| `JWT_SECRET` | Placeholder passed the production check | Production needs 32+ random chars (`npm run gen:secret`); photo links use a separate derived key |
| Database | `postgres:postgres`, port open to the network | Production refuses the default login; docker binds to `127.0.0.1` and takes `POSTGRES_PASSWORD` |
| Rate limits | `X-Forwarded-For` could be faked to dodge them | `TRUST_PROXY=0` by default; extra per-IP cap on the whole API |
| Changing email | One request, no password | Needs the current password **and** a link sent to the new address; the old address is told |
| Unconfirmed emails | Could squat someone's address | Sign-up sends a confirmation link; an address nobody confirmed for 48 h can be reclaimed by its real owner |
| Photos | Stored as uploaded (GPS/EXIF inside) | Decoded and re-encoded (metadata removed, max 2560 px), real-image check, folder size cap |
| Assign / reassign | Race with the worker starting | Row lock + status re-check |
| Spam | Unlimited complaints and duplicates | Daily cap, duplicate detection, optional GPS-in-area check (`GEOFENCE_COMPLAINTS`) |
| Login / reset timing | Unknown accounts answered faster | Same work for every attempt; reset answers immediately and works in the background |
| Deleted accounts | Email/mobile/username stayed locked forever | Released, so the person can sign up again |
| `reset` / `seed` scripts | Could wipe or seed a live DB | Refuse in production; `reset` needs `--yes` |
| Docker | Ran as root | Runs as the `node` user |
| Authority creation script | Generated passwords often failed the rules | Always valid; email required |

## Production checklist

1. `NODE_ENV=production`; `JWT_SECRET` from `npm run gen:secret`.
2. A strong database password; keep Postgres off the public internet.
3. `AUTHORITY_INVITE_CODE` empty; invite officers with `npm run authority:invite`.
4. SMTP configured (see `EMAIL_SETUP.md`), `APP_URL` and `API_URL` set to your real https addresses.
5. Serve everything over HTTPS (a reverse proxy such as nginx or Caddy) and set `TRUST_PROXY=1` **only** if exactly one proxy is in front.
6. Never run `npm run seed` or share your `.env` / zip it with the project.
7. Back up the database and the `uploads` folder.

## Risks that remain (known and accepted)

- **Sign-up reveals whether an email/mobile/employee ID already exists** ("an account with those details already exists"). Hiding this needs an email-first sign-up flow; it is rate-limited instead.
- **Tokens live in the browser's `localStorage` for 7 days.** A cross-site-scripting bug would expose them. No XSS sinks were found, but httpOnly cookies + CSRF protection would be stronger.
- **Photo links are bearer links** (valid for hours): whoever has the URL can open that photo until it expires.
- Authority accounts see citizens' contact details by design; protect those accounts (strong passwords, invites only).
- Test coverage is integration-level against a running API; there is no browser (UI) test suite.

## Location and photo analysis (privacy notes)
- **Geolocation** is requested only when the citizen taps "Use current location". The coordinates are stored with the complaint,
  and sent (through our API) to the OpenStreetMap geocoder to get the street address. Mention this in your privacy notice.
- **AI photo check** runs in the browser with TensorFlow.js. The photo is not sent anywhere for this. The model files
  (MobileNet, from Google's public model hosting) are downloaded on first use; with your own model they come from your server.
- The suggestion is advisory only: a wrong or missing suggestion can never block or change a report by itself.


---

## v18 changes and what they mean for security

**New protections**
- **Shorter officer sessions**: authority logins last 8 hours (`JWT_EXPIRES_AUTHORITY`), citizens and workers 7 days. Tokens are verified with the HS256 algorithm only.
- **No data left behind between officers**: the alert list (emergencies, overdue work) is wiped on sign-out and when a different officer signs in on the same computer, and "already seen" memory is kept per officer.
- **Emergency flag misuse is limited**: 3 flags per citizen per day (`MAX_EMERGENCIES_PER_DAY`); an officer can dismiss a flag with a reason that the citizen sees; 3 dismissed flags in 30 days switch the flag off for that citizen (`MAX_DISMISSED_EMERGENCIES`). Every notice reminds the citizen to call 112 for real danger.
- **Email is required to register a citizen**, so every account can recover its password. After a reset the owner gets a "password changed" email, and every older session is signed out.
- **Escalation emails** go to every officer of the area for unassigned emergencies, so an alert does not depend on someone watching the screen.
- **Geocoder protection**: identical lookups share one upstream call, and the queue is capped, so many citizens cannot flood the free address service or tie up the API.
- **Frontend headers**: `F11/deploy/` has a ready Content-Security-Policy and other headers (see `security-headers.md`). Without them the frontend has no CSP, and a token in `localStorage` is only as safe as the absence of any injected script.

**Privacy: the photo AI (this replaces the older statement)**
- The photo is analysed **in the citizen's browser**; it is not sent to any AI service. Only the result (category, severity, label) is sent with the complaint.
- The browser downloads model files from **Hugging Face** (zero-shot model) and, as a fallback, **Google storage** (MobileNet), and a runtime file from **jsDelivr**. Those hosts see the visitor's IP address and the request, not the photo. Host the model yourself (`VITE_CLIP_MODEL`, `VITE_CIVIC_MODEL_URL`) if that is not acceptable.
- The AI is advice. A photo the AI doubts is **flagged for the officer**, not refused. Only a confident "this is clearly a different problem / not a civic photo" can stop a report, and the citizen can change the category and retry.
- The severity percentage is shown only when the zero-shot model produced it. It is a suggestion for the officer, who sets the real priority.

**Known remaining risks (accepted, or for the operator to decide)**
- Login tokens live in the browser's `localStorage`. With the CSP above, and no use of `innerHTML`/`eval` anywhere in the code, the main way to steal one is closed, but it is not as strong as an HttpOnly cookie.
- The free OpenStreetMap services are for light use. Use a paid or self-hosted provider before a large launch.
- SMS is not supported, so password reset works only by email.


---

## v24 security review and fixes

**Fixed**
- **Public defaults can no longer protect a server.** If `JWT_SECRET` is missing, shorter than 32 characters or a placeholder (the `.env.example` text, `development-only-change-me`, `secret`...), outside production the API now uses a random secret for that run (with a warning) instead of the public default; production refuses to start. Before, a dev server started without a `.env` accepted logins forged with a publicly known key.
- **No shared invite code in every copy of the project.** `npm run setup:env` used to write the public code `CIVIC-AUTH-2026`, so anyone who reached a dev server could register as an officer in any area (and then read citizens' contact details and approve workers). It now writes a random `CIVIC-DEV-…` code and prints it once.
- **Password guessing against one account from many addresses.** The existing limit counted per address only. New per-account limit (`LOGIN_MAX_FAILURES`, default 10 wrong passwords in 15 minutes, then a `LOGIN_LOCK_MINUTES` pause). It counts unknown identifiers too (no account-existence signal), a correct sign-in clears it, and "Forgot password" is never blocked.
- **One-time tokens in logs.** Access logs no longer contain `?token=` (email links) or `?sig=` (photo links).
- **Workers no longer receive the citizen's email, mobile number or account id.** The worker screens never used them; the authority still sees them.
- **API answers send `Cache-Control: no-store`** (names, phones and complaints must not stay in a shared computer's cache).
- **Production start-up checks** also refuse `CORS_ORIGIN=*` and non-https `APP_URL` / `API_URL` (links in emails carry one-time tokens); `localhost` stays allowed for testing.
- **Profile name** follows the same strict rule as sign-up (letters, spaces, `. ' -`).
- **Malformed JSON** gets a plain 400 instead of the parser's internal message.
- **Content-Security-Policy is now built in.** `npm run build` writes the policy (script-src without inline scripts or `eval`, `object-src 'none'`, `base-uri`, `form-action`) into `dist/index.html`, so it works on hosts that cannot set headers (see `F11/csp.js`, switch off with `VITE_CSP=off`). The Hugging Face file hosts (`*.hf.co`) were missing from the example headers and are now included.

**Still open (could not be done offline, or too large to change safely)**
- **Run `npm audit` in `Backend/` and `F11/` before release** (no network was available here). Known from the lock file: `protobufjs 6.11.6` (pulled in by the photo-AI library `@xenova/transformers` → `onnxruntime-web`) is listed in 2026 advisories (prototype-pollution class, fixed in 7.5.6 / 8.0.2). Nothing in this app builds protobuf messages from user input, so the practical risk is low, but test an `overrides` entry for `protobufjs` and the photo check before you ship.
- **Login tokens still live in `localStorage`.** The CSP above removes the usual way to steal one. Moving to `HttpOnly` cookies + CSRF protection touches all three portals and the API, and should be done together with a browser test run.
- The login lock and rate limits are kept in memory (one API process). With several servers use a shared store such as Redis.
- Anyone can still deliberately lock a known account for 15 minutes by typing wrong passwords (the owner can use "Forgot password"). Raise `LOGIN_MAX_FAILURES` if that worries you more than guessing.
