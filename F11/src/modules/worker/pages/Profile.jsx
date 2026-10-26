import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Building2, KeyRound, LogOut, Mail, MapPin, Phone, Trash2, User } from "lucide-react";

import { TASKS } from "../data/tasks.js";
import Sidebar from "../components/Sidebar";
import PageTransition from "../components/PageTransition";
import ProfilePage from "../../../shared/ProfilePage.jsx";
import {
  ChangePasswordDialog,
  ChangeEmailDialog,
  DeleteAccountDialog,
  LogoutDialog,
  EditProfileDialog,
} from "../../../shared/AccountDialogs.jsx";
import { DELETE_REASONS } from "../../../shared/deleteReasons.js";
import { normalizeMobile } from "../../../shared/api.js";
import {
  getWorker,
  workerChangePassword,
  workerChangeEmail,
  workerDeleteAccount,
  workerLogout,
  workerUpdateProfile,
} from "../authAdapter.js";


const DELETE_REASONS_WORKER = [
  "I no longer work for the municipality",
  "I have been transferred to another area",
  ...DELETE_REASONS.slice(1),
];

function Profile() {
  const navigate = useNavigate();
  const [worker, setWorker] = useState(getWorker);

  const saveProfile = async (values) => {
    const result = await workerUpdateProfile(values);
    if (result.ok) setWorker(getWorker());
    return result;
  };

  /* Live figures from this worker's own tasks */
  const done = TASKS.filter((t) => t.status === "Completed").length;
  const SUMMARY = [
    { label: "Assigned Tasks", value: TASKS.length },
    { label: "Completed Tasks", value: done },
    { label: "Completion Rate", value: TASKS.length ? `${Math.round((done / TASKS.length) * 100)}%` : "0%" },
  ];
  const [dialog, setDialog] = useState(null); // "edit" | "password" | "delete" | "logout"

  const handleDelete = async (values) => {
    const result = await workerDeleteAccount(values);
    if (result.ok) navigate("/", { replace: true });
    return result;
  };

  return (
    <PageTransition>
      <Sidebar />

      <div className="app-shell">
        <main className="page-content profile-content">
          <ProfilePage
            name={worker.name}
            subtitle="Municipal Worker"
            status="Active Worker"
            details={[
              { icon: User, label: "Full Name", value: worker.name },
              { icon: Briefcase, label: "Worker ID", value: worker.workerId },
              { icon: Building2, label: "Department", value: worker.department },
              { icon: Mail, label: "Email", value: worker.email },
              { icon: Phone, label: "Phone", value: worker.phone },
              { icon: MapPin, label: "Assigned Area", value: worker.area },
            ]}
            stats={SUMMARY}
            onEdit={() => setDialog("edit")}
            actions={[
              { key: "email", label: "Change Email", description: "Needs your password and a confirmation link sent to the new address.", icon: Mail, onClick: () => setDialog("email") },
              { key: "password", label: "Change Password", description: "Update your password to keep your account secure.", icon: KeyRound, onClick: () => setDialog("password") },
              { key: "delete", label: "Delete Account", description: "You will be asked for a reason. This permanently removes your account.", icon: Trash2, tone: "danger", onClick: () => setDialog("delete") },
              { key: "logout", label: "Log Out", icon: LogOut, tone: "danger", onClick: () => setDialog("logout") },
            ]}
          >
            {dialog === "edit" && (
              <EditProfileDialog
                onClose={() => setDialog(null)}
                onSubmit={saveProfile}
                initial={{ ...worker, phone: normalizeMobile(worker.phone) }}
                fields={[
                  { name: "name", label: "Full name", kind: "name", placeholder: "Enter your full name" },
                  { name: "workerId", label: "Worker ID", readOnly: true },
                  { name: "username", label: "Username", readOnly: true, hint: "Your username is your login ID and can't be changed here." },
                  { name: "email", label: "Email address", readOnly: true, hint: "Use Change Email on the profile page to update it." },
                  { name: "phone", label: "Mobile number", kind: "mobile", type: "tel", placeholder: "10-digit mobile number" },
                  { name: "area", label: "Assigned area", readOnly: true, hint: "Your area is set by your municipal authority." },
                ]}
              />
            )}
            {dialog === "email" && (
              <ChangeEmailDialog currentEmail={worker.email} onClose={() => setDialog(null)} onSubmit={workerChangeEmail} />
            )}
            {dialog === "password" && (
              <ChangePasswordDialog onClose={() => setDialog(null)} onSubmit={workerChangePassword} />
            )}
            {dialog === "delete" && (
              <DeleteAccountDialog
                reasons={DELETE_REASONS_WORKER}
                onClose={() => setDialog(null)}
                onSubmit={handleDelete}
              />
            )}
            {dialog === "logout" && (
              <LogoutDialog
                portalLabel="Worker Portal"
                onCancel={() => setDialog(null)}
                onConfirm={() => {
                  workerLogout();
                  navigate("/", { replace: true });
                }}
              />
            )}
          </ProfilePage>
        </main>
      </div>
    </PageTransition>
  );
}

export default Profile;
