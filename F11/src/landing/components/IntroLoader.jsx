import { useEffect, useState } from "react";
import civicLogo from "../assets/civic-logo.png";

function IntroLoader() {
  // Plays on the first visit of a browser session AND every time the page is refreshed (F5 / reload).
  // Coming back from a portal or using the back button goes straight to the page.
  const [visible, setVisible] = useState(() => {
    try {
      const nav = performance.getEntriesByType?.("navigation")?.[0];
      const reloaded = nav ? nav.type === "reload" : performance.navigation?.type === 1;
      return reloaded || !sessionStorage.getItem("civicconnect.intro-seen");
    } catch { return true; }
  });
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    try { sessionStorage.setItem("civicconnect.intro-seen", "1"); } catch { /* ignore */ }
    document.body.style.overflow = "hidden";

    const leaveTimer = setTimeout(() => setLeaving(true), 1000);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = "";
    }, 1450);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      document.body.style.overflow = "";
    }, 450);
  };

  if (!visible) return null;

  return (
    <div
      className={`intro-loader${leaving ? " intro-leaving" : ""}`}
      onClick={dismiss}
      role="button"
      aria-label="Skip intro"
    >
      <div className="intro-logo-ring">
        <img src={civicLogo} alt="CivicConnect" />
      </div>

      <div className="intro-title">
        Civic<span>Connect</span>
      </div>

      <div className="intro-tagline">Together for a Better City</div>

      <div className="intro-progress">
        <span></span>
      </div>

      <div className="intro-skip">Tap anywhere to skip</div>
    </div>
  );
}

export default IntroLoader;
