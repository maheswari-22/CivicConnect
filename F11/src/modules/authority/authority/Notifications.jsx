import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationsView from "../../../shared/NotificationsView.jsx";
import useNotifications from "../../../shared/useNotifications.js";
import { AUTHORITY_READ_KEY, buildAuthorityNotifications } from "../data/notifications";

function Notifications() {
  const { items, unread, markRead, markAllRead } = useNotifications(
    AUTHORITY_READ_KEY,
    buildAuthorityNotifications
  );

  const navigate = useNavigate();

  // Clicking a notification marks it as read and opens that complaint.
  const open = (n) => {
    markRead(n.id);
    if (n.to) navigate(n.to);
  };

  return (
    <>
      <Sidebar />
      <NotificationsView
        eyebrow="AUTHORITY NOTIFICATIONS"
        subtitle="New complaints and worker progress across your jurisdiction."
        items={items}
        unread={unread}
        onOpen={open}
        onMarkAllRead={markAllRead}
        emptyText="New complaints and worker updates will appear here."
      />
    </>
  );
}

export default Notifications;
