import PortalSidebar from '../../../../shared/PortalSidebar.jsx';
import { initialsOf } from '../../../../shared/initials.js';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../navItems';

/** Citizen desktop sidebar: the shared portal sidebar with the citizen links. */
export default function Sidebar({ unread = 0, onLogout }) {
  const { user } = useAuth();
  const name = user?.name || 'Citizen';

  const links = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.to === '/alerts' ? unread : 0,
  }));

  return (
    <PortalSidebar
      portalLabel="Citizen Portal"
      links={links}
      user={{ name, sub: user?.mobile, initials: initialsOf(name, 'C'), to: '/profile' }}
      onLogout={onLogout}
    />
  );
}
