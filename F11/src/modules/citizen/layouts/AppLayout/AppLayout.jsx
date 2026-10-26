import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/Sidebar';
import BottomNavigation from '../../components/BottomNavigation/BottomNavigation';
import { MobileDrawer, MobileTopBar } from '../../../../shared/MobileNav.jsx';
import { LogoutDialog } from '../../../../shared/AccountDialogs.jsx';
import { initialsOf } from '../../../../shared/initials.js';
import { NAV_ITEMS } from '../../components/navItems';
import { useAuth } from '../../context/AuthContext';
import { fetchNotifications } from '../../data/mockData';
import './AppLayout.css';

export default function AppLayout({ children }) {
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const name = user?.name || 'Citizen';
  const initials = initialsOf(name, 'C');

  useEffect(() => {
    let active = true;
    fetchNotifications().then((list) => {
      if (active) setUnread(list.filter((n) => !n.read).length);
    }).catch(() => {});
    return () => { active = false; };
  }, [location.pathname]);

  return (
    <div className="app-layout">
      {/* Phones / tablets: same top bar + drawer as the Authority and Worker portals */}
      <MobileTopBar onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} homeTo="/dashboard">
        <Link to="/profile" className="cc-topbar__avatar" aria-label="Profile">
          {initials}
        </Link>
      </MobileTopBar>

      {/* Desktop: the shared sidebar (collapse state lives in the shared hook) */}
      <Sidebar unread={unread} onLogout={() => setConfirmingLogout(true)} />

      <div className="app-layout__main">
        <main className="app-shell">{children}</main>
        <BottomNavigation unread={unread} />
      </div>

      <MobileDrawer
        open={menuOpen}
        onClose={closeMenu}
        portalLabel="Citizen Portal"
        items={NAV_ITEMS.map((item) => ({ ...item, badge: item.to === '/alerts' ? unread : 0 }))}
        user={{ name, sub: user?.mobile, initial: initials }}
        onLogout={() => setConfirmingLogout(true)}
      />

      {confirmingLogout && (
        <LogoutDialog
          portalLabel="Citizen Portal"
          onCancel={() => setConfirmingLogout(false)}
          onConfirm={() => {
            logout();
            navigate('/', { replace: true });
          }}
        />
      )}
    </div>
  );
}
