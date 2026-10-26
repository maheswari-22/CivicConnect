import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useCallback } from "react";

import "./index.css";
import "../../shared/motion.css";
import PortalMotion from "../../shared/PortalMotion.jsx";

import AuthPage from "../../shared/AuthPage.jsx";
import WelcomeIntro from "../../shared/WelcomeIntro.jsx";
import RequireAuth from "../../shared/RequireAuth.jsx";
import DataGate from "../../shared/DataGate.jsx";
import { loadAuthorityData, hasAuthorityData } from "./data/complaints.js";
import { authorityAdapter } from "./authAdapter.js";

import Dashboard from "./authority/Dashboard";
import Complaints from "./authority/Complaints";
import AssignWorker from "./authority/AssignWorker";
import PendingComplaints from "./authority/PendingComplaints";
import CompletedComplaints from "./authority/CompletedComplaints";
import Workers from "./authority/Workers";
import Profile from "./authority/Profile";
import Tracking from "./authority/Tracking";
import Notifications from "./authority/Notifications";
import AttentionCenter from "./components/AttentionCenter.jsx";

/* Signed-in pages: session check, then complaints and workers are loaded from the API. */
function Guard({ children }) {
  return (
    <RequireAuth role="authority">
      <DataGate load={loadAuthorityData} hasData={hasAuthorityData} refreshMs={20000}>
        {children}
      </DataGate>
    </RequireAuth>
  );
}

function AuthorityAuth() {
  const navigate = useNavigate();
  return (
    <AuthPage
      role="authority"
      adapter={authorityAdapter}
      onAuthenticated={() => navigate("/welcome")}
    />
  );
}

function AuthorityWelcome() {
  const navigate = useNavigate();
  const done = useCallback(() => navigate("/dashboard", { replace: true }), [navigate]);
  return <WelcomeIntro role="authority" onDone={done} />;
}

/** Authority portal — served under /authority. */
export default function AuthorityApp() {
  return (
    <BrowserRouter basename="/authority">
      <PortalMotion />
      <AttentionCenter />
      <Routes>
        <Route path="/" element={<AuthorityAuth />} />
        <Route path="/welcome" element={<AuthorityWelcome />} />

        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/complaints" element={<Guard><Complaints /></Guard>} />
        <Route path="/complaints/:complaintId" element={<Guard><AssignWorker /></Guard>} />
        <Route path="/assign-worker" element={<Navigate to="/complaints" replace />} />
        <Route path="/pending" element={<Guard><PendingComplaints /></Guard>} />
        <Route path="/completed" element={<Guard><CompletedComplaints /></Guard>} />
        <Route path="/workers" element={<Guard><Workers /></Guard>} />
        <Route path="/tracking" element={<Guard><Tracking /></Guard>} />
        <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
        <Route path="/profile" element={<Guard><Profile /></Guard>} />
        {/* Change password is now a dialog on the Profile page. */}
        <Route path="/change-password" element={<Navigate to="/profile" replace />} />

        {/* Old sign-up / reset URLs now live inside the shared auth page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
