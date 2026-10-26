import { Children, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import "./portalPage.css";

/**
 * Page building blocks shared by the Citizen, Authority and Worker dashboards,
 * so the three look and line up identically.
 *
 *   <PortalMain>       full page shell (shifts with the sidebar) for pages
 *                      that do not already sit inside a layout
 *   <PageContainer>    the content column: same width and padding everywhere
 *   <PageHead>         eyebrow, greeting, subtitle and the notification bell
 *   <StatGrid>/<StatCard>  the summary cards under the welcome banner
 */

export function PortalMain({ children, className = "" }) {
  return (
    <main className={`cc-main ${className}`.trim()}>
      <PageContainer>{children}</PageContainer>
    </main>
  );
}

export function PageContainer({ children, className = "" }) {
  return <div className={`cc-page ${className}`.trim()}>{children}</div>;
}

/**
 * PageHead
 *   Pass `onNotify` to make the bell a plain button (Citizen opens its Alerts
 *   page). Pass `notifications` instead to get a dropdown list under the bell:
 *     [{ id, title, text, time, read, icon?, onOpen? }]
 *   with `onMarkRead(id)` and `onMarkAllRead()` called back to the page.
 *   Pass `onViewAll` to add a "View all notifications" link under the list.
 */
export function PageHead({
  eyebrow,
  title,
  subtitle,
  badge = 0,
  dot = false,
  onNotify,
  notifyLabel = "Notifications",
  notifications,
  onMarkRead,
  onMarkAllRead,
  onViewAll,
}) {
  const hasMenu = Array.isArray(notifications);
  const unread = hasMenu ? notifications.filter((n) => !n.read).length : badge;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="cc-page-head">
      <div className="cc-page-head__text">
        <p className="cc-page-head__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p className="cc-page-head__subtitle">{subtitle}</p>}
      </div>

      <div className="cc-notify" ref={wrapRef}>
        <button
          type="button"
          className="cc-bell"
          onClick={hasMenu ? () => setOpen((v) => !v) : onNotify}
          aria-label={unread > 0 ? `${notifyLabel}, ${unread} unread` : notifyLabel}
          aria-haspopup={hasMenu ? "true" : undefined}
          aria-expanded={hasMenu ? open : undefined}
        >
          <Bell size={20} aria-hidden="true" />
          {unread > 0 && <span className="cc-bell__badge">{unread > 9 ? "9+" : unread}</span>}
          {unread <= 0 && dot && !hasMenu && <span className="cc-bell__dot" aria-hidden="true" />}
        </button>

        {hasMenu && open && (
          <div className="cc-notify__panel" role="dialog" aria-label={notifyLabel}>
            <div className="cc-notify__head">
              <strong>{notifyLabel}</strong>
              {unread > 0 && (
                <button type="button" className="cc-notify__all" onClick={onMarkAllRead}>
                  <CheckCheck size={14} aria-hidden="true" />
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="cc-notify__empty">You&rsquo;re all caught up.</p>
            ) : (
              <ul className="cc-notify__list">
                {notifications.map((n) => {
                  const ItemIcon = n.icon || Bell;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        className={`cc-notify__item${n.read ? "" : " cc-notify__item--unread"}`}
                        onClick={() => {
                          onMarkRead?.(n.id);
                          setOpen(false);
                          n.onOpen?.();
                        }}
                      >
                        <span className="cc-notify__icon" aria-hidden="true">
                          <ItemIcon size={17} />
                        </span>
                        <span className="cc-notify__body">
                          <strong>{n.title}</strong>
                          <span>{n.text}</span>
                          <small>{n.time}</small>
                        </span>
                        {!n.read && <span className="cc-notify__pip" aria-hidden="true" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {onViewAll && (
              <div className="cc-notify__foot">
                <button
                  type="button"
                  className="cc-notify__viewall"
                  onClick={() => {
                    setOpen(false);
                    onViewAll();
                  }}
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function StatGrid({ children }) {
  // Four cards line up 2 x 2 on small screens and 4 across on wide ones.
  const four = Children.count(children) === 4;
  return <section className={`cc-stats${four ? " cc-stats--four" : ""}`}>{children}</section>;
}

/** tone: "blue" | "gold" | "green" | "purple" */
export function StatCard({ icon: Icon, label, value, tone = "blue" }) {
  return (
    <div className={`cc-stat cc-stat--${tone}`}>
      <span className="cc-stat__icon" aria-hidden="true">
        <Icon size={21} />
      </span>
      <div className="cc-stat__info">
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
