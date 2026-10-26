import {
  MapPin,
  Clock3,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import { TASKS } from "../data/tasks.js";

import "../styles/assignedTasks.css";
import SmartImage from "../../../shared/SmartImage";
import EmergencyBadge from "../../../shared/EmergencyBadge";
import EmergencyTasksBar from "../components/EmergencyTasksBar";
import DueChip from "../components/DueChip";

function AssignedTasks() {
  const navigate = useNavigate();

  const [animatedCount, setAnimatedCount] = useState(0);

  const tasks = TASKS.filter((task) => task.status !== "Completed");


  /* =====================================================
     ACTIVE TASK COUNT ANIMATION
  ===================================================== */

  useEffect(() => {
    let current = 0;

    const timer = setInterval(() => {
      current += 1;

      setAnimatedCount(current);

      if (current >= tasks.length) {
        clearInterval(timer);
      }
    }, 250);

    return () => {
      clearInterval(timer);
    };
  }, [tasks.length]);


  /* =====================================================
     OPEN TASK
  ===================================================== */

  const openTask = (task) => {
    navigate("/task-details", {
      state: {
        task,
      },
    });
  };


  return (
    <PageTransition>

      <Sidebar />

      <div className="app-shell">

        <main className="page-content assigned-page">


          {/* =====================================================
              HEADER
          ===================================================== */}

          <motion.div
            className="assigned-header"

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

              <h1>
                Assigned Tasks
              </h1>

              <p>
                View and manage the tasks assigned to you.
              </p>

            </div>


            {/* =================================================
                ACTIVE TASK COUNT
            ================================================= */}

            <motion.div
              className="task-count"

              initial={{
                opacity: 0,
                scale: 0.85,
              }}

              animate={{
                opacity: 1,
                scale: 1,
              }}

              transition={{
                delay: 0.15,
                duration: 0.4,
                ease: "easeOut",
              }}

              whileHover={{
                y: -4,
                scale: 1.03,
              }}
            >

              <motion.strong
                key={animatedCount}

                initial={{
                  opacity: 0,
                  y: 8,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                }}
              >
                {animatedCount}
              </motion.strong>

              <span>
                Active Tasks
              </span>

            </motion.div>

          </motion.div>


          {/* =====================================================
              TASK CARDS
          ===================================================== */}

          <EmergencyTasksBar />

          <section className="assigned-task-grid">

            {tasks.map((task, index) => (

              <motion.article
                key={task.id}

                className={`assigned-task-card${task.isEmergency ? " cc-is-emergency" : ""}`}

                initial={{
                  opacity: 0,
                  y: 20,
                }}

                animate={{
                  opacity: 1,
                  y: 0,
                }}

                transition={{
                  delay: 0.12 + index * 0.1,
                  duration: 0.4,
                }}

                whileHover={{
                  y: -5,
                }}
              >


                {/* =================================================
                    IMAGE
                ================================================= */}

                <div className="assigned-image-wrapper">

                  <SmartImage
                    src={task.image}
                    alt={task.title}
                    className="assigned-task-image"

                    onClick={(e) => {
                      e.currentTarget.classList.toggle(
                        "image-zoomed"
                      );
                    }}
                  />

                  <span
                    className={`priority-badge ${task.priorityClass}`}
                  >

                    <AlertTriangle size={12} />

                    {task.priority} Priority

                  </span>

                  {task.isEmergency && (
                    <EmergencyBadge className="assigned-emergency" />
                  )}

                </div>


                {/* =================================================
                    CONTENT
                ================================================= */}

                <div className="assigned-task-content">

                  <div className="assigned-task-top">

                    <h2>
                      {task.title}
                    </h2>

                    <span
                      className={`task-status-badge ${task.statusClass}`}
                    >
                      {task.status}
                    </span>
                    <DueChip task={task} />

                  </div>


                  {/* =================================================
                      TASK INFORMATION
                  ================================================= */}

                  <div className="assigned-task-info">

                    <div>

                      <MapPin size={15} />

                      <span>
                        {task.location}
                      </span>

                    </div>

                    <div>

                      <Clock3 size={15} />

                      <span>
                        {task.time}
                      </span>

                    </div>

                  </div>


                  {/* =================================================
                      DETAILS BUTTON
                  ================================================= */}

                  <button
                    className="task-details-button"
                    onClick={() => openTask(task)}
                  >

                    View Task Details

                    <ArrowRight size={16} />

                  </button>

                </div>

              </motion.article>

            ))}

          </section>

        </main>


        {/* =====================================================
            BOTTOM NAVIGATION
        ===================================================== */}


      </div>

    </PageTransition>
  );
}

export default AssignedTasks;