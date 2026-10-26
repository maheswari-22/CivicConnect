import { roles } from '../data/roles';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { ArrowLeft } from 'lucide-react';
import { leaveTo } from '../../shared/pageFlow.js';

// Real photo of each role (square, same crop style and colour grade for all three).
function RolePhoto({ role }) {
  return (
    <div className="role-photo">
      <img
        src={role.photo}
        alt={`${role.title} using CivicConnect`}
        width="800"
        height="800"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

function GetStartedPage() {
  useScrollReveal();

  // Each role opens its own portal, which starts on the shared sign-in page.
  const chooseRole = (id) => {
    leaveTo(`/${id}`);
  };

  return (
    <>
      <section className="getstarted-hero">
        <a href="#home" className="getstarted-back">
          <ArrowLeft size={15} strokeWidth={2.2} />
          Back to Home
        </a>

        <div className="getstarted-badge">GET STARTED</div>

        <h1>
          Choose how you'll use
          <br />
          <span>CivicConnect</span>
        </h1>

        <p>
          Pick the role that fits you best. You'll be taken straight to sign in.
        </p>
      </section>

      <section className="getstarted-roles">

        <div className="role-grid">

          {roles.map((role) => (
            <div
              key={role.id}
              className="role-card metal"
              data-tilt
              onClick={() => chooseRole(role.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  chooseRole(role.id);
                }
              }}
            >

              <RolePhoto role={role} />

              <div className="role-content">
                <div className="role-icon">
                  <role.Icon size={20} strokeWidth={2.2} />
                </div>
                <div className="role-info">
                  <h3>{role.title}</h3>
                </div>
              </div>

              <p className="role-description">
                {role.description}
              </p>

              <button
                className="login-button"
                data-magnetic
                onClick={(e) => {
                  e.stopPropagation();
                  chooseRole(role.id);
                }}
              >
                {role.action}
              </button>

            </div>
          ))}

        </div>

      </section>
    </>
  );
}

export default GetStartedPage;
