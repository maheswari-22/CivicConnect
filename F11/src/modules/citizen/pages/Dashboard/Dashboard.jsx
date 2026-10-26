import { useEffect, useState } from 'react';
import { ArrowRight, FileText, Target, Bell, UserRound, CirclePlus, ClipboardList, Clock, CircleCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout/AppLayout';
import RoleHero from '../../../../shared/RoleHero';
import { PageContainer, PageHead, StatGrid, StatCard } from '../../../../shared/PortalPage';
import Card from '../../components/Card/Card';
import ComplaintCard from '../../components/ComplaintCard/ComplaintCard';
import { SkeletonList } from '../../components/Loading/Loading';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { fetchComplaints, fetchDashboardStats, fetchNotifications } from '../../data/mockData';
import '../../../../shared/severity.css';
import './Dashboard.css';

function buildActions({ totalComplaints, unread }) {
  return [
    {
      to: '/report',
      label: 'Report Issue',
      desc: 'Log a new civic problem',
      icon: CirclePlus,
      isActive: (pathname) => pathname.startsWith('/report'),
    },
    {
      to: '/complaints',
      label: 'My Complaints',
      desc: 'View all your reports',
      icon: FileText,
      badge: totalComplaints > 0 ? totalComplaints : null,
      isActive: (pathname) => pathname === '/complaints',
    },
    {
      to: '/complaints',
      label: 'Track Status',
      desc: 'Follow an active complaint',
      icon: Target,
      isActive: (pathname) => pathname.startsWith('/track'),
    },
    {
      to: '/alerts',
      label: 'Alerts',
      desc: 'Updates & resolutions',
      icon: Bell,
      badge: unread > 0 ? unread : null,
      badgeTone: 'accent',
      isActive: (pathname) => pathname.startsWith('/alerts'),
    },
    {
      to: '/profile',
      label: 'Profile',
      desc: 'Manage your details',
      icon: UserRound,
      isActive: (pathname) => pathname.startsWith('/profile'),
    },
  ];
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 700;
    const tick = (t) => {
      const progress = Math.min((t - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{display}</>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    fetchDashboardStats().then(setStats).catch(() => {});
    fetchComplaints().then((list) => setComplaints(list.slice(0, 3))).catch(() => {});
    fetchNotifications().then((list) => setUnread(list.filter((n) => !n.read).length)).catch(() => {});
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'Citizen';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const actions = buildActions({ totalComplaints: stats?.total || 0, unread });

  return (
    <AppLayout>
      <PageContainer className="dashboard">
        {user && !user.email && (
          <section className="cc-alert cc-alert--soft" role="status">
            <span className="cc-alert__text">
              <strong>Add an email address to your account</strong>
              <span>Without one, we cannot send you a link if you forget your password.</span>
            </span>
            <button type="button" className="cc-alert__action" onClick={() => navigate('/profile')}>Add email</button>
          </section>
        )}

        <PageHead
          eyebrow="CITIZEN DASHBOARD"
          title={`${greeting}, ${firstName}`}
          subtitle="Report issues and follow every complaint until it is resolved."
          badge={unread}
          onNotify={() => navigate('/alerts')}
          notifyLabel="Alerts"
        />

        <RoleHero
          role="citizen"
          badge="Citizen Module"
          highlight="Citizen!"
          text="See a problem? Report it and help make your community cleaner, safer and better every day."
          ctaLabel="Report an Issue"
          onCta={() => navigate('/report')}
          image="/roles/citizen.jpg"
          imageAlt="CivicConnect citizen reporting an issue from a phone"
        />

        <StatGrid>
          <StatCard icon={ClipboardList} tone="blue" label="Active Complaints" value={stats ? <AnimatedNumber value={stats.active} /> : '—'} />
          <StatCard icon={Clock} tone="gold" label="In Progress" value={stats ? <AnimatedNumber value={stats.inProgress} /> : '—'} />
          <StatCard icon={CircleCheck} tone="green" label="Resolved" value={stats ? <AnimatedNumber value={stats.resolved} /> : '—'} />
        </StatGrid>

        <section className="dashboard__section">
          <h2 className="dashboard__section-title">Quick Actions</h2>
          <div className="dashboard__actions">
            {actions.map((action, i) => {
              const active = action.isActive(location.pathname);
              return (
                <Card
                  key={action.label}
                  interactive
                  className={`dashboard__action ${active ? 'dashboard__action--active' : ''} anim-fade-up`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                  onClick={() => navigate(action.to)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(action.to)}
                  aria-current={active ? 'page' : undefined}
                >
                  {action.badge != null && (
                    <span className={`dashboard__action-badge dashboard__action-badge--${action.badgeTone || 'default'}`}>
                      {action.badge > 9 ? '9+' : action.badge}
                    </span>
                  )}
                  <span className="dashboard__action-icon">
                    <action.icon size={22} />
                  </span>
                  <span className="dashboard__action-label">{action.label}</span>
                  <span className="dashboard__action-desc">{action.desc}</span>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="dashboard__section">
          <div className="dashboard__section-head">
            <h2 className="dashboard__section-title">Recent Complaints</h2>
            <button className="dashboard__see-all" onClick={() => navigate('/complaints')}>
              See all <ArrowRight size={14} />
            </button>
          </div>

          {complaints === null && <SkeletonList count={3} />}

          {complaints && complaints.length === 0 && (
            <EmptyState
              icon={CirclePlus}
              title="Nothing reported yet"
              description="Help improve your community by reporting an issue when you spot one."
              actionLabel="Report an Issue"
              onAction={() => navigate('/report')}
            />
          )}

          {complaints && complaints.length > 0 && (
            <div className="dashboard__complaints">
              {complaints.map((c, i) => (
                <ComplaintCard key={c.id} complaint={c} index={i} />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
    </AppLayout>
  );
}
