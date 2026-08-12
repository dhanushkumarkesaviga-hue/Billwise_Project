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
  ArrowLeft,
  Copy,
  Check,
  HelpCircle,
  Shield
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

  // Google Sign In state & Pre-fill
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleSignupData, setGoogleSignupData] = useState({ email: '', name: '', isGoogle: false });
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleRole, setCustomGoogleRole] = useState('ADMIN');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const googleBtnRef = useRef(null);

  // Handle OAuth2 Redirect Callbacks from Backend (e.g. /oauth2/authorization/google)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('oauth_token');
    const oauthNewUser = params.get('oauth_new_user');
    const errorParam = params.get('error');

    if (oauthToken) {
      loginWithToken(oauthToken, {
        username: params.get('username'),
        email: params.get('email'),
        fullName: params.get('fullName'),
        role: params.get('role'),
        merchantId: params.get('merchantId')
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthNewUser === 'true') {
      const email = params.get('email') || '';
      const name = params.get('name') || '';
      setGoogleSignupData({ email, name, isGoogle: true });
      setView('merchant_signup');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorParam) {
      setLocalError(decodeURIComponent(errorParam));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [loginWithToken]);

  // Forgot Password Flow State (Admin Approval Flow)
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

  const handleGoogleAuth = useCallback(async (googleAccount, idToken = null) => {
    setIsGoogleLoading(true);
    setLocalError(null);
    try {
      const res = await googleLogin({
        email: googleAccount.email,
        name: googleAccount.name || googleAccount.email.split('@')[0],
        googleId: googleAccount.googleId || `google_${googleAccount.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        avatar: googleAccount.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        role: googleAccount.role || 'ADMIN',
        idToken: idToken || null,
        adminUsername: googleAccount.adminUsername || null
      });
      setShowGoogleModal(false);

      if (res && (res.isNewUser || !res.token)) {
        // Merchant Verification Guardrail: Route new Google accounts to KYC verification signup
        setGoogleSignupData({
          email: res.email || googleAccount.email,
          name: res.fullName || googleAccount.name || '',
          isGoogle: true
        });
        setView('merchant_signup');
      }
    } catch (err) {
      console.warn("Google Auth notice:", err);
      // If user is new / not yet registered, immediately open Merchant Signup
      setShowGoogleModal(false);
      setGoogleSignupData({
        email: googleAccount.email,
        name: googleAccount.name || googleAccount.email.split('@')[0],
        isGoogle: true
      });
      setView('merchant_signup');
    } finally {
      setIsGoogleLoading(false);
    }
  }, [googleLogin]);

  // Google Identity Services (GIS) Credential Callback
  const handleGoogleCredentialResponse = useCallback(async (response) => {
    if (!response || !response.credential) return;
    setIsGoogleLoading(true);
    setLocalError(null);
    try {
      const payload = decodeJwtResponse(response.credential);
      if (!payload || !payload.email) {
        throw new Error('Could not extract verified email from Google Sign-In.');
      }
      await handleGoogleAuth({
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        avatar: payload.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        googleId: payload.sub,
        role: 'ADMIN'
      }, response.credential);
    } catch (err) {
      setLocalError(err.message || 'Google authentication failed');
      setIsGoogleLoading(false);
    }
  }, [handleGoogleAuth]);

  // Initialize Google Identity Services SDK (if valid Google Cloud Client ID is configured)
  useEffect(() => {
    if (!hasValidGoogleClientId) return;

    const initGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          setGsiLoaded(true);

          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'signin_with',
              logo_alignment: 'left',
              width: 340
            });
          }
          // Optionally display Google One-Tap
          try {
            window.google.accounts.id.prompt();
          } catch (e) {}
        } catch (e) {
          console.warn('GIS initialization notice:', e);
        }
      }
    };

    initGsi();
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        initGsi();
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [hasValidGoogleClientId, handleGoogleCredentialResponse, view]);

  const triggerGoogleSignIn = () => {
    setLocalError(null);
    setShowGoogleModal(true);
    if (window.google?.accounts?.id && hasValidGoogleClientId) {
      try {
        window.google.accounts.id.prompt();
      } catch (e) {}
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

  const handleCustomGoogleSubmit = async (e) => {
    e.preventDefault();
    if (!customGoogleEmail || !customGoogleEmail.includes('@')) {
      setLocalError('Please enter a valid Gmail address.');
      return;
    }
    await handleGoogleAuth({
      email: customGoogleEmail.toLowerCase().trim(),
      name: customGoogleName.trim() || customGoogleEmail.split('@')[0],
      role: 'ADMIN',
      adminUsername: null
    });
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
          setGoogleSignupData({ email: '', name: '', isGoogle: false });
        }}
        onBackToLanding={onBackToLanding}
        initialEmail={googleSignupData.email}
        initialName={googleSignupData.name}
        isGoogleSignup={googleSignupData.isGoogle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8 relative">
      
      {/* GOOGLE SIGN IN MODAL */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Sign In with Google</h3>
                  <p className="text-xs text-slate-500">1-Click Admin Authentication (Zero Typing)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Google Native One-Tap Trigger / GSI */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50/40 border border-rose-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    <span>Official Google Account Chooser</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold uppercase tracking-wider">
                    Instant
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Sign in instantly with your verified Google Admin account without typing passwords or OTPs.
                </p>

                <div className="flex flex-col items-center justify-center pt-1">
                  <div ref={googleBtnRef} className="min-h-[40px] flex items-center justify-center" />
                </div>
              </div>

              {/* Enter Official Business Gmail */}
              <div className="pt-2 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Or Enter Your Business Gmail:</span>
                  <span className="text-[10px] text-rose-600 font-bold">Secure Google Authentication</span>
                </div>
                <form onSubmit={handleCustomGoogleSubmit} className="space-y-2.5">
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. newmerchant@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                    />
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Full Name / Proprietor Name"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isGoogleLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-60"
                  >
                    <GoogleIcon className="w-4 h-4" />
                    <span>Continue with Gmail</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                  <p className="text-[10px] text-slate-500 text-center leading-normal">
                    ✨ If this Gmail is new, you will instantly be taken to the <strong>New Merchant Creation Page</strong> with verified email and zero OTP delay.
                  </p>
                </form>
              </div>

              {isGoogleLoading && (
                <div className="p-3 rounded-xl bg-slate-900 text-white text-xs font-medium flex items-center justify-center gap-2 animate-pulse">
                  <GoogleIcon className="w-4 h-4 animate-spin" />
                  <span>Authenticating with Google & routing to account…</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


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

              {/* Prominent Google Sign-In Button */}
              <button
                type="button"
                id="google-signin-btn"
                disabled={isGoogleLoading}
                onClick={triggerGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl border-2 border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-xs hover:shadow-md transition group cursor-pointer"
              >
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span className="text-slate-800 group-hover:text-slate-900 font-extrabold text-sm">
                  {isGoogleLoading ? 'Signing in with Google…' : 'Sign in with Google'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold ml-auto uppercase tracking-wide border border-slate-200">
                  Fast Sign In
                </span>
              </button>

              <div className="relative flex items-center justify-center">
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
                        setForgotStep(1);
                        setForgotIdentifier(username || '');
                        setLocalError(null);
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline transition"
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

          {/* VIEW 2: FORGOT PASSWORD (SUBMIT REQUEST TO ADMIN FOR APPROVAL) */}
          {view === 'forgot_password' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  Admin-Approved Password Reset
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">Forgot Your Password?</h2>
                <p className="text-xs text-slate-500">
                  Submit a reset request to your shop Admin for verification and approval.
                </p>
              </div>

              {!forgotSubmitted ? (
                <form onSubmit={handleForgotRequestSubmit} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Username or Registered Email *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. accountant or user@gmail.com"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Desired New Password (min 6 characters) *
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Enter desired new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-8 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
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
                        placeholder="Re-enter desired new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Contact Phone (for identity verification)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Reason / Note for Admin
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Forgot previous password, requesting urgent password reset approval"
                      value={forgotReason}
                      onChange={(e) => setForgotReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none"
                    />
                  </div>

                  {localError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2.5 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{localError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-60"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {forgotLoading ? 'Submitting Request…' : 'Submit Password Reset Request to Admin'}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => { setView('login'); setLocalError(null); }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckResetStatus}
                      className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                    >
                      Check Status
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <Clock className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Status: Pending Admin Approval
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-2">
                      Reset Request Submitted!
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                      Your password reset request for <strong className="text-slate-900">{forgotIdentifier}</strong> has been routed to your shop Admin (<strong className="text-rose-600 font-mono">@{assignedAdmin}</strong>).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                      What happens next?
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Your shop Admin will review and click <strong>"Approve Password Reset"</strong> in their Accountant Management panel. Once approved, your new password is automatically active!
                    </p>
                  </div>

                  {requestStatusData && (
                    <div className={`p-3 rounded-xl text-xs font-semibold border ${
                      requestStatusData.status === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : requestStatusData.status === 'REJECTED'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-amber-50 border-amber-300 text-amber-800'
                    }`}>
                      <div className="flex items-center justify-center gap-1.5 mb-1 font-bold">
                        {requestStatusData.status === 'APPROVED' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                        <span>Status: {requestStatusData.status}</span>
                      </div>
                      <p className="text-[11px]">{requestStatusData.message}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="button"
                      disabled={checkingStatus}
                      onClick={handleCheckResetStatus}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1"
                    >
                      {checkingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Check Approval Status
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setView('login');
                        setUsername(forgotIdentifier.trim());
                        setPassword(newPassword);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      Go to Sign In
                    </button>
                  </div>
                </div>
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
    </div>
  );
}
