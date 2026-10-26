import { FileEdit, Search, Camera, Activity, ShieldCheck } from "lucide-react";
import HeroStack from "./HeroStack";

function Hero() {
  return (
    <section className="hero" id="home">
      {/* LEFT SIDE */}
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          CIVIC ENGAGEMENT PLATFORM
        </div>

        <h1>
          Report.
          <br />
          Track.
          <br />
          <span>Resolved.</span>
        </h1>

        <p>
          CivicConnect is a smart platform that helps citizens report civic
          issues, track progress in real-time, and ensure faster resolutions.
        </p>

        <div className="hero-buttons">
          <a href="#get-started" className="gold-btn" data-magnetic>
            Get Started
          </a>

          {/* Straight to each portal's sign-in page */}
          <a href="/citizen" className="primary-btn" data-magnetic>
            <FileEdit size={18} strokeWidth={2.2} />
            Report an Issue
          </a>

          <a href="/authority" className="secondary-btn" data-magnetic>
            <Search size={18} strokeWidth={2.2} />
            Track Complaint
          </a>
        </div>

        <ul className="hero-highlights">
          <li>
            <span><Camera size={18} strokeWidth={2.2} /></span>
            <div>
              <strong>Quick reports</strong>
              <small>Photo, location, done</small>
            </div>
          </li>
          <li>
            <span><Activity size={18} strokeWidth={2.2} /></span>
            <div>
              <strong>Live tracking</strong>
              <small>See every status update</small>
            </div>
          </li>
          <li>
            <span><ShieldCheck size={18} strokeWidth={2.2} /></span>
            <div>
              <strong>Verified workers</strong>
              <small>Accountable resolution</small>
            </div>
          </li>
        </ul>
      </div>

      {/* RIGHT SIDE: five auto-moving cards */}
      <div className="hero-visual">
        <div className="hero-panel metal-dark">
          <HeroStack />
        </div>
      </div>
    </section>
  );
}

export default Hero;
