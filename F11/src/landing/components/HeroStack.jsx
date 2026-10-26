import { useEffect, useState } from "react";
import { HERO_CARDS } from "../data/content";

const COUNT = HERO_CARDS.length;
const INTERVAL = 2000;

/*
  Five cards fanned in a stack. Every 2 s the next card moves to the front.
  Position 0 is the front card; 1-2 fan to the right, 3-4 to the left (see
  .stack-card[data-p] in styles/hero.css). Hover pauses the rotation, a click
  or a dot brings that card forward.
*/
function HeroStack() {
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const t = setTimeout(() => setFront((f) => (f + 1) % COUNT), INTERVAL);
    return () => clearTimeout(t);
  }, [front, paused]);

  return (
    <div
      className="stack"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="stack-cards">
        {HERO_CARDS.map((c, i) => {
          const p = (i - front + COUNT) % COUNT;
          return (
            <article
              key={c.title}
              className="stack-card metal"
              data-p={p}
              style={{ "--c": c.color }}
              onClick={() => setFront(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFront(i);
                }
              }}
              tabIndex={p === 0 ? 0 : -1}
              role="button"
              aria-label={`${c.role}: ${c.title}`}
            >
              <div className="stack-photo">
                <img src={c.photo} alt={c.alt} loading="eager" decoding="async" />
              </div>
              <div className="stack-body">
                <span className="chip">{c.role}</span>
                <h4>{c.title}</h4>
                <p>{c.text}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="stack-dots" role="tablist" aria-label="Show card">
        {HERO_CARDS.map((c, i) => (
          <button
            key={c.title}
            type="button"
            role="tab"
            aria-selected={i === front}
            aria-label={c.title}
            className={i === front ? "on" : ""}
            onClick={() => setFront(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroStack;
