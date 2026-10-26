import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Check,
  ChevronDown,
  Clipboard,
  Clock,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  MapPinned,
  RefreshCw,
  Search,
  UserCheck,
  UserRound,
  Users,
  BarChart3,
  X,
} from "lucide-react";

/*
  Authority icons now come from lucide-react, the same set the Citizen and
  Worker portals and the landing page use, so every icon across CivicConnect
  shares one stroke, corner style and weight.
*/
const ICONS = {
  dashboard: LayoutDashboard,
  complaints: FileText,
  worker: UserCheck,
  pending: Clock,
  tracking: MapPinned,
  completed: CheckCircle2,
  profile: UserRound,
  logout: LogOut,
  bell: Bell,
  lock: Lock,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  clipboard: Clipboard,
  check: Check,
  clock: Clock,
  refresh: RefreshCw,
  search: Search,
  mapPin: MapPin,
  calendar: Calendar,
  alert: AlertTriangle,
  chart: BarChart3,
  users: Users,
  x: X,
  chevronDown: ChevronDown,
};

export default function Icon({ name, size = 20, strokeWidth = 2, className = "" }) {
  const Glyph = ICONS[name] || LayoutDashboard;
  return <Glyph size={size} strokeWidth={strokeWidth} className={className} aria-hidden="true" />;
}
