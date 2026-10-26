import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Eye, EyeOff, KeyRound, LogOut, Mail, UserRound, X } from "lucide-react";
import { DELETE_REASONS } from "./deleteReasons.js";
import { validateField, passwordError } from "./validate.js";
import "./accountDialogs.css";

/**
 * Account dialogs shared by the Citizen, Authority and Worker profile pages,
 * so Change password / Delete account / Log out look and behave identically.
 *
 * Each portal supplies its own handler. Handlers may be async and should
 * resolve to { ok: boolean, message?: string }.
 */

function Dialog({ title, icon: Icon, tone = "wine", onClose, children, busy = false }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, busy]);

  return (
    <div className="cc-dialog__overlay" onMouseDown={() => !busy && onClose()}>
      <div
        ref={panelRef}
        tabIndex={-1}
        className="cc-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cc-dialog__close"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className={`cc-dialog__icon cc-dialog__icon--${tone}`}>
          <Icon size={26} aria-hidden="true" />
        </div>
        <h2 id={titleId} className="cc-dialog__title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, autoComplete, hint }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="cc-field">
      <label htmlFor={id}>{label}</label>
      <div className="cc-field__wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="cc-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

/* ------------------------------------------------------------ Edit profile */

/**
 * Edit-profile dialog for the Authority and Worker portals (same look as the
 * other account dialogs).
 *
 *   fields    [{ name, label, kind?, type?, placeholder?, readOnly?, hint? }]
 *             kind drives validation ("name" | "email" | "mobile"); readOnly
 *             fields are shown greyed-out and are never submitted.
 *   initial   { [name]: value }
 *   onSubmit  async (values) => { ok, message? } — receives the editable
 *             fields only, trimmed.
 */
export function EditProfileDialog({ onClose, onSubmit, fields, initial = {} }) {
  const baseId = useId();
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, String(initial[f.name] ?? "")]))
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: "" }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const editable = fields.filter((f) => !f.readOnly);
    const next = {};
    editable.forEach((f) => {
      const msg = validateField(f, values[f.name]);
      if (msg) next[f.name] = msg;
    });
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    try {
      const payload = Object.fromEntries(editable.map((f) => [f.name, values[f.name].trim()]));
      const result = await onSubmit(payload);
      if (result?.ok === false) setError(result.message || "Could not update your profile.");
      else setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Dialog title="Profile updated" icon={UserRound} onClose={onClose}>
        <p className="cc-dialog__text">Your profile details have been saved.</p>
        <div className="cc-dialog__actions">
          <button type="button" className="cc-btn cc-btn--wine" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Edit profile" icon={UserRound} onClose={onClose} busy={busy}>
      <p className="cc-dialog__text">Keep your contact details up to date.</p>
      <form className="cc-dialog__form" onSubmit={handleSubmit} noValidate>
        {fields.map((f) => (
          <div className={`cc-field${errors[f.name] ? " cc-field--error" : ""}`} key={f.name}>
            <label htmlFor={`${baseId}-${f.name}`}>{f.label}</label>
            <input
              id={`${baseId}-${f.name}`}
              type={f.type || "text"}
              value={values[f.name]}
              onChange={set(f.name)}
              placeholder={f.placeholder}
              readOnly={f.readOnly}
              aria-readonly={f.readOnly || undefined}
              aria-invalid={errors[f.name] ? true : undefined}
              autoComplete="off"
            />
            {errors[f.name] ? <small role="alert" className="cc-field__error">{errors[f.name]}</small> : f.hint ? <small>{f.hint}</small> : null}
          </div>
        ))}
        {error && (
          <p className="cc-dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="cc-dialog__actions">
          <button type="button" className="cc-btn cc-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="cc-btn cc-btn--wine" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- Logout */

export function LogoutDialog({ portalLabel, onCancel, onConfirm }) {
  return (
    <Dialog title="Log out of CivicConnect?" icon={LogOut} onClose={onCancel}>
      <p className="cc-dialog__text">
        You will be signed out of the {portalLabel} and returned to the login page.
      </p>
      <div className="cc-dialog__actions">
        <button type="button" className="cc-btn cc-btn--ghost" onClick={onCancel} autoFocus>
          Stay signed in
        </button>
        <button type="button" className="cc-btn cc-btn--wine" onClick={onConfirm}>
          Log out
        </button>
      </div>
    </Dialog>
  );
}

/* --------------------------------------------------------- Change password */

export function ChangePasswordDialog({ onClose, onSubmit }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!current) return setError("Please enter your current password.");
    const weak = passwordError(next);
    if (weak) return setError(weak + ".");
    if (next !== confirm) return setError("New password and confirmation do not match.");
    if (next === current) return setError("New password must be different from the current one.");

    setBusy(true);
    try {
      const result = await onSubmit({ currentPassword: current, newPassword: next });
      if (result?.ok === false) setError(result.message || "Could not change the password.");
      else setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Dialog title="Password updated" icon={KeyRound} tone="wine" onClose={onClose}>
        <p className="cc-dialog__text">Your password has been changed successfully.</p>
        <div className="cc-dialog__actions">
          <button type="button" className="cc-btn cc-btn--wine" onClick={onClose} autoFocus>
            Done
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Change password" icon={KeyRound} onClose={onClose} busy={busy}>
      <p className="cc-dialog__text">Update your password to keep your account secure.</p>
      <form className="cc-dialog__form" onSubmit={handleSubmit} noValidate>
        <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" hint="10+ characters with upper & lower case, a number and a symbol" />
        <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        {error && (
          <p className="cc-dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="cc-dialog__actions">
          <button type="button" className="cc-btn cc-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="cc-btn cc-btn--wine" disabled={busy}>
            {busy ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------ Change email */

/**
 * Changing the e-mail needs the current password, and only takes effect once the link
 * sent to the NEW address is opened. onSubmit({ newEmail, currentPassword }) -> { ok, message? }.
 */
export function ChangeEmailDialog({ onClose, onSubmit, currentEmail = "" }) {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const problem = validateField({ name: "email", label: "Email address", kind: "email" }, email);
    if (problem) return setError(problem + ".");
    if (currentEmail && email.trim().toLowerCase() === currentEmail.toLowerCase()) return setError("That is already your email address.");
    if (!password) return setError("Please enter your current password.");
    setBusy(true);
    try {
      const result = await onSubmit({ newEmail: email.trim(), currentPassword: password });
      if (result?.ok === false) setError(result.message || "Could not start the email change.");
      else setSentTo(email.trim());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <Dialog title="Check your inbox" icon={Mail} tone="wine" onClose={onClose}>
        <p className="cc-dialog__text">We sent a confirmation link to <strong>{sentTo}</strong>. Your email changes only after you open it (the link works for 48 hours). Until then, your current email stays in use.</p>
        <div className="cc-dialog__actions">
          <button type="button" className="cc-btn cc-btn--wine" onClick={onClose} autoFocus>Done</button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Change email" icon={Mail} onClose={onClose} busy={busy}>
      <p className="cc-dialog__text">Enter your new email address and your current password. We will send a confirmation link to the new address.</p>
      <form className="cc-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="cc-field">
          <label htmlFor={emailId}>New email address</label>
          <input id={emailId} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" autoComplete="off" />
        </div>
        <PasswordField label="Current password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="cc-dialog__error" role="alert">{error}</p>}
        <div className="cc-dialog__actions">
          <button type="button" className="cc-btn cc-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="cc-btn cc-btn--wine" disabled={busy}>{busy ? "Sending…" : "Send confirmation link"}</button>
        </div>
      </form>
    </Dialog>
  );
}

/* ---------------------------------------------------------- Delete account */

export function DeleteAccountDialog({ onClose, onSubmit, reasons = DELETE_REASONS }) {
  const reasonId = useId();
  const detailsId = useId();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!reason) return setError("Please select a reason for deleting your account.");
    if (reason === "Other" && !details.trim()) return setError("Please tell us your reason in the box below.");
    if (!password) return setError("Please enter your password to confirm.");

    setBusy(true);
    try {
      const result = await onSubmit({ password, reason, details: details.trim() });
      if (result?.ok === false) setError(result.message || "Could not delete the account.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title="Delete your account?" icon={AlertTriangle} tone="danger" onClose={onClose} busy={busy}>
      <p className="cc-dialog__text">
        This permanently removes your account and signs you out. This action cannot be undone.
      </p>
      <form className="cc-dialog__form" onSubmit={handleSubmit} noValidate>
        <div className="cc-field">
          <label htmlFor={reasonId}>Why are you deleting your account?</label>
          <select id={reasonId} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Select a reason</option>
            {reasons.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="cc-field">
          <label htmlFor={detailsId}>
            {reason === "Other" ? "Tell us more" : "Additional details (optional)"}
          </label>
          <textarea
            id={detailsId}
            rows={3}
            maxLength={300}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Share anything that would help us improve…"
          />
        </div>
        <PasswordField label="Confirm your password" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && (
          <p className="cc-dialog__error" role="alert">
            {error}
          </p>
        )}
        <div className="cc-dialog__actions">
          <button type="button" className="cc-btn cc-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="cc-btn cc-btn--danger" disabled={busy}>
            {busy ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
