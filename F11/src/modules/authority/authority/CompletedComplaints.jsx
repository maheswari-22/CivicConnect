import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./CompletedComplaints.css";
import { TriangleAlert } from "lucide-react";
import { getComplaints, priorityLabel, relativeDay } from "../data/complaints";
import SmartImage from "../../../shared/SmartImage";

function CompletedComplaints() {
  const navigate = useNavigate();

  const complaints = useMemo(
    () =>
      getComplaints()
        .filter((c) => c.status === "Completed")
        .map((c) => ({
          ...c,
          priority: priorityLabel(c.priority),
          worker: c.assignedWorkerName || "—",
          completed: `Completed ${relativeDay(c.completedOn)}`,
        })),
    []
  );

  const resolvedToday = complaints.filter(
    (c) => relativeDay(c.completedOn) === "Today"
  ).length;
  const workerCount = new Set(complaints.map((c) => c.assignedWorkerId)).size;

  return (
    <div className="completed-page">

      <Sidebar />

      <main className="completed-main">

        {/* HEADER */}

        <section className="completed-header">

          <div>
            <p>RESOLVED SERVICES</p>

            <h1>Completed Complaints</h1>

            <span>
              Review complaints that have been successfully resolved.
            </span>
          </div>

        </section>

        {/* SUMMARY */}

        <section className="completed-summary">

          <div className="completed-summary-card">
            <strong>{complaints.length}</strong>
            <span>Completed Complaints</span>
          </div>

          <div className="completed-summary-card">
            <strong>{resolvedToday}</strong>
            <span>Resolved Today</span>
          </div>

          <div className="completed-summary-card">
            <strong>{workerCount}</strong>
            <span>Workers</span>
          </div>

          <div className="completed-summary-card">
            <strong>100%</strong>
            <span>Success Rate</span>
          </div>

        </section>

        {/* LIST */}

        <section className="completed-section">

          <div className="completed-section-heading">
            <p>RESOLUTION HISTORY</p>
            <h2>Successfully Completed</h2>
          </div>

          <div className="completed-grid">

            {complaints.map((complaint) => (
              <article
                className="completed-card"
                key={complaint.id}
              >

                <div className="completed-image">

                  {/* PRIORITY BADGE */}
                  <span
                    className={`completed-priority ${
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

                  <SmartImage
                    src={complaint.image}
                    alt={complaint.title}
                  />

                </div>

                <div className="completed-content">

                  <div className="completed-top">

                    <span className="completed-id">
                      {complaint.id}
                    </span>

                    <span className="completed-status">
                      Completed
                    </span>

                  </div>

                  <h3>{complaint.title}</h3>

                  <p>
                    Category: {complaint.category}
                  </p>

                  <div className="completed-worker">
                    <span>Assigned Worker</span>
                    <strong>{complaint.worker}</strong>
                  </div>

                  <div className="completed-date">
                    <span>Resolution</span>
                    <strong>{complaint.completed}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/complaints/${complaint.id}`)
                    }
                  >
                    View Details
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

export default CompletedComplaints;