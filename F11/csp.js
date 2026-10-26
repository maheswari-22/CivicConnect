/* Content-Security-Policy for production builds.

   A CSP is the main protection against an injected script, which matters here because the login token lives in the
   browser. vite.config.js puts this policy into index.html as a <meta> tag for `npm run build`, so the protection is
   there even on a host that cannot set headers. If your host CAN set headers, use F11/deploy/ as well (the header adds
   frame-ancestors, which a <meta> tag cannot).  Pure function: tested in tests/csp.test.js. */

const origin = (url) => {
  try { return new URL(url).origin; } catch { return null; }
};

export function buildCsp({ apiUrl = 'http://localhost:4000', extraConnect = [] } = {}) {
  const api = origin(apiUrl);
  const extras = extraConnect.map(origin).filter(Boolean); // self-hosted model addresses (VITE_CLIP_MODEL, VITE_CIVIC_MODEL_URL)
  const list = (...items) => [...new Set(items.flat().filter(Boolean))].join(' ');
  return [
    "default-src 'self'",
    // The app's own scripts; WebAssembly for the on-device AI; the AI runtime's .wasm file comes from jsDelivr. No inline scripts, no eval.
    `script-src ${list("'self'", "'wasm-unsafe-eval'", 'https://cdn.jsdelivr.net')}`,
    // React and Leaflet set inline styles; Google Fonts for the typefaces.
    `style-src ${list("'self'", "'unsafe-inline'", 'https://fonts.googleapis.com')}`,
    `font-src ${list("'self'", 'https://fonts.gstatic.com')}`,
    // Photos come from the API; blob:/data: for the photo preview; OpenStreetMap tiles for the location map.
    `img-src ${list("'self'", 'data:', 'blob:', api, 'https://tile.openstreetmap.org', 'https://*.tile.openstreetmap.org')}`,
    // The API, and where the AI models download from (Hugging Face serves files through *.hf.co; MobileNet fallback from Google).
    `connect-src ${list("'self'", api, extras, 'https://huggingface.co', 'https://*.huggingface.co', 'https://hf.co', 'https://*.hf.co', 'https://cdn.jsdelivr.net', 'https://storage.googleapis.com', 'https://tfhub.dev', 'https://www.kaggle.com')}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
