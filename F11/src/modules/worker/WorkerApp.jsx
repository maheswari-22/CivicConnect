import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useCallback } from "react";

import "./index.css";
import "../../shared/motion.css";
import PortalMotion from "../../shared/PortalMotion.jsx";

import AuthPage from "../../shared/AuthPage.jsx";
import WelcomeIntro from "../../shared/WelcomeIntro.jsx";
import RequireAuth from "../../shared/RequireAuth.jsx";
import DataGate from "../../shared/DataGate.jsx";
import { loadWorkerData, hasWorkerData } from "./data/tasks.js";
import { workerAdapter } from "./authAdapter.js";

import Dashboard from "./pages/Dashboard";
import AssignedTasks from "./pages/AssignedTasks";
import TaskDetails from "./pages/TaskDetails";
import History from "./pages/History";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";

/* Signed-in pages: session check, then the worker's tasks are loaded from the API. */
function Guard({ children }) {
  return (
    <RequireAuth role="worker">
      <DataGate load={loadWorkerData} hasData={hasWorkerData}>
        {children}
      </DataGate>
    </RequireAuth>
  );
}

function WorkerAuth() {
  const navigate = useNavigate();
  return (
    <AuthPage
      role="worker"
      adapter={workerAdapter}
      onAuthenticated={() => navigate("/welcome")}
    />
  );
}

function WorkerWelcome() {
  const navigate = useNavigate();
  const done = useCallback(() => navigate("/dashboard", { replace: true }), [navigate]);
  return <WelcomeIntro role="worker" onDone={done} />;
}

/** Worker portal — served under /worker. */
export default function WorkerApp() {
  return (
    <BrowserRouter basename="/worker">
      <PortalMotion />
      <Routes>
        <Route path="/" element={<WorkerAuth />} />
        <Route path="/welcome" element={<WorkerWelcome />} />

        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/assigned-tasks" element={<Guard><AssignedTasks /></Guard>} />
        <Route path="/task-details" element={<Guard><TaskDetails /></Guard>} />
        <Route path="/history" element={<Guard><History /></Guard>} />
        <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
