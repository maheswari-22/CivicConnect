import { useLayoutEffect } from "react";

/* ==========================================================================
   PortalMotion — gives the Citizen, Authority and Worker portals the same
   scroll-reveal the landing page has (rise + un-blur, staggered).

   It needs no changes inside the pages: it finds cards, section headings and
   lists by class name, hides them just before the first paint, and reveals
   them as they scroll into view. New content (a page change, a list that
   refreshes) is picked up by a MutationObserver.

   The state lives in a data-rv attribute, not a class or inline style, because
   React owns className and style and would wipe them on a re-render; it never
   removes attributes it did not render. motion.css turns it into a one-shot
   animation, so hover and tilt transforms stay free afterwards.
   ========================================================================== */

const TARGETS = [
  // headings and intro blocks
  ".authority-hero", ".complaints-header", ".completed-header", ".pending-header", ".tracking-header",
  ".workers-header", ".aw-header", ".assigned-header", ".history-header", ".task-details-header",
  ".section-header", ".dashboard__section-head", ".history__head", ".track__head", ".report__head",
  // cards and tiles
  ".stat-card", ".cc-stat", ".dashboard-card", ".overview-card", ".progress-card", ".quick-action-card", ".quick-card",
  ".complaints-summary-card", ".completed-summary-card", ".pending-summary-card", ".tracking-summary-card",
  ".complaint-card", ".completed-card", ".pending-card", ".tracking-card", ".assigned-task-card", ".history-card",
  ".workers-card", ".aw-card", ".tracking-filter-card", ".task-details-image-card", ".task-details-info-card",
  ".track__timeline-card", ".track__photos-card", ".track__summary", ".category-card", ".report__card",
  ".notif-card", ".cc-notify__panel", ".cc-profile__card", ".civic-scene__card",
  // (the red alert bars are deliberately not here: they must appear at once)
  ".workers-banner",
].join(",");

// Never animate things that live in overlays, or that another library already animates.
const SKIP = "[role='dialog'], dialog, .modal, .cc-dialog, .photo-lightbox, .cc-sidebar, nav";

export default function PortalMotion() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return undefined;
    root.setAttribute("data-motion", "on");

    const reveal = (el, index) => {
      el.style.setProperty("--d", `${Math.min(index, 9) * 70}ms`);
      el.setAttribute("data-rv", "in");
    };

    const io = new IntersectionObserver(
      (entries) => {
        let n = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target, n);
          n += 1;
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -24px 0px" }
    );

    // The portals redraw their pages when fresh data arrives (DataGate). Only content that appears right after a page change
    // is animated; a background refresh must not replay every card.
    let lastPath = window.location.pathname;
    let animateUntil = performance.now() + 4000;
    const animating = () => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        animateUntil = performance.now() + 4000;
      }
      return performance.now() < animateUntil;
    };

    const prime = (el) => {
      if (el.hasAttribute("data-rv") || el.closest(SKIP)) return;
      if (!animating()) {
        el.setAttribute("data-rv", "done");
        return;
      }
      // framer-motion (the Worker portal) already animates these: do not fight it.
      if (el.style.opacity !== "" || el.style.transform) return;
      el.setAttribute("data-rv", "wait");
      io.observe(el);
    };

    const scan = (node) => {
      if (node.nodeType !== 1) return;
      if (node.matches?.(TARGETS)) prime(node);
      node.querySelectorAll?.(TARGETS).forEach(prime);
    };

    scan(document.body);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) m.addedNodes.forEach(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety net: anything still hidden after a few seconds is shown (a card that never intersects must not stay invisible).
    const rescue = window.setInterval(() => {
      document.querySelectorAll("[data-rv='wait']").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) reveal(el, 0);
      });
    }, 2500);

    return () => {
      window.clearInterval(rescue);
      mo.disconnect();
      io.disconnect();
      root.removeAttribute("data-motion");
      document.querySelectorAll("[data-rv]").forEach((el) => el.removeAttribute("data-rv"));
    };
  }, []);
  return null;
}
