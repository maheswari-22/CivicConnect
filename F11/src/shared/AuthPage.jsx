import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";
import { ROLES, SIGNUP_FIELDS, FORGOT_FIELDS } from "./roles";
import { validateField, passwordError } from "./validate";
import PasswordStrength from "./PasswordStrength";
import { authResetPassword } from "./api";
import { AREAS } from "./areas";
import "./auth.css";

const LOGO = "/civic-logo.png";

function PasswordInput({ id, value, onChange, placeholder, autoComplete, invalid }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="cc-input">
      <Lock size={17} className="cc-input__icon" aria-hidden="true" />
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
      />
      <button
        type="button"
        className="cc-input__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

function Field({ id, label, error, wide, children }) {
  return (
    <div className={`cc-field${error ? " cc-field--error" : ""}${wide ? " cc-field--wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}

function TextInput({ field, id, value, onChange, error, Icon }) {
  if (field.type === "select") {
    return (
      <div className="cc-input">
        <select id={id} value={value} onChange={onChange} aria-invalid={error ? true : undefined}>
          <option value="">{field.placeholder}</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="cc-input">
      {Icon && <Icon size={17} className="cc-input__icon" aria-hidden="true" />}
      <input
        id={id}
        type={field.type || "text"}
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        autoComplete={field.autoComplete || "off"}
        maxLength={field.kind === "username" ? 20 : field.kind === "name" ? 60 : 160}
        aria-invalid={error ? true : undefined}
      />
    </div>
  );
}

/**
 * The one authentication experience shared by every portal.
 *
 *   role          "citizen" | "authority" | "worker"
 *   adapter       { login(values), signup(values), forgot(values) } — each
 *                 returns a promise of { ok, error?, message? }. This is the
 *                 only place a portal plugs in its own account logic.
 *   onAuthenticated()  called after a successful log in / sign up.
 */
export default function AuthPage({ role, adapter, onAuthenticated }) {
  const cfg = ROLES[role];
  // A password-reset email links to /<portal>/?reset=<token>, which opens straight on the "reset" step.
  const [resetToken] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("reset") || ""; } catch { return ""; }
  });
  const [mode, setMode] = useState(resetToken ? "reset" : "login"); // login | signup | forgot | reset
  // The one-time token is now in memory; take it out of the address bar so it does not stay in history or get shared.
  useEffect(() => {
    if (!resetToken) return;
    try { window.history.replaceState({}, "", window.location.pathname); } catch { /* ignore */ }
  }, [resetToken]);
  const [notice, setNotice] = useState("");
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);
  const [resetDone, setResetDone] = useState("");

  const identifierField = {
    name: "identifier",
    label: cfg.identifier.label,
    placeholder: cfg.identifier.placeholder,
    kind: cfg.identifier.kind || "required",
    autoComplete: "username",
  };
  const loginFields = [identifierField];
  const signupFields = SIGNUP_FIELDS[role];
  const forgotFields = FORGOT_FIELDS[role];

  const switchMode = (next, message = "") => {
    if (mode === "reset" && next !== "reset") {
      try { window.history.replaceState({}, "", window.location.pathname); } catch { /* ignore */ }
    }
    setNotice(message);
    setMode(next);
    setValues({});
    setErrors({});
    setFormError("");
    setResetDone("");
  };

  const set = (name) => (e) => {
    setValues((v) => ({ ...v, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: "" }));
    setFormError("");
  };

  const collectErrors = (fields, extra = {}) => {
    const next = {};
    fields.forEach((f) => {
      const msg = validateField(f, values[f.name]);
      if (msg) next[f.name] = msg;
    });
    return { ...next, ...extra };
  };

  const run = async (fields, action, passwordRules) => {
    setFormError("");
    let next = collectErrors(fields);
    if (passwordRules) next = { ...next, ...passwordRules(values) };
    setErrors(next);
    if (Object.keys(next).length) return null;

    setBusy(true);
    try {
      return await action({ ...values, remember });
    } catch {
      return { ok: false, error: "Something went wrong. Please try again." };
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    const res = await run(loginFields, adapter.login, (v) =>
      v.password ? {} : { password: "Enter your password" }
    );
    if (!res) return;
    if (res.ok) onAuthenticated();
    else setFormError(res.error || "Incorrect details. Please try again.");
  };

  const submitSignup = async (e) => {
    e.preventDefault();
    const res = await run(signupFields, adapter.signup, (v) => {
      const out = {};
      const pwError = passwordError(v.password, [v.name, v.username, v.email, v.mobile, v.phone, v.employeeId]);
      if (pwError) out.password = pwError;
      if (!v.confirm) out.confirm = "Confirm your password";
      else if (v.confirm !== v.password) out.confirm = "Passwords don't match";
      return out;
    });
    if (!res) return;
    if (res.ok && res.pending) switchMode("login", res.message || "Your account is waiting for approval. You can sign in once it is approved.");
    else if (res.ok) onAuthenticated();
    else setFormError(res.error || "We couldn't create your account. Please try again.");
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    const res = await run(forgotFields, adapter.forgot);
    if (!res) return;
    if (res.ok) setResetDone(res.message);
    else setFormError(res.error || "We couldn't process that. Please try again.");
  };

  const submitReset = async (e) => {
    e.preventDefault();
    const res = await run([], async () => {
      const res2 = await authResetPassword(role, { token: resetToken, newPassword: values.password });
      return res2.ok ? { ok: true, message: res2.data.message } : { ok: false, error: res2.error };
    }, (v) => {
      const out = {};
      const pwError = passwordError(v.password);
      if (pwError) out.password = pwError;
      if (!v.confirm) out.confirm = "Confirm your new password";
      else if (v.confirm !== v.password) out.confirm = "Passwords don't match";
      return out;
    });
    if (!res) return;
    if (res.ok) switchMode("login", "Password changed. Sign in with your new password.");
    else setFormError(res.error || "We couldn't reset your password. Please request a new link.");
  };

  const Icon = cfg.Icon;
  const banner = formError && (
    <div className="cc-banner" role="alert">
      <CircleAlert size={17} aria-hidden="true" />
      <span>{formError}</span>
    </div>
  );

  const submitLabel = (idle, working) =>
    busy ? (
      <>
        <Loader2 size={18} className="cc-spin" aria-hidden="true" />
        {working}
      </>
    ) : (
      <>
        {idle}
        <ArrowRight size={18} aria-hidden="true" />
      </>
    );

  return (
    <div className="cc-auth">
      <aside className="cc-auth__intro">
        <a href="/" className="cc-brand" aria-label="CivicConnect home">
          <span className="cc-brand__ring">
            <img src={LOGO} alt="" />
          </span>
          <span className="cc-brand__name">
            Civic<span>Connect</span>
          </span>
        </a>

        <div className="cc-intro__body">
          <span className="cc-role-pill">
            <Icon size={16} aria-hidden="true" />
            {cfg.portal}
          </span>
          <h1>{cfg.headline}</h1>
          <p>{cfg.description}</p>

          <ul className="cc-features">
            {cfg.features.map(({ Icon: F, text }) => (
              <li key={text}>
                <span>
                  <F size={17} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="cc-intro__foot">© {new Date().getFullYear()} CivicConnect · Together for a Better City</p>
      </aside>

      <main className="cc-auth__main">
        <div className="cc-auth__topbar">
          <a href="/#get-started" className="cc-back">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to Get Started
          </a>
        </div>

        <section className="cc-card" aria-labelledby="cc-auth-title">
          <header className="cc-card__head">
            <span className="cc-card__icon">
              <Icon size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="cc-card__eyebrow">{cfg.portal}</p>
              <h2 id="cc-auth-title">
                {mode === "login" && `${cfg.title} Login`}
                {mode === "signup" && `Create ${cfg.title} Account`}
                {mode === "forgot" && "Reset your password"}
                {mode === "reset" && "Choose a new password"}
              </h2>
            </div>
          </header>

          {mode !== "forgot" && mode !== "reset" && (
            <div className="cc-tabs" role="tablist" aria-label="Authentication">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={mode === "login" ? "is-active" : ""}
                onClick={() => switchMode("login")}
              >
                Log In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={mode === "signup" ? "is-active" : ""}
                onClick={() => switchMode("signup")}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* ---------------- LOG IN ---------------- */}
          {mode === "login" && (
            <form onSubmit={submitLogin} noValidate>
              <p className="cc-card__lead">
                Enter your details to continue to your {cfg.title.toLowerCase()} account.
              </p>
              {notice && (
                <div className="cc-banner cc-banner--ok" role="status">
                  <CircleCheck size={17} aria-hidden="true" />
                  <span>{notice}</span>
                </div>
              )}
              {banner}
              <Field id="cc-identifier" label={identifierField.label} error={errors.identifier}>
                <TextInput
                  field={identifierField}
                  id="cc-identifier"
                  value={values.identifier || ""}
                  onChange={set("identifier")}
                  error={errors.identifier}
                  Icon={role === "citizen" ? Mail : User}
                />
              </Field>
              <Field id="cc-password" label="Password" error={errors.password}>
                <PasswordInput
                  id="cc-password"
                  value={values.password || ""}
                  onChange={set("password")}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  invalid={!!errors.password}
                />
              </Field>
              <div className="cc-row">
                <label className="cc-check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <button type="button" className="cc-link" onClick={() => switchMode("forgot")}>
                  Forgot password?
                </button>
              </div>
              <button type="submit" className="cc-submit" disabled={busy}>
                {submitLabel(`Log in as ${cfg.title}`, "Logging in…")}
              </button>
              <p className="cc-switch">
                New here?{" "}
                <button type="button" className="cc-link" onClick={() => switchMode("signup")}>
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* ---------------- SIGN UP ---------------- */}
          {mode === "signup" && (
            <form onSubmit={submitSignup} noValidate>
              <p className="cc-card__lead">
                Set up your {cfg.title.toLowerCase()} account in a minute.
              </p>
              {banner}
              <div className="cc-grid">
                {signupFields.map((f) => (
                  <Field key={f.name} id={`cc-${f.name}`} label={f.label} error={errors[f.name]}>
                    <TextInput
                      field={f}
                      id={`cc-${f.name}`}
                      value={values[f.name] || ""}
                      onChange={set(f.name)}
                      error={errors[f.name]}
                    />
                  </Field>
                ))}
                <Field id="cc-new-password" label="Password" error={errors.password} wide>
                  <PasswordInput
                    id="cc-new-password"
                    value={values.password || ""}
                    onChange={set("password")}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    invalid={!!errors.password}
                  />
                  <PasswordStrength password={values.password || ""} />
                </Field>
                <Field id="cc-confirm" label="Confirm password" error={errors.confirm} wide>
                  <PasswordInput
                    id="cc-confirm"
                    value={values.confirm || ""}
                    onChange={set("confirm")}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    invalid={!!errors.confirm}
                  />
                </Field>
              </div>
              <button type="submit" className="cc-submit" disabled={busy}>
                {submitLabel(`Create ${cfg.title} account`, "Creating account…")}
              </button>
              <p className="cc-switch">
                Already have an account?{" "}
                <button type="button" className="cc-link" onClick={() => switchMode("login")}>
                  Log in
                </button>
              </p>
            </form>
          )}

          {/* ---------------- RESET (opened from the emailed link) ---------------- */}
          {mode === "reset" && (
            <form onSubmit={submitReset} noValidate>
              <p className="cc-card__lead">
                <LockKeyhole size={15} aria-hidden="true" /> Choose a new password for your {cfg.title.toLowerCase()} account.
              </p>
              {banner}
              <Field id="cc-new-password" label="New password" error={errors.password}>
                <PasswordInput
                  id="cc-new-password"
                  value={values.password || ""}
                  onChange={set("password")}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  invalid={!!errors.password}
                />
                <PasswordStrength password={values.password || ""} />
              </Field>
              <Field id="cc-confirm-password" label="Confirm new password" error={errors.confirm}>
                <PasswordInput
                  id="cc-confirm-password"
                  value={values.confirm || ""}
                  onChange={set("confirm")}
                  placeholder="Re-enter the new password"
                  autoComplete="new-password"
                  invalid={!!errors.confirm}
                />
              </Field>
              <button type="submit" className="cc-submit" disabled={busy}>
                {submitLabel("Save new password", "Saving…")}
              </button>
              <p className="cc-switch">
                <button type="button" className="cc-link" onClick={() => switchMode("forgot")}>
                  Link expired? Request a new one
                </button>
              </p>
            </form>
          )}

          {/* ---------------- FORGOT ---------------- */}
          {mode === "forgot" && !resetDone && (
            <form onSubmit={submitForgot} noValidate>
              <p className="cc-card__lead">
                <LockKeyhole size={15} aria-hidden="true" /> Enter your registered details and we'll email you a link to reset your password.
              </p>
              {banner}
              {forgotFields.map((f) => (
                <Field key={f.name} id={`cc-f-${f.name}`} label={f.label} error={errors[f.name]}>
                  <TextInput
                    field={f}
                    id={`cc-f-${f.name}`}
                    value={values[f.name] || ""}
                    onChange={set(f.name)}
                    error={errors[f.name]}
                    Icon={Mail}
                  />
                </Field>
              ))}
              <button type="submit" className="cc-submit" disabled={busy}>
                {submitLabel("Send reset link", "Sending link…")}
              </button>
              <p className="cc-switch">
                <button type="button" className="cc-link" onClick={() => switchMode("login")}>
                  <ArrowLeft size={14} aria-hidden="true" /> Back to login
                </button>
              </p>
            </form>
          )}

          {mode === "forgot" && resetDone && (
            <div className="cc-done">
              <span className="cc-done__icon">
                <CircleCheck size={30} aria-hidden="true" />
              </span>
              <h3>Check your email</h3>
              <p>{resetDone}</p>
              <button type="button" className="cc-submit" onClick={() => switchMode("login")}>
                Back to login
              </button>
            </div>
          )}
        </section>

        <p className="cc-auth__foot">© {new Date().getFullYear()} CivicConnect · {cfg.footNote}</p>
      </main>
    </div>
  );
}
