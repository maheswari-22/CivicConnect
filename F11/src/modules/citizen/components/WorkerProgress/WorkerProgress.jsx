import { WORKER_TASK_STEPS } from '../../data/mockData';
import { Check, Phone, Star } from 'lucide-react';
import './WorkerProgress.css';

// Read-only view for citizens of how far the assigned field worker
// has gotten on their complaint — a task checklist plus a percent
// complete bar, separate from the broader complaint status timeline.
export default function WorkerProgress({ worker }) {
  if (!worker) return null;

  const initials = worker.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="worker-progress">
      <div className="worker-progress__header">
        <span className="worker-progress__avatar">{initials}</span>
        <div className="worker-progress__who">
          <strong>{worker.name}</strong>
          <span>{worker.role}</span>
        </div>
        <a className="worker-progress__call" href={`tel:${worker.phone}`} aria-label={`Call ${worker.name}`}>
          <Phone size={15} />
        </a>
      </div>

      <div className="worker-progress__meta">
        {worker.rating != null ? (
          <span className="worker-progress__rating"><Star size={13} /> {worker.rating}</span>
        ) : <span />}
        <span className="worker-progress__percent">{worker.percent}% complete</span>
      </div>

      <div className="worker-progress__bar" role="progressbar" aria-valuenow={worker.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="worker-progress__bar-fill" style={{ width: `${worker.percent}%` }} />
      </div>

      <ul className="worker-progress__tasks">
        {WORKER_TASK_STEPS.map((task, i) => {
          const done = i < worker.completedSteps;
          return (
            <li key={task} className={`worker-progress__task ${done ? 'is-done' : ''}`}>
              <span className="worker-progress__task-check">{done && <Check size={12} />}</span>
              {task}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
