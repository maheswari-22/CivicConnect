import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "./sidebarToggle.css";

/**
 * Collapse / expand button used by every portal's sidebar, so the control
 * looks and behaves identically in Citizen, Authority and Worker.
 */
export default function SidebarToggle({ collapsed, onToggle }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? "Open sidebar" : "Close sidebar";

  return (
    <button
      type="button"
      className="cc-sidebar-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <Icon size={16} strokeWidth={2.25} />
    </button>
  );
}
