import { Handshake, User, HardHat, Landmark } from "lucide-react";
import { ABOUT_POINTS } from "../data/content";

/*
  Left: the description. Right: an animated handshake. Three role badges
  (citizen, worker, authority) orbit it; the handshake pulses and floats.
*/
const ORBIT = [
  { Icon: User, label: "Citizen", angle: 0 },
  { Icon: HardHat, label: "Worker", angle: 120 },
  { Icon: Landmark, label: "Authority", angle: 240 },
];

function About() {
  return (
    <section className="block" id="about" style={{ paddingTop: 20 }}>
      <div className="wrap split about-split">
        <div className="about-text">
          <p className="section-tag reveal">ABOUT CIVICCONNECT</p>
          <h2 className="reveal" style={{ "--d": "0.05s" }}>
            Connecting People. <em>Improving Communities.</em>
          </h2>
          <p className="lead reveal" style={{ "--d": "0.1s" }}>
            CivicConnect is a digital platform designed to connect citizens,
            authorities and workers in one place.
          </p>
          <p className="lead reveal" style={{ "--d": "0.15s", marginTop: 0 }}>
            Citizens can report civic problems, authorities can manage the
            reported issues, and workers can take action to resolve them.
          </p>
          <ul className="about-points reveal" style={{ "--d": "0.2s" }}>
            {ABOUT_POINTS.map((p) => (
              <li key={p}>
                <span aria-hidden="true">&#10003;</span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="about-art reveal" style={{ "--d": "0.15s" }} aria-hidden="true">
          <div className="about-stage">
            <span className="about-ring r1" />
            <span className="about-ring r2" />
            <span className="about-ring r3" />
            <div className="about-orbit">
              {ORBIT.map(({ Icon, label, angle }) => (
                <div key={label} className="orbit-arm" style={{ "--a": `${angle}deg` }}>
                  <span className="orbit-badge" title={label}>
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                </div>
              ))}
            </div>
            <div className="about-core">
              <Handshake size={96} strokeWidth={1.7} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default About;
