import { useEffect, useState } from 'react';
import { UserRound, Phone, Mail, MapPin, Lock, LogOut, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout/AppLayout';
import Input from '../../components/Input/Input';
import Button from '../../components/Button/Button';
import Modal from '../../components/Modal/Modal';
import ProfilePage from '../../../../shared/ProfilePage.jsx';
import { ChangePasswordDialog, ChangeEmailDialog, DeleteAccountDialog, LogoutDialog } from '../../../../shared/AccountDialogs.jsx';
import { fetchDashboardStats } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AREAS } from '../../../../shared/areas';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile, logout, changeEmail, changePassword, deleteAccount } = useAuth();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(user || {});
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState(null); // 'email' | 'password' | 'delete' | 'logout'
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    fetchDashboardStats()
      .then((s) => active && setStats(s))
      .catch(() => active && setStats(null));
    return () => { active = false; };
  }, []);

  const openEdit = () => { setForm(user); setEditing(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile(form);
    setSaving(false);
    if (result?.ok === false) {
      showToast(result.message || 'Could not update your profile', 'error');
      return;
    }
    setEditing(false);
    showToast('Profile updated', 'success');
  };

  const handleDelete = async ({ password, reason, details }) => {
    const result = await deleteAccount({ password, reason: [reason, details].filter(Boolean).join(' — ') });
    if (result.ok) {
      showToast('Your account has been deleted', 'info', 4000);
      navigate('/', { replace: true });
    }
    return result;
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AppLayout>
      <ProfilePage
        name={user?.name || 'Citizen'}
        subtitle="Civic Connect Member"
        details={[
          { icon: Phone, label: 'Mobile', value: user?.mobile },
          { icon: Mail, label: 'Email', value: user?.email },
          { icon: MapPin, label: 'Location', value: user?.location },
        ]}
        stats={stats ? [
          { label: 'Total Complaints', value: stats.total },
          { label: 'In Progress', value: stats.inProgress },
          { label: 'Resolved', value: stats.resolved },
        ] : []}
        onEdit={openEdit}
        actions={[
          { key: 'email', label: 'Change Email', description: 'Needs your password and a confirmation link sent to the new address.', icon: Mail, onClick: () => setDialog('email') },
          { key: 'password', label: 'Change Password', description: 'Update your password to keep your account secure.', icon: Lock, onClick: () => setDialog('password') },
          { key: 'delete', label: 'Delete Account', description: 'You will be asked for a reason. This permanently removes your account.', icon: Trash2, tone: 'danger', onClick: () => setDialog('delete') },
          { key: 'logout', label: 'Log Out', icon: LogOut, tone: 'danger', onClick: () => setDialog('logout') },
        ]}
      >
        <Modal open={editing} onClose={() => setEditing(false)} title="Edit Profile">
          <form className="profile__form" onSubmit={handleSave}>
            <Input label="Full name" icon={UserRound} value={form.name || ''} onChange={setField('name')} />
            <Input label="Mobile" icon={Phone} value={form.mobile || ''} readOnly helper="Your mobile number is your login ID and can't be changed here." />
            <Input label="Email" icon={Mail} value={form.email || ''} readOnly helper="Use Change Email on the profile page to update it." />
            <Input label="City / area" icon={MapPin} options={AREAS} placeholder="Select your city / area" value={AREAS.includes(form.location) ? form.location : ''} onChange={setField('location')} helper="Complaints you report go to the authority of this area by default." />
            <Button type="submit" fullWidth size="lg" loading={saving}>Save Changes</Button>
          </form>
        </Modal>

        {dialog === 'email' && (
          <ChangeEmailDialog currentEmail={user?.email} onClose={() => setDialog(null)} onSubmit={changeEmail} />
        )}
        {dialog === 'password' && (
          <ChangePasswordDialog onClose={() => setDialog(null)} onSubmit={changePassword} />
        )}
        {dialog === 'delete' && (
          <DeleteAccountDialog onClose={() => setDialog(null)} onSubmit={handleDelete} />
        )}
        {dialog === 'logout' && (
          <LogoutDialog
            portalLabel="Citizen Portal"
            onCancel={() => setDialog(null)}
            onConfirm={() => { logout(); navigate('/', { replace: true }); }}
          />
        )}
      </ProfilePage>
    </AppLayout>
  );
}
