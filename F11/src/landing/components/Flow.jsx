import { useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { FLOW_ITEMS, ROLE_COLOR } from "../data/content";
import civicLogo from "../assets/civic-logo.png";

const RED = "#D9534F";
const GOLD = "#C9962E";
const GREEN = ROLE_COLOR.worker;
const BLUE = ROLE_COLOR.citizen;

function Face({ tag, color, title, sub }) {
  return (
    <>
      <span className="chip" style={{ "--c": color }}>{tag}</span>
      <b>{title}</b>
      <small>{sub}</small>
    </>
  );
}

// 12 cards: six problems travelling left to right, six solutions right to left.
const CARDS = [
  ...FLOW_ITEMS.map((x) => ({
    top: true,
    a: <Face tag="Reported" color={RED} title={x[0]} sub={x[1]} />,
    b: <Face tag="Assigned" color={GOLD} title={x[0]} sub={`Sent to ${x[2]}`} />,
  })),
  ...FLOW_ITEMS.map((x) => ({
    top: false,
    a: <Face tag="Fixed on site" color={BLUE} title={x[3]} sub={x[0]} />,
    b: <Face tag="Resolved" color={GREEN} title={x[3]} sub="Citizen notified" />,
  })),
];

/*
  Conveyor: problems enter CivicConnect from the left, are detected,
  prioritised and assigned, and the solutions return to the citizen on the
  right. Each card flips its face as it crosses the hub. The belt slows down
  while the pointer is over it and sleeps while it is off screen.
*/
function Flow() {
  const stage = useRef(null);
  const nodes = useRef([]);

  useEffect(() => {
    const cv = stage.current;
    if (!cv) return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = FLOW_ITEMS.length;
    let visible = false;
    let hovered = false;
    let speed = 70;
    let offset = 0;
    let last = performance.now();
    let raf = 0;

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 });
    io.observe(cv);

    const enter = () => { hovered = true; };
    const leave = () => { hovered = false; };
    cv.addEventListener("pointerenter", enter);
    cv.addEventListener("pointerleave", leave);

    const tick = (t) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;

      if (visible) {
        speed += ((reduce ? 0 : hovered ? 20 : 70) - speed) * 0.08;
        offset += dt * speed;

        const W = cv.clientWidth;
        const cw = nodes.current[0].offsetWidth || 158;
        const step = cw + 50;
        const loop = n * step;

        nodes.current.forEach((el, k) => {
          const top = CARDS[k].top;
          const i = k % n;
          const p = (offset + i * step) % loop;
          const x = top ? p - cw : W - p;
          const y = top ? 53 : 251;
          const mid = x + cw / 2;
          el.style.transform = `translate(${x}px,${y}px) rotate(${i % 2 ? 3 : -3}deg)`;
          el.classList.toggle("sw", top ? mid > W / 2 : mid < W / 2);
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      cv.removeEventListener("pointerenter", enter);
      cv.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <section className="block" id="flow" style={{ paddingTop: 20 }}>
      <div className="wrap">
        <div className="head head-center">
          <h2 className="reveal">
            Problems go in. <em>Solutions come out.</em>
          </h2>
          <p className="reveal" style={{ "--d": "0.1s" }}>
            Complaints travel through CivicConnect to the workers. The solution
            travels back to the citizen.
          </p>
        </div>

        <div className="conveyor reveal" ref={stage}>
          <div className="belt b1"></div>
          <div className="belt b2"></div>
          <span className="tg t1">
            Problems
            <ArrowRight className="tg-arrow" size={15} strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="tg t2">
            <ArrowLeft className="tg-arrow" size={15} strokeWidth={2.4} aria-hidden="true" />
            Solutions
          </span>

          <div className="hub metal-dark">
            <div className="core">
              <img src={civicLogo} alt="CivicConnect logo" width="64" height="64" />
            </div>
            <b>CivicConnect</b>
            <div className="stp">
              <span>Detect</span>
              <span>Prioritize</span>
              <span>Assign</span>
            </div>
          </div>

          {CARDS.map((c, k) => (
            <div
              key={k}
              className="vc"
              ref={(el) => { nodes.current[k] = el; }}
            >
              <div className="fa f1">{c.a}</div>
              <div className="fa f2">{c.b}</div>
            </div>
          ))}
        </div>

        <p className="hint">
          Problems travel left to right. Solutions return right to left. Hover
          to slow it down.
        </p>
      </div>
    </section>
  );
}

export default Flow;
