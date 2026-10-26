import { useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, X } from "lucide-react";
import "./mobileNav.css";

/**
 * Shared mobile navigation for all three portals (Citizen, Authority, Worker).
 *
 * Below 960px the desktop sidebar is hidden and these pieces take over:
 *   <MobileMenuButton> — the three-line (hamburger) button
 *   <MobileTopBar>     — sticky header: menu button, logo, optional right slot
 *   <MobileDrawer>     — slide-in navigation panel opened by the button
 *   <MobileBottomNav>  — floating footer navigation (same look as the Citizen bar)
 */

export const DRAWER_ID = "cc-mobile-drawer";
const LOGO_SRC = "/images/logo-icon-96.png";

export function MobileMenuButton({ onClick, open = false }) {
  return (
    <button
      type="button"
      className="cc-menu-btn"
      onClick={onClick}
      aria-label="Open navigation menu"
      aria-expanded={open}
      aria-controls={DRAWER_ID}
    >
      <Menu size={22} strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}

export function MobileTopBar({ onMenu, menuOpen, homeTo, children }) {
  // Fixed bar → push the page down by its height (CSS reads this class).
  useEffect(() => {
    document.body.classList.add("cc-has-topbar");
    return () => document.body.classList.remove("cc-has-topbar");
  }, []);

  return (
    <header className="cc-topbar">
      <MobileMenuButton onClick={onMenu} open={menuOpen} />
      <Link className="cc-topbar__brand" to={homeTo} aria-label="CivicConnect home">
        <img src={LOGO_SRC} alt="" width="38" height="38" />
        <span className="cc-topbar__word">
          CIVIC<span>CONNECT</span>
        </span>
      </Link>
      <div className="cc-topbar__right">{children}</div>
    </header>
  );
}

export function MobileDrawer({ open, onClose, items, user, onLogout, portalLabel }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cc-drawer-root">
      <div className="cc-drawer__scrim" onClick={onClose} aria-hidden="true" />
      <aside
        id={DRAWER_ID}
        className="cc-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${portalLabel} navigation`}
      >
        <div className="cc-drawer__head">
          <div className="cc-drawer__brand">
            <img src={LOGO_SRC} alt="" width="40" height="40" />
            <div>
              <strong>CivicConnect</strong>
              <span>{portalLabel}</span>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="cc-drawer__close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="cc-drawer__nav" aria-label="Primary">
          {items.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `cc-drawer__link${isActive ? " cc-drawer__link--active" : ""}`
              }
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
              {badge > 0 && <span className="cc-drawer__badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="cc-drawer__foot">
          {user && (
            <div className="cc-drawer__user">
              <span className="cc-drawer__avatar" aria-hidden="true">
                {user.initial}
              </span>
              <div>
                <strong>{user.name}</strong>
                {user.sub && <span>{user.sub}</span>}
              </div>
            </div>
          )}
          <button
            type="button"
            className="cc-drawer__logout"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>
    </div>
  );
}

/**
 * Floating footer navigation for phones and tablets (< 960px) — the same pill
 * bar the Citizen portal uses, so all three portals navigate alike. Pass the
 * 4–5 most-used links; the drawer still lists everything.
 */
export function MobileBottomNav({ items }) {
  // Reserve room under the page so nothing hides behind the floating bar.
  useEffect(() => {
    document.body.classList.add("cc-has-bottomnav");
    return () => document.body.classList.remove("cc-has-bottomnav");
  }, []);

  return (
    <nav className="cc-bottomnav" aria-label="Primary">
      <div
        className="cc-bottomnav__inner"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `cc-bottomnav__item${isActive ? " cc-bottomnav__item--active" : ""}`
            }
          >
            <span className="cc-bottomnav__icon">
              <Icon size={20} aria-hidden="true" />
              {badge > 0 && <span className="cc-bottomnav__dot" aria-hidden="true" />}
            </span>
            <span className="cc-bottomnav__label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
