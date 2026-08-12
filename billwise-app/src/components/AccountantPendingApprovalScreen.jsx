import React, { useState } from 'react';
import { 
  ScanLine, 
  Clock, 
  ShieldCheck, 
  Building2, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  User, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountantPendingApprovalScreen() {
  const { 
    username, 
    fullName, 
    merchantTradeName, 
    adminUsername, 
    refreshProfile, 
    logout 
  } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleCheckStatus = async () => {
    setIsRefreshing(true);
    setStatusMsg(null);
    try {
      await refreshProfile();
      setStatusMsg("Checked status. If your Admin has accepted your request, your access will unlock.");
      setTimeout(() => setStatusMsg(null), 4000);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg space-y-6">

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
            Multi-Tenant Enterprise GST Invoicing
          </p>
        </div>

        {/* Main Holding Card */}
        <div className="glass-panel bg-white border border-amber-200 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 animate-in zoom-in-95">
          
          {/* Status Badge & Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              Pending Admin Approval
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Accountant Access Pending Verification
            </h2>
            <p className="text-xs text-slate-500">
              Your request to join this shop has been submitted and is awaiting confirmation from your organization's Administrator.
            </p>
          </div>

          {/* Target Shop & Accountant Details */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-rose-600" /> Shop / Business:
              </span>
              <span className="font-bold text-slate-900">{merchantTradeName || 'Business Shop'}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Shop Admin:
              </span>
              <span className="font-mono font-bold text-rose-700">@{adminUsername || 'admin'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" /> Your Account:
              </span>
              <span className="font-mono font-bold text-slate-800">@{username} ({fullName || 'Accountant'})</span>
            </div>
          </div>

          {/* Explanation Info Box */}
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              How to activate your access:
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              1. Ask Admin <strong className="font-mono text-rose-700">@{adminUsername || 'admin'}</strong> to log in to BillWise.
              <br />
              2. Your Admin will navigate to <strong>Settings → Team Staff Management</strong>.
              <br />
              3. Clicking <strong>"Verify Accountant"</strong> will instantly unlock your shop invoices and tax breakdown tools.
            </p>
          </div>

          {statusMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={isRefreshing}
              className="w-full flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Checking…' : 'Check Approval Status'}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
