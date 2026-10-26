# CivicConnect v23 – mobile responsive + page flow

## Landing page
- **Hamburger menu** (three bars -> X) below 860px. Links open as a panel under the bar with a dimmed page behind it.
  Closes on link tap, outside tap, Escape, hash change or widening the window. Page scroll is locked while open,
  focus stays inside, and the toggle has aria-expanded / aria-controls.
  Phones (<=560px): the Get Started button moves into the menu. Tablets keep it in the bar.
- Navbar + footer now stay mounted when switching Landing <-> Get Started (no flicker); the content cross-fades.
  Page switches jump instantly instead of running a long smooth scroll; scroll-spy keeps working after a round trip.
- Fixed the About-section orbit that made the page wider than the screen on phones.
- Quieter hero card stack and evenly stacked closing buttons on phones.

## Page flow (whole app)
- `src/shared/pageFlow.js` + `pageFlow.css`: moving between the landing site and a portal fades out/in.
  Only same-site links are ever followed; the fade is removed again on bfcache restore (Back button).
- `BootSplash` replaces the blank screen while a portal's code downloads.

## Portals
- Authority complaint page: long e-mails/names no longer stretch the page.
- Complaint cards: ID never breaks across lines; chips wrap below it.
- Authority Complaints / Pending / Completed: stat cards are 2 per row on phones.
- Worker pages: consistent top/side spacing (phone, tablet, desktop); EMERGENCY badge no longer covers the priority chip.
- Worker dashboard: list rows keyed by task id (was the category, so duplicates collided).
- Authority alert only vibrates once the browser allows it.

## Security review (what was checked)
- Frontend: no innerHTML / dangerouslySetInnerHTML / eval / document.write; no input-driven redirects; external link has
  rel="noopener"; no secrets committed. New code is CSP-compatible (no inline scripts).
- Backend: SQL is parameterised (dynamic column names are whitelisted); JWT algorithm pinned, bcrypt cost 12, token revocation;
  role + ownership checks on every route; uploads type-checked by bytes, re-encoded, random names, signed expiring URLs;
  helmet, CORS allow-list, rate limits.
- No code changes were needed in the backend.
- Known, unchanged: login tokens live in localStorage (an XSS bug anywhere could read them; mitigated by the CSP and by
  having no HTML-injection sinks). Moving to httpOnly cookies would be a larger change.
- Not done: `npm audit` (needs network) – run it before release.
