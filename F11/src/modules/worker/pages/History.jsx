import {
  CheckCircle2,
  Clock3,
  MapPin,
} from "lucide-react";

import { motion } from "framer-motion";

import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import { getTaskUpdate } from "../../../shared/workPhotos.js";
import { TASKS } from "../data/tasks.js";

import "../styles/history.css";
import SmartImage from "../../../shared/SmartImage";

const AFTER_IMAGE = {
  "Road Damage": "/images/road-after.jpg",
  "Garbage Collection": "/images/garbage-after.jpg",
  "Water Leakage": "/images/water-after.jpg",
};

function History() {

  /* Every task the worker has completed, with the photo they uploaded as proof */
  const historyTasks = TASKS
    .filter((task) => task.status === "Completed")
    .map((task) => {
      const update = getTaskUpdate(task.id);
      const done = task.completedAt ? new Date(task.completedAt) : new Date();
      return {
        id: task.id,
        title: task.title,
        details: task.description,
        beforeImage: task.image,
        afterImage: update?.completionPhoto?.src || AFTER_IMAGE[task.title] || task.image,
        location: task.location,
        completedDate: done.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        completedTime: done.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      };
    });

  return (
    <PageTransition>

      <Sidebar />

      <div className="app-shell">

        <main className="page-content history-page">

          {/* =====================================================
              HEADER
              ===================================================== */}

          <motion.div
            className="history-header"

            initial={{
              opacity: 0,
              y: -15,
            }}

            animate={{
              opacity: 1,
              y: 0,
            }}

            transition={{
              duration: 0.45,
            }}
          >

            <div>

              <h1>Task History</h1>

              <p>
                View your completed civic tasks and work results.
              </p>

            </div>


            <div className="history-count">

              <strong>
                {historyTasks.length}
              </strong>

              <span>
                Completed
              </span>

            </div>

          </motion.div>


          {/* =====================================================
              HISTORY CARDS
              ===================================================== */}

          <section className="history-grid">

            {historyTasks.map((task, index) => (

              <motion.article
                key={task.id}
                className="history-card"

                initial={{
                  opacity: 0,
                  y: 20,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  delay: index * 0.1,
                  duration: 0.4,
                }}

                whileHover={{
                  y: -5,
                }}
              >

                {/* =================================================
                    TASK NAME
                    ================================================= */}

                <div className="history-card-heading">

                  <h2>
                    {task.title}
                  </h2>

                  <span className="completed-badge">

                    <CheckCircle2 size={14} />

                    Completed

                  </span>

                </div>


                {/* =================================================
                    TASK DETAILS
                    ================================================= */}

                <div className="history-task-details">

                  <span>
                    Task Details
                  </span>

                  <p>
                    {task.details}
                  </p>

                </div>


                {/* =================================================
                    BEFORE IMAGE
                    ================================================= */}

                <div className="history-image-section">

                  <div className="history-image-title">
                    BEFORE
                  </div>

                  <div className="history-image-box">

                    <SmartImage
                      src={task.beforeImage}
                      alt={`${task.title} before`}
                    />

                  </div>

                </div>


                {/* =================================================
                    AFTER IMAGE
                    ================================================= */}

                <div className="history-image-section">

                  <div className="history-image-title after-title">
                    AFTER
                  </div>

                  <div className="history-image-box">

                    <SmartImage
                      src={task.afterImage}
                      alt={`${task.title} after`}
                    />

                  </div>

                </div>


                {/* =================================================
                    LOCATION
                    ================================================= */}

                <div className="history-location">

                  <MapPin size={15} />

                  <span>
                    {task.location}
                  </span>

                </div>


                {/* =================================================
                    COMPLETION INFORMATION
                    ================================================= */}

                <div className="history-completion">

                  <div>

                    <span>
                      Completed Date
                    </span>

                    <strong>
                      {task.completedDate}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Time
                    </span>

                    <strong>
                      {task.completedTime}
                    </strong>

                  </div>

                </div>


                <div className="history-status">

                  <Clock3 size={14} />

                  Work completed successfully

                </div>

              </motion.article>

            ))}

          </section>

        </main>



      </div>

    </PageTransition>
  );
}

export default History;