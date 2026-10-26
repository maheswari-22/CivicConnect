import { useEffect, useRef, useState } from "react";
import { DEMOS, DEMO_POINTS } from "../data/content";
import { useInView } from "../hooks/useInView";

const ROTATE_MS = 6000;

function PhotoDemo() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const card = useRef(null);
  const inView = useInView(card, 0.4);
  const d = DEMOS[index];

  // Cycle through the three sample issues while the card is on screen,
  // until the visitor picks one themselves.
  useEffect(() => {
    if (!auto || !inView) return undefined;
    const t = setTimeout(() => setIndex((i) => (i + 1) % DEMOS.length), ROTATE_MS);
    return () => clearTimeout(t);
  }, [index, auto, inView]);

  const rows = [
    ["Issue type", d.name, null],
    ["Location", d.loc, null],
    ["Priority", d.priority, d.priorityColor],
    ["Forwarded to", d.dept, null],
    ["Status", "Assigned", "#1F7A5A"],
  ];

  return (
    <section className="block" id="ai" style={{ paddingTop: 20 }}>
      <div className="wrap split">
        <div>
          <h2 className="reveal">
            Upload a photo. <em>We do the rest.</em>
          </h2>
          <p className="lead reveal" style={{ "--d": "0.1s" }}>
            AI image classification identifies the problem, geolocation captures
            the spot and severity sets the priority.
          </p>
          <ul className="ticks reveal" style={{ "--d": "0.2s" }}>
            {DEMO_POINTS.map((t) => (
              <li key={t} className="metal">{t}</li>
            ))}
          </ul>
        </div>

        <div className="demo metal reveal" ref={card} style={{ "--d": "0.15s" }}>
          <div className="tabs tabs-sm" role="tablist" aria-label="Sample issues">
            {DEMOS.map((x, i) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`tab${i === index ? " on" : ""}`}
                onClick={() => { setAuto(false); setIndex(i); }}
              >
                {x.name}
              </button>
            ))}
          </div>

          <div className="demo-photo">
            {DEMOS.map((x, i) => (
              <img
                key={x.key}
                src={x.photo}
                alt={x.alt}
                loading="lazy"
                decoding="async"
                className={i === index ? "on" : ""}
              />
            ))}
            <div className="scan"></div>
            <div
              className="bx"
              style={{
                left: `${d.box.left}%`,
                top: `${d.box.top}%`,
                width: `${d.box.width}%`,
                height: `${d.box.height}%`,
              }}
            >
              <b>{d.name} {d.conf}%</b>
            </div>
          </div>

          {/* key restarts the staggered reveal each time the sample changes */}
          <div className="res" key={d.key}>
            {rows.map(([k, v, color], j) => (
              <div key={k} style={{ "--k": `${0.2 + j * 0.2}s` }}>
                <span>{k}</span>
                <b style={color ? { color } : undefined}>{v}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default PhotoDemo;
