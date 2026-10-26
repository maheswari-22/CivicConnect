import { portalPath } from "../data/content";

function Closing() {
  return (
    <>
      <section className="block" style={{ padding: "50px 0" }}>
        <div className="wrap">
          <p className="quote reveal">
            CivicConnect combines AI, location tracking and real-time updates so
            authorities resolve problems faster and citizens stay engaged in the
            quality of public service.
          </p>
        </div>
      </section>

      <section className="block" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="cta metal-dark reveal">
            <h2>
              Ready to improve <em>your city?</em>
            </h2>
            <p>Pick your role and jump in. It takes less than a minute to sign up.</p>
            <div className="cta-buttons">
              <a className="btn" href={portalPath("citizen")} data-magnetic>Citizen</a>
              <a className="btn" href={portalPath("worker")} data-magnetic>Worker</a>
              <a className="btn" href={portalPath("authority")} data-magnetic>Authority</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Closing;
