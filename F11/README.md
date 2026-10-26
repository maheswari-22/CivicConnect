# CivicConnect (integrated)

One Vite + React app containing the landing page and the Citizen, Authority and Worker portals.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Routes

| URL            | What loads                                   |
| -------------- | -------------------------------------------- |
| `/`            | Landing page (choose a role via Get Started) |
| `/citizen`     | Citizen sign-in → welcome → dashboard        |
| `/authority`   | Authority sign-in → welcome → dashboard      |
| `/worker`      | Worker sign-in → welcome → dashboard         |

Each portal is code-split and served under its own base path. Moving between the landing page
and a portal is a full page navigation, which keeps each portal's global CSS isolated.
When hosting the build, configure the server to fall back to `index.html` for unknown paths.

## Structure

- `src/shared/` — the single authentication page (`AuthPage`), welcome intro (`WelcomeIntro`),
  sidebar collapse button (`SidebarToggle`) and role copy (`roles.js`). Identical in all portals.
- `src/modules/<portal>/authAdapter.js` (or `CitizenApp.jsx`) — each portal's own account logic,
  plugged into the shared page.
- `src/landing/` — landing page.

## Backend

This app needs the CivicConnect API (see the `Backend/` folder and the root README). Set `VITE_API_URL`
in `.env` (default `http://localhost:4000`). Demo logins:

- Citizen: `citizen@civicconnect.com` / `citizen@1234`
- Authority: Employee ID `AUTH-001` / `authority@1234`
- Worker: `wk-101` / `worker@1234`
- Ongole demo: citizen `citizen.ongole@civicconnect.com`, authority `AUTH-003`, worker `wk-301` (same passwords as above)
