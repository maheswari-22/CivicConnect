import { Bell, UserRound } from "lucide-react";
import "./Topbar.css";

function Topbar() {
  return (
    <div className="topbar">

      <div className="topbar-left">
        <h2>Authority Dashboard</h2>
      </div>

      <div className="topbar-right">

        <div className="notification">
          <Bell size={18} aria-hidden="true" /> <span className="badge">3</span>
        </div>

        <div className="profile-info">
          <UserRound size={18} aria-hidden="true" /> Authority
        </div>

      </div>

    </div>
  );
}

export default Topbar;  