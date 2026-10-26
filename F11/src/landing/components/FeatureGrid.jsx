import { useState } from "react";
import { FEATURES, FEATURE_TABS, ROLE_COLOR } from "../data/content";

const LABEL = { ai: "AI", citizen: "Citizen", worker: "Worker", authority: "Authority" };

function FeatureGrid() {
  const [tab, setTab] = useState("all");
  const shown = tab === "all" ? FEATURES : FEATURES.filter((f) => f.group === tab);

  return (
    <section className="block" id="features" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <div className="head">
          <h2 className="reveal">
            Everything the loop <em>needs.</em>
          </h2>
        </div>

        <div className="tabs reveal" role="tablist" aria-label="Filter features">
          {FEATURE_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab${tab === t.id ? " on" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* key restarts the pop-in each time the filter changes */}
        <div className={`feature-grid${tab === "all" ? " is-all" : ""}`} key={tab}>
          {shown.map((f, i) => (
            <div
              key={f.title}
              className="feature metal"
              style={{ "--c": ROLE_COLOR[f.group], "--i": `${i * 0.05}s` }}
            >
              <span className="chip">{LABEL[f.group]}</span>
              <b>{f.title}</b>
              <span className="t">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureGrid;
