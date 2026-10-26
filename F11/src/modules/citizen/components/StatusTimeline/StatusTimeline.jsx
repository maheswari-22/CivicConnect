import { STATUS_STEPS, statusIndex } from '../../data/mockData';
import { Check } from 'lucide-react';
import './StatusTimeline.css';

export default function StatusTimeline({ status }) {
  const currentIdx = statusIndex(status);
  const isRejected = status === 'rejected';

  return (
    <ol className="timeline" aria-label="Complaint progress">
      {STATUS_STEPS.map((step, i) => {
        const state = isRejected
          ? (i === 0 ? 'done' : 'pending')
          : i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending';

        return (
          <li key={step.id} className={`timeline__item timeline__item--${state}`}>
            <div className="timeline__rail">
              <span className="timeline__node" style={{ animationDelay: `${i * 0.08}s` }}>
                {state === 'done' ? <Check size={13} /> : null}
              </span>
              {i < STATUS_STEPS.length - 1 && (
                <span className="timeline__line">
                  <span
                    className="timeline__line-fill"
                    style={{ transform: state === 'done' ? 'scaleY(1)' : 'scaleY(0)', transitionDelay: `${i * 0.08 + 0.15}s` }}
                  />
                </span>
              )}
            </div>
            <div className="timeline__content">
              <p className="timeline__label">{step.label}</p>
              {state === 'current' && (
                <p className="timeline__message anim-fade-up">{step.message}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
