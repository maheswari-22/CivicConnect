import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  User,
  Phone,
  CalendarDays,
  Building2,
  TriangleAlert,
  Camera,
  CircleCheckBig,
  UserCheck,
  Navigation,
  ImageOff,
  ZoomIn,
  Check,
  RotateCcw,
  Star,
} from "lucide-react";

import Sidebar from "./Sidebar";
import LocationMap from "../components/LocationMap";
import PhotoLightbox from "../components/PhotoLightbox";
import RejectComplaint from "../components/RejectComplaint";
import {
  getComplaints,
  getComplaintById,
  assignWorker,
  dismissEmergency,
  formatDate,
} from "../data/complaints";
import {
  CATEGORY_DEPARTMENT,
  getWorkerById,
  getInitials,
  rankWorkers,
} from "../data/workers";
import "./AssignWorker.css";
import SmartImage from "../../../shared/SmartImage";
import SeverityMeter from "../../../shared/SeverityMeter";
import EmergencyBadge from "../../../shared/EmergencyBadge";

const STEPS = ["Reported", "Worker Assigned", "In Progress", "Completed"];
/* How many steps are finished, and which one is being worked on now */
const STEP_STATE = {
  New: { done: 1, current: 1, label: "Awaiting assignment" },
  Pending: { done: 2, current: 2, label: "Waiting to start" },
  "In Progress": { done: 2, current: 2, label: "Work in progress" },
  Completed: { done: 4, current: -1, label: "" },
};

/* Keyed by complaint id so all local state resets when the URL changes */
function AssignWorker() {
  const { complaintId } = useParams();
  return <AssignWorkerPage key={complaintId} complaintId={complaintId} />;
}

function AssignWorkerPage({ complaintId }) {
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(() => getComplaintById(complaintId));
  const [sameDepartmentOnly, setSameDepartmentOnly] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  // An emergency is always High. Otherwise a new complaint starts on the priority the photo AI suggests (the officer can change it).
  const [dismissOpen, setDismissOpen] = useState(false);   // "this is not an emergency" form
  const [dismissReason, setDismissReason] = useState("");
  const [dismissing, setDismissing] = useState(false);
  const [priority, setPriority] = useState(() => (complaint?.isEmergency ? "High" : complaint?.status === "New" ? complaint.suggestedPriority || "Medium" : complaint?.priority || "Medium"));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const ranked = useMemo(
    () =>
      complaint
        ? rankWorkers(complaint, getComplaints(), { sameDepartmentOnly })
        : [],
    [complaint, sameDepartmentOnly]
  );

  /* ---------------------------------------------------------- not found */
  if (!complaint) {
    return (
      <div className="aw-page">
        <Sidebar />
        <main className="aw-main">
          <div className="aw-empty">
            <h1>Complaint not found</h1>
            <p>This complaint may have been removed. Please pick another one.</p>
            <button type="button" className="aw-btn-primary" onClick={() => navigate("/complaints")}>
              <ArrowLeft size={18} />
              Back to Complaints
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isNew = complaint.status === "New";
  const stepState = STEP_STATE[complaint.status];
  const department = CATEGORY_DEPARTMENT[complaint.category];
  const assignedWorker = getWorkerById(complaint.assignedWorkerId);
  const statusClass = complaint.status.toLowerCase().replace(" ", "-");

  const stepDates = [
    complaint.reportedOn,
    complaint.assignedOn,
    complaint.progressPhotos[0]?.at,
    complaint.completedOn,
  ];

  const selectedWorker = ranked.find((worker) => worker.id === selectedId);

  const handleToggleDepartment = (event) => {
    const next = event.target.checked;
    setSameDepartmentOnly(next);

    /* Drop a selection that is no longer in the list */
    if (next && selectedWorker && !selectedWorker.departmentMatch) {
      setSelectedId("");
    }
  };

  const handleAssign = async () => {
    if (!selectedId) {
      setError("Please select a worker to assign this complaint.");
      return;
    }

    setError("");
    setAssigning(true);

    try {
      const updated = await assignWorker(complaint.id, {
        workerId: selectedId,
        priority,
        note: note.trim(),
      });
      setComplaint(updated);
      setNotice(`${updated.assignedWorkerName} has been assigned to ${updated.id}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Could not assign this worker. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const handleDismiss = async () => {
    if (dismissReason.trim().length < 5) {
      setError("Give a short reason (at least 5 characters). The citizen will see it.");
      return;
    }
    setError("");
    setDismissing(true);
    try {
      const updated = await dismissEmergency(complaint.id, dismissReason.trim());
      setComplaint(updated);
      setPriority(updated.priority);
      setDismissOpen(false);
      setDismissReason("");
      setNotice("The emergency flag was removed. This is now a normal complaint and the citizen has been told why.");
    } catch (err) {
      setError(err.message || "Could not remove the emergency flag. Please try again.");
    } finally {
      setDismissing(false);
    }
  };

  /* Photos shown once a worker is on the job */
  const photos = [
    { key: "reported", src: complaint.image, label: "Reported by citizen", caption: complaint.title, tone: "reported" },
    ...complaint.progressPhotos.map((photo, index) => ({
      key: `progress-${index}`,
      src: photo.src,
      label: "Worker progress",
      caption: `${photo.caption} · ${formatDate(photo.at)}`,
      tone: "progress",
    })),
    ...(complaint.completionPhoto
      ? [{ key: "completed", src: complaint.completionPhoto, label: "Work completed", caption: `Completed on ${formatDate(complaint.completedOn)}`, tone: "completed" }]
      : []),
  ];

  return (
    <div className="aw-page">
      <Sidebar />

      <main className="aw-main">
        {/* ------------------------------------------------------- top bar */}
        <div className="aw-top">
          <button type="button" className="aw-back" onClick={() => navigate("/complaints")}>
            <ArrowLeft size={18} />
            Back to Complaints
          </button>
        </div>

        <header className="aw-header">
          <div>
            <p className="aw-eyebrow">{isNew ? "ASSIGN WORKER" : "COMPLAINT DETAILS"}</p>
            <h1>{complaint.title}</h1>
            <p className="aw-subtitle">
              {isNew
                ? "Review the complaint, then choose the nearest suitable worker."
                : "Track the assigned worker and the progress of this complaint."}
            </p>
          </div>

          <div className="aw-badges">
            {complaint.isEmergency && complaint.status !== "Completed" && <EmergencyBadge />}
            <span className={`aw-priority priority-${complaint.priority.toLowerCase()}`}>
              <TriangleAlert size={16} />
              {complaint.priority} priority
            </span>
            <span className={`aw-status status-${statusClass}`}>{complaint.status}</span>
          </div>
        </header>

        {complaint.reopenReason && complaint.status !== "Completed" && (
          <div className="aw-flag aw-flag-warn" role="status">
            <RotateCcw size={18} />
            <span>
              <strong>Reopened by the citizen{complaint.reopenCount > 1 ? ` (${complaint.reopenCount}×)` : ""}:</strong>{" "}
              {complaint.reopenReason}
            </span>
          </div>
        )}
        {complaint.rating && (
          <div className="aw-flag" role="status">
            <Star size={18} />
            <span>
              <strong>Citizen rated this fix {complaint.rating}/5.</strong>
              {complaint.feedback ? ` “${complaint.feedback}”` : ""}
            </span>
          </div>
        )}

        {notice && (
          <div className="aw-notice" role="status">
            <CircleCheckBig size={20} />
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
              <Check size={16} />
            </button>
          </div>
        )}

        {/* ------------------------------------------------ complaint card */}
        <section className="aw-card aw-summary">
          <button
            type="button"
            className="aw-summary-photo"
            onClick={() =>
              setLightbox({ src: complaint.image, title: "Reported by citizen", caption: complaint.title })
            }
            aria-label="View complaint photo"
          >
            <SmartImage src={complaint.image} alt={complaint.title} />
            <span><ZoomIn size={15} /> View photo</span>
          </button>

          <div className="aw-summary-body">
            <span className="aw-id">{complaint.id}</span>
            <p className="aw-description">{complaint.description}</p>
            {complaint.needsReview && (
              <p className="aw-review-flag" role="note">
                The photo could not be verified automatically. Look at it before sending a worker.
              </p>
            )}

            <div className="aw-facts">
              <div className="aw-fact">
                <span className="aw-fact-icon"><Building2 size={18} /></span>
                <div><small>Category</small><strong>{complaint.category} · {department}</strong></div>
              </div>
              <div className="aw-fact">
                <span className="aw-fact-icon"><MapPin size={18} /></span>
                <div><small>Location</small><strong>{complaint.location}</strong></div>
              </div>
              <div className="aw-fact">
                <span className="aw-fact-icon"><User size={18} /></span>
                <div><small>Reported by</small><strong>{complaint.citizenName}</strong></div>
              </div>
              <div className="aw-fact">
                <span className="aw-fact-icon"><Phone size={18} /></span>
                <div><small>Citizen contact</small><strong>{complaint.citizenContact}</strong></div>
              </div>
              <div className="aw-fact">
                <span className="aw-fact-icon"><CalendarDays size={18} /></span>
                <div><small>Reported on</small><strong>{formatDate(complaint.reportedOn)}</strong></div>
              </div>
              <div className="aw-fact">
                <span className="aw-fact-icon"><Navigation size={18} /></span>
                <div><small>Ward</small><strong>{complaint.ward}</strong></div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ progress */}
        <section className="aw-card aw-tracker">
          <div className="aw-tracker-top">
            <h2>Resolution Progress</h2>
            <strong>{complaint.progress}%</strong>
          </div>

          <div className="aw-bar" aria-hidden="true">
            <div className="aw-bar-fill" style={{ width: `${complaint.progress}%` }} />
          </div>

          <ol className="aw-steps">
            {STEPS.map((step, index) => {
              const state =
                index < stepState.done
                  ? "done"
                  : index === stepState.current
                  ? "current"
                  : "todo";

              return (
                <li key={step} className={`aw-step ${state}`}>
                  <span className="aw-step-dot">
                    {state === "done" ? <Check size={15} /> : index + 1}
                  </span>
                  <strong>{step}</strong>
                  <small>
                    {state === "done"
                      ? formatDate(stepDates[index])
                      : state === "current"
                      ? stepState.label
                      : "Waiting"}
                  </small>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ------------------------------------------- ASSIGN (New only) */}
        {isNew && (
          <section className="aw-card aw-assign">
            <div className="aw-section-head">
              <div>
                <h2>Assign a Worker</h2>
                <p>
                  Workers are ranked by distance from <strong>{complaint.location}</strong>. Pick
                  the nearest worker from the right department.
                </p>
              </div>

              <label className="aw-switch">
                <input
                  type="checkbox"
                  checked={sameDepartmentOnly}
                  onChange={handleToggleDepartment}
                />
                <span className="aw-switch-track" />
                <span className="aw-switch-label">Only {department}</span>
              </label>
            </div>

            <div className="aw-assign-grid">
              <LocationMap
                complaint={complaint}
                workers={ranked}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id);
                  setError("");
                }}
              />

              <div className="aw-workers" role="radiogroup" aria-label="Available workers">
                {ranked.map((worker, index) => (
                  <label
                    key={worker.id}
                    className={`aw-worker${selectedId === worker.id ? " selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="worker"
                      value={worker.id}
                      checked={selectedId === worker.id}
                      onChange={() => {
                        setSelectedId(worker.id);
                        setError("");
                      }}
                    />

                    <span className="aw-worker-avatar">{getInitials(worker.name)}</span>

                    <span className="aw-worker-info">
                      <strong>{worker.name}</strong>
                      <small>{worker.department} · {worker.ward}</small>
                      <span className="aw-worker-tags">
                        {index === 0 && <em className="tag tag-green">Nearest</em>}
                        {worker.sameWard && <em className="tag tag-gold">Same ward</em>}
                        {!worker.departmentMatch && <em className="tag tag-gray">Other department</em>}
                        <em className="tag tag-plain">
                          {worker.activeTasks === 0
                            ? "Available"
                            : `${worker.activeTasks} active ${worker.activeTasks === 1 ? "task" : "tasks"}`}
                        </em>
                      </span>
                    </span>

                    <span className="aw-worker-distance">
                      <strong>{worker.distance.toFixed(1)}</strong>
                      <small>km away</small>
                    </span>
                  </label>
                ))}

                {ranked.length === 0 && (
                  <p className="aw-no-workers">No workers found for this department.</p>
                )}
              </div>
            </div>

            {isNew && (complaint.aiSeverity != null || complaint.isEmergency) && (
              <div className={`aw-ai${complaint.isEmergency ? " aw-ai--emergency" : ""}`}>
                {complaint.isEmergency && (
                  <p className="aw-ai__emergency">
                    <EmergencyBadge /> The citizen marked this as an emergency{complaint.emergencyReason ? `: “${complaint.emergencyReason}”` : ""}.
                    Priority is locked to High and the worker is asked to finish it today, unless you decide below that it is not an emergency.
                  </p>
                )}
                {complaint.isEmergency && (
                  dismissOpen ? (
                    <div className="aw-ai__dismiss">
                      <label htmlFor="aw-dismiss">Why is this not an emergency? The citizen will see your answer.</label>
                      <input id="aw-dismiss" type="text" maxLength={300} value={dismissReason} onChange={(e) => setDismissReason(e.target.value)} placeholder="For example: litter only, nobody is at risk" />
                      <div className="aw-ai__dismiss-actions">
                        <button type="button" className="aw-ai__confirm" onClick={handleDismiss} disabled={dismissing}>{dismissing ? "Saving..." : "Remove emergency flag"}</button>
                        <button type="button" className="aw-ai__cancel" onClick={() => { setDismissOpen(false); setError(""); }} disabled={dismissing}>Keep as emergency</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="aw-ai__link" onClick={() => setDismissOpen(true)}>This is not an emergency</button>
                  )
                )}
                {complaint.aiSeverity != null && (
                  <div className="aw-ai__meter">
                    <SeverityMeter score={complaint.aiSeverity} label="AI severity from the photo" />
                    <p>
                      Suggested priority: <strong>{complaint.suggestedPriority}</strong>
                      {!complaint.isEmergency && priority !== complaint.suggestedPriority && (
                        <button type="button" onClick={() => setPriority(complaint.suggestedPriority)}>Use suggestion</button>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="aw-form">
              <div className="aw-field aw-field-priority">
                <label htmlFor="aw-priority">Priority</label>
                <select
                  id="aw-priority"
                  value={priority}
                  disabled={complaint.isEmergency}
                  onChange={(event) => setPriority(event.target.value)}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="aw-field aw-field-note">
                <label htmlFor="aw-note">Instructions for the worker (optional)</label>
                <textarea
                  id="aw-note"
                  rows={2}
                  value={note}
                  maxLength={200}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Bring a truck, work between 9 AM and 12 PM…"
                />
              </div>
            </div>

            <div className="aw-actions">
              <p className={`aw-selection${error ? " is-error" : ""}`} role={error ? "alert" : undefined}>
                {error ||
                  (selectedWorker
                    ? `${selectedWorker.name} selected · ${selectedWorker.distance.toFixed(1)} km from the complaint`
                    : "No worker selected yet.")}
              </p>

              <button
                type="button"
                className="aw-btn-primary"
                onClick={handleAssign}
                disabled={assigning}
              >
                <UserCheck size={19} />
                {assigning ? "Assigning…" : "Assign Worker"}
              </button>
            </div>

            <RejectComplaint complaintId={complaint.id} onRejected={() => navigate("/complaints")} />
          </section>
        )}

        {/* ------------------------------------ WORKER + PHOTOS (assigned) */}
        {!isNew && assignedWorker && (
          <>
            <section className="aw-card aw-assigned">
              <div className="aw-section-head">
                <div>
                  <h2>{complaint.status === "Completed" ? "Resolved By" : "Assigned Worker"}</h2>
                </div>
              </div>

              <div className="aw-assigned-row">
                <span className="aw-worker-avatar large">{getInitials(assignedWorker.name)}</span>

                <div className="aw-assigned-name">
                  <strong>{assignedWorker.name}</strong>
                  <small>{assignedWorker.id} · {assignedWorker.department}</small>
                </div>

                <dl className="aw-assigned-meta">
                  <div><dt>Base ward</dt><dd>{assignedWorker.ward}</dd></div>
                  <div><dt>Phone</dt><dd>{assignedWorker.phone}</dd></div>
                  <div><dt>Assigned on</dt><dd>{formatDate(complaint.assignedOn)}</dd></div>
                  <div>
                    <dt>{complaint.status === "Completed" ? "Completed on" : "Expected by"}</dt>
                    <dd>{formatDate(complaint.status === "Completed" ? complaint.completedOn : complaint.expectedBy)}</dd>
                  </div>
                </dl>
              </div>

              {complaint.note && (
                <p className="aw-instructions">
                  <strong>Instructions:</strong> {complaint.note}
                </p>
              )}
            </section>

            <section className="aw-card aw-photos">
              <div className="aw-section-head">
                <div>
                  <h2>Worker Progress Photos</h2>
                  <p>Photos uploaded by the worker from the field.</p>
                </div>
              </div>

              <div className="aw-photo-grid">
                {photos.map((photo) => (
                  <button
                    key={photo.key}
                    type="button"
                    className="aw-photo"
                    onClick={() =>
                      setLightbox({ src: photo.src, title: photo.label, caption: photo.caption })
                    }
                  >
                    <SmartImage src={photo.src} alt={photo.label} loading="lazy" />
                    <span className={`aw-photo-label ${photo.tone}`}>
                      <Camera size={13} />
                      {photo.label}
                    </span>
                    <span className="aw-photo-caption">{photo.caption}</span>
                  </button>
                ))}

                {complaint.progressPhotos.length === 0 && !complaint.completionPhoto && (
                  <div className="aw-photo-empty">
                    <ImageOff size={30} />
                    <strong>No progress photo yet</strong>
                    <span>{assignedWorker.name} has not uploaded a photo. It will appear here once work starts.</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <PhotoLightbox
        src={lightbox?.src}
        title={lightbox?.title}
        caption={lightbox?.caption}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}

export default AssignWorker;
