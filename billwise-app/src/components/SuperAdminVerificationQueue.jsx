import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  ExternalLink, 
  Search, 
  Filter, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  Eye, 
  History,
  Store,
  RefreshCw,
  Ban,
  Check
} from 'lucide-react';
import { merchantApi } from '../api';
import { validateGstin } from '../utils/gstValidation';

export default function SuperAdminVerificationQueue() {
  const [merchants, setMerchants] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Modals
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [actionType, setActionType] = useState(null); // 'APPROVE' | 'REJECT' | 'SUSPEND' | 'LOGS' | 'DOC_PREVIEW'
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState([]);

  const loadMerchants = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await merchantApi.getAll();
      setMerchants(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load merchants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  const handleOpenApprove = (m) => {
    setSelectedMerchant(m);
    setActionType('APPROVE');
    setActionReason('GST Registration Certificate (Form GST REG-06) and business address verified.');
  };

  const handleOpenReject = (m) => {
    setSelectedMerchant(m);
    setActionType('REJECT');
    setActionReason('Uploaded GST certificate is illegible / expired. Please upload a valid digital copy of Form GST REG-06.');
  };

  const handleOpenSuspend = (m) => {
    setSelectedMerchant(m);
    setActionType('SUSPEND');
    setActionReason('Account temporarily suspended by administrator.');
  };

  const handleOpenLogs = async (m) => {
    setSelectedMerchant(m);
    setActionType('LOGS');
    try {
      const logData = await merchantApi.getLogs(m.id);
      setLogs(logData);
    } catch {
      setLogs([]);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedMerchant || !actionType) return;
    setIsProcessing(true);
    try {
      if (actionType === 'APPROVE') {
        await merchantApi.approve(selectedMerchant.id, actionReason);
      } else if (actionType === 'REJECT') {
        await merchantApi.reject(selectedMerchant.id, actionReason);
      } else if (actionType === 'SUSPEND') {
        await merchantApi.suspend(selectedMerchant.id, actionReason);
      }
      await loadMerchants();
      setActionType(null);
      setSelectedMerchant(null);
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingCount = merchants.filter(m => m.status === 'PENDING_VERIFICATION').length;
  const verifiedCount = merchants.filter(m => m.status === 'VERIFIED').length;
  const rejectedCount = merchants.filter(m => m.status === 'REJECTED').length;

  const filtered = merchants.filter(m => {
    const matchesStatus = selectedStatus === 'ALL' || m.status === selectedStatus;
    const matchesSearch = 
      m.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.legalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.adminUsername && m.adminUsername.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-rose-200 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              Platform Super Administration
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
              Merchant Verification & Compliance Queue
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Review self-service merchant registrations, inspect uploaded Form GST REG-06 certificates, verify Mod-36 checksums, and approve or reject tenant activations.
            </p>
          </div>

          <button
            onClick={loadMerchants}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>

        {/* Stats Pill Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Review</span>
            <div className="text-2xl font-extrabold text-amber-900 font-mono mt-0.5">{pendingCount}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Verified Merchants</span>
            <div className="text-2xl font-extrabold text-emerald-900 font-mono mt-0.5">{verifiedCount}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Rejected / Updates</span>
            <div className="text-2xl font-extrabold text-rose-900 font-mono mt-0.5">{rejectedCount}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Total Registered</span>
            <div className="text-2xl font-extrabold text-slate-900 font-mono mt-0.5">{merchants.length}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Trade Name, GSTIN, Owner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:border-rose-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedStatus === st
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL' ? 'All Merchants' : st === 'PENDING_VERIFICATION' ? `Pending (${pendingCount})` : st}
            </button>
          ))}
        </div>
      </div>

      {/* Merchants Queue Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 text-xs">
          Loading merchant queue…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-2">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No merchants found in this view</h3>
          <p className="text-xs text-slate-400">All submissions in this category have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((m) => {
            const gstinValidation = validateGstin(m.gstin);
            const isPending = m.status === 'PENDING_VERIFICATION';
            const isVerified = m.status === 'VERIFIED';
            const isRejected = m.status === 'REJECTED';

            return (
              <div 
                key={m.id}
                className={`glass-panel rounded-3xl p-6 space-y-4 transition border ${
                  isPending 
                    ? 'border-amber-300 bg-amber-50/15 shadow-sm' 
                    : isVerified 
                    ? 'border-slate-200' 
                    : 'border-rose-200 bg-rose-50/10'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isPending
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : isVerified
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {m.status}
                      </span>
                      <span className="text-xs font-mono text-slate-400">Merchant ID: {m.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{m.businessType || 'Proprietorship'}</span>
                    </div>

                    <h2 className="text-lg font-extrabold text-slate-900">
                      {m.tradeName} <span className="text-xs font-normal text-slate-500">({m.legalName})</span>
                    </h2>
                  </div>

                  {/* Top Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleOpenLogs(m)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Audit Trail
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() => handleOpenReject(m)}
                          className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                        <button
                          onClick={() => handleOpenApprove(m)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve Merchant
                        </button>
                      </>
                    )}

                    {isVerified && (
                      <button
                        onClick={() => handleOpenSuspend(m)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      >
                        <Ban className="w-3.5 h-3.5" /> Suspend
                      </button>
                    )}
                  </div>
                </div>

                {/* Duplicate/Similarity Warning Signal */}
                {m.duplicateWarningFlags && m.duplicateWarningFlags.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Review Signal / Similarity Alert:
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5">
                      {m.duplicateWarningFlags.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  
                  {/* GSTIN & Checksum verification */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GSTIN & Checksum</span>
                    <div className="font-mono font-bold text-rose-600 text-xs tracking-wider">{m.gstin}</div>
                    <div className="flex items-center gap-1 text-[11px]">
                      {gstinValidation.isValid ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Checksum Valid
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Invalid Checksum
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">State: {m.state} ({m.stateCode || m.gstin.slice(0, 2)})</div>
                  </div>

                  {/* PAN & Admin Contact */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PAN & Admin Account</span>
                    <div className="font-mono font-bold text-slate-900">{m.pan}</div>
                    <div className="text-[11px] text-slate-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span className="font-mono text-rose-600 font-bold">{m.adminUsername}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{m.contactEmail}</div>
                  </div>

                  {/* Registered Address */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Address</span>
                    <div className="text-slate-800 text-[11px] leading-relaxed line-clamp-2">{m.registeredAddress}</div>
                    <div className="text-[10px] text-slate-500 font-mono">PIN: {m.pincode || '—'}</div>
                  </div>

                  {/* Uploaded Document Proofs */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submitted Proofs</span>
                    <div className="space-y-1">
                      {m.gstCertificateUrl ? (
                        <a
                          href={m.gstCertificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" /> GST REG-06 Cert
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">No GST cert</span>
                      )}

                      {m.shopLicenseUrl && (
                        <a
                          href={m.shopLicenseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> Trade License
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>
                      )}

                      {m.storefrontPhotoUrl && (
                        <a
                          href={m.storefrontPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-1">
                            <Store className="w-3.5 h-3.5" /> Shop Photo
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer notes / rejection reasons */}
                {m.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
                    <strong className="font-bold">Rejection Note:</strong> {m.rejectionReason}
                  </div>
                )}

                {isVerified && m.verifiedBy && (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>Verified by: <strong className="text-slate-700">{m.verifiedBy}</strong></span>
                    <span>Verified at: {new Date(m.verifiedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve / Reject / Suspend Action Modal */}
      {actionType && actionType !== 'LOGS' && selectedMerchant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                actionType === 'APPROVE' 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : actionType === 'REJECT' 
                  ? 'bg-rose-50 text-rose-600' 
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {actionType === 'APPROVE' ? <CheckCircle2 className="w-5 h-5" /> : actionType === 'REJECT' ? <XCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {actionType === 'APPROVE' ? 'Approve Merchant Activation' : actionType === 'REJECT' ? 'Reject Merchant Registration' : 'Suspend Merchant Account'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedMerchant.tradeName}</p>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 block mb-1">
                {actionType === 'REJECT' ? 'Mandatory Rejection Reason *' : 'Reviewer Notes / Verification Reason'}
              </label>
              <textarea
                rows={3}
                required={actionType === 'REJECT'}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Document your review reasoning..."
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isProcessing || (actionType === 'REJECT' && !actionReason.trim())}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition disabled:opacity-50 ${
                  actionType === 'APPROVE' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : actionType === 'REJECT' 
                    ? 'bg-rose-600 hover:bg-rose-700' 
                    : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                {isProcessing ? 'Processing…' : actionType === 'APPROVE' ? 'Confirm Approval' : actionType === 'REJECT' ? 'Confirm Rejection' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {actionType === 'LOGS' && selectedMerchant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-rose-600" />
                  Verification Audit Trail
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedMerchant.tradeName} ({selectedMerchant.gstin})</p>
              </div>
              <button
                onClick={() => setActionType(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No audit log entries recorded yet.</p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        l.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : l.action === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {l.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(l.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{l.reason}</p>
                    <div className="text-[10px] text-slate-500">Performed by: <strong className="text-slate-700">{l.performedBy}</strong></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
