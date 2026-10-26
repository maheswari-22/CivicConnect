import { useState } from "react";
import { Bell, BellOff, CheckCheck, ChevronRight } from "lucide-react";

import { PortalMain } from "./PortalPage.jsx";
import "./notificationsPage.css";

/**
 * The Notifications page body, shared by the Authority and Worker portals so
 * both look and behave the same. The page wrapper supplies the sidebar:
 *
 *   <Sidebar />
 *   <NotificationsView eyebrow="..." items unread onOpen onMarkAllRead />
 *
 *   items  [{ id, title, text, time, read, icon, tone }]
 *   onOpen(item) is called when a notification is clicked (the page marks it
 *   read and navigates).
 */
export default function NotificationsView({
  eyebrow,
  subtitle,
  items,
  unread,
  onOpen,
  onMarkAllRead,
  emptyText = "New updates will appear here.",
}) {
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const shown = filter === "unread" ? items.filter((n) => !n.read) : items;

  return (
    <PortalMain>
      <header className="cc-page-head">
        <div className="cc-page-head__text">
          <p className="cc-page-head__eyebrow">{eyebrow}</p>
          <h1>Notifications</h1>
          <p className="cc-page-head__subtitle">
            {unread > 0
              ? `${unread} unread update${unread > 1 ? "s" : ""}. ${subtitle}`
              : `You’re all caught up. ${subtitle}`}
          </p>
        </div>
      </header>

      <div className="cc-notices__bar">
        <div className="cc-notices__tabs" role="tablist" aria-label="Filter notifications">
          <button
            type="button"
            role="tab"
            aria-selected={filter === "all"}
            className={`cc-notices__tab${filter === "all" ? " cc-notices__tab--on" : ""}`}
            onClick={() => setFilter("all")}
          >
            All <span>{items.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === "unread"}
            className={`cc-notices__tab${filter === "unread" ? " cc-notices__tab--on" : ""}`}
            onClick={() => setFilter("unread")}
          >
            Unread <span>{unread}</span>
          </button>
        </div>

        <button
          type="button"
          className="cc-notices__all"
          onClick={onMarkAllRead}
          disabled={unread === 0}
        >
          <CheckCheck size={16} aria-hidden="true" />
          Mark all read
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="cc-notices__empty">
          <span aria-hidden="true">
            <BellOff size={26} />
          </span>
          <strong>{filter === "unread" ? "No unread notifications" : "No notifications yet"}</strong>
          <p>{filter === "unread" ? "You’ve read everything." : emptyText}</p>
        </div>
      ) : (
        <ul className="cc-notices__list">
          {shown.map((n) => {
            const NoticeIcon = n.icon || Bell;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`cc-notice cc-notice--${n.tone || "wine"}${n.read ? "" : " cc-notice--unread"}`}
                  onClick={() => onOpen(n)}
                >
                  <span className="cc-notice__icon" aria-hidden="true">
                    <NoticeIcon size={20} />
                  </span>
                  <span className="cc-notice__body">
                    <strong>{n.title}</strong>
                    <span>{n.text}</span>
                    <small>{n.time}</small>
                  </span>
                  {!n.read && <span className="cc-notice__pip" aria-label="Unread" />}
                  {n.to && <ChevronRight className="cc-notice__go" size={18} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </PortalMain>
  );
}
