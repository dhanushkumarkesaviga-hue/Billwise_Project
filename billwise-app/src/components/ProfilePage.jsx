import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Key, 
  Camera, 
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import { userApi } from '../api';
import { useAuth } from '../context/AuthContext';

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
];

export default function ProfilePage() {
  const { username, role, refreshProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    profilePhotoUrl: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Change Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const data = await userApi.getMe();
      setProfile(data);
      setProfileForm({
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        profilePhotoUrl: data.profilePhotoUrl || AVATAR_PRESETS[0]
      });
    } catch (err) {
      setProfileError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);
    setProfileError(null);
    try {
      const updated = await userApi.updateProfile(profileForm);
      setProfile(updated);
      setProfileMsg("Profile details updated successfully!");
      await refreshProfile();
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    setIsChangingPass(true);
    try {
      await userApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordMsg("Password changed successfully!");
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordMsg(null), 3000);
    } catch (err) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setIsChangingPass(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-slate-500 text-xs">
        Loading user profile…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header Profile Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-rose-200 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative group shrink-0">
          <img
            src={profileForm.profilePhotoUrl || AVATAR_PRESETS[0]}
            alt={profile?.username}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-rose-300 shadow-md"
          />
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              role === 'SUPER_ADMIN' 
                ? 'bg-purple-100 text-purple-800 border-purple-300' 
                : role === 'ADMIN'
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {role}
            </span>

            {profile?.merchant && (
              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                profile.merchant.status === 'VERIFIED'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {profile.merchant.status}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">
            {profile?.fullName || profile?.username}
          </h1>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 font-medium">
            <span className="font-mono text-rose-600">@{profile?.username}</span>
            <span>•</span>
            <span>{profile?.email}</span>
            {profile?.phone && (
              <>
                <span>•</span>
                <span>{profile?.phone}</span>
              </>
            )}
          </div>

          {profile?.merchant && (
            <div className="pt-2 text-xs flex items-center justify-center sm:justify-start gap-2 text-slate-700">
              <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Assigned Merchant: <strong className="text-slate-900">{profile.merchant.tradeName}</strong></span>
              <span className="font-mono text-[11px] text-slate-500">({profile.merchant.gstin})</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Edit Info & Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Edit Personal Details */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <User className="w-4 h-4 text-rose-600" />
            Personal Information
          </div>

          {profileMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                Choose Profile Avatar Preset
              </label>
              <div className="flex items-center gap-2">
                {AVATAR_PRESETS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, profilePhotoUrl: av })}
                    className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition ${
                      profileForm.profilePhotoUrl === av ? 'border-rose-600 scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av} alt="avatar option" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {isSavingProfile ? 'Saving Changes…' : 'Save Profile Details'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="glass-panel rounded-3xl p-6 space-y-4 border border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Key className="w-4 h-4 text-rose-600" />
            Security & Change Password
          </div>

          {passwordMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passwordMsg}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Current Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                New Password (min 6 chars) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition disabled:opacity-60"
              >
                <Key className="w-4 h-4" />
                {isChangingPass ? 'Updating Password…' : 'Update Account Password'}
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
