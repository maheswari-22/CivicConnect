import { useEffect, useState } from 'react';
import { Bell, CircleCheck } from 'lucide-react';
import AppLayout from '../../layouts/AppLayout/AppLayout';
import NotificationCard from '../../components/NotificationCard/NotificationCard';
import EmptyState from '../../components/EmptyState/EmptyState';
import { SkeletonList } from '../../components/Loading/Loading';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../../data/mockData';
import './Alerts.css';

export default function Alerts() {
  const [notifications, setNotifications] = useState(null);

  const load = () => fetchNotifications().then(setNotifications).catch(() => setNotifications([]));

  useEffect(() => { load(); }, []);

  const unread = notifications?.filter((n) => !n.read).length || 0;

  const handleRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id).catch(() => {});
  };

  const handleReadAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead().catch(() => {});
  };

  return (
    <AppLayout>
      <div className="container alerts">
        <div className="alerts__head">
          <div>
            <h1>Alerts</h1>
            <p>{unread > 0 ? `${unread} unread update${unread > 1 ? 's' : ''}` : 'You\u2019re all caught up'}</p>
          </div>
          {unread > 0 && (
            <button className="alerts__mark-all" onClick={handleReadAll}>
              <CircleCheck size={15} /> Mark all read
            </button>
          )}
        </div>

        {notifications === null && <SkeletonList count={5} />}

        {notifications && notifications.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No alerts yet"
            description="You\u2019ll see updates here as your complaints move through review, assignment, and resolution."
          />
        )}

        {notifications && notifications.length > 0 && (
          <div className="alerts__list">
            {notifications.map((n, i) => (
              <NotificationCard key={n.id} notification={n} index={i} onRead={handleRead} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
