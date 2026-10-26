import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Clock3,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import RoleHero from "../../../shared/RoleHero";
import EmergencyTasksBar from "../components/EmergencyTasksBar";
import { PageContainer, PageHead, StatGrid, StatCard } from "../../../shared/PortalPage";
import useNotifications from "../../../shared/useNotifications.js";
import { getWorker } from "../authAdapter.js";
import { firstName } from "../../../shared/initials.js";
import { WORKER_READ_KEY, buildWorkerNotifications } from "../data/notifications.js";
import { TASKS } from "../data/tasks.js";
import { getTaskUpdate } from "../../../shared/workPhotos.js";

import "../styles/dashboard.css";


function Dashboard() {
  const navigate = useNavigate();

  const [greeting, setGreeting] = useState("");
  const [workerName, setWorkerName] = useState(() => firstName(getWorker().name) || "Worker");

  /* The bell opens the Notifications page; the badge shows how many are unread. */
  const { unread } = useNotifications(WORKER_READ_KEY, buildWorkerNotifications);

  useEffect(() => {
    const savedAccount =
      localStorage.getItem("workerAccount");

    if (savedAccount) {
      try {
        const account = JSON.parse(savedAccount);

        setWorkerName(
          firstName(
            account.name ||
            account.fullName ||
            account.username
          ) || "Worker"
        );
      } catch (error) {
        console.error(
          "Unable to load worker details:",
          error
        );
      }
    }

    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 17) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);


  /* Live task data: the same list and the same shared work store the Tasks page
     and the notifications use, so every number on this page agrees. */
  const STATUS_VIEW = {
    Pending: { statusClass: "pending", Icon: ClipboardList },
    "In Progress": { statusClass: "progress", Icon: Clock3 },
    Completed: { statusClass: "completed", Icon: CheckCircle2 },
  };

  const recentTasks = TASKS.map((task) => {
    const status = getTaskUpdate(task.id)?.status || "Pending";
    const { statusClass, Icon: StatusIcon } = STATUS_VIEW[status] || STATUS_VIEW.Pending;
    return { task, title: task.title, location: task.location, status, statusClass, icon: <StatusIcon size={19} /> };
  });

  const total = recentTasks.length;
  const completed = recentTasks.filter((t) => t.status === "Completed").length;
  const pending = total - completed;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const nextTask = recentTasks.find((t) => t.status !== "Completed") || null;

  return (
    <PageTransition>

      <div className="dashboard-page">

        <Sidebar />

        <main className="cc-main">

          <PageContainer>

            <PageHead
              eyebrow="WORKER DASHBOARD"
              title={`${greeting}, ${workerName}`}
              subtitle="Stay on top of your assigned civic tasks."
              badge={unread}
              onNotify={() => navigate("/notifications")}
            />

            <RoleHero
              role="worker"
              badge="Worker Module"
              highlight="Worker!"
              text="Your work helps keep the community cleaner, safer and better every day."
              ctaLabel="View Assigned Tasks"
              onCta={() => navigate("/assigned-tasks")}
              image="/roles/worker.jpg"
              imageAlt="CivicConnect worker in a hard hat checking a task on a tablet"
            />

            <EmergencyTasksBar />

            <StatGrid>
              <StatCard icon={ClipboardList} tone="blue" label="Assigned Tasks" value={total} />
              <StatCard icon={CheckCircle2} tone="green" label="Completed" value={completed} />
              <StatCard icon={Clock3} tone="gold" label="Pending" value={pending} />
            </StatGrid>

              {/* =====================================================
                  PROGRESS + NEXT TASK
              ===================================================== */}

              <div className="dashboard-grid">


                {/* PROGRESS */}

                <motion.div
                  className="progress-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.35,
                  }}
                >

                  <div className="card-heading">

                    <div>

                      <h3>Today's Progress</h3>

                      <p>
                        Keep up the good work
                      </p>

                    </div>

                    <CheckCircle2 size={20} />

                  </div>


                  <div className="progress-content">

                    <div className="progress-ring">

                      <svg
                        viewBox="0 0 120 120"
                        aria-hidden="true"
                      >

                        <circle
                          className="progress-track"
                          cx="60"
                          cy="60"
                          r="50"
                        />

                        <circle
                          className="progress-value"
                          cx="60"
                          cy="60"
                          r="50"
                          strokeDashoffset={314 * (1 - percent / 100)}
                        />

                      </svg>


                      <div className="progress-number">
                        {percent}%
                      </div>

                    </div>


                    <div className="progress-text">

                      <strong>
                        {completed} of {total} tasks
                      </strong>

                      <p>
                        completed
                      </p>

                      <span>
                        {total > 0 && completed === total
                          ? "All tasks done. Great work!"
                          : completed > 0
                            ? "Great progress!"
                            : "Pick up your first task."}
                      </span>

                    </div>

                  </div>

                </motion.div>



                {/* NEXT TASK */}

                <motion.div
                  className="quick-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.45,
                  }}
                >

                  <div className="quick-icon">
                    <ClipboardList size={21} />
                  </div>


                  <div>

                    <p className="quick-label">
                      NEXT TASK
                    </p>

                    <h3>
                      {nextTask ? nextTask.title : "All caught up"}
                    </h3>

                    <p>
                      {nextTask ? nextTask.location : "No tasks waiting"}
                    </p>

                  </div>


                  <button
                    className="quick-arrow"
                    type="button"
                    aria-label="Open next task"
                    onClick={() =>
                      navigate(
                        nextTask ? "/task-details" : "/assigned-tasks",
                        nextTask ? { state: { task: nextTask.task } } : undefined
                      )
                    }
                  >
                    <ArrowRight size={18} />
                  </button>

                </motion.div>

              </div>



              {/* =====================================================
                  RECENT TASKS
              ===================================================== */}

              <section className="recent-section">

                <div className="section-header">

                  <div>

                    <h2 className="section-title">
                      Recent Tasks
                    </h2>

                    <p className="section-subtitle">
                      Your latest assigned work
                    </p>

                  </div>


                  <button
                    className="view-all"
                    type="button"
                    onClick={() =>
                      navigate("/assigned-tasks")
                    }
                  >
                    View All
                    <ArrowRight size={15} />
                  </button>

                </div>



                <div className="recent-list">

                  {recentTasks.map((task, index) => (

                    <motion.div
                      className="recent-task"
                      key={task.task?.id ?? `${task.title}-${index}`}
                      initial={{
                        opacity: 0,
                        x: -10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        duration: 0.4,
                        delay:
                          0.5 + index * 0.08,
                      }}
                      whileHover={{
                        x: 3,
                      }}
                      onClick={() =>
                        navigate("/task-details", {
                          state: { task: task.task },
                        })
                      }
                      style={{
                        cursor: "pointer",
                      }}
                    >

                      <div className="task-icon">
                        {task.icon}
                      </div>


                      <div className="task-main">

                        <h3>
                          {task.title}
                        </h3>

                        <p>
                          <MapPin size={12} />
                          {task.location}
                        </p>

                      </div>


                      <span
                        className={`task-status ${task.statusClass}`}
                      >
                        {task.status}
                      </span>


                      <ArrowRight
                        className="task-arrow"
                        size={17}
                      />

                    </motion.div>

                  ))}

                </div>

              </section>

          </PageContainer>

        </main>

      </div>

    </PageTransition>
  );
}


export default Dashboard;