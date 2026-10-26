import { MapPin, Construction, Lightbulb, Trash2, Droplets, CircleEllipsis } from 'lucide-react';

const MAP = {
  road: Construction,
  light: Lightbulb,
  garbage: Trash2,
  water: Droplets,
  other: CircleEllipsis,
};

export default function CategoryIcon({ id, size = 20, className = '' }) {
  const Icon = MAP[id] || MapPin;
  return <Icon size={size} className={className} />;
}
