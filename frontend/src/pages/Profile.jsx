import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, Save, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState(user?.profilePicture || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordCooldown, setPasswordCooldown] = useState(0);

  useEffect(() => {
    if (passwordCooldown <= 0) return;
    const timer = setInterval(() => setPasswordCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [passwordCooldown]);

  const canChangePassword = currentPassword.length > 0 && newPassword.length >= 6 && confirmPassword.length >= 6 && newPassword === confirmPassword;

  const { register: regProfile, handleSubmit: handleProfile, watch, formState: { errors } } = useForm({
    defaultValues: { name: user?.name, department: user?.department, phone: user?.phone },
  });

  const watchedValues = watch();
  const hasFormChanges = watchedValues.name !== (user?.name || '') || watchedValues.department !== (user?.department || '') || watchedValues.phone !== (user?.phone || '');
  const hasChanges = hasFormChanges || avatarChanged;

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
    setAvatarChanged(true);
  };

  const onProfileSubmit = async (data) => {
    setSaving(true);
    setCooldownActive(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => v && formData.append(k, v));
      if (avatarFile) formData.append('profilePicture', avatarFile);
      const res = await api.put('/auth/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser(res.data.user);
      setAvatarChanged(false);
      setAvatarFile(null);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
      setCooldownActive(false);
    } finally {
      setSaving(false);
      setTimeout(() => setCooldownActive(false), 3000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    setPasswordCooldown(10);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to change password';
      setPasswordError(msg);
      setPasswordCooldown(0);
    } finally {
      setChangingPassword(false);
      setTimeout(() => setPasswordCooldown(0), 3000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-slate-100 mb-6">Profile Settings</h1>

      <div className="card p-6 animate-fade-in">
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">{user?.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-primary-600 dark:bg-primary-500 text-white rounded-full p-1.5 cursor-pointer hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors">
                <Camera className="w-3 h-3" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <p className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">{user?.name}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
              <span className={`badge text-xs mt-1 ${user?.role === 'admin' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>{user?.role}</span>
            </div>
          </div>

          <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
              <input {...regProfile('name', { required: true })} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
                <input {...regProfile('department')} className="input" placeholder="e.g., CSE" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input {...regProfile('phone')} className="input" placeholder="+91..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email (cannot be changed)</label>
              <input value={user?.email} disabled className="input bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 cursor-not-allowed" />
            </div>
            <button type="submit" disabled={!hasChanges || saving || cooldownActive} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

      {user.role !== 'admin' && (
        <div className="card p-6 mt-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100">Change Password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input pr-10"
                placeholder="Enter current password"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pr-10"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                className="input pr-10"
                placeholder="Re-enter new password"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPasswords ? 'Hide passwords' : 'Show passwords'}
            </button>

            {passwordError && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5">
                {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={!canChangePassword || changingPassword || passwordCooldown > 0}
              className="btn-primary flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {changingPassword ? 'Updating...' : passwordCooldown > 0 ? `Wait ${passwordCooldown}s` : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
