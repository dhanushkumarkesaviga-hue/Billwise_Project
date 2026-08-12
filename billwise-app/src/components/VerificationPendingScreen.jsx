import React, { useState } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  ShieldX, 
  FileText, 
  CheckCircle2, 
  RefreshCw, 
  LogOut, 
  ExternalLink, 
  Upload, 
  Send,
  Building2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { merchantApi } from '../api';

export default function VerificationPendingScreen() {
  const { merchant, merchantStatus, username, logout, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitError, setResubmitError] = useState(null);
  const [resubmitSuccess, setResubmitSuccess] = useState(false);

  const [resubmitData, setResubmitData] = useState({
    tradeName: merchant?.tradeName || '',
    registeredAddress: merchant?.registeredAddress || '',
    contactPhone: merchant?.contactPhone || '',
    contactEmail: merchant?.contactEmail || '',
    gstCertificateUrl: merchant?.gstCertificateUrl || '',
    shopLicenseUrl: merchant?.shopLicenseUrl || '',
    resubmitNotes: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setResubmitData(prev => ({
        ...prev,
        [fieldName]: event.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    if (!merchant?.id) return;
    setIsResubmitting(true);
    setResubmitError(null);
    try {
      await merchantApi.resubmit(merchant.id, resubmitData);
      setResubmitSuccess(true);
      await refreshProfile();
      setTimeout(() => {
        setShowResubmitModal(false);
        setResubmitSuccess(false);
      }, 1500);
    } catch (err) {
      setResubmitError(err.message || 'Resubmission failed');
    } finally {
      setIsResubmitting(false);
    }
  };

  const isRejected = merchantStatus === 'REJECTED';
  const isSuspended = merchantStatus === 'SUSPENDED';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="max-w-2xl w-full space-y-6">

        {/* Top Card */}
        <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Header Icon & Title */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
              isRejected 
                ? 'bg-rose-50 border border-rose-200 text-rose-600'
                : isSuspended 
                ? 'bg-slate-100 border border-slate-300 text-slate-700'
                : 'bg-amber-50 border border-amber-200 text-amber-600'
            }`}>
              {isRejected ? (
                <ShieldX className="w-8 h-8" />
              ) : isSuspended ? (
                <ShieldAlert className="w-8 h-8" />
              ) : (
                <Clock className="w-8 h-8 animate-pulse" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full border ${
                  isRejected 
                    ? 'bg-rose-100 text-rose-800 border-rose-200' 
                    : isSuspended
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  Status: {merchantStatus || 'PENDING_VERIFICATION'}
                </span>
                <span className="text-xs text-slate-400 font-mono">ID: {merchant?.id || '—'}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {isRejected 
                  ? 'Verification Application Requires Updates' 
                  : isSuspended 
                  ? 'Merchant Account Suspended' 
                  : 'Account Verification Under Review'}
              </h1>
              
              <p className="text-xs text-slate-500">
                Logged in as <strong className="text-slate-800 font-bold">{username}</strong> ({merchant?.tradeName || 'Your Business'})
              </p>
            </div>
          </div>

          {/* Rejection Alert Banner */}
          {isRejected && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" />
                Reviewer Feedback & Reason for Rejection
              </div>
              <p className="text-xs text-rose-900 font-medium leading-relaxed bg-white/80 p-3 rounded-xl border border-rose-100">
                {merchant?.rejectionReason || 'Uploaded documents did not pass verification criteria. Please resubmit clear documentation.'}
              </p>
              <button
                onClick={() => setShowResubmitModal(true)}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
              >
                Update Details & Resubmit Documents
              </button>
            </div>
          )}

          {/* Pending Information Notice */}
          {!isRejected && !isSuspended && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                What happens during verification?
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                BillWise adheres to GST compliance standards. A platform Super Administrator is reviewing your submitted <strong>Form GST REG-06</strong> certificate and business details. Once approved, full invoice ledger and OCR scanning capabilities will unlock immediately.
              </p>
            </div>
          )}

          {/* Business & Document Summary */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Submitted Business Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Legal Business Name</span>
                <span className="font-bold text-slate-900">{merchant?.legalName || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">GSTIN & State</span>
                <span className="font-mono font-bold text-rose-600">{merchant?.gstin || '—'}</span>
                <span className="text-[10px] text-slate-500 block">({merchant?.state || '—'})</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">PAN</span>
                <span className="font-mono font-bold text-slate-800">{merchant?.pan || '—'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Registered Address</span>
                <span className="text-slate-700 text-[11px] line-clamp-2">{merchant?.registeredAddress || '—'}</span>
              </div>
            </div>
          </div>

          {/* Document Previews */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Attached Document Proofs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {merchant?.gstCertificateUrl && (
                <a 
                  href={merchant.gstCertificateUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs transition group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-slate-800 group-hover:text-rose-600 transition">GST Certificate</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}

              {merchant?.shopLicenseUrl && (
                <a 
                  href={merchant.shopLicenseUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-xs transition group"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-800 group-hover:text-emerald-600 transition">Trade License</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition w-full sm:w-auto justify-center"
            >
              <LogOut className="w-4 h-4" /> Log out
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition w-full sm:w-auto justify-center disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking Status…' : 'Check Verification Status'}
            </button>
          </div>

        </div>

      </div>

      {/* Resubmit Modal */}
      {showResubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-rose-600" />
              Resubmit Verification Details
            </h2>
            <p className="text-xs text-slate-500">
              Update your business address or upload a clearer copy of your GST registration certificate.
            </p>

            {resubmitError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {resubmitError}
              </div>
            )}

            {resubmitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Resubmission received! Status changed to Pending Review.
              </div>
            )}

            <form onSubmit={handleResubmitSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Trade Name</label>
                <input
                  type="text"
                  value={resubmitData.tradeName}
                  onChange={(e) => setResubmitData({ ...resubmitData, tradeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  value={resubmitData.registeredAddress}
                  onChange={(e) => setResubmitData({ ...resubmitData, registeredAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Upload New GST Certificate</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, 'gstCertificateUrl')}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Notes for Reviewer</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Attached updated renewed Form GST REG-06..."
                  value={resubmitData.resubmitNotes}
                  onChange={(e) => setResubmitData({ ...resubmitData, resubmitNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResubmitModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-60 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isResubmitting ? 'Submitting…' : 'Resubmit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
