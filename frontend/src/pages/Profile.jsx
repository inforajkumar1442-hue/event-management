import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Save, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [avatarPreview, setAvatarPreview] = useState(user?.profilePicture || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors } } = useForm({
    defaultValues: { name: user?.name, department: user?.department, phone: user?.phone },
  });

  const { register: regPass, handleSubmit: handlePass, watch, reset: resetPass, formState: { errors: passErrors } } = useForm();
  const newPassword = watch('newPassword');

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
  };

  const onProfileSubmit = async (data) => {
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => v && formData.append(k, v));
      if (avatarFile) formData.append('profilePicture', avatarFile);
      const res = await api.put('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed!');
      resetPass();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-bold text-3xl text-slate-900 mb-6">Profile Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6 w-fit">
        {[['profile', 'Profile', User], ['password', 'Password', Lock]].map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card p-6 animate-fade-in">
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-100 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary-600">{user?.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full p-1.5 cursor-pointer hover:bg-primary-700 transition-colors">
                <Camera className="w-3 h-3" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="font-display font-bold text-xl text-slate-900">{user?.name}</p>
              <p className="text-slate-500 text-sm">{user?.email}</p>
              <span className={`badge text-xs mt-1 ${user?.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>{user?.role}</span>
            </div>
          </div>

          <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input {...regProfile('name', { required: true })} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input {...regProfile('department')} className="input" placeholder="e.g., CSE" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input {...regProfile('phone')} className="input" placeholder="+91..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">Email (cannot be changed)</label>
              <input value={user?.email} disabled className="input bg-slate-50 text-slate-400 cursor-not-allowed" />
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="card p-6 animate-fade-in">
          <h2 className="font-display font-bold text-xl mb-4">Change Password</h2>
          <form onSubmit={handlePass(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
              <input {...regPass('currentPassword', { required: 'Required' })} type="password" className="input" placeholder="••••••••" />
              {passErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{passErrors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input {...regPass('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })} type="password" className="input" placeholder="Min. 6 characters" />
              {passErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passErrors.newPassword.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
              <input {...regPass('confirm', { required: 'Required', validate: v => v === newPassword || 'Passwords do not match' })} type="password" className="input" placeholder="Confirm new password" />
              {passErrors.confirm && <p className="text-xs text-red-500 mt-1">{passErrors.confirm.message}</p>}
            </div>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Lock className="w-4 h-4" />{saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
