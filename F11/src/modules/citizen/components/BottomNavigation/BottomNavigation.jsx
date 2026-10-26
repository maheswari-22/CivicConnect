import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Bell, UserRound, Plus } from 'lucide-react';
import './BottomNavigation.css';

const ITEMS = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/complaints', label: 'Complaints', icon: ClipboardList },
  { to: '/report', label: 'Report', icon: Plus, primary: true },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export default function BottomNavigation({ unread = 0 }) {
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav hide-desktop" aria-label="Primary">
      <div className="bottom-nav__inner">
        {ITEMS.map((item) => {
          if (item.primary) {
            return (
              <button
                key={item.to}
                className="bottom-nav__fab"
                onClick={() => navigate(item.to)}
                aria-label={item.label}
              >
                <item.icon size={28} />
              </button>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
            >
              <span className="bottom-nav__icon-wrap">
                <item.icon size={20} />
                {item.to === '/alerts' && unread > 0 && <span className="bottom-nav__dot" />}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
