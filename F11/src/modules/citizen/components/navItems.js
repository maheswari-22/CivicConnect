import { LayoutDashboard, CirclePlus, ClipboardList, Bell, UserRound } from 'lucide-react';

// Shared by the desktop sidebar and the mobile drawer so they never drift apart.
// "Report Issue" sits right under the Dashboard so citizens can file a complaint
// from anywhere; the bottom bar also keeps its centre shortcut button.
export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/report', label: 'Report Issue', icon: CirclePlus },
  { to: '/complaints', label: 'My Complaints', icon: ClipboardList },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserRound },
];
