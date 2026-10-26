import { MARQUEE } from "../data/content";

function Marquee() {
  const loop = [...MARQUEE, ...MARQUEE];
  return (
    <div className="marquee">
      <small>Built for every part of civic service</small>
      <div className="marquee-track">
        {loop.map((t, i) => (
          <span key={`${t}-${i}`} aria-hidden={i >= MARQUEE.length ? "true" : undefined}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default Marquee;
