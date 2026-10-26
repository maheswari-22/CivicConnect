import { useNavigate } from 'react-router-dom';
import { Bell, CircleCheck, UserCheck, Wrench, Send } from 'lucide-react';
import './NotificationCard.css';

const ICONS = [
  { match: /submitted/i, icon: Send, tone: 'info' },
  { match: /review/i, icon: Bell, tone: 'warning' },
  { match: /assigned/i, icon: UserCheck, tone: 'warning' },
  { match: /progress|started/i, icon: Wrench, tone: 'accent' },
  { match: /resolved/i, icon: CircleCheck, tone: 'success' },
];

function resolveIcon(title) {
  return ICONS.find((i) => i.match.test(title)) || { icon: Bell, tone: 'info' };
}

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = diff / 3600000;
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

export default function NotificationCard({ notification, index = 0, onRead }) {
  const navigate = useNavigate();
  const { icon: Icon, tone } = resolveIcon(notification.title);

  const handleClick = () => {
    onRead?.(notification.id);
    if (notification.complaintId) navigate(`/track/${notification.complaintId}`);
  };

  return (
    <button
      type="button"
      className={`notif-card anim-fade-up ${!notification.read ? 'notif-card--unread' : ''}`}
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={handleClick}
    >
      <span className={`notif-card__icon notif-card__icon--${tone}`}>
        <Icon size={18} />
      </span>
      <span className="notif-card__body">
        <span className="notif-card__title">{notification.title}</span>
        <span className="notif-card__text">{notification.body}</span>
        <span className="notif-card__time">{timeAgo(notification.createdAt)}</span>
      </span>
      {!notification.read && <span className="notif-card__dot" aria-label="Unread" />}
    </button>
  );
}
