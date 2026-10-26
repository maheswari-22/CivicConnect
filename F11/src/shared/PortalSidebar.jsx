import { NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";

import SidebarToggle from "./SidebarToggle.jsx";
import useSidebarCollapsed from "./useSidebarCollapsed.js";
import "./portalSidebar.css";

/**
 * The one desktop sidebar used by Citizen, Authority and Worker.
 *
 *   portalLabel  "Citizen Portal" | "Authority Portal" | "Worker Portal"
 *   links        [{ to, label, icon, badge? }]
 *   user         { name, sub, initials, to }   footer card (links to the profile)
 *   onLogout     opens the portal's logout dialog
 *
 * Logo placement, spacing, menu label, user card and logout are identical in
 * every portal; only the label, links and user change. Hidden below 960px,
 * where the shared hamburger drawer takes over (see MobileNav).
 */
export default function PortalSidebar({ portalLabel, links, user, onLogout }) {
  const [collapsed, toggle] = useSidebarCollapsed();

  return (
    <aside className={`cc-sidebar${collapsed ? " cc-sidebar--collapsed" : ""}`}>
      <div className="cc-sidebar__brand">
        <img src="/civic-logo.png" alt="CivicConnect" className="cc-sidebar__logo" />
        <img
          src="/images/logo-icon-96.png"
          alt="CivicConnect"
          className="cc-sidebar__mark"
          width="44"
          height="44"
        />
        <span className="cc-sidebar__tag">{portalLabel}</span>
      </div>

      <SidebarToggle collapsed={collapsed} onToggle={toggle} />

      <nav className="cc-sidebar__nav" aria-label="Primary">
        <p className="cc-sidebar__label">Main Menu</p>

        {links.map(({ to, label, icon: LinkIcon, badge, urgent }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `cc-sidebar__link${isActive ? " cc-sidebar__link--active" : ""}`
            }
          >
            <LinkIcon size={20} strokeWidth={2} aria-hidden="true" />
            <span className="cc-sidebar__text">{label}</span>
            {badge > 0 && <span className={`cc-sidebar__badge${urgent ? " cc-sidebar__badge--urgent" : ""}`}>{badge > 9 ? "9+" : badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="cc-sidebar__footer">
        <NavLink to={user.to || "/profile"} className="cc-sidebar__user" title={collapsed ? user.name : undefined}>
          <span className="cc-sidebar__avatar" aria-hidden="true">{user.initials}</span>
          <span className="cc-sidebar__user-info">
            <strong>{user.name}</strong>
            {user.sub && <small>{user.sub}</small>}
          </span>
          <span className="cc-sidebar__dot" aria-hidden="true" />
        </NavLink>

        <button
          type="button"
          className="cc-sidebar__logout"
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={20} strokeWidth={2} aria-hidden="true" />
          <span className="cc-sidebar__text">Logout</span>
        </button>
      </div>
    </aside>
  );
}
