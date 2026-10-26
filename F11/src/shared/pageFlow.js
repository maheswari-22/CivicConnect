/* ==========================================================================
   Page flow: how the visitor moves between the landing site and the portals.

   The landing site and each portal (/citizen, /authority, /worker) are separate
   apps, so moving between them is a real page load. To keep that from feeling
   like a hard cut, the page fades out first (.is-leaving, see pageFlow.css) and
   the next app fades in (#root animation). Moves *inside* an app are left to
   that app's router and are not touched here.
   ========================================================================== */

const LEAVE_MS = 220;

const rootEl = () => document.documentElement;
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/** "/citizen/dashboard" -> "citizen";  "/" -> "" (the landing site). */
const appOf = (pathname) => pathname.split("/").filter(Boolean)[0] || "";

/** Fade the page out, then go to `url`. Only addresses on this same site are ever followed. */
export function leaveTo(url) {
  let target;
  try {
    target = new URL(url, window.location.href);
  } catch {
    return;
  }
  if (target.origin !== window.location.origin) return;

  if (reducedMotion()) {
    window.location.assign(target.href);
    return;
  }

  const el = rootEl();
  if (el.classList.contains("is-leaving")) return;
  el.classList.add("is-leaving");
  window.setTimeout(() => window.location.assign(target.href), LEAVE_MS);
  // If the navigation is cancelled or stalls, never leave the visitor looking at a blank page.
  window.setTimeout(() => el.classList.remove("is-leaving"), 5000);
}

/**
 * Click handler for the whole document: a plain left-click on a link that goes to a
 * different app (landing <-> portal) fades out first. Everything else (new-tab clicks,
 * downloads, #hash links, links inside the same app) behaves exactly as before.
 * Returns a function that removes the listeners.
 */
export function installLeaveTransition() {
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!link || link.target || link.hasAttribute("download")) return;

    const href = link.getAttribute("href") || "";
    if (!href.startsWith("/") || href.startsWith("//")) return; // only same-site paths

    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (url.origin !== window.location.origin) return;
    if (appOf(url.pathname) === appOf(window.location.pathname)) return;

    e.preventDefault();
    leaveTo(url.href);
  };

  // Coming back with the browser's Back button can restore the page exactly as it was left (faded out).
  const onShow = () => rootEl().classList.remove("is-leaving");

  document.addEventListener("click", onClick);
  window.addEventListener("pageshow", onShow);
  return () => {
    document.removeEventListener("click", onClick);
    window.removeEventListener("pageshow", onShow);
  };
}
