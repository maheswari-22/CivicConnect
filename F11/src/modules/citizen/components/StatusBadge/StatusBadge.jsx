import { STATUS_STEPS } from '../../data/mockData';
import './StatusBadge.css';

const TONE = {
  submitted: 'info',
  review: 'warning',
  assigned: 'warning',
  progress: 'accent',
  resolved: 'success',
  rejected: 'error',
};

export default function StatusBadge({ status, size = 'md' }) {
  const step = STATUS_STEPS.find((s) => s.id === status);
  const label = status === 'rejected' ? 'Rejected' : step?.label || status;
  const tone = TONE[status] || 'info';
  return (
    <span className={`status-badge status-badge--${tone} status-badge--${size}`}>
      <span className="status-badge__dot" />
      {label}
    </span>
  );
}
