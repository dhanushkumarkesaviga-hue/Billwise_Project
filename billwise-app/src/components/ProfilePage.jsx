import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Calendar,
  Eye,
  EyeOff,
  Image as ImageIcon,
  RotateCcw
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
  const fileInputRef = useRef(null);

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
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);

  // Change Email with OTP state
  const [showEmailOtpModal, setShowEmailOtpModal] = useState(false);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailOtpCountdown, setEmailOtpCountdown] = useState(0);
  const [emailOtpError, setEmailOtpError] = useState(null);
  const [devEmailOtp, setDevEmailOtp] = useState(null);

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

  // OTP resend countdown timer
  useEffect(() => {
    let timer;
    if (emailOtpCountdown > 0) {
      timer = setInterval(() => {
        setEmailOtpCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [emailOtpCountdown]);

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

  // Handle Local Image Upload & Client-Side Canvas Optimization
  const handleLocalImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image file is too large (max 5MB). Please choose a smaller photo.');
      return;
    }

    setIsUploadingLocal(true);
    setProfileError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // High quality canvas resize (max 320x320)
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        setProfileForm(prev => ({ ...prev, profilePhotoUrl: optimizedBase64 }));
        setIsUploadingLocal(false);
        setProfileMsg('Local image loaded! Click "Save Profile Details" to apply.');
        setTimeout(() => setProfileMsg(null), 3000);
      };
      img.onerror = () => {
        setIsUploadingLocal(false);
        setProfileError('Failed to process the selected image.');
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setIsUploadingLocal(false);
      setProfileError('Failed to read image file from disk.');
    };
    reader.readAsDataURL(file);
  };

  // Trigger dispatching OTP to new email address
  const handleSendEmailChangeOtp = async () => {
    const targetEmail = profileForm.email.trim();
    if (!targetEmail) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    setIsSendingEmailOtp(true);
    setEmailOtpError(null);
    try {
      const resp = await userApi.sendEmailChangeOtp(targetEmail);
      if (resp?.devOtp) {
        setDevEmailOtp(resp.devOtp);
      }
      setEmailOtpCountdown(60);
      setShowEmailOtpModal(true);
    } catch (err) {
      setProfileError(err.message || 'Failed to send verification OTP to new email');
      setEmailOtpError(err.message || 'Failed to send OTP code.');
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileError(null);

    const isEmailChanged = profile?.email && profileForm.email.trim().toLowerCase() !== profile.email.trim().toLowerCase();

    if (isEmailChanged) {
      // Require OTP verification modal for email update
      await handleSendEmailChangeOtp();
      return;
    }

    setIsSavingProfile(true);
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

  // Confirm email change with OTP
  const handleConfirmEmailOtpAndUpdate = async (e) => {
    e.preventDefault();
    if (!emailOtpCode || emailOtpCode.trim().length !== 6) {
      setEmailOtpError("Please enter the 6-digit numeric OTP code.");
      return;
    }

    setIsVerifyingEmailOtp(true);
    setEmailOtpError(null);
    try {
      const updated = await userApi.updateProfile({
        ...profileForm,
        emailOtp: emailOtpCode.trim()
      });
      setProfile(updated);
      setShowEmailOtpModal(false);
      setEmailOtpCode('');
      setDevEmailOtp(null);
      setProfileMsg("Email address verified and profile updated successfully!");
      await refreshProfile();
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err) {
      setEmailOtpError(err.message || "Invalid or expired OTP code.");
    } finally {
      setIsVerifyingEmailOtp(false);
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
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative group shrink-0 cursor-pointer"
          title="Click to choose a local avatar image"
        >
          <img
            src={profileForm.profilePhotoUrl || AVATAR_PRESETS[0]}
            alt={profile?.username}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-rose-300 shadow-md group-hover:opacity-90 group-hover:scale-102 transition"
          />
          <div className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition">
            <Camera className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Change</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-rose-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm">
            <Upload className="w-3 h-3" />
          </div>
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

              {/* Email Change Warning Alert */}
              {profile?.email && profileForm.email && profileForm.email.trim().toLowerCase() !== profile.email.trim().toLowerCase() && (
                <div className="p-3.5 mt-2.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    ⚠️ Security Notice: Changing Registered Account Email
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    You are changing your email from <strong className="font-semibold text-slate-900">{profile.email}</strong> to <strong className="font-semibold text-rose-600">{profileForm.email}</strong>.
                  </p>
                  <div className="text-[10.5px] text-amber-900 font-medium bg-amber-100/60 p-2 rounded-xl border border-amber-200/80 leading-normal">
                    🔒 <strong>OTP Verification Required:</strong> Clicking <em>"Save Profile Details"</em> will send a 6-digit verification code to the new address. All future GST filing alerts, password reset codes, and login recovery links will be routed to this new email.
                  </div>
                </div>
              )}
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

            {/* Profile Avatar Selection: Local Upload & Presets */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 block">
                Profile Avatar
              </label>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLocalImageUpload}
                className="hidden"
              />

              {/* Local File Picker Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLocal}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isUploadingLocal ? 'Processing…' : 'Choose Local Image from Device'}</span>
                </button>

                {profileForm.profilePhotoUrl?.startsWith('data:') && (
                  <button
                    type="button"
                    onClick={() => setProfileForm(prev => ({ ...prev, profilePhotoUrl: AVATAR_PRESETS[0] }))}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs font-bold transition cursor-pointer"
                    title="Reset to default avatar"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Avatar Presets Row */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 font-medium block mb-1.5">Or choose a preset:</span>
                <div className="flex items-center gap-2">
                  {AVATAR_PRESETS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, profilePhotoUrl: av })}
                      className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                        profileForm.profilePhotoUrl === av ? 'border-rose-600 scale-105 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={av} alt="avatar option" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-60 cursor-pointer"
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition disabled:opacity-60 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                {isChangingPass ? 'Updating Password…' : 'Update Account Password'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Email Change OTP Verification Modal */}
      {showEmailOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Verify New Email Address
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Confirm ownership of <strong className="text-rose-600">{profileForm.email}</strong>
                </p>
              </div>
            </div>

            {/* Security Warning Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Security Warning
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90">
                A 6-digit OTP code has been dispatched to <strong>{profileForm.email}</strong>. Once confirmed, your old email (<em>{profile?.email}</em>) will no longer receive system notifications or password reset requests.
              </p>
            </div>

            {emailOtpError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{emailOtpError}</span>
              </div>
            )}

            {/* Dev helper code */}
            {devEmailOtp && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center justify-between">
                <span>Dev OTP code:</span>
                <span className="font-mono font-bold tracking-widest bg-white px-2 py-0.5 rounded border border-blue-300">
                  {devEmailOtp}
                </span>
              </div>
            )}

            <form onSubmit={handleConfirmEmailOtpAndUpdate} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
                  Enter 6-Digit Verification Code *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="123456"
                  value={emailOtpCode}
                  onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-2xl font-mono font-extrabold tracking-widest py-3 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-rose-500 focus:bg-white outline-none transition"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleSendEmailChangeOtp}
                  disabled={emailOtpCountdown > 0 || isSendingEmailOtp}
                  className="text-rose-600 font-bold hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
                >
                  {isSendingEmailOtp ? 'Sending…' : emailOtpCountdown > 0 ? `Resend in ${emailOtpCountdown}s` : 'Resend Code'}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailOtpModal(false);
                    setEmailOtpCode('');
                    setEmailOtpError(null);
                  }}
                  disabled={isVerifyingEmailOtp}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingEmailOtp || emailOtpCode.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isVerifyingEmailOtp ? 'Verifying…' : 'Verify & Update Email'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
