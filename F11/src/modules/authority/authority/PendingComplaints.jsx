import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./PendingComplaints.css";
import { TriangleAlert } from "lucide-react";
import { getComplaints, priorityLabel } from "../data/complaints";
import SmartImage from "../../../shared/SmartImage";
import EmergencyBadge from "../../../shared/EmergencyBadge";

function PendingComplaints() {
  const navigate = useNavigate();

  /* Complaints still waiting on the authority (New) or on the worker (Pending) */
  const complaints = useMemo(
    () =>
      getComplaints()
        .filter((c) => c.status === "New" || c.status === "Pending")
        .map((c) => ({
          ...c,
          priority: priorityLabel(c.priority),
          worker: c.assignedWorkerName || "Not Assigned",
        }))
        // Emergencies first (the list otherwise keeps the server's newest-first order).
        .map((c, i) => ({ c, i }))
        .sort((a, b) => Number(b.c.isEmergency) - Number(a.c.isEmergency) || a.i - b.i)
        .map(({ c }) => c),
    []
  );

  const assignedCount = complaints.filter((c) => c.status === "Pending").length;
  const newCount = complaints.filter((c) => c.status === "New").length;
  const resolvedCount = useMemo(
    () => getComplaints().filter((c) => c.status === "Completed").length,
    []
  );

  return (
    <div className="pending-page">
      <Sidebar />

      <main className="pending-main">

        <section className="pending-header">
          <p>PENDING SERVICES</p>

          <h1>Pending Complaints</h1>

          <span>
            Monitor complaints that still require action.
          </span>
        </section>

        {/* SUMMARY */}

        <section className="pending-summary">

          <div className="pending-summary-card">
            <strong>{complaints.length}</strong>
            <span>Pending Complaints</span>
          </div>

          <div className="pending-summary-card">
            <strong>{assignedCount}</strong>
            <span>Workers Assigned</span>
          </div>

          <div className="pending-summary-card">
            <strong>{newCount}</strong>
            <span>Needs Attention</span>
          </div>

          <div className="pending-summary-card">
            <strong>{resolvedCount}</strong>
            <span>Resolved</span>
          </div>

        </section>

        {/* LIST */}

        <section className="pending-section">

          <div className="pending-section-heading">
            <p>ACTIVE QUEUE</p>
            <h2>Complaints Awaiting Action</h2>
          </div>

          <div className="pending-grid">

            {complaints.map((complaint) => (
              <article
                className={`pending-card${complaint.isEmergency ? " cc-is-emergency" : ""}`}
                key={complaint.id}
              >

                <div className="pending-image">

                  {/* PRIORITY BADGE */}
                  <span
                    className={`pending-priority ${
                      complaint.priority === "High priority"
                        ? "priority-high"
                        : complaint.priority === "Medium priority"
                        ? "priority-medium"
                        : "priority-low"
                    }`}
                  >
                    <span className="priority-warning"><TriangleAlert size={16} /></span>
                    {complaint.priority}
                  </span>

                  {complaint.isEmergency && <EmergencyBadge className="pending-emergency" />}

                  <SmartImage
                    src={complaint.image}
                    alt={complaint.title}
                  />

                </div>

                <div className="pending-content">

                  <div className="pending-top">
                    <span className="pending-id">
                      {complaint.id}
                    </span>

                    <span className="pending-status">
                      {complaint.status}
                    </span>
                  </div>

                  <h3>{complaint.title}</h3>

                  <p>
                    Category: {complaint.category}
                  </p>

                  <div className="pending-worker">
                    <span>Assigned Worker</span>
                    <strong>{complaint.worker}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/complaints/${complaint.id}`)
                    }
                  >
                    {complaint.status === "New"
                      ? "Assign Worker"
                      : "View Details"}
                  </button>

                </div>

              </article>
            ))}

          </div>

        </section>

      </main>
    </div>
  );
}

export default PendingComplaints;