import CategoryIcon from '../icons/CategoryIcon';
import './CategoryCard.css';

export default function CategoryCard({ category, selected, onSelect, index = 0 }) {
  return (
    <button
      type="button"
      className={`category-card anim-fade-up ${selected ? 'category-card--selected' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onSelect(category.id)}
      aria-pressed={selected}
    >
      <span className="category-card__icon">
        <CategoryIcon id={category.id} size={26} />
      </span>
      <span className="category-card__label">{category.label}</span>
      <span className="category-card__desc">{category.desc}</span>
    </button>
  );
}
