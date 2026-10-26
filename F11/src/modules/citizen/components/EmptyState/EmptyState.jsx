import Button from '../Button/Button';
import './EmptyState.css';

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state anim-fade-up">
      <div className="empty-state__art anim-float-slow">
        {Icon && <Icon size={40} />}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && (
        <Button variant="primary" onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
