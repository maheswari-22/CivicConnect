import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, KeyRound, LogOut, Mail, MapPin, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Sidebar from "./Sidebar";
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
import { getComplaints } from "../data/complaints";
import {
  getAuthority,
  authorityLogout,
  authorityUpdateProfile,
  authorityChangePassword,
  authorityChangeEmail,
  authorityDeleteAccount,
} from "../authAdapter.js";
import "./Profile.css";

const DELETE_REASONS_AUTHORITY = [
  "I no longer work in this department",
  "I have been transferred to another ward",
  ...DELETE_REASONS.slice(1),
];

function Profile() {
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null); // "edit" | "password" | "delete" | "logout"
  const [me, setMe] = useState(getAuthority);

  const saveProfile = async (values) => {
    const result = await authorityUpdateProfile(values);
    if (result.ok) setMe(getAuthority());
    return result;
  };

  /* Live counts from the shared complaint store */
  const stats = useMemo(() => {
    const all = getComplaints();
    return [
      { label: "Completed", value: all.filter((c) => c.status === "Completed").length },
      { label: "In Progress", value: all.filter((c) => c.status === "Pending" || c.status === "In Progress").length },
      { label: "New Complaints", value: all.filter((c) => c.status === "New").length },
    ];
  }, []);

  return (
    <div className="profile-page">
      <Sidebar />

      <main className="profile-main">
        <ProfilePage
          name={me.name?.trim() || "Municipal Officer"}
          subtitle="Civic Authority"
          details={[
            { icon: ShieldCheck, label: "Role", value: "Civic Authority" },
            { icon: Building2, label: "Department", value: "Municipal Administration" },
            { icon: UserRound, label: "Employee ID", value: me.employeeId || "—" },
            { icon: MapPin, label: "Area", value: me.area || "—" },
            { icon: Mail, label: "Email", value: me.email ? `${me.email}${me.emailVerified === false ? " (not confirmed yet)" : ""}` : "—" },
            { icon: Phone, label: "Phone", value: me.phone || "—" },
          ]}
          stats={stats}
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
              initial={{ ...me, phone: normalizeMobile(me.phone) }}
              fields={[
                { name: "name", label: "Full name", kind: "name", placeholder: "Enter your full name" },
                { name: "employeeId", label: "Employee ID", readOnly: true, hint: "Your Employee ID is your login ID and can't be changed here." },
                { name: "email", label: "Email address", readOnly: true, hint: "Use Change Email on the profile page to update it." },
                { name: "phone", label: "Mobile number", kind: "mobile", type: "tel", placeholder: "10-digit mobile number" },
                { name: "area", label: "Area", readOnly: true, hint: "Your area decides which complaints you receive." },
              ]}
            />
          )}
          {dialog === "email" && (
            <ChangeEmailDialog currentEmail={me.email} onClose={() => setDialog(null)} onSubmit={authorityChangeEmail} />
          )}
          {dialog === "password" && (
            <ChangePasswordDialog
              onClose={() => setDialog(null)}
              onSubmit={authorityChangePassword}
            />
          )}
          {dialog === "delete" && (
            <DeleteAccountDialog
              reasons={DELETE_REASONS_AUTHORITY}
              onClose={() => setDialog(null)}
              onSubmit={async (values) => {
                const result = await authorityDeleteAccount(values);
                if (result.ok) navigate("/", { replace: true });
                return result;
              }}
            />
          )}
          {dialog === "logout" && (
            <LogoutDialog
              portalLabel="Authority Portal"
              onCancel={() => setDialog(null)}
              onConfirm={() => {
                authorityLogout();
                navigate("/", { replace: true });
              }}
            />
          )}
        </ProfilePage>
      </main>
    </div>
  );
}

export default Profile;
