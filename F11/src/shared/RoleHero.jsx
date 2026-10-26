import { ArrowRight, MapPin, BellRing, ClipboardCheck, Camera, Users, Activity } from "lucide-react";
import "./hero.css";

/*
  RoleHero - the welcome banner used on the Citizen, Authority and Worker home pages.
  Same size, gradient, badge, heading, gold button and photo frame in all three
  modules. Only the photo focus point and the two small info chips change per role.
*/
const ROLES = {
  citizen: {
    focus: "42% 30%",
    chips: [
      { icon: MapPin, label: "Location auto-tagged" },
      { icon: BellRing, label: "Live status alerts" },
    ],
  },
  worker: {
    focus: "55% 28%",
    chips: [
      { icon: ClipboardCheck, label: "Tasks at a glance" },
      { icon: Camera, label: "Before & after photos" },
    ],
  },
  authority: {
    focus: "51% 28%",
    chips: [
      { icon: Users, label: "Assign in one click" },
      { icon: Activity, label: "Track to resolution" },
    ],
  },
};

function RoleHero({
  role = "citizen",
  badge,
  highlight,
  text,
  ctaLabel,
  onCta,
  image,
  imageAlt,
  className = "",
}) {
  const cfg = ROLES[role] || ROLES.citizen;
  const [first, second] = cfg.chips;
  const FirstIcon = first.icon;
  const SecondIcon = second.icon;

  return (
    <div className={`cc-hero-wrap ${className}`.trim()}>
      <section className={`cc-hero cc-hero--${role}`}>
        <div className="cc-hero__content">
          <div className="cc-hero__badge">
            <span></span>
            {badge}
          </div>

          <h2>
            Welcome, <strong>{highlight}</strong>
          </h2>

          <p>{text}</p>

          <button type="button" className="cc-hero__button" onClick={onCta}>
            {ctaLabel}
            <ArrowRight size={17} />
          </button>
        </div>

        <div className="cc-hero__visual">
          <span className="cc-hero__ring" aria-hidden="true"></span>

          <div className="cc-hero__frame">
            <img
              src={image}
              alt={imageAlt}
              className="cc-hero__photo"
              style={{ objectPosition: cfg.focus }}
              width="800"
              height="800"
              draggable={false}
              decoding="async"
            />
          </div>

          <div className="cc-hero__chip cc-hero__chip--a" aria-hidden="true">
            <FirstIcon size={15} />
            <span>{first.label}</span>
          </div>

          <div className="cc-hero__chip cc-hero__chip--b" aria-hidden="true">
            <SecondIcon size={15} />
            <span>{second.label}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default RoleHero;
