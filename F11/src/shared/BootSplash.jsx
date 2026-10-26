/** Neutral full-screen placeholder shown while an app's code is still downloading. */
export default function BootSplash() {
  return (
    <div className="cc-boot" role="status" aria-live="polite">
      <span className="cc-boot__ring" aria-hidden="true" />
      <span className="visually-hidden-boot">Loading CivicConnect</span>
    </div>
  );
}
