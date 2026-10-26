import './StepProgress.css';
import { Check } from 'lucide-react';

export default function StepProgress({ steps, current }) {
  return (
    <div className="step-progress" aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((label, i) => (
        <div key={label} className="step-progress__item">
          <div className="step-progress__node-wrap">
            <div className={`step-progress__node ${i < current ? 'is-done' : i === current ? 'is-active' : ''}`}>
              {i < current ? <Check size={13} /> : i + 1}
            </div>
            <span className="step-progress__label">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className="step-progress__track">
              <div
                className="step-progress__fill"
                style={{ transform: i < current ? 'scaleX(1)' : 'scaleX(0)' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
