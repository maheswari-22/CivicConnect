import {
  ArrowLeft,
  MapPin,
  Clock3,
  AlertTriangle,
  User,
  Building2,
  Play,
  CheckCircle2,
} from "lucide-react";

import EmergencyBadge from "../../../shared/EmergencyBadge";
import DueChip from "../components/DueChip";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import WorkPhotosPanel from "../components/WorkPhotosPanel";
import WorkTimeline from "../components/WorkTimeline";
import {
  MAX_PROGRESS_PHOTOS,
  addProgressPhoto,
  completeTask as saveTaskCompletion,
  getTaskUpdate,
  removeProgressPhoto,
  setCompletionPhoto,
  startTask as saveTaskStart,
} from "../../../shared/workPhotos.js";
import { prepareImage } from "../../../shared/imageTools.js";

import "../styles/taskDetails.css";
import SmartImage from "../../../shared/SmartImage";

function TaskDetails() {
  const location = useLocation();
  const navigate = useNavigate();

  const task = location.state?.task;

  // Status + photos come from the shared store, so they survive a reload and
  // are the same data the Authority and Citizen portals read.
  const [update, setUpdate] = useState(() =>
    task ? getTaskUpdate(task.id) : null
  );
  const taskStatus = update ? update.status : "Pending";

  const [imageZoomed, setImageZoomed] = useState(false);
  const [caption, setCaption] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [uploading, setUploading] = useState(false);

  const progressPhotos = update?.progressPhotos || [];
  const completionPhoto = update?.completionPhoto || null;
  const canEditPhotos = taskStatus === "In Progress";

  /* Runs a store write and reports a problem (photo limit, network, ...) to the worker. */
  const applyResult = (result) => {
    if (result.update) setUpdate(result.update);
    if (!result.ok) {
      setPhotoError(
        result.full
          ? `You can add up to ${MAX_PROGRESS_PHOTOS} progress photos.`
          : result.error || "Could not save this change. Please try again."
      );
      return false;
    }
    setPhotoError("");
    return true;
  };

  const pickPhoto = async (event, onReady) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    setUploading(true);
    setPhotoError("");
    let prepared = null;
    try {
      // Big camera / gallery photos are shrunk here first, so they always upload.
      prepared = await prepareImage(picked);
      await onReady(prepared.file);
    } catch (error) {
      setPhotoError(error.message);
    } finally {
      if (prepared) URL.revokeObjectURL(prepared.previewUrl);
      setUploading(false);
    }
  };

  const handleProgressPhoto = (event) =>
    pickPhoto(event, async (photo) => {
      if (applyResult(await addProgressPhoto(task.id, { photo, caption }))) setCaption("");
    });

  const handleCompletionPhoto = (event) =>
    pickPhoto(event, async (photo) => applyResult(await setCompletionPhoto(task.id, photo)));

  const handleRemovePhoto = async (id) => applyResult(await removeProgressPhoto(task.id, id));

  /* =========================================================
     TASK LOCATIONS
     ========================================================= */

  const taskPosition = task?.coords || [17.6868, 83.2185];

  /* =========================================================
     TASK NOT FOUND
     ========================================================= */

  if (!task) {
    return (
      <PageTransition>
        <Sidebar />

        <div className="app-shell">
          <main className="page-content task-details-page">

            <div className="task-not-found">

              <h1>Task Not Found</h1>

              <p>
                Please select a task from the Assigned Tasks page.
              </p>

              <button
                onClick={() =>
                  navigate("/assigned-tasks")
                }
              >
                <ArrowLeft size={17} />
                Back to Assigned Tasks
              </button>

            </div>

          </main>

        </div>
      </PageTransition>
    );
  }

  /* =========================================================
     START TASK
     ========================================================= */

  const startTask = async () => {
    setUploading(true);
    applyResult(await saveTaskStart(task.id));
    setUploading(false);
  };

  /* =========================================================
     COMPLETE TASK
     ========================================================= */

  const completeTask = async () => {

    /* A completion photo is the proof of work the authority and citizen see */

    if (!completionPhoto) {
      setPhotoError("Upload a completion photo before completing the task.");
      return;
    }

    setUploading(true);
    const ok = applyResult(await saveTaskCompletion(task.id));
    setUploading(false);
    if (ok) navigate("/history");
  };

  return (
    <PageTransition>

      <Sidebar />

      <div className="app-shell">

        <main className="page-content task-details-page">

          {/* =====================================================
              BACK BUTTON
              ===================================================== */}

          <motion.button
            className="task-back-button"

            onClick={() =>
              navigate("/assigned-tasks")
            }

            initial={{
              opacity: 0,
              x: -15,
            }}

            animate={{
              opacity: 1,
              x: 0,
            }}

            transition={{
              duration: 0.35,
            }}
          >

            <ArrowLeft size={18} />

            Back to Assigned Tasks

          </motion.button>


          {/* =====================================================
              HEADER
              ===================================================== */}

          <motion.div
            className="task-details-header"

            initial={{
              opacity: 0,
              y: -15,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.4,
            }}
          >

            <div>

              <p className="task-details-label">
                TASK DETAILS
              </p>

              <h1>
                {task.title}
              </h1>

              <p>
                Review and complete the assigned work.
              </p>

            </div>

            <span
              className={`task-details-priority ${task.priorityClass}`}
            >

              <AlertTriangle size={15} />

              {task.priority} Priority

            </span>

            {task.isEmergency && <EmergencyBadge>Emergency · finish today</EmergencyBadge>}
            <DueChip task={task} />

          </motion.div>


          {/* =====================================================
              MAIN CONTENT
              ===================================================== */}

          <section className="task-details-layout">


            {/* ===================================================
                LEFT SIDE
                =================================================== */}

            <div className="task-details-left">


              {/* =================================================
                  BEFORE IMAGE
                  ================================================= */}

              <motion.div
                className="task-details-image-card"

                initial={{
                  opacity: 0,
                  x: -20,
                }}

                animate={{
                  opacity: 1,
                  x: 0,
                }}

                transition={{
                  duration: 0.45,
                }}
              >

                <div className="task-details-image-wrapper">

                  <SmartImage
                    src={task.image}
                    alt={task.title}

                    className={`task-details-image ${
                      imageZoomed
                        ? "image-zoomed"
                        : ""
                    }`}

                    onClick={() =>
                      setImageZoomed(!imageZoomed)
                    }
                  />

                  <span className="before-image-label">
                    BEFORE
                  </span>

                </div>

              </motion.div>



              <WorkPhotosPanel
                taskStatus={taskStatus}
                progressPhotos={progressPhotos}
                completionPhoto={completionPhoto}
                canEditPhotos={canEditPhotos}
                uploading={uploading}
                caption={caption}
                onCaptionChange={setCaption}
                photoError={photoError}
                onRemovePhoto={handleRemovePhoto}
                onProgressPhoto={handleProgressPhoto}
                onCompletionPhoto={handleCompletionPhoto}
              />

              <WorkTimeline taskStatus={taskStatus} />

            </div>


            {/* ===================================================
                RIGHT SIDE
                =================================================== */}

            <motion.div
              className="task-details-info-card"

              initial={{
                opacity: 0,
                x: 20,
              }}

              animate={{
                opacity: 1,
                x: 0,
              }}

              transition={{
                duration: 0.45,
              }}
            >


              {/* =================================================
                  STATUS
                  ================================================= */}

              <div className="task-status-row">

                <span
                  className={`task-detail-status ${
                    taskStatus === "Completed"
                      ? "completed"
                      : taskStatus === "In Progress"
                      ? "in-progress"
                      : "pending"
                  }`}
                >

                  {taskStatus}

                </span>


                <span className="task-detail-time">

                  <Clock3 size={15} />

                  {task.time}

                </span>

              </div>


              {/* =================================================
                  WORK LOCATION
                  ================================================= */}

              <div className="detail-info-item">

                <div className="detail-icon">

                  <MapPin size={19} />

                </div>

                <div>

                  <span>
                    Work Location
                  </span>

                  <strong>
                    {task.location}
                  </strong>

                </div>

              </div>


              {/* =================================================
                  MAP
                  ================================================= */}

              <div className="task-map-section">

                <div className="task-map-header">

                  <div>

                    <h3>
                      Work Location Map
                    </h3>

                    <p>
                      {task.location}
                    </p>

                  </div>

                </div>


                <MapContainer
                  center={taskPosition}
                  zoom={15}
                  scrollWheelZoom={true}
                  className="task-map"
                >

                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Marker
                    position={taskPosition}
                  >

                    <Popup>

                      <strong>
                        {task.title}
                      </strong>

                      <br />

                      {task.location}

                    </Popup>

                  </Marker>

                </MapContainer>

              </div>


              {/* =================================================
                  AUTHORITY
                  ================================================= */}

              <div className="detail-info-item">

                <div className="detail-icon">

                  <User size={19} />

                </div>

                <div>

                  <span>
                    Assigned By
                  </span>

                  <strong>
                    Municipal Authority
                  </strong>

                </div>

              </div>


              {/* =================================================
                  DEPARTMENT
                  ================================================= */}

              <div className="detail-info-item">

                <div className="detail-icon">

                  <Building2 size={19} />

                </div>

                <div>

                  <span>
                    Department
                  </span>

                  <strong>
                    Municipal Services
                  </strong>

                </div>

              </div>


              {/* =================================================
                  START TASK
                  ================================================= */}

              {taskStatus === "Pending" && (

                <button
                  className="start-task-button"
                  onClick={startTask}
                  disabled={uploading}
                >

                  <Play size={17} />

                  Start Task

                </button>

              )}


              {/* =================================================
                  COMPLETE TASK
                  ================================================= */}

              {taskStatus === "In Progress" && (

                <button
                  className="complete-task-button"
                  onClick={completeTask}
                  disabled={!completionPhoto || uploading}
                  title={completionPhoto ? "" : "Upload a completion photo first"}
                >

                  <CheckCircle2 size={17} />

                  Complete Task

                </button>

              )}


              {/* =================================================
                  COMPLETED
                  ================================================= */}

              {taskStatus === "Completed" && (

                <div className="task-completed-message">

                  <CheckCircle2 size={19} />

                  Task Completed Successfully

                </div>

              )}

            </motion.div>

          </section>

        </main>


        {/* =====================================================
            BOTTOM NAVIGATION
            ===================================================== */}


      </div>

    </PageTransition>
  );
}

export default TaskDetails;