import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Clock, Bell, UserRound } from "lucide-react";

import PortalSidebar from "../../../shared/PortalSidebar.jsx";
import { MobileBottomNav, MobileDrawer, MobileTopBar } from "../../../shared/MobileNav.jsx";
import { LogoutDialog } from "../../../shared/AccountDialogs.jsx";
import { initialsOf } from "../../../shared/initials.js";
import useNotifications from "../../../shared/useNotifications.js";
import { getWorker, workerLogout } from "../authAdapter.js";
import { WORKER_READ_KEY, buildWorkerNotifications } from "../data/notifications.js";

const LINKS = [
  { label: "Home", to: "/dashboard", icon: LayoutDashboard },
  { label: "Tasks", to: "/assigned-tasks", icon: ClipboardList },
  { label: "History", to: "/history", icon: Clock },
  { label: "Notifications", to: "/notifications", icon: Bell },
  { label: "Profile", to: "/profile", icon: UserRound },
];

/* Footer bar on phones: same links, with the short label the other portals use. */
const BOTTOM_LINKS = LINKS.map((link) =>
  link.to === "/notifications" ? { ...link, label: "Alerts" } : link
);

/* Adds the unread count to the Notifications entry. */
const withBadge = (links, unread) =>
  links.map((link) => (link.to === "/notifications" ? { ...link, badge: unread } : link));

function Sidebar() {
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const { unread } = useNotifications(WORKER_READ_KEY, buildWorkerNotifications);

  const links = withBadge(LINKS, unread);
  const bottomLinks = withBadge(BOTTOM_LINKS, unread);

  const worker = getWorker(); // re-read each render so a profile edit shows immediately
  const initials = initialsOf(worker.name, "W");

  const confirmLogout = () => {
    workerLogout();
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
        portalLabel="Worker Portal"
        items={links}
        user={{ name: worker.name, sub: "Active", initial: initials }}
        onLogout={() => setShowLogout(true)}
      />
      <MobileBottomNav items={bottomLinks} />

      {/* Desktop: the one shared sidebar */}
      <PortalSidebar
        portalLabel="Worker Portal"
        links={links}
        user={{ name: worker.name, sub: "Active", initials, to: "/profile" }}
        onLogout={() => setShowLogout(true)}
      />

      {showLogout && (
        <LogoutDialog
          portalLabel="Worker Portal"
          onCancel={() => setShowLogout(false)}
          onConfirm={confirmLogout}
        />
      )}
    </>
  );
}

export default Sidebar;
