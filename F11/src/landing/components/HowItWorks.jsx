import { useState } from "react";
import { STEPS } from "../data/content";

/*
  Six steps, one panel. The progress line under the panel is a CSS animation;
  when it finishes (animationend) the next step is shown. Hovering the panel
  pauses it, clicking a step jumps there.
*/
function HowItWorks() {
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const s = STEPS[cur];

  return (
    <section className="block" id="how-it-works" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <div className="head">
          <h2 className="reveal">
            From report to <em>resolved.</em>
          </h2>
        </div>

        <div className="flow-steps reveal">
          <div className="steps" role="tablist" aria-label="Steps">
            {STEPS.map((st, i) => (
              <button
                key={st.title}
                type="button"
                role="tab"
                aria-selected={i === cur}
                className={`st${i === cur ? " on" : ""}`}
                onClick={() => setCur(i)}
              >
                <i>0{i + 1}</i>
                {st.title}
              </button>
            ))}
          </div>

          <div
            className="panel metal"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <span className="n" aria-hidden="true">{cur + 1}</span>

            <div className="panel-in" key={cur}>
              <figure className="panel-photo">
                <img src={s.photo} alt={s.alt} loading="lazy" decoding="async" />
                {s.detect && (
                  <span className="panel-box"><b>Pothole 96%</b></span>
                )}
                <figcaption className={s.done ? "done" : ""}>{s.tag}</figcaption>
              </figure>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>

            <div className="prog">
              <i
                key={cur}
                style={{ animationPlayState: paused ? "paused" : "running" }}
                onAnimationEnd={() => setCur((c) => (c + 1) % STEPS.length)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
