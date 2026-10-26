import { useEffect, useMemo, useState } from 'react';
import { Search, CirclePlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout/AppLayout';
import ComplaintCard from '../../components/ComplaintCard/ComplaintCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import ErrorState from '../../components/ErrorState/ErrorState';
import { SkeletonList } from '../../components/Loading/Loading';
import { CATEGORIES, STATUS_STEPS, fetchComplaints } from '../../data/mockData';
import './Complaints.css';

export default function ComplaintHistory() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  const load = () => {
    setError(false);
    setComplaints(null);
    fetchComplaints()
      .then(setComplaints)
      .catch(() => setError(true));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!complaints) return [];
    return complaints.filter((c) => {
      const matchesQuery =
        !query ||
        c.id.toLowerCase().includes(query.toLowerCase()) ||
        c.location.toLowerCase().includes(query.toLowerCase()) ||
        c.description.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'all' || c.category === category;
      const matchesStatus = status === 'all' || c.status === status;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [complaints, query, category, status]);

  const hasActiveFilters = query || category !== 'all' || status !== 'all';

  return (
    <AppLayout>
      <div className="container history">
        <div className="history__head">
          <h1>My Complaints</h1>
          <p>Every issue you&rsquo;ve reported, in one place.</p>
        </div>

        <div className="history__search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search by ID, location, or keyword"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>
          )}
        </div>

        <div className="history__filters no-scrollbar">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_STEPS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {complaints === null && !error && <SkeletonList count={5} />}

        {error && <ErrorState onAction={load} />}

        {complaints && !error && filtered.length === 0 && (
          <EmptyState
            icon={CirclePlus}
            title={hasActiveFilters ? 'No matching complaints' : 'No complaints yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search or filters.'
                : 'Your community is looking good! Report an issue when you spot one.'
            }
            actionLabel={hasActiveFilters ? undefined : 'Report an Issue'}
            onAction={() => navigate('/report')}
          />
        )}

        {complaints && !error && filtered.length > 0 && (
          <div className="history__list">
            {filtered.map((c, i) => (
              <ComplaintCard key={c.id} complaint={c} index={i} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
