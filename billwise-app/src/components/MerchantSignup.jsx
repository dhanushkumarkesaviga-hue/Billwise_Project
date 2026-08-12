import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  FileText, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Eye,
  EyeOff,
  Store,
  HelpCircle,
  KeyRound,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import { validateGstin, DUMMY_VALID_GSTINS, extractPanFromGstin } from '../utils/gstValidation';
import { merchantApi, authApi } from '../api';

const BUSINESS_TYPES = [
  "Proprietorship",
  "Partnership",
  "Private Limited",
  "LLP (Limited Liability Partnership)",
  "Public Limited",
  "One Person Company (OPC)"
];

export default function MerchantSignup({ 
  onSwitchToLogin,
  initialEmail = '',
  initialName = '',
  isGoogleSignup = false
}) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdMerchant, setCreatedMerchant] = useState(null);

  // Email OTP verification state (Pre-verified if signing up with Google)
  const [emailOtp, setEmailOtp] = useState(isGoogleSignup ? 'GOOGLE_VERIFIED' : '');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(Boolean(isGoogleSignup && initialEmail));
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState(null);
  const [devOtp, setDevOtp] = useState(null);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  // Form State
  const [formData, setFormData] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    businessType: 'Proprietorship',
    registeredAddress: '',
    state: '',
    pincode: '',
    contactEmail: initialEmail || '',
    contactPhone: '',
    gstCertificateUrl: '',
    gstCertFileName: '',
    shopLicenseUrl: '',
    shopLicenseFileName: '',
    storefrontPhotoUrl: '',
    storefrontFileName: '',
    adminFullName: initialName || '',
    adminUsername: initialEmail ? initialEmail.split('@')[0].replace(/[^a-z0-9_]/g, '').toLowerCase() : '',
    adminPassword: ''
  });

  // Real-time GSTIN validation
  const gstinVal = validateGstin(formData.gstin);

  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    const validation = validateGstin(val);
    setFormData(prev => ({
      ...prev,
      gstin: val,
      state: validation.stateName || prev.state
    }));
  };

  const handleApplyDummyGstin = (dummy) => {
    setFormData(prev => ({
      ...prev,
      gstin: dummy.gstin,
      state: dummy.state,
      legalName: prev.legalName || `${dummy.name} Pvt Ltd`,
      tradeName: prev.tradeName || dummy.name
    }));
  };

  // Document file to base64 conversion
  const handleFileUpload = (e, fieldName, nameField) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        [fieldName]: event.target.result,
        [nameField]: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSampleDocFill = (fieldName, nameField, fallbackUrl, label) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: fallbackUrl,
      [nameField]: label
    }));
  };

  const handleNextStep1 = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.legalName.trim() || !formData.tradeName.trim()) {
      setErrorMsg("Please enter both legal business name and trade name.");
      return;
    }

    if (!gstinVal.isValid) {
      setErrorMsg(`Invalid GSTIN: ${gstinVal.message}`);
      return;
    }

    if (!formData.registeredAddress.trim()) {
      setErrorMsg("Please enter registered business address.");
      return;
    }

    setStep(2);
  };

  const handleSendEmailOtp = async () => {
    const cleanEmail = formData.contactEmail ? formData.contactEmail.trim().toLowerCase() : '';
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg("Please enter a valid Gmail / Contact Email address first.");
      return;
    }
    setErrorMsg(null);
    setOtpLoading(true);
    setOtpMessage(null);
    try {
      const res = await authApi.sendSignupOtp(cleanEmail);
      setIsOtpSent(true);
      setDevOtp(res.devOtp);
      setOtpMessage(res.message || "OTP code sent to email.");
      setOtpCountdown(60);
    } catch (err) {
      setErrorMsg(err.message || "Failed to send OTP to email.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const cleanEmail = formData.contactEmail ? formData.contactEmail.trim().toLowerCase() : '';
    const cleanOtp = emailOtp ? emailOtp.trim() : '';
    if (!cleanOtp || cleanOtp.length < 6) {
      setErrorMsg("Please enter the 6-digit OTP code.");
      return;
    }
    setErrorMsg(null);
    setOtpLoading(true);
    try {
      await authApi.verifySignupOtp(cleanEmail, cleanOtp);
      setIsEmailVerified(true);
      setOtpMessage("✓ Email verified successfully!");
    } catch (err) {
      setErrorMsg(err.message || "Invalid or expired OTP code.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleNextStep2 = (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.adminFullName.trim() || !formData.adminUsername.trim() || !formData.adminPassword) {
      setErrorMsg("Please fill in all owner/admin account fields.");
      return;
    }

    if (formData.adminPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (!formData.contactEmail.trim() || !formData.contactEmail.includes('@')) {
      setErrorMsg("Please provide a valid contact Gmail / Email.");
      return;
    }

    if (!formData.contactPhone.trim() || formData.contactPhone.trim().length < 10) {
      setErrorMsg("Please provide a valid contact mobile phone number (min 10 digits).");
      return;
    }

    if (!isEmailVerified) {
      setErrorMsg("Please verify your Gmail / Email with the 6-digit OTP before proceeding.");
      return;
    }

    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.gstCertificateUrl) {
      setErrorMsg("GST Certificate document is mandatory for verification.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        legalName: formData.legalName,
        tradeName: formData.tradeName,
        gstin: formData.gstin,
        pan: extractPanFromGstin(formData.gstin),
        businessType: formData.businessType || 'Proprietorship',
        registeredAddress: formData.registeredAddress,
        state: formData.state || gstinVal.stateName || 'Maharashtra',
        stateCode: formData.gstin.slice(0, 2),
        pincode: formData.pincode || '400001',
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        emailOtp: isGoogleSignup ? 'GOOGLE_VERIFIED' : (emailOtp || (isEmailVerified ? 'GOOGLE_VERIFIED' : '')),
        gstCertificateUrl: formData.gstCertificateUrl,
        shopLicenseUrl: formData.shopLicenseUrl || null,
        storefrontPhotoUrl: formData.storefrontPhotoUrl || null,
        adminFullName: formData.adminFullName || formData.tradeName + ' Admin',
        adminUsername: formData.adminUsername,
        adminEmail: formData.contactEmail,
        adminPhone: formData.contactPhone,
        adminPassword: formData.adminPassword
      };

      const result = await merchantApi.signup(payload);
      setCreatedMerchant(result);
      setIsSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || "Registration failed. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white border border-rose-200 rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              Status: Pending Verification
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2">
              Registration Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your merchant account for <strong className="text-slate-900 font-bold">{createdMerchant?.tradeName}</strong> has been submitted. Our compliance team and platform administrators review submissions within 24 hours.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Registered GSTIN:</span>
              <span className="font-mono font-bold text-slate-900">{createdMerchant?.gstin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PAN:</span>
              <span className="font-mono font-bold text-slate-900">{createdMerchant?.pan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Admin Username:</span>
              <span className="font-mono font-bold text-rose-600">{createdMerchant?.adminUsername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Submitted Documents:</span>
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> GST Certificate Attached
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs text-left">
            <p className="font-bold flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-rose-600" />
              What happens next?
            </p>
            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
              You can log into BillWise right now using your username & password. Your account will display an <strong>"Under Review"</strong> progress dashboard until a Super Administrator approves your GST certificate.
            </p>
          </div>

          <button
            onClick={onSwitchToLogin}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="max-w-2xl w-full space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            Merchant Self-Service Onboarding
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Register Your Business on Bill<span className="text-rose-600">Wise</span>
          </h1>
          <p className="text-xs text-slate-500">
            GST invoice automation, ITC claiming & statutory compliance platform
          </p>
        </div>

        {/* Wizard Card */}
        <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">

          {/* Stepper Progress */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center transition ${
                step === 1 ? 'bg-rose-600 text-white shadow-sm' : step > 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </span>
              <span className={`text-xs font-bold hidden sm:inline ${step === 1 ? 'text-slate-900' : 'text-slate-500'}`}>
                Business Details
              </span>
            </div>

            <div className="h-0.5 w-12 bg-slate-200 mx-2" />

            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center transition ${
                step === 2 ? 'bg-rose-600 text-white shadow-sm' : step > 2 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </span>
              <span className={`text-xs font-bold hidden sm:inline ${step === 2 ? 'text-slate-900' : 'text-slate-500'}`}>
                Owner / Admin
              </span>
            </div>

            <div className="h-0.5 w-12 bg-slate-200 mx-2" />

            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full text-xs font-extrabold flex items-center justify-center transition ${
                step === 3 ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'
              }`}>
                3
              </span>
              <span className={`text-xs font-bold hidden sm:inline ${step === 3 ? 'text-slate-900' : 'text-slate-500'}`}>
                Document Proofs
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: BUSINESS DETAILS */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                    Legal Business Name *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Logistics LLP"
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                    Trade / Shop Name *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Logistics"
                      value={formData.tradeName}
                      onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* GSTIN Input with Mod-36 Checksum Validation */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-rose-50/30 border border-rose-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    15-Character GSTIN Number *
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Mod-36 Checksum Verified</span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={handleGstinChange}
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-sm tracking-wider uppercase focus:border-rose-500 outline-none"
                  />
                  {gstinVal.isValid && (
                    <span className="absolute right-3 top-2.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Checksum Valid
                    </span>
                  )}
                </div>

                {/* Validation message badge */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className={`font-medium ${
                    gstinVal.isValid ? 'text-emerald-700 font-bold' : gstinVal.status === 'CHECKSUM_FAILED' ? 'text-rose-600 font-bold' : 'text-slate-500'
                  }`}>
                    {gstinVal.message}
                  </span>
                  {gstinVal.pan && (
                    <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      PAN: <strong>{gstinVal.pan}</strong>
                    </span>
                  )}
                </div>

                {/* Quick Demo GSTINs */}
                <div className="pt-2 border-t border-rose-100/60">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Test with Sample Valid GSTINs:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DUMMY_VALID_GSTINS.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplyDummyGstin(d)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-rose-200 text-slate-700 hover:text-rose-700 font-mono text-[10px] transition shadow-2xs font-semibold"
                      >
                        {d.gstin} ({d.state})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                    Business Constitution Type
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:border-rose-500 outline-none font-medium"
                  >
                    {BUSINESS_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={formData.state || gstinVal.stateName || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                  Registered Business Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <textarea
                    required
                    rows={2}
                    placeholder="Unit / Plot number, Street, Industrial Area, City"
                    value={formData.registeredAddress}
                    onChange={(e) => setFormData({ ...formData, registeredAddress: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                  Pincode
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 400093"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                />
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  Already registered? Log in
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition"
                >
                  Next: Owner Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: OWNER / ADMIN ACCOUNT */}
          {step === 2 && (
            <form onSubmit={handleNextStep2} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                  Owner / Authorized Signatory Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Malhotra"
                    value={formData.adminFullName}
                    onChange={(e) => setFormData({ ...formData, adminFullName: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 block">
                      Contact Email / Gmail *
                    </label>
                    {isEmailVerified && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      disabled={isEmailVerified}
                      placeholder="merchant@gmail.com"
                      value={formData.contactEmail}
                      onChange={(e) => {
                        setFormData({ ...formData, contactEmail: e.target.value });
                        setIsEmailVerified(false);
                        setIsOtpSent(false);
                        setEmailOtp('');
                      }}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1 block">
                    Contact Mobile Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value.replace(/[^0-9+ -]/g, '') })}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* EMAIL OTP VERIFICATION CONTAINER */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isEmailVerified 
                  ? 'bg-emerald-50/70 border-emerald-200' 
                  : isOtpSent 
                  ? 'bg-rose-50/70 border-rose-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isEmailVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      <KeyRound className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {isEmailVerified ? 'Gmail / Email Verified' : 'Verify Email with 6-Digit OTP'}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {isEmailVerified 
                          ? 'Your email address has been verified for merchant ownership.' 
                          : 'A 6-digit verification code is required to register this business.'}
                      </p>
                    </div>
                  </div>

                  {!isEmailVerified && (
                    <button
                      type="button"
                      disabled={otpLoading || !formData.contactEmail || !formData.contactEmail.includes('@') || otpCountdown > 0}
                      onClick={handleSendEmailOtp}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold text-[11px] shadow-sm transition shrink-0"
                    >
                      {otpLoading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      {otpCountdown > 0 ? `Resend (${otpCountdown}s)` : isOtpSent ? 'Resend OTP' : 'Send OTP to Email'}
                    </button>
                  )}
                  {isEmailVerified && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailVerified(false);
                        setIsOtpSent(false);
                        setEmailOtp('');
                        setDevOtp(null);
                        setOtpMessage(null);
                      }}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline transition"
                    >
                      Change Email
                    </button>
                  )}
                </div>

                {/* OTP Input Form when OTP is sent & not yet verified */}
                {isOtpSent && !isEmailVerified && (
                  <div className="mt-3 pt-3 border-t border-rose-200/60 space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">
                        Code sent to <strong className="text-slate-900">{formData.contactEmail}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtpSent(false);
                          setEmailOtp('');
                          setDevOtp(null);
                          setOtpMessage(null);
                        }}
                        className="text-rose-700 hover:text-rose-900 font-bold underline transition"
                      >
                        Mistyped email? Edit
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="w-3.5 h-3.5 absolute left-3 top-3 text-rose-500" />
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-Digit OTP"
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-rose-300 text-slate-900 font-mono font-bold text-sm tracking-widest focus:border-rose-500 outline-none shadow-2xs"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={otpLoading || emailOtp.length < 6}
                        onClick={handleVerifyEmailOtp}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1"
                      >
                        {otpLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Verify OTP
                      </button>
                    </div>

                    {/* Dev OTP auto-fill badge for easy local testing */}
                    {devOtp && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Dev Code: <strong className="font-mono font-bold tracking-wider">{devOtp}</strong></span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEmailOtp(devOtp);
                            setCopiedOtp(true);
                            setTimeout(() => setCopiedOtp(false), 2000);
                          }}
                          className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-bold transition flex items-center gap-1"
                        >
                          {copiedOtp ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedOtp ? 'Filled' : 'Auto-fill'}
                        </button>
                      </div>
                    )}

                    {otpMessage && (
                      <p className="text-[11px] text-rose-700 font-medium">{otpMessage}</p>
                    )}
                  </div>
                )}

                {isEmailVerified && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>OTP verified successfully for {formData.contactEmail}</span>
                  </div>
                )}
              </div>


              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-900 block">
                  Create Admin Login Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Admin Username *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. apex_admin"
                        value={formData.adminUsername}
                        onChange={(e) => setFormData({ ...formData, adminUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Password (min 6 chars) *
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={formData.adminPassword}
                        onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                        className="w-full pl-8 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs focus:border-rose-500 outline-none font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition"
                >
                  Next: Upload Documents <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: DOCUMENT PROOFS */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-800 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Manual Verification Review Process
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Upload your GST Registration Certificate (Form GST REG-06). A Super Administrator will review your document proof to activate full invoice ledger access.
                </p>
              </div>

              {/* GST Certificate (Required) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    1. GST Registration Certificate (Form GST REG-06) *
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSampleDocFill('gstCertificateUrl', 'gstCertFileName', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60', 'Sample_GST_REG06.pdf')}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline"
                  >
                    Use Sample Document
                  </button>
                </div>

                <div className="border-2 border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/20 rounded-2xl p-4 text-center cursor-pointer transition relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'gstCertificateUrl', 'gstCertFileName')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {formData.gstCertificateUrl ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>{formData.gstCertFileName || 'GST Certificate Attached'}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-rose-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-800">Click to upload GST Certificate</p>
                      <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Shop / Trade License (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    2. Shop & Establishment / Trade License (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSampleDocFill('shopLicenseUrl', 'shopLicenseFileName', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60', 'Sample_Shop_License.pdf')}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline"
                  >
                    Use Sample
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 rounded-2xl p-3 text-center cursor-pointer transition relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileUpload(e, 'shopLicenseUrl', 'shopLicenseFileName')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {formData.shopLicenseUrl ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{formData.shopLicenseFileName || 'Trade License Attached'}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>Upload Trade License / Udyam Certificate (Optional)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Storefront Photo (Optional) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                    3. Storefront / Office Photo (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSampleDocFill('storefrontPhotoUrl', 'storefrontFileName', 'https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?w=800&auto=format&fit=crop&q=60', 'Storefront_Photo.jpg')}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold underline"
                  >
                    Use Sample Photo
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 rounded-2xl p-3 text-center cursor-pointer transition relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'storefrontPhotoUrl', 'storefrontFileName')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {formData.storefrontPhotoUrl ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{formData.storefrontFileName || 'Storefront Photo Attached'}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
                      <Store className="w-4 h-4 text-slate-400" />
                      <span>Upload Storefront / Premises Photo (Improves Trust Score)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting Application…' : 'Submit for Verification'}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
