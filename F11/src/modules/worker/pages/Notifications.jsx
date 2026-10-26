import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import NotificationsView from "../../../shared/NotificationsView.jsx";
import useNotifications from "../../../shared/useNotifications.js";
import { WORKER_READ_KEY, buildWorkerNotifications } from "../data/notifications";

function Notifications() {
  const { items, unread, markRead, markAllRead } = useNotifications(
    WORKER_READ_KEY,
    buildWorkerNotifications
  );

  const navigate = useNavigate();

  // Clicking a notification marks it as read and opens what it is about
  // (the task, the history page or the task list).
  const open = (n) => {
    markRead(n.id);
    if (n.to) navigate(n.to, n.state ? { state: n.state } : undefined);
  };

  return (
    <PageTransition>
      <Sidebar />
      <NotificationsView
        eyebrow="WORKER NOTIFICATIONS"
        subtitle="Your assigned tasks and progress updates."
        items={items}
        unread={unread}
        onOpen={open}
        onMarkAllRead={markAllRead}
        emptyText="New task assignments will appear here."
      />
    </PageTransition>
  );
}

export default Notifications;
