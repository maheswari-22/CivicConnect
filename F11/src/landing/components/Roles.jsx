import { User, HardHat, Landmark } from "lucide-react";
import { ROLE_CARDS, portalPath } from "../data/content";

const ICON = { citizen: User, worker: HardHat, authority: Landmark };

function Roles() {
  return (
    <section className="block" id="roles">
      <div className="wrap">
        <div className="head">
          <h2 className="reveal">
            One platform, <em>three roles.</em>
          </h2>
          <p className="reveal" style={{ "--d": "0.1s" }}>
            Each role gets a focused workspace with the same look, the same
            sidebar and the same simple flow.
          </p>
        </div>

        <div className="grid-3">
          {ROLE_CARDS.map((r, i) => {
            const Icon = ICON[r.id];
            return (
              <div
                key={r.id}
                className="tile role-tile metal reveal"
                data-tilt
                style={{ "--c": r.color, "--d": `${i * 0.1}s` }}
              >
                <div className="role-tile-top">
                  <span className="role-ico"><Icon size={20} strokeWidth={2.2} /></span>
                  <span className="chip">{r.label}</span>
                </div>
                <h3>{r.title}</h3>
                <p>{r.text}</p>
                {/* Opens that role's sign-in page */}
                <a className="btn" href={portalPath(r.id)} data-magnetic>
                  {r.action}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Roles;
