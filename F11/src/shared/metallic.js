/*
  Pointer effects shared by the whole site. One delegated listener, mouse only
  (touch screens keep the static metal finish and never pay for it).

    --mx / --my  cursor position inside a metallic card (drives the specular light)
    --rx / --ry  gentle 3D tilt, only on elements marked data-tilt
    --tx / --ty  magnetic pull, only on elements marked data-magnetic

  The values are written with style.setProperty, which React never overwrites.
*/
const METAL =
  ".metal, .metal-dark, .assigned-task-card, .aw-card, .cc-profile__card, .cc-stat, " +
  ".cc-notify__panel, .complaint-card, .complaints-summary-card, .completed-summary-card, " +
  ".pending-summary-card, .history-card, .overview-card, .progress-card, .quick-action-card, " +
  ".stat-card, .task-details-image-card, .task-details-info-card, .tracking-filter-card, " +
  ".workers-card, .category-card, .report__card, .track__timeline-card, .track__photos-card";

const TILT_DEG = 7;
const PULL_X = 0.16;
const PULL_Y = 0.26;

export function installMetallic() {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e) => {
    if (e.pointerType !== "mouse" || !e.target.closest) return;

    const card = e.target.closest(METAL);
    if (card) {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      card.style.setProperty("--mx", `${x}px`);
      card.style.setProperty("--my", `${y}px`);
      if (!reduce && card.hasAttribute("data-tilt")) {
        card.style.setProperty("--ry", `${(x / r.width - 0.5) * TILT_DEG}deg`);
        card.style.setProperty("--rx", `${-(y / r.height - 0.5) * TILT_DEG}deg`);
      }
    }

    const btn = e.target.closest("[data-magnetic]");
    if (btn && !reduce) {
      const q = btn.getBoundingClientRect();
      btn.style.setProperty("--tx", `${(e.clientX - q.left - q.width / 2) * PULL_X}px`);
      btn.style.setProperty("--ty", `${(e.clientY - q.top - q.height / 2) * PULL_Y}px`);
    }
  };

  const onOut = (e) => {
    if (!e.target.closest) return;
    const card = e.target.closest("[data-tilt]");
    if (card && !card.contains(e.relatedTarget)) {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    }
    const btn = e.target.closest("[data-magnetic]");
    if (btn && !btn.contains(e.relatedTarget)) {
      btn.style.setProperty("--tx", "0px");
      btn.style.setProperty("--ty", "0px");
    }
  };

  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerout", onOut, { passive: true });
  return () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerout", onOut);
  };
}
