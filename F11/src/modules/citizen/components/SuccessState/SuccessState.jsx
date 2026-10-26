import './SuccessState.css';

export default function SuccessState({ title, description, children }) {
  return (
    <div className="success-state anim-fade-in">
      <div className="success-state__ring">
        <svg viewBox="0 0 80 80" width="88" height="88">
          <circle cx="40" cy="40" r="35" fill="none" stroke="var(--success-bg)" strokeWidth="6" />
          <circle
            className="success-state__ring-progress"
            cx="40" cy="40" r="35" fill="none" stroke="var(--success)" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="220"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <svg className="success-state__check" viewBox="0 0 24 24" width="34" height="34">
          <path d="M4 12.5L9.5 18L20 6" fill="none" stroke="var(--success)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="success-state__title">{title}</h2>
      {description && <p className="success-state__desc">{description}</p>}
      <div className="success-state__actions">
        {children}
      </div>
    </div>
  );
}
