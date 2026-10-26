import './Loading.css';

export function Spinner({ size = 28 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" role="status" />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 14 }} />
      <div className="skeleton-card__lines">
        <div className="skeleton" style={{ width: '40%', height: 12 }} />
        <div className="skeleton" style={{ width: '70%', height: 16 }} />
        <div className="skeleton" style={{ width: '55%', height: 12 }} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

export default function PageLoader({ label = 'Loading Civic Connect' }) {
  return (
    <div className="page-loader">
      <Spinner size={36} />
      <p>{label}</p>
    </div>
  );
}
