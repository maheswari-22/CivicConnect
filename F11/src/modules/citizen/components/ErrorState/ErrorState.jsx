import Button from '../Button/Button';
import { TriangleAlert } from 'lucide-react';
import './ErrorState.css';

export default function ErrorState({
  title = 'Something went wrong',
  description = 'We couldn\u2019t complete that action. Please try again.',
  actionLabel = 'Try again',
  onAction,
}) {
  return (
    <div className="error-state anim-fade-up">
      <div className="error-state__icon"><TriangleAlert size={30} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {onAction && <Button variant="secondary" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
