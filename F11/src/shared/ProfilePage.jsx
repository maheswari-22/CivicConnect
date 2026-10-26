import { ChevronRight, Pencil } from "lucide-react";
import { initialsOf } from "./initials.js";
import "./profilePage.css";

/**
 * One full-width profile layout for Citizen, Authority and Worker.
 *
 * The page content only — each portal wraps it in its own shell
 * (sidebar / header) and supplies its own data and handlers. The shell must
 * not add its own padding or max-width: this page owns its spacing so the
 * three profiles are pixel-identical.
 *
 *   name, subtitle, status   banner (avatar shows the initials)
 *   details  [{ icon, label, value }]
 *   stats    [{ label, value }]            optional strip of numbers
 *   actions  [{ key, label, description, icon, onClick, tone }]
 *            Every portal passes the same three, in this order:
 *            Change Password, Delete Account, Log Out. tone "danger" is red.
 *   onEdit   optional; shows a small Edit button in the details heading
 *
 * Layout is one column, top to bottom: banner, Profile details, then the
 * account actions. It is the same on phones and desktops.
 *   children dialogs owned by the portal
 */
export default function ProfilePage({ name, subtitle, status = "Active", details = [], stats = [], actions = [], onEdit, children }) {
  return (
    <div className="cc-profile">
      <header className="cc-profile__banner">
        <div className="cc-profile__avatar" aria-hidden="true">
          {initialsOf(name)}
        </div>
        <div className="cc-profile__who">
          <h1>{name}</h1>
          <p>{subtitle}</p>
          {status && <span className="cc-profile__status">{status}</span>}
        </div>

        {stats.length > 0 && (
          <ul className="cc-profile__stats" aria-label="Summary">
            {stats.map(({ label, value }) => (
              <li key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="cc-profile__grid">
        <section className="cc-profile__card" aria-label="Profile details">
          <div className="cc-profile__heading-row">
            <h2 className="cc-profile__heading">Profile details</h2>
            {onEdit && (
              <button type="button" className="cc-profile__edit" onClick={onEdit}>
                <Pencil size={14} aria-hidden="true" />
                Edit
              </button>
            )}
          </div>
          <dl className="cc-profile__details">
            {details.map(({ icon: Icon, label, value }) => (
              <div className="cc-profile__row" key={label}>
                <span className="cc-profile__row-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div>
                  <dt>{label}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <section className="cc-profile__side" aria-label="Account actions">
          <h2 className="cc-profile__heading">Account</h2>
          <div className="cc-profile__actions">
            {actions.map(({ key, label, description, icon: Icon, onClick, tone }) => (
              <button
                key={key}
                type="button"
                className={`cc-profile__action${tone === "danger" ? " cc-profile__action--danger" : ""}`}
                onClick={onClick}
              >
                <span className="cc-profile__action-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="cc-profile__action-text">
                  <strong>{label}</strong>
                  {description && <small>{description}</small>}
                </span>
                {tone !== "danger" && <ChevronRight size={18} className="cc-profile__chevron" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>
      </div>

      {children}
    </div>
  );
}
