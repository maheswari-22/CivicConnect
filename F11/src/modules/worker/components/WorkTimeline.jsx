import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

/** Assigned → started → completed steps for a task, driven by its status. */
function WorkTimeline({ taskStatus }) {
  return (
    <motion.section
      className="work-timeline-section"

      initial={{
        opacity: 0,
        y: 20,
      }}

      animate={{
        opacity: 1,
        y: 0,
      }}

      transition={{
        delay: 0.2,
        duration: 0.45,
      }}
    >

      <div className="section-heading">

        <div>

          <h2>
            Work Timeline
          </h2>

          <p>
            Track the progress of this assigned task.
          </p>

        </div>

      </div>


      <div className="timeline">

        {/* TASK ASSIGNED */}

        <div className="timeline-item active">

          <div className="timeline-dot">

            <CheckCircle2 size={16} />

          </div>

          <div>

            <strong>
              Task Assigned
            </strong>

            <span>
              Task has been assigned to the worker.
            </span>

          </div>

        </div>


        {/* LINE */}

        <div
          className={`timeline-line ${
            taskStatus !== "Pending"
              ? "timeline-active"
              : ""
          }`}
        />


        {/* WORK STARTED */}

        <div
          className={`timeline-item ${
            taskStatus !== "Pending"
              ? "active"
              : ""
          }`}
        >

          <div className="timeline-dot">

            {taskStatus !== "Pending" ? (
              <CheckCircle2 size={16} />
            ) : (
              "2"
            )}

          </div>

          <div>

            <strong>
              Work Started
            </strong>

            <span>

              {taskStatus !== "Pending"
                ? "Worker has started working on this task."
                : "Waiting for the worker to start."
              }

            </span>

          </div>

        </div>


        {/* LINE */}

        <div
          className={`timeline-line ${
            taskStatus === "Completed"
              ? "timeline-active"
              : ""
          }`}
        />


        {/* COMPLETED */}

        <div
          className={`timeline-item ${
            taskStatus === "Completed"
              ? "active"
              : ""
          }`}
        >

          <div className="timeline-dot">

            {taskStatus === "Completed" ? (
              <CheckCircle2 size={16} />
            ) : (
              "3"
            )}

          </div>

          <div>

            <strong>
              Task Completed
            </strong>

            <span>

              {taskStatus === "Completed"
                ? "The assigned work has been completed."
                : "Complete the work to finish this task."
              }

            </span>

          </div>

        </div>

      </div>

    </motion.section>
  );
}

export default WorkTimeline;
