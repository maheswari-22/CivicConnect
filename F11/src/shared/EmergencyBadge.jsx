import { TriangleAlert } from "lucide-react";
import "./severity.css";

/** A pulsing red badge for complaints the citizen marked as an emergency. */
export default function EmergencyBadge({ children = "Emergency", size = 13, className = "" }) {
  return (
    <span className={`cc-emergency ${className}`.trim()} role="status">
      <TriangleAlert size={size} aria-hidden="true" />
      {children}
    </span>
  );
}
