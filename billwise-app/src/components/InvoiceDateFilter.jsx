import React, { useState } from 'react';
import { 
  Calendar, 
  Filter, 
  RotateCcw, 
  CalendarRange, 
  Check, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function InvoiceDateFilter({
  availableMonths = [],
  filterState,
  setPreset,
  setCustomRange,
  resetFilter,
  isFiltered,
  activeLabel,
  totalPeriodSpend = 0,
  totalPeriodCount = 0
}) {
  const [showCustomInputs, setShowCustomInputs] = useState(filterState.mode === 'custom');

  const handleFromChange = (e) => {
    const from = e.target.value;
    setShowCustomInputs(true);
    setCustomRange(from, filterState.customTo);
  };

  const handleToChange = (e) => {
    const to = e.target.value;
    setShowCustomInputs(true);
    setCustomRange(filterState.customFrom, to);
  };

  const handleSelectPreset = (key) => {
    setPreset(key);
    if (key === 'ALL') {
      setShowCustomInputs(false);
    }
  };

  return (
    <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Filter by Date & Period
              </h3>
              {isFiltered && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                  {activeLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Synchronized view for Expense Breakdown & Vendor Leaderboard
            </p>
          </div>
        </div>

        {/* Live Period Summary & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
            {totalPeriodCount} {totalPeriodCount === 1 ? 'bill' : 'bills'} • ₹{totalPeriodSpend.toLocaleString('en-IN')}
          </span>

          {isFiltered && (
            <button
              type="button"
              onClick={resetFilter}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Row: Preset Month Pills + Custom Date Range Inputs */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        
        {/* Quick Month Presets (Pills) */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0">
          {availableMonths.map((m) => {
            const isSelected = filterState.mode === 'preset' && filterState.presetKey === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => handleSelectPreset(m.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{m.label}</span>
                {m.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200/70 text-slate-600'
                  }`}>
                    {m.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Controls */}
        <div className="flex items-center gap-2 w-full xl:w-auto bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 px-2 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Custom:</span>
          </div>

          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <input
              type="date"
              aria-label="From Date"
              value={filterState.customFrom}
              onChange={handleFromChange}
              className={`px-2.5 py-1 text-xs rounded-xl bg-white border outline-none font-medium text-slate-800 transition ${
                filterState.mode === 'custom' && filterState.customFrom
                  ? 'border-rose-500 ring-1 ring-rose-500/20'
                  : 'border-slate-200 focus:border-rose-400'
              }`}
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              aria-label="To Date"
              value={filterState.customTo}
              onChange={handleToChange}
              className={`px-2.5 py-1 text-xs rounded-xl bg-white border outline-none font-medium text-slate-800 transition ${
                filterState.mode === 'custom' && filterState.customTo
                  ? 'border-rose-500 ring-1 ring-rose-500/20'
                  : 'border-slate-200 focus:border-rose-400'
              }`}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
