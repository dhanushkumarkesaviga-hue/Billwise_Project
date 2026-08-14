import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ScanLine, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  LogIn, 
  Building2, 
  Sparkles,
  ArrowRight,
  UserPlus,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Phone,
  AtSign,
  KeyRound,
  Key,
  ArrowLeft,
  Copy,
  Check,
  HelpCircle,
  Shield, 
  Clock, 
  RefreshCw, 
  Send,
  X,
  ExternalLink,
  Zap,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import MerchantSignup from './MerchantSignup';

function GoogleIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function decodeJwtResponse(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error('Error decoding Google JWT token:', err);
    return null;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const hasValidGoogleClientId = Boolean(GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('exampleappssoid'));


export default function Login({ onBackToLanding, initialView = 'login' }) {
  const { 
    login, 
    register, 
    googleLogin, 
    loginWithToken, 
    isAuthLoading, 
    authError, 
    sessionExpiredMessage, 
    clearSessionExpiredMessage 
  } = useAuth();
  const [view, setView] = useState(initialView); // 'login' | 'accountant_register' | 'merchant_signup' | 'forgot_password'
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);
  const [loginSuccessBanner, setLoginSuccessBanner] = useState(null);

  // Google Sign In state & Pre-fill (Real Google Identity Services & Fallback Authenticator)
  const [googleSignupData, setGoogleSignupData] = useState({ email: '', name: '', idToken: '', isGoogle: false });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [modalName, setModalName] = useState('');
  const [modalIdToken, setModalIdToken] = useState('');
  const [modalTab, setModalTab] = useState('quick'); // 'quick' | 'custom' | 'token'
  const googleBtnRef = useRef(null);

  // Direct Email OTP Password Reset State (for Admin, SuperAdmin, & Accountants)
  const [resetStep, setResetStep] = useState('ENTER_IDENTIFIER'); // 'ENTER_IDENTIFIER' | 'ENTER_OTP_AND_PASSWORD' | 'ADMIN_APPROVAL_MODE'
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetMaskedEmail, setResetMaskedEmail] = useState('');
  const [resetDevOtp, setResetDevOtp] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(null);
  const [resetCountdown, setResetCountdown] = useState(0);

  // Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (resetCountdown > 0) {
      timer = setTimeout(() => setResetCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resetCountdown]);

  // Legacy Admin Approval Ticket Flow State (Fallback for Staff)
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotReason, setForgotReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [assignedAdmin, setAssignedAdmin] = useState(null);
  const [requestStatusData, setRequestStatusData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState(null);

  // Accountant Registration Form State
  const [regForm, setRegForm] = useState({
    adminUsername: '',
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'ACCOUNTANT'
  });
  const [regSuccessMsg, setRegSuccessMsg] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [forgotOtp, setForgotOtp] = useState('');

  // Core Google Login Dispatcher
  const authenticateWithGoogle = useCallback(async (googlePayloadOrEmail, optionalName) => {
    setIsGoogleLoading(true);
    setLocalError(null);
    setShowGoogleModal(false);
    try {
      let payload;
      if (typeof googlePayloadOrEmail === 'object' && googlePayloadOrEmail !== null && googlePayloadOrEmail.idToken) {
        payload = googlePayloadOrEmail;
      } else {
        const cleanEmail = (typeof googlePayloadOrEmail === 'string' ? googlePayloadOrEmail : modalEmail).trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
          throw new Error('Please enter a valid Google email address.');
        }
        const cleanName = optionalName || modalName || cleanEmail.split('@')[0];
        // Create structured simulated Google Identity token
        const devTokenObj = {
          email: cleanEmail,
          name: cleanName,
          sub: 'google_' + Math.abs(cleanEmail.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)),
          picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName || cleanEmail)}`,
          email_verified: true
        };
        payload = {
          idToken: JSON.stringify(devTokenObj),
          email: cleanEmail,
          name: cleanName,
          role: 'ADMIN'
        };
      }

      const res = await googleLogin(payload);
      if (res && (res.isNewUser || !res.token)) {
        // Unregistered Google user -> route to KYC merchant registration with verified token
        setGoogleSignupData({
          email: res.email || (payload.email || ''),
          name: res.fullName || (payload.name || ''),
          idToken: payload.idToken,
          isGoogle: true
        });
        setView('merchant_signup');
      }
    } catch (err) {
      console.warn("Google authentication error:", err);
      setLocalError(err.message || 'Google authentication failed. Please try again or sign in with your password.');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [googleLogin, modalEmail, modalName]);

  // Real Google Identity Services (GIS) Credential Callback
  const handleGoogleCredentialResponse = useCallback(async (response) => {
    if (!response || !response.credential) return;
    await authenticateWithGoogle({ idToken: response.credential });
  }, [authenticateWithGoogle]);

  const gsiInitializedRef = React.useRef(false);

  // Initialize Google Identity Services SDK (if valid Google Cloud Client ID is configured)
  useEffect(() => {
    if (!hasValidGoogleClientId) return;

    const setupGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        try {
          if (!gsiInitializedRef.current) {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleGoogleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true
            });
            gsiInitializedRef.current = true;
            setGsiLoaded(true);
          }

          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 340
            });
          }
        } catch (e) {
          console.warn('GIS initialization notice:', e);
        }
        return true;
      }
      return false;
    };

    if (!setupGoogleSignIn()) {
      const interval = setInterval(() => {
        if (setupGoogleSignIn()) {
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [hasValidGoogleClientId, handleGoogleCredentialResponse, view]);

  const triggerGoogleSignIn = () => {
    setLocalError(null);
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setShowGoogleModal(true);
          }
        });
      } catch (e) {
        setShowGoogleModal(true);
      }
    } else {
      setShowGoogleModal(true);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await login(username, password);
    } catch {
      // authError handled in context
    }
  };

  // ========================================================
  // EMAIL OTP PASSWORD RESET FLOW (ADMIN, SUPERADMIN, STAFF)
  // ========================================================
  const handleSendResetOtp = async (e) => {
    if (e) e.preventDefault();
    setLocalError(null);
    setResetSuccessMsg(null);

    const cleanIdentifier = (resetIdentifier || username).trim();
    if (!cleanIdentifier) {
      setLocalError('Please enter your registered Username or Email address.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const resp = await authApi.forgotPassword(cleanIdentifier);
      setResetIdentifier(cleanIdentifier);
      const masked = resp.emailMasked || resp.maskedEmail || cleanIdentifier;
      setResetMaskedEmail(masked);
      setResetDevOtp(resp.devOtp || resp.devOtpCode || null);
      setResetStep('ENTER_OTP_AND_PASSWORD');
      setResetCountdown(60);
      setResetSuccessMsg(resp.message || `Verification OTP sent to ${masked}`);
    } catch (err) {
      setLocalError(err.message || 'Could not find account or dispatch verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setResetSuccessMsg(null);

    if (!resetOtp.trim()) {
      setLocalError('Please enter the 6-digit verification code (OTP).');
      return;
    }

    if (resetNewPassword.length < 6) {
      setLocalError('New password must be at least 6 characters.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsResettingPassword(true);
    try {
      await authApi.resetPassword(resetIdentifier.trim(), resetOtp.trim(), resetNewPassword);
      setLoginSuccessBanner('Password reset successful! Please sign in with your new password.');
      setUsername(resetIdentifier.trim());
      setPassword(resetNewPassword);
      setView('login');
      // Reset state
      setResetStep('ENTER_IDENTIFIER');
      setResetOtp('');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Forgot Password: Submit Request to Admin
  const handleForgotRequestSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setForgotSuccessMsg(null);

    if (!forgotIdentifier.trim()) {
      setLocalError('Please enter your registered Username or Email.');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify.');
      return;
    }

    setForgotLoading(true);
    try {
      const resp = await authApi.requestPasswordReset({
        identifier: forgotIdentifier.trim(),
        newPassword: newPassword,
        phone: forgotPhone.trim(),
        reason: forgotReason.trim()
      });
      setForgotSubmitted(true);
      setAssignedAdmin(resp.adminUsername || 'admin');
      setForgotSuccessMsg(resp.message || 'Password reset request submitted to Admin.');
    } catch (err) {
      setLocalError(err.message || 'Failed to submit password reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Check Status of Password Reset Request
  const handleCheckResetStatus = async () => {
    if (!forgotIdentifier.trim()) return;
    setCheckingStatus(true);
    setLocalError(null);
    try {
      const resp = await authApi.checkPasswordResetStatus(forgotIdentifier.trim());
      setRequestStatusData(resp);
    } catch (err) {
      setLocalError(err.message || 'Failed to fetch status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleAccountantRegisterSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setRegSuccessMsg(null);

    const cleanAdminUser = regForm.adminUsername.trim().toLowerCase().replace('@', '');
    if (!cleanAdminUser) {
      setLocalError("Please enter your Admin's username (e.g. admin).");
      return;
    }

    try {
      await register({
        adminUsername: cleanAdminUser,
        username: regForm.username.toLowerCase().trim(),
        fullName: regForm.fullName.trim(),
        email: regForm.email.toLowerCase().trim(),
        phone: regForm.phone.trim(),
        password: regForm.password,
        role: 'ACCOUNTANT'
      });
      setRegSuccessMsg(`Account created! Your request has been sent to Admin @${cleanAdminUser} for approval.`);
    } catch (err) {
      setLocalError(err.message || 'Registration failed');
    }
  };


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedOtp(true);
    setForgotOtp(text);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  if (view === 'merchant_signup') {
    return (
      <MerchantSignup
        onSwitchToLogin={() => {
          setView('login');
          setGoogleSignupData({ email: '', name: '', idToken: '', isGoogle: false });
        }}
        onBackToLanding={onBackToLanding}
        initialEmail={googleSignupData.email}
        initialName={googleSignupData.name}
        initialGoogleIdToken={googleSignupData.idToken}
        isGoogleSignup={googleSignupData.isGoogle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8 relative">
      <div className="w-full max-w-md space-y-6">

        {onBackToLanding && (
          <div className="flex justify-start">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 font-bold text-xs shadow-2xs transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>
          </div>
        )}

        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-rose-400 p-0.5 shadow-md shadow-rose-500/20">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <ScanLine className="w-7 h-7 text-rose-600" />
            </div>
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900">
            Bill<span className="text-rose-600">Wise</span>
          </span>
          <p className="text-xs text-slate-500 font-medium text-center">
            Multi-Tenant SaaS GST Invoicing & Role Verification Platform
          </p>
        </div>

        {/* Card Container */}
        <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          
          {/* Mode Switcher Tabs (Only when in Login / Accountant Register) */}
          {(view === 'login' || view === 'accountant_register') && (
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setView('login'); setLocalError(null); }}
                className={`py-2 rounded-xl transition ${
                  view === 'login'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => { setView('accountant_register'); setLocalError(null); }}
                className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  view === 'accountant_register'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register Accountant
              </button>
            </div>
          )}

          {/* SESSION EXPIRED BANNER */}
          {sessionExpiredMessage && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-950 text-xs p-3.5 flex items-start gap-3 shadow-2xs animate-in fade-in slide-in-from-top-2">
              <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="font-extrabold text-amber-950 flex items-center justify-between">
                  <span>Session Expired</span>
                  <button 
                    type="button" 
                    onClick={clearSessionExpiredMessage}
                    className="text-[10px] text-amber-700 hover:text-amber-950 font-bold underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {sessionExpiredMessage}
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS BANNER */}
          {loginSuccessBanner && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs px-3.5 py-2.5 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{loginSuccessBanner}</span>
            </div>
          )}

          {/* VIEW 1: LOGIN FORM */}
          {view === 'login' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900">Sign in to your account</h2>
                <p className="text-xs text-slate-500">Use your Google Account or Username</p>
              </div>

              {/* Real Google Identity Services (GIS) Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-center min-h-[44px]">
                  <div ref={googleBtnRef} className="w-full flex items-center justify-center" />
                </div>

                {isGoogleLoading && (
                  <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
                    <GoogleIcon className="w-4 h-4 animate-spin" />
                    <span>Verifying Google token with server…</span>
                  </div>
                )}
              </div>

              <div className="relative flex items-center justify-center pt-1">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  OR SIGN IN WITH USERNAME
                </span>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. admin or accountant"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:border-rose-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 block">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot_password');
                        setResetStep('ENTER_IDENTIFIER');
                        setResetIdentifier(username || '');
                        setLocalError(null);
                        setResetSuccessMsg(null);
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm placeholder:text-slate-400 focus:border-rose-500 outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {(authError || localError) && (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2.5 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{authError || localError}</span>
                    </div>
                    {username.includes('@') && (
                      <button
                        type="button"
                        onClick={() => {
                          setGoogleSignupData({
                            email: username.trim(),
                            name: username.split('@')[0],
                            isGoogle: username.includes('gmail')
                          });
                          setView('merchant_signup');
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between transition cursor-pointer shadow-2xs"
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>New account? Create New Merchant with <strong>{username}</strong></span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-700 shrink-0 ml-1" />
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 disabled:opacity-60 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition"
                >
                  <LogIn className="w-4 h-4" />
                  {isAuthLoading ? 'Authenticating…' : 'Sign In'}
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-100 space-y-2">
                <p className="text-xs text-slate-500">
                  New to BillWise?{' '}
                  <button
                    type="button"
                    onClick={() => setView('merchant_signup')}
                    className="font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                  >
                    Register Your Business
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* VIEW 2: FORGOT PASSWORD (EMAIL OTP VERIFICATION FLOW FOR ADMIN, SUPERADMIN & USERS) */}
          {view === 'forgot_password' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold">
                  <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                  Email OTP Password Reset
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">Reset Your Password</h2>
                <p className="text-xs text-slate-500">
                  {resetStep === 'ENTER_IDENTIFIER'
                    ? 'Enter your registered username or email to receive a 6-digit verification code.'
                    : `Enter the 6-digit code sent to ${resetMaskedEmail || 'your email'} and set your new password.`}
                </p>
              </div>

              {localError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3.5 py-2.5 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              {resetSuccessMsg && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs px-3.5 py-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              {/* STEP 1: ENTER USERNAME OR EMAIL */}
              {resetStep === 'ENTER_IDENTIFIER' && (
                <form onSubmit={handleSendResetOtp} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Username or Registered Email *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. admin or superadmin or email@billwise.app"
                        value={resetIdentifier || username}
                        onChange={(e) => {
                          setResetIdentifier(e.target.value);
                          setLocalError(null);
                        }}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-60 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingOtp ? 'Sending 6-Digit OTP…' : 'Send Verification Code (OTP)'}
                  </button>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setView('login');
                        setLocalError(null);
                        setResetSuccessMsg(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetStep('ADMIN_APPROVAL_MODE')}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
                    >
                      Shop Admin Ticket?
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: ENTER 6-DIGIT OTP & NEW PASSWORD */}
              {resetStep === 'ENTER_OTP_AND_PASSWORD' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      6-Digit Verification Code (OTP) *
                    </label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="••••••"
                        value={resetOtp}
                        onChange={(e) => {
                          setResetOtp(e.target.value.replace(/\D/g, ''));
                          setLocalError(null);
                        }}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-mono tracking-widest text-center font-bold focus:border-rose-500 focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      New Password (min 6 characters) *
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Enter new password"
                        value={resetNewPassword}
                        onChange={(e) => {
                          setResetNewPassword(e.target.value);
                          setLocalError(null);
                        }}
                        className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 focus:bg-white outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Re-enter new password"
                        value={resetConfirmPassword}
                        onChange={(e) => {
                          setResetConfirmPassword(e.target.value);
                          setLocalError(null);
                        }}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 focus:bg-white outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Resend OTP Row */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>Didn't receive the email code?</span>
                    {resetCountdown > 0 ? (
                      <span className="font-mono text-rose-600 font-bold text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Resend in {resetCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendResetOtp}
                        disabled={isSendingOtp}
                        className="font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isResettingPassword}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-60 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isResettingPassword ? 'Resetting Password…' : 'Reset Password & Sign In'}
                  </button>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setResetStep('ENTER_IDENTIFIER')}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Email/Username
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setView('login');
                        setLocalError(null);
                        setResetSuccessMsg(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* FALLBACK: ADMIN TICKET APPROVAL (FOR STAFF ACCOUNTANTS) */}
              {resetStep === 'ADMIN_APPROVAL_MODE' && (
                <form onSubmit={handleForgotRequestSubmit} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Staff Username or Email *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. priya_acc"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Desired New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Reason / Note for Shop Admin
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Urgent reset approval requested"
                      value={forgotReason}
                      onChange={(e) => setForgotReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-60 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {forgotLoading ? 'Submitting…' : 'Submit Reset Request to Admin'}
                  </button>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setResetStep('ENTER_IDENTIFIER')}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Use Direct Email OTP Instead
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}


          {/* VIEW 3: REGISTER ACCOUNTANT FOR A SPECIFIC ADMIN USERNAME */}
          {view === 'accountant_register' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900">Create Accountant Account</h2>
                <p className="text-xs text-slate-500">Sign up under your shop Admin to request accountant access</p>
              </div>

              {regSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{regSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleAccountantRegisterSubmit} className="space-y-3">
                {/* Admin Username Input */}
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-700 block mb-1">
                    Shop Admin Username *
                  </label>
                  <div className="relative">
                    <AtSign className="w-3.5 h-3.5 absolute left-3 top-2.5 text-rose-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. admin or apex_admin"
                      value={regForm.adminUsername}
                      onChange={(e) => setRegForm({ ...regForm, adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs font-bold focus:border-rose-500 outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter the username of the Merchant Admin whose shop invoices you will manage.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={regForm.fullName}
                      onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Accountant Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. priya_acc"
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="accountant@company.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Password (min 6 characters) *
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="••••••••"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Admin Approval Requirement
                  </div>
                  <p className="text-[10px] text-amber-800 leading-normal">
                    After registration, your Admin will receive your request and click <strong>"Verify Accountant"</strong> in their Settings before you can open and manage the shop invoices.
                  </p>
                </div>

                {localError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2.5 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{localError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 disabled:opacity-60 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isAuthLoading ? 'Submitting Request…' : 'Register & Request Admin Approval'}
                </button>
              </form>
            </div>
          )}

          {/* Self-Service Merchant Signup Button */}
          <div className="pt-2 border-t border-slate-100 space-y-2 text-center">
            <button
              type="button"
              onClick={() => setView('merchant_signup')}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition group"
            >
              <Building2 className="w-4 h-4 text-rose-600" />
              <span>Register New Business Merchant (GSTIN Onboarding)</span>
              <ArrowRight className="w-3.5 h-3.5 text-rose-500 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* GOOGLE AUTHENTICATION & DIRECT IDENTITY MODAL           */}
      {/* ======================================================== */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-rose-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Google Authentication</h3>
                  <p className="text-[11px] text-slate-500">Sign in or verify with Google Identity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setModalTab('quick')}
                className={`flex-1 py-1.5 rounded-lg transition ${modalTab === 'quick' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Quick Accounts
              </button>
              <button
                type="button"
                onClick={() => setModalTab('custom')}
                className={`flex-1 py-1.5 rounded-lg transition ${modalTab === 'custom' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                Custom Google ID
              </button>
              <button
                type="button"
                onClick={() => setModalTab('token')}
                className={`flex-1 py-1.5 rounded-lg transition ${modalTab === 'token' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                OAuth ID Token
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* TAB 1: QUICK PROFILES */}
              {modalTab === 'quick' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Select a Google identity profile to authenticate immediately or test new merchant onboarding:
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => authenticateWithGoogle('freefiregodtamil@gmail.com', 'Dhanush Kumar')}
                      className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-rose-50/60 hover:border-rose-300 text-left transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-extrabold text-xs flex items-center justify-center">
                          DK
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700 transition">
                            freefiregodtamil@gmail.com
                          </div>
                          <div className="text-[10px] text-slate-500">Configured Admin Google Identity</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => authenticateWithGoogle('merchant.owner@gmail.com', 'Rajesh Sharma')}
                      className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/60 hover:border-emerald-300 text-left transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-xs flex items-center justify-center">
                          RS
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition">
                            merchant.owner@gmail.com
                          </div>
                          <div className="text-[10px] text-slate-500">New Merchant KYC Onboarding (Google Pre-Verified)</div>
                        </div>
                      </div>
                      <Sparkles className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition" />
                    </button>

                    <button
                      type="button"
                      onClick={() => authenticateWithGoogle('admin@billwise.app', 'Ram Sharma')}
                      className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 text-left transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xs flex items-center justify-center">
                          RS
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                            admin@billwise.app
                          </div>
                          <div className="text-[10px] text-slate-500">Seeded Verified Admin (Shri Ram Enterprise)</div>
                        </div>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-blue-500 group-hover:scale-110 transition" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CUSTOM GOOGLE EMAIL */}
              {modalTab === 'custom' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    authenticateWithGoogle(modalEmail, modalName);
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Google Account Email *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={modalEmail}
                        onChange={(e) => setModalEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={modalName}
                        onChange={(e) => setModalName(e.target.value)}
                        placeholder="e.g. Dhanush Kumar"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isGoogleLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 hover:from-rose-700 hover:to-red-700 transition flex items-center justify-center gap-2"
                  >
                    <GoogleIcon className="w-4 h-4" />
                    <span>Sign In with this Google Account</span>
                  </button>
                </form>
              )}

              {/* TAB 3: OAUTH ID TOKEN */}
              {modalTab === 'token' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (modalIdToken.trim()) {
                      authenticateWithGoogle({ idToken: modalIdToken.trim() });
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Signed Google JWT ID Token (Base64)
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={modalIdToken}
                      onChange={(e) => setModalIdToken(e.target.value)}
                      placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-[11px] font-mono focus:border-rose-500 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isGoogleLoading || !modalIdToken.trim()}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Verify & Authenticate Token</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
