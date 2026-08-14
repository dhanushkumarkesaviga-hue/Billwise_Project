import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Bell, 
  Calendar as CalendarIcon,
  ShieldCheck,
  Send,
  Sparkles,
  TrendingUp,
  Building2,
  MapPin,
  Check,
  AlertCircle
} from 'lucide-react';
import { deadlineApi } from '../api';

export default function TaxDeadlineTracker() {
  const [merchantInfo, setMerchantInfo] = useState(null);
  const [turnoverStats, setTurnoverStats] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  
  // Reminder & Test Email State
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState(null);
  const [testEmailError, setTestEmailError] = useState(null);

  // Late fee estimator calculation
  const [delayedDays, setDelayedDays] = useState(5);
  const [isNilReturn, setIsNilReturn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDeadlines(cancelled);
    return () => { cancelled = true; };
  }, []);

  const loadDeadlines = async (cancelled = false) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await deadlineApi.getPersonalized();
      if (!cancelled && data) {
        if (data.deadlines) {
          setDeadlines(data.deadlines);
          setMerchantInfo(data.merchantInfo);
          setTurnoverStats(data.turnoverStats);
        } else if (Array.isArray(data)) {
          setDeadlines(data);
        }
      }
    } catch {
      // Fallback to legacy getAll
      try {
        const fallbackData = await deadlineApi.getAll();
        if (!cancelled && Array.isArray(fallbackData)) {
          setDeadlines(fallbackData);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      }
    } finally {
      if (!cancelled) setIsLoading(false);
    }
  };

  const calculateLateFee = (days, isNil) => {
    const dailyRate = isNil ? 20 : 50;
    return Math.min(days * dailyRate, 10000);
  };

  const handleToggleFilingStatus = (id) => {
    setDeadlines(prev => prev.map(item => {
      if (item.id === id) {
        const nextStatus = item.status === 'Filed' ? 'Upcoming' : 'Filed';
        return { ...item, status: nextStatus };
      }
      return item;
    }));
  };

  const handleToggleReminders = async () => {
    if (!merchantInfo) return;
    const nextState = !merchantInfo.emailRemindersEnabled;
    setMerchantInfo(prev => ({ ...prev, emailRemindersEnabled: nextState }));
    try {
      await deadlineApi.updatePreferences({ emailRemindersEnabled: nextState });
    } catch {
      // Revert if failed
      setMerchantInfo(prev => ({ ...prev, emailRemindersEnabled: !nextState }));
    }
  };

  const handleSendTestReminder = async () => {
    setIsSendingTestEmail(true);
    setTestEmailMsg(null);
    setTestEmailError(null);
    try {
      const res = await deadlineApi.triggerTestReminder();
      setTestEmailMsg(res.message || "Statutory 3-day deadline email reminder dispatched!");
      setTimeout(() => setTestEmailMsg(null), 5000);
    } catch (err) {
      setTestEmailError(err.message || "Failed to dispatch test reminder email");
      setTimeout(() => setTestEmailError(null), 5000);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleExportCalendar = (item) => {
    const title = encodeURIComponent(`GST Filing Deadline: ${item.formName} - ${item.title}`);
    const details = encodeURIComponent(item.description);
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${item.dueDate.replace(/-/g, '')}/${item.dueDate.replace(/-/g, '')}`;
    window.open(googleCalUrl, '_blank');
  };

  const isAutoBumped = merchantInfo?.autoBumpedToMonthly || turnoverStats?.isThresholdExceeded;
  const turnoverProgress = turnoverStats ? Math.min(turnoverStats.percentageOfThreshold || 0, 100) : 0;
  const liveTurnoverFormatted = turnoverStats?.currentFyTurnover
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(turnoverStats.currentFyTurnover)
    : '₹0';

  return (
    <div className="space-y-6">

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Couldn't load deadlines ({loadError}).</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <CalendarClock className="w-4 h-4 text-rose-600 animate-pulse" />
            Statutory GST Filing Calendar & Compliance Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Personalized Tax Deadlines & 3-Day Alert System
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Statutory deadlines customized to your enterprise's GSTIN, State classification, and current Financial Year turnover. Automatic email alerts are dispatched <strong>3 days</strong> prior to each return due date.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleToggleReminders}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition shadow-xs ${
              merchantInfo?.emailRemindersEnabled 
                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4 text-rose-600" />
            {merchantInfo?.emailRemindersEnabled ? '3-Day Email Alerts Active' : 'Enable 3-Day Alerts'}
          </button>

          <button
            onClick={handleSendTestReminder}
            disabled={isSendingTestEmail}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            {isSendingTestEmail ? 'Sending...' : 'Send Test 3-Day Alert'}
          </button>
        </div>
      </div>

      {/* Notification Toast for Test Email */}
      {testEmailMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{testEmailMsg}</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono">Recipient: {merchantInfo?.contactEmail || 'Admin Email'}</span>
        </div>
      )}

      {testEmailError && (
        <div className="p-4 rounded-2xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2.5 shadow-xs animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-bold">{testEmailError}</span>
        </div>
      )}

      {/* Statutory > ₹5 Cr Turnover Bump Alert Banner */}
      {isAutoBumped && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                  Statutory Mandate: Aggregate Turnover &gt; ₹5 Crore
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  Rule 59(6) / Sec 39
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Your recorded sales turnover in BillWise has reached <strong>{liveTurnoverFormatted}</strong> (exceeding the ₹5 Crore threshold). The QRMP scheme is no longer applicable. Your filing frequency has been upgraded to <strong>Monthly (GSTR-1 by 11th & GSTR-3B by 20th)</strong>, and annual <strong>GSTR-9 & GSTR-9C</strong> reconciliations are now statutory requirements.
              </p>
            </div>
          </div>
          <div className="shrink-0 font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 shadow-2xs">
            Mandatory Monthly Mode Active
          </div>
        </div>
      )}

      {/* Enterprise GST Profile & Turnover Gauge */}
      {merchantInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Card 1: Identity & Scheme */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-rose-600" />
                Enterprise GST Profile
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {merchantInfo.taxpayerType}
              </span>
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-slate-900">{merchantInfo.legalName}</h2>
              <div className="font-mono font-bold text-xs text-rose-600 mt-0.5">GSTIN: {merchantInfo.gstin}</div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {merchantInfo.state} (Code: {merchantInfo.stateCode})
              </span>
              <span className="font-bold text-slate-700">
                {merchantInfo.filingFrequency === 'MONTHLY' ? 'Monthly Filer' : 'QRMP Quarterly'}
              </span>
            </div>
          </div>

          {/* Card 2: State Category Classification */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                State Classification Rule
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                CGST Staggered Filing
              </span>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-900 block">{merchantInfo.stateCategory}</span>
              <p className="text-[11px] text-slate-500 mt-1">
                {merchantInfo.filingFrequency === 'MONTHLY'
                  ? 'Monthly filers submit GSTR-3B by the 20th of every month.'
                  : 'QRMP taxpayers in your state file quarterly GSTR-3B on the ' + (merchantInfo.stateCategory.includes('22nd') ? '22nd' : '24th') + ' post quarter.'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Auto-synchronized with State Code {merchantInfo.stateCode}
            </div>
          </div>

          {/* Card 3: Live Sales Turnover Meter */}
          <div className="glass-panel rounded-3xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                Current FY Recorded Turnover
              </span>
              <span className="text-[10px] font-mono font-bold text-slate-700">
                Cap: ₹5.00 Cr
              </span>
            </div>

            <div>
              <div className="text-lg font-extrabold text-slate-900 font-mono">{liveTurnoverFormatted}</div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    turnoverProgress >= 100 ? 'bg-amber-500' : 'bg-rose-600'
                  }`}
                  style={{ width: `${turnoverProgress}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>{turnoverProgress.toFixed(1)}% of ₹5 Cr Threshold</span>
              <span className="font-semibold text-slate-700">
                {turnoverProgress >= 100 ? 'Threshold Exceeded' : 'Under ₹5 Cr'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Deadline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deadlines.map((item) => {
          const isFiled = item.status === 'Filed';
          const isNear = item.isNearDeadline && !isFiled;

          return (
            <div 
              key={item.id}
              className={`glass-panel rounded-3xl p-5 space-y-4 relative overflow-hidden transition-all hover:border-rose-300 shadow-xs ${
                isFiled 
                  ? 'opacity-70 border-emerald-200 bg-emerald-50/20' 
                  : isNear 
                    ? 'border-rose-300 bg-rose-50/30 ring-2 ring-rose-500/20' 
                    : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-slate-900 font-mono">{item.formName}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {item.frequency}
                    </span>
                    {isNear && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                        3-Day Alert
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-rose-600 mt-0.5">{item.title}</h3>
                </div>

                <button
                  onClick={() => handleToggleFilingStatus(item.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-2xs ${
                    isFiled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {isFiled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Filed
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" /> Mark Filed
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Statutory Due Date:</span>
                  <span className="font-mono font-bold text-slate-900">{item.dueDate}</span>
                </div>

                {!isFiled && (
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500">Time Remaining:</span>
                    <span className={`font-extrabold flex items-center gap-1 font-mono ${
                      item.daysRemaining <= 3 ? 'text-rose-600 animate-pulse' : 'text-slate-800'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      {item.daysRemaining} Days
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {item.description}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  Late Fee: ₹{item.lateFeePerDay}/day
                </span>

                <button
                  onClick={() => handleExportCalendar(item)}
                  className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 text-xs transition"
                >
                  <CalendarIcon className="w-3.5 h-3.5" /> Add to Cal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Late Fee & Penalty Estimator */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 border border-rose-200 shadow-xs">
        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          Statutory Section 47 Late Fee & Section 50 Interest Calculator
        </div>

        <h3 className="text-base font-extrabold text-slate-900">
          Simulate Statutory Late Fees & Delay Liability
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Delay Period (Days after Statutory Due Date)</label>
            <input 
              type="range" 
              min="1" 
              max="60" 
              value={delayedDays}
              onChange={(e) => setDelayedDays(Number(e.target.value))}
              className="w-full accent-rose-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>1 Day</span>
              <span className="text-rose-600 font-bold">{delayedDays} Days Delay</span>
              <span>60 Days</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Return Type & Tax Liability</label>
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                <input 
                  type="radio" 
                  name="returnType"
                  checked={!isNilReturn}
                  onChange={() => setIsNilReturn(false)}
                  className="accent-rose-600"
                />
                Tax Liability Payable Return (₹50/day)
              </label>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                <input 
                  type="radio" 
                  name="returnType"
                  checked={isNilReturn}
                  onChange={() => setIsNilReturn(true)}
                  className="accent-rose-600"
                />
                Nil Return (₹20/day)
              </label>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col justify-center shadow-2xs">
            <span className="text-xs text-slate-600 font-semibold">Estimated Statutory Late Fee</span>
            <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
              ₹{calculateLateFee(delayedDays, isNilReturn).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              + 18% p.a. interest on net cash ledger payable under Section 50
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
