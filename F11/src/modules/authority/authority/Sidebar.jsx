import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  CircleCheckBig,
  MapPin,
  Bell,
  Users,
  UserRound,
} from "lucide-react";

import PortalSidebar from "../../../shared/PortalSidebar.jsx";
import { MobileBottomNav, MobileDrawer, MobileTopBar } from "../../../shared/MobileNav.jsx";
import { LogoutDialog } from "../../../shared/AccountDialogs.jsx";
import { initialsOf } from "../../../shared/initials.js";
import useNotifications from "../../../shared/useNotifications.js";
import { authorityName, authorityLogout } from "../authAdapter.js";
import { AUTHORITY_READ_KEY, buildAuthorityNotifications } from "../data/notifications";
import { useAttention } from "../data/attention";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/complaints", label: "Complaints", icon: ClipboardList },
  { to: "/pending", label: "Pending", icon: Clock },
  { to: "/completed", label: "Completed", icon: CircleCheckBig },
  { to: "/workers", label: "Workers", icon: Users },
  { to: "/tracking", label: "Tracking", icon: MapPin },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserRound },
];

/* Footer bar on phones / tablets: the five most-used pages (the drawer lists all seven). */
const BOTTOM_LINKS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/complaints", label: "Complaints", icon: ClipboardList },
  { to: "/pending", label: "Pending", icon: Clock },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserRound },
];

/* Adds the unread count to the Notifications entry. */
const withBadge = (links, unread, urgent) =>
  links.map((link) => {
    if (link.to === "/notifications") return { ...link, badge: unread };
    // Open emergencies and overdue complaints pulse red on the Complaints entry.
    if (link.to === "/complaints" && urgent > 0) return { ...link, badge: urgent, urgent: true };
    return link;
  });

function Sidebar() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const { unread } = useNotifications(AUTHORITY_READ_KEY, buildAuthorityNotifications);

  const { count: urgent } = useAttention();
  const links = withBadge(LINKS, unread, urgent);
  const bottomLinks = withBadge(BOTTOM_LINKS, unread, urgent);

  const name = authorityName();
  const initials = initialsOf(name, "AU");

  const handleLogout = () => {
    authorityLogout();
    setShowLogout(false);
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* Mobile / tablet: top bar + hamburger drawer + footer bar (< 960px) */}
      <MobileTopBar onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} homeTo="/dashboard">
        <Link to="/profile" className="cc-topbar__avatar" aria-label="Profile">
          {initials}
        </Link>
      </MobileTopBar>
      <MobileDrawer
        open={menuOpen}
        onClose={closeMenu}
        portalLabel="Authority Portal"
        items={links}
        user={{ name, sub: "Civic Authority", initial: initials }}
        onLogout={() => setShowLogout(true)}
      />
      <MobileBottomNav items={bottomLinks} />

      {/* Desktop: the one shared sidebar */}
      <PortalSidebar
        portalLabel="Authority Portal"
        links={links}
        user={{ name, sub: "Civic Authority", initials, to: "/profile" }}
        onLogout={() => setShowLogout(true)}
      />

      {showLogout && (
        <LogoutDialog
          portalLabel="Authority Portal"
          onCancel={() => setShowLogout(false)}
          onConfirm={handleLogout}
        />
      )}
    </>
  );
}

export default Sidebar;
