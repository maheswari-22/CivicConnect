import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, ChevronRight } from 'lucide-react';
import Card from '../Card/Card';
import StatusBadge from '../StatusBadge/StatusBadge';
import CategoryIcon from '../icons/CategoryIcon';
import { categoryById } from '../../data/mockData';
import EmergencyBadge from '../../../../shared/EmergencyBadge';
import './ComplaintCard.css';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ComplaintCard({ complaint, index = 0 }) {
  const navigate = useNavigate();
  const category = categoryById(complaint.category);

  const open = !['resolved', 'rejected'].includes(complaint.status);
  const urgent = complaint.isEmergency && open;

  return (
    <Card
      interactive
      className={`complaint-card anim-fade-up${urgent ? ' cc-is-emergency' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => navigate(`/track/${complaint.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/track/${complaint.id}`)}
    >
      <div className="complaint-card__icon">
        <CategoryIcon id={complaint.category} size={22} />
      </div>
      <div className="complaint-card__body">
        <div className="complaint-card__top">
          <span className="complaint-card__id">{complaint.id}</span>
          {urgent && <EmergencyBadge />}
          <StatusBadge status={complaint.status} size="sm" />
        </div>
        <h3 className="complaint-card__title">{category.label}</h3>
        <div className="complaint-card__meta">
          <span><MapPin size={13} /> {complaint.location}</span>
          <span><Calendar size={13} /> {formatDate(complaint.createdAt)}</span>
        </div>
        {complaint.worker && (
          <div className="complaint-card__worker-bar" aria-hidden="true">
            <span className="complaint-card__worker-bar-fill" style={{ width: `${complaint.worker.percent}%` }} />
          </div>
        )}
      </div>
      <ChevronRight className="complaint-card__chevron" size={20} />
    </Card>
  );
}
