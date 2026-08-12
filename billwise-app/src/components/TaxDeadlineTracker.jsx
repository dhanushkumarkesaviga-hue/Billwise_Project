import React, { useState, useEffect } from 'react';
import { 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Bell, 
  Calendar as CalendarIcon
} from 'lucide-react';
import { deadlineApi } from '../api';

export default function TaxDeadlineTracker() {
  const [deadlines, setDeadlines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;

    deadlineApi.getAll()
      .then((data) => { if (!cancelled) setDeadlines(data); })
      .catch((err) => { if (!cancelled) setLoadError(err.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  // Late fee estimator calculation
  const [delayedDays, setDelayedDays] = useState(5);
  const [isNilReturn, setIsNilReturn] = useState(false);

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

  const handleExportCalendar = (item) => {
    const title = encodeURIComponent(`GST Filing Deadline: ${item.formName} - ${item.title}`);
    const details = encodeURIComponent(item.description);
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${item.dueDate.replace(/-/g, '')}/${item.dueDate.replace(/-/g, '')}`;
    window.open(googleCalUrl, '_blank');
  };

  return (
    <div className="space-y-6">

      {loadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3">
          Couldn't load deadlines from the backend ({loadError}).
        </div>
      )}
      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white text-slate-500 text-sm px-4 py-3">
          Loading deadlines…
        </div>
      )}

      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <CalendarClock className="w-4 h-4 text-rose-600 animate-pulse" />
            Statutory GST Filing Calendar
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            Tax Deadline & Penalty Risk Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Never miss a GST filing deadline. Track GSTR-1, GSTR-3B, CMP-08 & GSTR-9 schedules with real-time countdown alerts and late fee calculators.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setReminderEnabled(!reminderEnabled)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition ${
              reminderEnabled 
                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs' 
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            <Bell className="w-4 h-4 text-rose-600" />
            {reminderEnabled ? 'SMS/Email Alerts Active' : 'Enable Reminders'}
          </button>
        </div>
      </div>

      {/* Deadline Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deadlines.map((item) => {
          const isFiled = item.status === 'Filed';
          
          return (
            <div 
              key={item.id}
              className={`glass-panel rounded-2xl p-5 space-y-4 relative overflow-hidden transition-all hover:border-rose-300 ${
                isFiled ? 'opacity-70 border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-extrabold text-slate-900 font-mono">{item.formName}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {item.frequency}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-rose-600 mt-0.5">{item.title}</h3>
                </div>

                <button
                  onClick={() => handleToggleFilingStatus(item.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1 ${
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

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Due Date:</span>
                  <span className="font-mono font-bold text-slate-900">{item.dueDate}</span>
                </div>

                {!isFiled && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Time Remaining:</span>
                    <span className="font-extrabold text-rose-600 flex items-center gap-1">
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
                  className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 text-xs"
                >
                  <CalendarIcon className="w-3.5 h-3.5" /> Add to Cal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Late Fee & Penalty Estimator */}
      <div className="glass-panel rounded-2xl p-6 space-y-4 border border-rose-200">
        <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          Interactive Penalty & Late Fee Estimator
        </div>

        <h3 className="text-base font-bold text-slate-900">
          Simulate Statutory Late Fees & Interest Penalty
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Delay Period (Days after Due Date)</label>
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
            <label className="text-xs font-semibold text-slate-600">Return Type</label>
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

          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col justify-center">
            <span className="text-xs text-slate-600 font-semibold">Estimated Late Fee Impact</span>
            <div className="text-2xl font-extrabold text-rose-600 font-mono mt-1">
              ₹{calculateLateFee(delayedDays, isNilReturn).toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              + 18% p.a. interest on unpaid net tax liability
            </span>
          </div>

        </div>
      </div>

    </div>
  );
}
