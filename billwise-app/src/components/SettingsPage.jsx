import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Users, 
  Bell, 
  ShieldCheck, 
  Lock, 
  Save, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Power,
  MapPin,
  Mail,
  Phone,
  Store,
  Laptop,
  Check,
  Moon,
  Sun,
  Globe,
  DollarSign
} from 'lucide-react';
import { merchantApi, userApi } from '../api';
import { useAuth } from '../context/AuthContext';
import AccountantManagement from './AccountantManagement';

export default function SettingsPage({ onSelectInvoice }) {
  const { role, isSuperAdmin, refreshProfile } = useAuth();
  const isMerchantAdmin = role === 'ADMIN';

  const [activeTab, setActiveTab] = useState(isMerchantAdmin ? 'business' : 'notifications');

  // Business Details Form State
  const [businessData, setBusinessData] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    businessType: '',
    registeredAddress: '',
    state: '',
    pincode: '',
    contactEmail: '',
    contactPhone: '',
    status: ''
  });
  const [isSavingBiz, setIsSavingBiz] = useState(false);
  const [bizMsg, setBizMsg] = useState(null);
  const [bizError, setBizError] = useState(null);

  // User Settings State (matching backend UserSettings entity)
  const [userSettings, setUserSettings] = useState({
    emailAlerts: true,
    smsAlerts: true,
    deadlineReminders: true,
    autoOcrClassification: true,
    twoFactorAuth: false,
    language: 'English',
    currency: 'INR (₹)',
    theme: 'Light'
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState(null);
  const [settingsError, setSettingsError] = useState(null);

  useEffect(() => {
    if (isMerchantAdmin) {
      loadBusinessDetails();
    }
    loadUserSettings();
  }, [isMerchantAdmin]);

  const loadBusinessDetails = async () => {
    try {
      const data = await merchantApi.getMyBusiness();
      if (data) {
        setBusinessData({
          legalName: data.legalName || '',
          tradeName: data.tradeName || '',
          gstin: data.gstin || '',
          pan: data.pan || '',
          businessType: data.businessType || 'Proprietorship',
          registeredAddress: data.registeredAddress || '',
          state: data.state || '',
          pincode: data.pincode || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          status: data.status || 'VERIFIED'
        });
      }
    } catch {
      // ignore
    }
  };

  const loadUserSettings = async () => {
    try {
      const data = await userApi.getSettings();
      if (data) {
        setUserSettings({
          emailAlerts: data.emailAlerts ?? true,
          smsAlerts: data.smsAlerts ?? true,
          deadlineReminders: data.deadlineReminders ?? true,
          autoOcrClassification: data.autoOcrClassification ?? true,
          twoFactorAuth: data.twoFactorAuth ?? false,
          language: data.language || 'English',
          currency: data.currency || 'INR (₹)',
          theme: data.theme || 'Light'
        });
      }
    } catch {
      // ignore
    }
  };

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setIsSavingBiz(true);
    setBizMsg(null);
    setBizError(null);
    try {
      await merchantApi.updateMyBusiness({
        tradeName: businessData.tradeName,
        businessType: businessData.businessType,
        registeredAddress: businessData.registeredAddress,
        state: businessData.state,
        pincode: businessData.pincode,
        contactEmail: businessData.contactEmail,
        contactPhone: businessData.contactPhone
      });
      setBizMsg("Business details updated successfully!");
      await refreshProfile();
      setTimeout(() => setBizMsg(null), 3000);
    } catch (err) {
      setBizError(err.message || "Failed to update business details");
    } finally {
      setIsSavingBiz(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMsg(null);
    setSettingsError(null);
    try {
      await userApi.updateSettings(userSettings);
      setSettingsMsg("Configuration and preferences saved successfully!");
      setTimeout(() => setSettingsMsg(null), 3000);
    } catch (err) {
      setSettingsError(err.message || "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Top Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
          <Settings className="w-4 h-4 text-rose-600" />
          Settings & Configuration
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
          Account & Enterprise Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your business identity, accountant team access and activities, notification rules, and security.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4 overflow-x-auto">
          {isMerchantAdmin && (
            <button
              onClick={() => setActiveTab('business')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'business'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Business Profile
            </button>
          )}

          {isMerchantAdmin && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Accountants & Activities
            </button>
          )}

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Bell className="w-3.5 h-3.5" /> Notifications & Tax Alerts
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Sessions & Security
          </button>
        </div>
      </div>

      {/* TAB 1: BUSINESS PROFILE */}
      {activeTab === 'business' && isMerchantAdmin && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Registered Merchant Details
            </h2>
            <p className="text-xs text-slate-500">
              Update your trade name and registered address. Verified identity anchors (GSTIN and legal name) are locked.
            </p>
          </div>

          {bizMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{bizMsg}</span>
            </div>
          )}

          {bizError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{bizError}</span>
            </div>
          )}

          <form onSubmit={handleSaveBusiness} className="space-y-4">
            
            {/* Identity Locked GSTIN & Legal Name Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  Verified Identity Anchor (Locked)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Secured & Audited
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Legal Name</span>
                  <span className="font-bold text-slate-900">{businessData.legalName || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified GSTIN</span>
                  <span className="font-mono font-bold text-rose-600">{businessData.gstin || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Permanent Account No (PAN)</span>
                  <span className="font-mono font-bold text-slate-900">{businessData.pan || '—'}</span>
                </div>
              </div>
            </div>

            {/* Editable Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Trade / Display Name
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={businessData.tradeName}
                    onChange={(e) => setBusinessData({ ...businessData, tradeName: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Business Constitution Type
                </label>
                <input
                  type="text"
                  value={businessData.businessType}
                  onChange={(e) => setBusinessData({ ...businessData, businessType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                Registered Business Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  required
                  value={businessData.registeredAddress}
                  onChange={(e) => setBusinessData({ ...businessData, registeredAddress: e.target.value })}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Contact Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={businessData.contactEmail}
                    onChange={(e) => setBusinessData({ ...businessData, contactEmail: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={businessData.contactPhone}
                    onChange={(e) => setBusinessData({ ...businessData, contactPhone: e.target.value })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium focus:border-rose-500 focus:bg-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingBiz}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {isSavingBiz ? 'Saving Changes…' : 'Update Business Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: STAFF & ACCOUNTANT ACTIVITIES (Embeds full AccountantManagement component) */}
      {activeTab === 'staff' && isMerchantAdmin && (
        <AccountantManagement onSelectInvoice={onSelectInvoice} />
      )}

      {/* TAB 3: NOTIFICATIONS & PREFERENCES */}
      {activeTab === 'notifications' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Notification Rules & System Preferences
            </h2>
            <p className="text-xs text-slate-500">
              Configure statutory tax deadline reminders, automated OCR classification, and account preferences.
            </p>
          </div>

          {settingsMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{settingsMsg}</span>
            </div>
          )}

          {settingsError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">{settingsError}</span>
            </div>
          )}

          <div className="space-y-4">
            
            {/* Toggle 1: Email Alerts */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Email Notifications & Alerts</h4>
                <p className="text-[11px] text-slate-500">
                  Receive email alerts for invoice uploads, accountant actions, and deletion approvals.
                </p>
              </div>
              <input
                type="checkbox"
                checked={userSettings.emailAlerts}
                onChange={(e) => setUserSettings({ ...userSettings, emailAlerts: e.target.checked })}
                className="w-4 h-4 accent-rose-600 cursor-pointer"
              />
            </div>

            {/* Toggle 2: Deadline Reminders */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">GST Statutory Deadline Reminders</h4>
                <p className="text-[11px] text-slate-500">
                  Get automated reminders for upcoming GSTR-1, GSTR-3B, CMP-08, and GSTR-9 due dates.
                </p>
              </div>
              <input
                type="checkbox"
                checked={userSettings.deadlineReminders}
                onChange={(e) => setUserSettings({ ...userSettings, deadlineReminders: e.target.checked })}
                className="w-4 h-4 accent-rose-600 cursor-pointer"
              />
            </div>

            {/* Toggle 3: Auto OCR ML Classification */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Auto ML Invoice Category Classification</h4>
                <p className="text-[11px] text-slate-500">
                  Automatically categorize scanned invoices into 15 GST expense categories using the calibrated ML model.
                </p>
              </div>
              <input
                type="checkbox"
                checked={userSettings.autoOcrClassification}
                onChange={(e) => setUserSettings({ ...userSettings, autoOcrClassification: e.target.checked })}
                className="w-4 h-4 accent-rose-600 cursor-pointer"
              />
            </div>

            {/* Toggle 4: SMS Alerts */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">SMS / OTP Notifications</h4>
                <p className="text-[11px] text-slate-500">
                  Receive SMS alerts for high-value invoice approvals and urgent compliance filings.
                </p>
              </div>
              <input
                type="checkbox"
                checked={userSettings.smsAlerts}
                onChange={(e) => setUserSettings({ ...userSettings, smsAlerts: e.target.checked })}
                className="w-4 h-4 accent-rose-600 cursor-pointer"
              />
            </div>

            {/* Currency and Language Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-rose-600" /> Default Currency
                </label>
                <select
                  value={userSettings.currency}
                  onChange={(e) => setUserSettings({ ...userSettings, currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                  <option value="USD ($)">USD ($) - US Dollar</option>
                  <option value="EUR (€)">EUR (€) - Euro</option>
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-rose-600" /> Language
                </label>
                <select
                  value={userSettings.language}
                  onChange={(e) => setUserSettings({ ...userSettings, language: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिन्दी (Hindi)</option>
                  <option value="Marathi">मराठी (Marathi)</option>
                  <option value="Gujarati">ગુજરાતી (Gujarati)</option>
                </select>
              </div>
            </div>

          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {isSavingSettings ? 'Saving…' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SESSIONS & SECURITY */}
      {activeTab === 'security' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Active Sessions & Security Controls
            </h2>
            <p className="text-xs text-slate-500">
              Inspect active browser tokens and authentication state.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Current Web Session</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Active Now
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Stateless JWT Token • Local Browser Storage • Port 3000
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono text-slate-400">Expires in ~24 hrs</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
