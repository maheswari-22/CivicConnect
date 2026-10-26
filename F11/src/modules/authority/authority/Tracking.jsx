import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Icon from "../components/Icons";
import { Camera, ArrowRight } from "lucide-react";
import PhotoLightbox from "../components/PhotoLightbox";
import { getComplaints, TRACKING_STATUS, formatDate } from "../data/complaints";
import "./Tracking.css";
import SmartImage from "../../../shared/SmartImage";

function toTrackingItem(c) {
  const photos = [
    ...c.progressPhotos.map((photo) => ({ src: photo.src, caption: photo.caption })),
    ...(c.completionPhoto ? [{ src: c.completionPhoto, caption: "Work completed" }] : []),
  ];

  const lastUpdate =
    c.completedOn ||
    c.progressPhotos[c.progressPhotos.length - 1]?.at ||
    c.assignedOn ||
    c.reportedOn;

  return {
    id: c.id,
    title: c.title,
    category: c.category,
    worker: c.assignedWorkerName || "Not Assigned",
    status: TRACKING_STATUS[c.status],
    progress: c.progress,
    image: c.image,
    location: c.ward,
    submitted: formatDate(c.reportedOn),
    updated: formatDate(lastUpdate),
    expected: c.expectedBy ? formatDate(c.expectedBy) : "To be scheduled",
    priority: c.priority,
    photo: photos[photos.length - 1] || null,
  };
}

const filters = ["All", "Submitted", "Assigned", "In Progress", "Completed"];
const statusSteps = ["Submitted", "Assigned", "In Progress", "Completed"];

function Tracking() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);

  const complaints = useMemo(() => getComplaints().map(toTrackingItem), []);

  const filteredComplaints = useMemo(() => {
    const term = search.trim().toLowerCase();
    return complaints.filter((complaint) => {
      const matchesFilter = filter === "All" || complaint.status === filter;
      const matchesSearch = !term || [complaint.id, complaint.title, complaint.category, complaint.worker, complaint.location].some((value) => value.toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [complaints, filter, search]);

  const counts = useMemo(() => ({
    active: complaints.filter((c) => c.status !== "Completed").length,
    progress: complaints.filter((c) => c.status === "In Progress").length,
    assigned: complaints.filter((c) => c.worker !== "Not Assigned").length,
    completed: complaints.filter((c) => c.status === "Completed").length,
  }), [complaints]);

  const getStatusClass = (status) => `tracking-status ${status.toLowerCase().replaceAll(" ", "-")}`;

  return (
    <div className="tracking-layout">
      <Sidebar />
      <main className="tracking-main">
        <section className="tracking-header">
          <div>
            <p className="tracking-label">COMPLAINT MONITORING</p>
            <h1>Complaint Tracking</h1>
            <p className="tracking-subtitle">Monitor complaint progress, worker assignments and expected completion.</p>
          </div>
          <button type="button" className="tracking-back-button" onClick={() => navigate("/dashboard")}><Icon name="arrowLeft" size={17} /> Dashboard</button>
        </section>

        <section className="tracking-summary-grid">
          <div className="tracking-summary-card"><span className="tracking-summary-icon blue"><Icon name="complaints" size={20} /></span><div><strong>{counts.active}</strong><span>Active complaints</span></div></div>
          <div className="tracking-summary-card"><span className="tracking-summary-icon gold"><Icon name="clock" size={20} /></span><div><strong>{counts.progress}</strong><span>In progress</span></div></div>
          <div className="tracking-summary-card"><span className="tracking-summary-icon purple"><Icon name="worker" size={20} /></span><div><strong>{counts.assigned}</strong><span>Workers assigned</span></div></div>
          <div className="tracking-summary-card"><span className="tracking-summary-icon green"><Icon name="check" size={20} /></span><div><strong>{counts.completed}</strong><span>Completed</span></div></div>
        </section>

        <section className="tracking-filter-card">
          <div className="tracking-filter-top">
            <div className="tracking-filter-title"><p>FILTER & SEARCH</p><h2>Find a Complaint</h2></div>
            <div className="tracking-search"><Icon name="search" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ID, issue, ward or worker..." aria-label="Search complaints" />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><Icon name="x" size={16} /></button>}</div>
          </div>
          <div className="tracking-filters">
            {filters.map((item) => <button key={item} type="button" className={`tracking-filter ${filter === item ? "active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
        </section>

        <section className="tracking-list-section">
          <div className="tracking-list-heading">
            <div><p>LIVE MONITORING</p><h2>Current Status</h2></div>
            <span className="tracking-count"><Icon name="clipboard" size={15} /> {filteredComplaints.length} {filteredComplaints.length === 1 ? "Complaint" : "Complaints"}</span>
          </div>

          <div className="tracking-list">
            {filteredComplaints.map((complaint) => {
              const currentIndex = statusSteps.indexOf(complaint.status);
              return (
                <article className="tracking-card" key={complaint.id}>
                  <div className="tracking-image-wrap">
                    <div className="tracking-image"><SmartImage src={complaint.image} alt={complaint.title} /></div>
                    <span className={`tracking-priority priority-${complaint.priority.toLowerCase()}`}><Icon name="alert" size={13} /> {complaint.priority} priority</span>
                  </div>

                  <div className="tracking-details">
                    <div className="tracking-card-top">
                      <div className="tracking-title-block">
                        <span className="tracking-id">{complaint.id}</span>
                        <h3>{complaint.title}</h3>
                        <div className="tracking-meta"><span>{complaint.category}</span><span><Icon name="mapPin" size={13} /> {complaint.location}</span></div>
                      </div>
                      <span className={getStatusClass(complaint.status)}><span className="status-dot" />{complaint.status}</span>
                    </div>

                    <div className="tracking-progress-section">
                      <div className="tracking-progress-header"><span>Resolution progress</span><strong>{complaint.progress}%</strong></div>
                      <div className="tracking-progress-bar"><div className="tracking-progress-fill" style={{ width: `${complaint.progress}%` }} /></div>
                    </div>

                    <div className="tracking-steps">
                      {statusSteps.map((step, index) => {
                        const stepState = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
                        return <React.Fragment key={step}><div className={`tracking-step ${stepState}`}><span className="tracking-step-dot">{stepState === "done" ? <Icon name="check" size={13} /> : index + 1}</span><span className="tracking-step-label">{step}</span></div>{index < statusSteps.length - 1 && <div className={`tracking-step-line ${index < currentIndex ? "done" : ""}`} />}</React.Fragment>;
                      })}
                    </div>

                    <div className="tracking-worker"><span className="tracking-worker-avatar"><Icon name="worker" size={17} /></span><div><span>Assigned Worker</span><strong>{complaint.worker}</strong></div></div>

                    <div className="tracking-card-footer">
                      {complaint.photo ? (
                        <button type="button" className="tracking-photo" onClick={() => setLightbox({ src: complaint.photo.src, title: "Worker progress photo", caption: complaint.photo.caption })}>
                          <SmartImage src={complaint.photo.src} alt="Worker progress" />
                          <span><Camera size={14} /> Worker photo</span>
                        </button>
                      ) : (
                        <span className="tracking-photo-none"><Camera size={14} /> No worker photo yet</span>
                      )}
                      <button type="button" className="tracking-view" onClick={() => navigate(`/complaints/${complaint.id}`)}>View details <ArrowRight size={15} /></button>
                    </div>

                    <div className="tracking-dates">
                      <div><span><Icon name="calendar" size={12} /> Submitted</span><strong>{complaint.submitted}</strong></div>
                      <div><span><Icon name="refresh" size={12} /> Last Updated</span><strong>{complaint.updated}</strong></div>
                      <div><span><Icon name="clock" size={12} /> Expected</span><strong>{complaint.expected}</strong></div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filteredComplaints.length === 0 && <div className="tracking-empty"><Icon name="search" size={28} /><h3>No complaints found</h3><p>Try a different search term or status filter.</p><button type="button" onClick={() => { setSearch(""); setFilter("All"); }}>Clear filters</button></div>}
        </section>
      </main>

      <PhotoLightbox src={lightbox?.src} title={lightbox?.title} caption={lightbox?.caption} onClose={() => setLightbox(null)} />
    </div>
  );
}

export default Tracking;
