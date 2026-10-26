# Production security headers for the frontend

The API already sets strict headers (helmet). The **frontend** is static files, so its headers come from whatever serves it
(nginx, Netlify, Cloudflare Pages, Vercel...). A Content-Security-Policy is the main protection against a script being injected into a page,
which matters here because the login token lives in the browser. Copy the matching file below, replace `https://api.example.com` with your
real API address (the same value as `VITE_API_URL`), and deploy.

| Host | File |
|------|------|
| nginx | `nginx.conf.example` |
| Netlify / Cloudflare Pages | `_headers.example` (rename to `_headers` and put it in `public/`) |

What the policy allows, and why:

- `script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net` - the app's own scripts; WebAssembly for the AI model; the model runtime's `.wasm` file comes from jsDelivr.
- `connect-src` - your API; Hugging Face (`huggingface.co` and the `hf.co` file hosts it redirects to; the zero-shot model download); Google storage (the MobileNet fallback model); jsDelivr.
- `img-src` - your API (photos), `blob:`/`data:` (the photo preview), OpenStreetMap tiles (the location map).
- `style-src 'unsafe-inline'` - React and Leaflet set inline styles. Scripts have no `unsafe-inline`.
- `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` - no embedding in other sites, no plug-ins.

Test it: open the site with the browser's developer console open. A blocked request shows as "Refused to ... because it violates the
Content Security Policy"; add that host to the matching directive. If you switch the AI engine (`VITE_AI_ENGINE`) or the model address
(`VITE_CLIP_MODEL`, `VITE_CIVIC_MODEL_URL`), update `connect-src` too.

**Built-in policy (v24).** `npm run build` now also writes this policy into `dist/index.html` as a `<meta>` tag (see `F11/csp.js`; set
`VITE_CSP=off` to disable it), so a host that cannot send headers is still protected. The header is still worth setting where you can:
it adds `frame-ancestors 'none'` (clickjacking protection), which a `<meta>` tag cannot carry. If you host a model yourself
(`VITE_CLIP_MODEL`, `VITE_CIVIC_MODEL_URL` with a full https address), its address is added to `connect-src` automatically.
