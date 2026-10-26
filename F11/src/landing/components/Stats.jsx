import { useEffect, useRef } from "react";
import { STATS } from "../data/content";

function Counter({ n, suffix }) {
  const el = useRef(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !('IntersectionObserver' in window)) {
      node.textContent = `${n}${suffix}`;
      return undefined;
    }

    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const frame = (t) => {
          const p = Math.min((t - t0) / 1400, 1);
          node.textContent = `${Math.round(n * (1 - Math.pow(1 - p, 3)))}${suffix}`;
          if (p < 1) raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      },
      { threshold: 0.6 }
    );
    io.observe(node);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [n, suffix]);

  return <b ref={el}>0</b>;
}

function Stats() {
  return (
    <section className="block" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <div className="stats">
          {STATS.map((s, i) => (
            <div key={s.label} className="stat metal reveal" style={{ "--d": `${i * 0.08}s` }}>
              <Counter n={s.n} suffix={s.suffix} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Stats;
