import { PROBLEMS } from "../data/content";

function Problem() {
  return (
    <section className="block" id="problem">
      <div className="wrap">
        <div className="head">
          <h2 className="reveal">
            Reporting civic issues is <em>still broken.</em>
          </h2>
          <p className="reveal" style={{ "--d": "0.1s" }}>
            Citizens struggle with slow manual processes, no transparency and no
            proper way to track a complaint.
          </p>
        </div>

        <div className="grid-3">
          {PROBLEMS.map((p, i) => (
            <div
              key={p.title}
              className="tile metal reveal"
              data-tilt
              style={{ "--c": p.color, "--d": `${i * 0.1}s` }}
            >
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Problem;
