import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Download,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  FileCheck2,
  Ban,
  DollarSign
} from 'lucide-react';
import { salesInvoiceApi } from '../api';

export default function Gstr3bDashboard({
  merchantGstin = '27AAACA1234F1Z5',
  onNavigateToSales,
  onNavigateToGstr1
}) {
  // Date period state (defaults to current month)
  const [periodPreset, setPeriodPreset] = useState('THIS_MONTH');
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyPreset = (preset) => {
    setPeriodPreset(preset);
    const now = new Date();

    if (preset === 'THIS_MONTH') {
      setFromDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setToDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      setFromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]);
      setToDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]);
    } else if (preset === 'THIS_QUARTER') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      setFromDate(new Date(now.getFullYear(), quarterMonth, 1).toISOString().split('T')[0]);
      setToDate(new Date(now.getFullYear(), quarterMonth + 3, 0).toISOString().split('T')[0]);
    } else if (preset === 'FULL_YEAR') {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setFromDate(`${year}-04-01`);
      setToDate(`${year + 1}-03-31`);
    }
  };

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesInvoiceApi.getGstr3bSummary(fromDate, toDate);
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch GSTR-3B summary:', err);
      setError(err.message || 'Failed to compute GSTR-3B net liability.');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const isPayable = summary?.liabilityType === 'PAYABLE';
  const isCarryForward = summary?.liabilityType === 'CARRY_FORWARD';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider">
              Statutory Net Settlement
            </span>
            <span className="text-xs text-slate-400 font-medium">Monthly / Quarterly Return</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>GSTR-3B Net Liability Dashboard</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Auto-net output tax from sales against eligible purchase ITC (excluding Section 17(5) blocked credits).
          </p>
        </div>

        {/* Date Filter & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-bold">
            <button
              onClick={() => applyPreset('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                periodPreset === 'THIS_MONTH' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => applyPreset('LAST_MONTH')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                periodPreset === 'LAST_MONTH' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => applyPreset('THIS_QUARTER')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                periodPreset === 'THIS_QUARTER' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Quarter
            </button>
            <button
              onClick={() => applyPreset('CUSTOM')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                periodPreset === 'CUSTOM' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPeriodPreset('CUSTOM');
              }}
              className="text-xs font-semibold text-slate-700 focus:outline-none bg-transparent"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPeriodPreset('CUSTOM');
              }}
              className="text-xs font-semibold text-slate-700 focus:outline-none bg-transparent"
            />
          </div>

          <button
            onClick={fetchSummary}
            title="Recalculate Net Liability"
            className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* HERO NET SETTLEMENT CARD */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-extrabold uppercase tracking-wider text-slate-300 font-mono">
                {fromDate} → {toDate}
              </span>
              <span className="text-xs text-slate-400">Statutory Net Tax Ledger</span>
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isPayable ? 'Net Statutory Tax Payable to Government' : 'Statutory Carry-Forward ITC Credit'}
            </div>

            <div className="flex items-baseline gap-3">
              <div
                className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                  isPayable ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                ₹{Number(isPayable ? summary?.netPayableAmount : summary?.carryForwardCreditAmount || 0).toLocaleString(
                  'en-IN',
                  { minimumFractionDigits: 2 }
                )}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                  isPayable
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isPayable ? '● Cash Payment Required' : '✓ Credit Carried Forward'}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {isPayable ? (
                <>
                  Output tax collected on sales exceeds your eligible purchase credits. Pay{' '}
                  <strong className="text-white font-mono">
                    ₹{Number(summary?.netPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  via GST PMT-06 challan by the GSTR-3B due date.
                </>
              ) : (
                <>
                  Eligible purchase ITC exceeds output tax liabilities. An excess credit of{' '}
                  <strong className="text-white font-mono">
                    ₹{Number(summary?.carryForwardCreditAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>{' '}
                  is securely held in your Electronic Credit Ledger to offset against next period's sales.
                </>
              )}
            </p>
          </div>

          {/* Equation Breakdown pill */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3 min-w-[280px]">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Settlement Arithmetic
            </div>

            <div className="space-y-2 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Output Tax (Sales):</span>
                <span className="font-mono font-bold text-rose-300">
                  + ₹{Number(summary?.totalOutputTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Less Eligible ITC (Purchases):</span>
                <span className="font-mono font-bold text-emerald-300">
                  - ₹{Number(summary?.totalEligibleItc || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold">
                <span className="text-white">Net Balance:</span>
                <span
                  className={`font-mono font-extrabold ${
                    isPayable ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {isPayable ? 'Payable' : 'Carry Forward'}: ₹
                  {Number(isPayable ? summary?.netPayableAmount : summary?.carryForwardCreditAmount || 0).toLocaleString(
                    'en-IN',
                    { minimumFractionDigits: 2 }
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 COMPARISON CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Output Tax */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Table 3.1: Output Tax on Sales
            </span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>

          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{Number(summary?.totalOutputTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Taxable Sales Value:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{Number(summary?.totalOutputTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST + SGST:</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{(Number(summary?.totalOutputCgst || 0) + Number(summary?.totalOutputSgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IGST:</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{Number(summary?.totalOutputIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Derived from {summary?.salesInvoiceCount || 0} non-cancelled outward invoices.
            </div>
          </div>
        </div>

        {/* Card 2: Eligible Purchase ITC */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Table 4(A): Eligible Purchase ITC
            </span>
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="text-2xl font-black text-emerald-600 font-mono">
            ₹{Number(summary?.totalEligibleItc || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Eligible Purchases:</span>
              <span className="font-mono font-bold text-slate-900">
                ₹{Number(summary?.totalEligibleItcTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CGST + SGST:</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{(Number(summary?.totalEligibleCgst || 0) + Number(summary?.totalEligibleSgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>IGST:</span>
              <span className="font-mono font-semibold text-slate-800">
                ₹{Number(summary?.totalEligibleIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Claimed across {summary?.eligiblePurchaseInvoiceCount || 0} eligible vendor bills.
            </div>
          </div>
        </div>

        {/* Card 3: Ineligible Blocked ITC Section 17(5) */}
        <div className="p-5 bg-amber-50/40 rounded-3xl border border-amber-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5 text-amber-600" />
              Table 4(D): Ineligible (Sec 17(5))
            </span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              Non-Deductible
            </span>
          </div>

          <div className="text-2xl font-black text-amber-900 font-mono">
            ₹{Number(summary?.totalIneligibleItc || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <div className="space-y-1.5 pt-2 border-t border-amber-200/60 text-xs">
            <p className="text-amber-800 text-[11px] leading-relaxed">
              Blocked Input Tax Credit from food & beverages, personal expenses, or motor vehicles under Section 17(5) of the CGST Act.
            </p>
            <div className="text-[10px] text-amber-700 font-semibold mt-1">
              ✓ Strictly isolated: Does not reduce your output tax liability.
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Count: {summary?.ineligiblePurchaseInvoiceCount || 0} blocked invoice(s).
            </div>
          </div>
        </div>
      </div>

      {/* DETAILED STATUTORY SCHEDULE TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 3.1: Details of Outward Supplies */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Table 3.1: Details of Outward Supplies
              </h3>
              <p className="text-[11px] text-slate-400">
                Tax liability arising from outward sales during the period
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-xl text-slate-700">
              Form GSTR-3B
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Tax Component</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right">Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                    Integrated Tax (IGST)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    ₹{Number(summary?.totalOutputTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                    ₹{Number(summary?.totalOutputIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                    Central Tax (CGST)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    ₹{Number(summary?.totalOutputTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                    ₹{Number(summary?.totalOutputCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                    State / UT Tax (SGST)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    ₹{Number(summary?.totalOutputTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                    ₹{Number(summary?.totalOutputSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="bg-slate-50/80 font-bold">
                  <td className="py-2.5 px-3 font-sans text-slate-900">Total Outward Tax (A)</td>
                  <td className="py-2.5 px-3 text-right text-slate-900">
                    ₹{Number(summary?.totalOutputTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-700 font-black">
                    ₹{Number(summary?.totalOutputTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 4: Eligible ITC Available */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Table 4: Eligible Input Tax Credit (ITC)
              </h3>
              <p className="text-[11px] text-slate-400">
                Input tax credits claimed on inward business expenses
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-xl text-slate-700">
              Form GSTR-3B
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-right">CGST</th>
                  <th className="py-2.5 px-3 text-right">SGST</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">Total ITC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                    (A) ITC Available
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">
                    ₹{Number(summary?.totalEligibleCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">
                    ₹{Number(summary?.totalEligibleSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">
                    ₹{Number(summary?.totalEligibleIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                    ₹{Number(summary?.totalEligibleItc || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="bg-amber-50/50">
                  <td className="py-2.5 px-3 font-sans font-semibold text-amber-900">
                    (D) Ineligible Sec 17(5)
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-800" colSpan={3}>
                    Blocked ITC from entertainment / personal
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-800">
                    ₹{Number(summary?.totalIneligibleItc || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="bg-slate-50/80 font-bold">
                  <td className="py-2.5 px-3 font-sans text-slate-900">Net Eligible ITC (B)</td>
                  <td className="py-2.5 px-3 text-right text-slate-900">
                    ₹{Number(summary?.totalEligibleCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900">
                    ₹{Number(summary?.totalEligibleSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-900">
                    ₹{Number(summary?.totalEligibleIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 font-black">
                    ₹{Number(summary?.totalEligibleItc || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Table 6.1: Payment of Tax Ledger Settlement */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Table 6.1: Payment of Tax & Credit Utilization
            </h3>
            <p className="text-[11px] text-slate-400">
              Head-wise netting of output liability through available input tax credit
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToSales && (
              <button
                onClick={onNavigateToSales}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 transition cursor-pointer"
              >
                View Sales Ledger →
              </button>
            )}
            {onNavigateToGstr1 && (
              <button
                onClick={onNavigateToGstr1}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition cursor-pointer ml-3"
              >
                View GSTR-1 →
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Tax Payable (Output)</th>
                <th className="py-2.5 px-3 text-right">Paid Through ITC</th>
                <th className="py-2.5 px-3 text-right">Tax Paid in Cash</th>
                <th className="py-2.5 px-3 text-right">Excess Credit (C/F)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                  Integrated Tax (IGST)
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700">
                  ₹{Number(summary?.totalOutputIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  ₹{Math.min(Number(summary?.totalOutputIgst || 0), Number(summary?.totalEligibleIgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                  ₹{Math.max(0, Number(summary?.totalOutputIgst || 0) - Number(summary?.totalEligibleIgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-400">
                  ₹{Math.max(0, Number(summary?.totalEligibleIgst || 0) - Number(summary?.totalOutputIgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                  Central Tax (CGST)
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700">
                  ₹{Number(summary?.totalOutputCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  ₹{Math.min(Number(summary?.totalOutputCgst || 0), Number(summary?.totalEligibleCgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                  ₹{Math.max(0, Number(summary?.totalOutputCgst || 0) - Number(summary?.totalEligibleCgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-400">
                  ₹{Math.max(0, Number(summary?.totalEligibleCgst || 0) - Number(summary?.totalOutputCgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-semibold text-slate-800">
                  State Tax (SGST)
                </td>
                <td className="py-2.5 px-3 text-right text-slate-700">
                  ₹{Number(summary?.totalOutputSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-700">
                  ₹{Math.min(Number(summary?.totalOutputSgst || 0), Number(summary?.totalEligibleSgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                  ₹{Math.max(0, Number(summary?.totalOutputSgst || 0) - Number(summary?.totalEligibleSgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-400">
                  ₹{Math.max(0, Number(summary?.totalEligibleSgst || 0) - Number(summary?.totalOutputSgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                <td className="py-3 px-3 font-sans text-slate-900">Total Net Settlement</td>
                <td className="py-3 px-3 text-right text-slate-900 font-extrabold">
                  ₹{Number(summary?.totalOutputTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right text-emerald-700 font-extrabold">
                  ₹{Math.min(Number(summary?.totalOutputTax || 0), Number(summary?.totalEligibleItc || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right text-rose-700 font-black">
                  ₹{Number(summary?.netPayableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right text-emerald-700 font-black">
                  ₹{Number(summary?.carryForwardCreditAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
