import React from 'react';
import { 
  Sparkles, 
  Bot, 
  Lightbulb, 
  PieChart as PieIcon,
  BarChart3,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AiFinancialSummary({ invoices = [], onOpenCopilot }) {
  const { merchantTradeName, username } = useAuth();
  const displayName = merchantTradeName || username;

  const totalSpend = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const eligibleItc = invoices
    .filter(inv => inv.itcEligibility && inv.itcEligibility.includes('Eligible'))
    .reduce((acc, inv) => acc + (inv.itcAmount || 0), 0);

  const blockedItc = invoices
    .filter(inv => inv.itcEligibility && inv.itcEligibility.includes('Ineligible'))
    .reduce((acc, inv) => acc + ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)), 0);

  const categoriesMap = invoices.reduce((acc, inv) => {
    const cat = inv.category || 'General Expense';
    acc[cat] = (acc[cat] || 0) + (inv.totalAmount || 0);
    return acc;
  }, {});

  const categoryItems = Object.keys(categoriesMap).map(cat => ({
    name: cat,
    amount: categoriesMap[cat],
    percentage: totalSpend > 0 ? Math.round((categoriesMap[cat] / totalSpend) * 100) : 0
  })).sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-6">
      
      {/* Executive AI Header */}
      <div className="glass-panel-glow rounded-2xl p-6 md:p-8 space-y-4 relative border border-rose-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              AI Executive Financial Digest • {displayName}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Smart Tax & Financial Health Digest
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Generated automatically by analyzing your OCR scanned invoices, HSN classifications, and GSTR compliance records.
            </p>
          </div>

          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition hover:scale-[1.02]"
          >
            <Bot className="w-4 h-4" />
            Ask BillWise AI Assistant
          </button>
        </div>

        {/* AI Key Insights Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            AI Auditor Observations:
          </h3>

          {invoices.length === 0 ? (
            <p className="text-xs text-slate-500">
              No transactions recorded yet for this account. Upload or scan vendor invoices to generate automated ITC savings recommendations and expense audits.
            </p>
          ) : (
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <span>
                  <strong className="text-slate-900">ITC Optimization:</strong> You have accumulated <strong className="text-emerald-700">₹{eligibleItc.toLocaleString('en-IN')}</strong> in claimable Input Tax Credit across {invoices.filter(i => i.itcEligibility && i.itcEligibility.includes('Eligible')).length} invoices. This directly reduces your cash tax liability in GSTR-3B.
                </span>
              </li>

              {blockedItc > 0 && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                  <span>
                    <strong className="text-slate-900">Blocked Credit Audit:</strong> <strong className="text-amber-700">₹{blockedItc.toLocaleString('en-IN')}</strong> of GST paid is marked as blocked under Sec 17(5). It cannot be claimed as tax credit.
                  </span>
                </li>
              )}

              {categoryItems.length > 0 && (
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0"></span>
                  <span>
                    <strong className="text-slate-900">Top Expense Driver:</strong> <strong className="text-rose-700">{categoryItems[0]?.name}</strong> accounts for <strong className="text-slate-900">{categoryItems[0]?.percentage}%</strong> of total expenditure this period.
                  </span>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Category Expense Breakdown */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-rose-600" />
              Expense Distribution by Category
            </h3>
            <span className="text-xs text-slate-500 font-mono">Total: ₹{totalSpend.toLocaleString('en-IN')}</span>
          </div>

          {categoryItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No categorized expenses recorded yet.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {categoryItems.map((cat, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{cat.name}</span>
                    <span className="font-mono text-slate-500">
                      ₹{cat.amount.toLocaleString('en-IN')} ({cat.percentage}%)
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Monthly Financial Trend Forecast */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Account Spend & Tax Trajectory
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {invoices.length} Invoices
            </span>
          </div>

          {/* SVG Bar Chart Visualization */}
          <div className="h-52 flex items-end justify-between gap-4 pt-6 px-4 pb-2 border-b border-slate-100">
            {[
              { label: 'Total Spend', val: totalSpend, color: 'bg-rose-500' },
              { label: 'Eligible ITC', val: eligibleItc, color: 'bg-emerald-500' },
              { label: 'Blocked Tax', val: blockedItc, color: 'bg-amber-500' }
            ].map((bar, idx) => {
              const maxVal = Math.max(totalSpend, 1);
              const heightPct = Math.max((bar.val / maxVal) * 100, 5);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full max-w-[60px] flex items-end justify-center h-full">
                    <div 
                      className={`w-full ${bar.color} rounded-t transition-all group-hover:opacity-90`}
                      style={{ height: `${heightPct}%` }}
                      title={`${bar.label}: ₹${bar.val.toLocaleString()}`}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold truncate text-center">{bar.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-rose-500 rounded-sm"></span>
              <span className="text-slate-700 font-semibold">Total Spend</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
              <span className="text-slate-700 font-semibold">Claimable ITC</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
