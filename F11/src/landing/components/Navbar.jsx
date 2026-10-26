import { useCallback, useEffect, useRef, useState } from "react";
import civicLogo from "../assets/civic-logo.png";

const LINKS = [
  { id: "home", label: "Home" },
  { id: "roles", label: "Roles" },
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "about", label: "About Us" },
];

// Below this width the links no longer fit in one row, so they move into the
// hamburger menu. Keep in step with the 860px breakpoint in styles/shell.css.
const MENU_QUERY = "(max-width: 860px)";
const MENU_ID = "primary-nav";

/**
 * Landing navbar.
 *   page  "home" | "get-started" — which page is showing. The navbar stays
 *         mounted across both, so the bar never flickers when you switch.
 *
 * Wide screens: brand, five links and a Get Started button in one row.
 * Narrow screens: brand + three-bar button; the links open as a panel under the bar
 * (while closed the panel is visibility:hidden, so it is out of the tab order too).
 */
function Navbar({ page = "home" }) {
  const [spyId, setSpyId] = useState(null);
  const [open, setOpen] = useState(false);
  const bar = useRef(null);
  const toggle = useRef(null);
  const panel = useRef(null);

  // The highlight only means something on the home page; derive it instead of resetting state.
  const activeId = page === "home" ? spyId : null;

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) toggle.current?.focus();
  }, []);

  // Highlight the link of the section in the middle of the screen (re-attached whenever the home page comes back).
  useEffect(() => {
    if (page !== "home") return undefined;
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean);
    if (sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setSpyId(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [page]);

  // Reading-progress line under the navbar.
  useEffect(() => {
    const onScroll = () => {
      if (!bar.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.current.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [page]);

  // While the menu is open: lock page scroll, close on Escape / hash change / growing past the breakpoint,
  // and keep Tab inside the bar + menu.
  useEffect(() => {
    if (!open) return undefined;

    const root = document.documentElement;
    root.classList.add("nav-open");

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== "Tab") return;
      const items = [toggle.current, ...(panel.current?.querySelectorAll("a[href]") ?? [])].filter(Boolean);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onHash = () => close();
    const mq = window.matchMedia(MENU_QUERY);
    const onMq = (e) => { if (!e.matches) close(); };

    document.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    mq.addEventListener("change", onMq);

    return () => {
      root.classList.remove("nav-open");
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
      mq.removeEventListener("change", onMq);
    };
  }, [open, close]);

  return (
    <>
      <nav className={`navbar${open ? " navbar--open" : ""}`} aria-label="Main">
        <a href="#home" className="navbar-brand" onClick={() => close()}>
          <img src={civicLogo} alt="CivicConnect Logo" width="50" height="50" />
          <span>
            Civic<span>Connect</span>
          </span>
        </a>

        <ul className="nav-links" id={MENU_ID} ref={panel}>
          {LINKS.map((l, i) => (
            <li key={l.id} style={{ "--i": i }}>
              <a
                href={`#${l.id}`}
                className={activeId === l.id ? "active" : ""}
                aria-current={activeId === l.id ? "location" : undefined}
                onClick={() => close()}
              >
                {l.label}
              </a>
            </li>
          ))}
          {/* Phones: the call to action sits at the bottom of the menu (the bar is too narrow for it) */}
          <li className="nav-links__cta" style={{ "--i": LINKS.length }}>
            <a
              href="#get-started"
              className="nav-button"
              aria-current={page === "get-started" ? "page" : undefined}
              onClick={() => close()}
            >
              Get Started
            </a>
          </li>
        </ul>

        <a
          href="#get-started"
          className="nav-button nav-button--bar"
          aria-current={page === "get-started" ? "page" : undefined}
          data-magnetic
          onClick={() => close()}
        >
          Get Started
        </a>

        <button
          type="button"
          ref={toggle}
          className="nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav-toggle__bars" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>

        <div className="scroll-progress" ref={bar} aria-hidden="true" />
      </nav>

      {/* Dims the page behind the open menu; tapping it closes the menu. */}
      {open && <div className="nav-scrim" onClick={() => close()} aria-hidden="true" />}
    </>
  );
}

export default Navbar;
