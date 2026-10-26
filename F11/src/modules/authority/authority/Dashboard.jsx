import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Clock, UserCheck, CircleCheck, AlertTriangle } from "lucide-react";
import Sidebar from "./Sidebar";
import RoleHero from "../../../shared/RoleHero";
import { PageContainer, PageHead, StatGrid, StatCard } from "../../../shared/PortalPage";
import Icon from "../components/Icons";
import useNotifications from "../../../shared/useNotifications.js";
import { getComplaints, getUnassigned, hoursWaiting, waitingLabel, isOverdue, alertLimitHours } from "../data/complaints";
import AttentionBar from "../components/AttentionBar";
import EmergencyBadge from "../../../shared/EmergencyBadge";
import { getAuthority } from "../authAdapter";
import { firstName } from "../../../shared/initials.js";
import { AUTHORITY_READ_KEY, buildAuthorityNotifications } from "../data/notifications";
import "./Dashboard.css";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
}

function Dashboard() {
  const navigate = useNavigate();

  /* The bell opens the Notifications page; the badge shows how many are unread. */
  const { unread } = useNotifications(AUTHORITY_READ_KEY, buildAuthorityNotifications);

  /* Live data from the shared complaint store */
  const complaints = useMemo(
    () =>
      getComplaints().map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        location: c.ward,
        status: c.status,
        progress: c.progress,
      })),
    []
  );

  // New complaints with no worker yet, longest-waiting first (shown as an alert at the top).
  const unassigned = useMemo(() => getUnassigned(), []);
  const overdueCount = unassigned.filter((c) => isOverdue(c)).length;

  const [greeting, setGreeting] = useState(getGreeting());
  // First name of the signed-in officer, from the profile cached at login.
  const authorityName = firstName(getAuthority().name) || "Officer";

  useEffect(() => {
    const timer = setInterval(() => {
      setGreeting(getGreeting());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const newCount = complaints.filter(
      (c) => c.status === "New"
    ).length;

    const pending = complaints.filter(
      (c) => c.status === "Pending"
    ).length;

    const inProgress = complaints.filter(
      (c) => c.status === "In Progress"
    ).length;

    const completed = complaints.filter(
      (c) => c.status === "Completed"
    ).length;

    const total = complaints.length;

    // An area with no complaints yet must show 0%, not NaN.
    const progress = total
      ? Math.round((completed / total) * 100)
      : 0;

    return {
      newCount,
      pending,
      inProgress,
      completed,
      total,
      progress,
    };
  }, [complaints]);

  const nextComplaint = complaints.find(
    (c) => c.status === "New"
  );

  const statCards = [
    { label: "New Complaints", value: stats.newCount, icon: ClipboardList, tone: "blue" },
    { label: "Pending Complaints", value: stats.pending, icon: Clock, tone: "gold" },
    { label: "In Progress", value: stats.inProgress, icon: UserCheck, tone: "purple" },
    { label: "Completed", value: stats.completed, icon: CircleCheck, tone: "green" },
  ];

  return (
    <div className="dashboard-layout">

      <Sidebar />

      <main className="cc-main fade-in-stack">
        <PageContainer>

        <PageHead
          eyebrow="AUTHORITY DASHBOARD"
          title={`${greeting}, ${authorityName}`}
          subtitle="Here’s what’s happening across your jurisdiction today."
          badge={unread}
          onNotify={() => navigate("/notifications")}
        />

        <RoleHero
          role="authority"
          className="authority-hero"
          badge="Authority Module"
          highlight="Authority!"
          text="Review incoming civic issues, assign the right worker and track every complaint through to resolution."
          ctaLabel="View Complaints"
          onCta={() => navigate("/complaints")}
          image="/roles/authority.jpg"
          imageAlt="CivicConnect authority officer briefing a team"
        />


        <AttentionBar />

        {unassigned.length > 0 && (
          <section className="unassigned-alert" role="alert" aria-label="Complaints without a worker">
            <div className="unassigned-alert__head">
              <span className="unassigned-alert__icon" aria-hidden="true">
                <AlertTriangle size={20} />
              </span>
              <div>
                <h2>
                  {unassigned.length} complaint{unassigned.length > 1 ? "s" : ""} still need
                  {unassigned.length > 1 ? "" : "s"} a worker
                </h2>
                <p>
                  {overdueCount > 0
                    ? `${overdueCount} ${overdueCount > 1 ? "have" : "has"} waited past ${overdueCount > 1 ? "their" : "its"} limit (1 hour for emergencies, 2 for severe, 4 for the rest).`
                    : "Assign a worker so work can start."}
                </p>
              </div>
            </div>

            <ul className="unassigned-alert__list">
              {unassigned.slice(0, 4).map((c) => {
                const waited = hoursWaiting(c);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="unassigned-alert__item"
                      onClick={() => navigate(`/complaints/${c.id}`)}
                    >
                      <span className="unassigned-alert__main">
                        <strong>{c.title}{c.isEmergency && <> <EmergencyBadge size={11} /></>}</strong>
                        <small>{c.id} · {c.place ? `${c.place}, ` : ""}{c.location}</small>
                      </span>
                      <span className={`unassigned-alert__wait${waited >= alertLimitHours(c) ? " unassigned-alert__wait--late" : ""}`}>
                        Waiting {waitingLabel(waited)}
                      </span>
                      <span className="unassigned-alert__cta">Assign</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {unassigned.length > 4 && (
              <button type="button" className="unassigned-alert__more" onClick={() => navigate("/complaints")}>
                View all {unassigned.length} unassigned
              </button>
            )}
          </section>
        )}

        <StatGrid>
          {statCards.map((card) => (
            <StatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              tone={card.tone}
            />
          ))}
        </StatGrid>

        {/* =====================================================
            PERFORMANCE + NEEDS ATTENTION
        ===================================================== */}

        <section className="dashboard-grid">

          {/* RESOLUTION PROGRESS */}

          <div className="progress-card">

            <div className="card-heading">

              <div>

                <p className="mini-label">
                  PERFORMANCE
                </p>

                <h3>
                  Resolution Progress
                </h3>

                <p>
                  Overall complaint completion rate
                </p>

              </div>


              <Icon
                name="chart"
                size={20}
              />

            </div>


            <div className="progress-content">

              <div className="progress-ring">

                <svg
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >

                  <circle
                    className="progress-track"
                    cx="50"
                    cy="50"
                    r="46"
                  />

                  <circle
                    className="progress-value"
                    cx="50"
                    cy="50"
                    r="46"
                  />

                </svg>


                <span className="progress-number">
                  {stats.progress}%
                </span>

              </div>


              <div className="progress-text">

                <strong>
                  {stats.completed} of {stats.total} complaints
                </strong>

                <p>
                  resolved overall
                </p>

                <span>
                  {stats.pending +
                    stats.inProgress +
                    stats.newCount}{" "}
                  complaints still open
                </span>

              </div>

            </div>

          </div>


          {/* NEEDS ATTENTION */}

          <div className="quick-card">

            <div className="quick-icon">

              <Icon
                name="alert"
                size={22}
              />

            </div>


            <div className="quick-body">

              <p className="quick-label">
                NEEDS ATTENTION
              </p>

              <h3>
                {nextComplaint?.title ||
                  "All caught up"}
              </h3>

              <p className="quick-location">

                <Icon
                  name="mapPin"
                  size={13}
                />

                {nextComplaint?.location ||
                  "Every complaint has a worker."}

              </p>

            </div>


            <button
              type="button"
              className="quick-arrow"
              onClick={() =>
                navigate(
                  nextComplaint
                    ? `/complaints/${nextComplaint.id}`
                    : "/complaints"
                )
              }
              aria-label="View complaints"
            >

              <Icon
                name="arrowRight"
                size={18}
              />

            </button>

          </div>

        </section>


        {/* =====================================================
            RECENT ACTIVITY
        ===================================================== */}

        <section className="recent-section">

          <div className="section-heading">

            <div>

              <p>
                RECENT ACTIVITY
              </p>

              <h2>
                Latest Complaints
              </h2>

            </div>


            <button
              type="button"
              className="view-all"
              onClick={() =>
                navigate("/complaints")
              }
            >

              View all

              <Icon
                name="arrowRight"
                size={15}
              />

            </button>

          </div>


          <div className="recent-list">

            {complaints.slice(0, 4).map((complaint) => (

              <button
                key={complaint.id}
                type="button"
                className="recent-task"
                onClick={() =>
                  navigate(`/complaints/${complaint.id}`)
                }
              >

                <div className="task-icon">

                  <Icon
                    name={
                      complaint.category === "Road"
                        ? "tracking"
                        : complaint.category ===
                          "Electricity"
                        ? "chart"
                        : complaint.category ===
                          "Water"
                        ? "pending"
                        : "complaints"
                    }
                    size={19}
                  />

                </div>


                <div className="task-main">

                  <span>
                    {complaint.id}
                  </span>

                  <h3>
                    {complaint.title}
                  </h3>

                  <p>

                    <Icon
                      name="mapPin"
                      size={13}
                    />

                    {complaint.location}

                  </p>

                </div>


                <div className="task-progress">

                  <span>
                    {complaint.progress}%
                  </span>

                  <div>

                    <i
                      style={{
                        width: `${complaint.progress}%`,
                      }}
                    />

                  </div>

                </div>


                <span
                  className={`task-status-pill status-${complaint.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                >

                  {complaint.status}

                </span>


                <Icon
                  name="arrowRight"
                  className="task-arrow"
                  size={17}
                />

              </button>

            ))}

          </div>

        </section>


        {/* =====================================================
            QUICK ACTIONS
        ===================================================== */}

        <section className="quick-actions-section">

          <div className="section-heading">

            <div>

              <p>
                QUICK ACTIONS
              </p>

              <h2>
                Manage Services
              </h2>

            </div>

          </div>


          <div className="quick-actions-grid">

            {/* VIEW COMPLAINTS */}

            <button
              type="button"
              className="quick-action-card"
              onClick={() =>
                navigate("/complaints")
              }
            >

              <span className="quick-action-icon">

                <Icon
                  name="complaints"
                  size={22}
                />

              </span>


              <span className="quick-action-text">

                <strong>
                  View Complaints
                </strong>

                <small>
                  Review citizen complaints
                </small>

              </span>


              <Icon
                name="arrowRight"
                size={20}
              />

            </button>


            {/* ASSIGN WORKER */}

            <button
              type="button"
              className="quick-action-card"
              onClick={() =>
                navigate(
                  nextComplaint
                    ? `/complaints/${nextComplaint.id}`
                    : "/complaints"
                )
              }
            >

              <span className="quick-action-icon">

                <Icon
                  name="worker"
                  size={22}
                />

              </span>


              <span className="quick-action-text">

                <strong>
                  Assign Worker
                </strong>

                <small>
                  Dispatch complaints quickly
                </small>

              </span>


              <Icon
                name="arrowRight"
                size={20}
              />

            </button>


            {/* TRACK COMPLAINTS */}

            <button
              type="button"
              className="quick-action-card"
              onClick={() =>
                navigate("/tracking")
              }
            >

              <span className="quick-action-icon">

                <Icon
                  name="tracking"
                  size={22}
                />

              </span>


              <span className="quick-action-text">

                <strong>
                  Track Complaints
                </strong>

                <small>
                  Monitor live progress
                </small>

              </span>


              <Icon
                name="arrowRight"
                size={20}
              />

            </button>

          </div>

        </section>

        </PageContainer>
      </main>

    </div>
  );
}

export default Dashboard;