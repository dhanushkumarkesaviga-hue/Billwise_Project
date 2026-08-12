import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Receipt,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_SLABS = [
  { rate: '5% GST', color: '#10b981', amount: 0, percentage: 0 },
  { rate: '12% GST', color: '#3b82f6', amount: 0, percentage: 0 },
  { rate: '18% GST', color: '#f59e0b', amount: 0, percentage: 0 },
  { rate: '28% GST', color: '#ef4444', amount: 0, percentage: 0 },
];

export default function GstCategorizer({ invoices = [], onSelectInvoice }) {
  const { merchantTradeName, username } = useAuth();
  const [filterItc, setFilterItc] = useState('ALL');

  const eligibleItc = invoices
    .filter(inv => inv.itcEligibility && inv.itcEligibility.includes('Eligible'))
    .reduce((acc, inv) => acc + (inv.itcAmount || 0), 0);
  
  const blockedItc = invoices
    .filter(inv => inv.itcEligibility && inv.itcEligibility.includes('Ineligible'))
    .reduce((acc, inv) => acc + ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)), 0);

  const rcmTotal = invoices
    .filter(inv => inv.rcmApplicable)
    .reduce((acc, inv) => acc + (inv.itcAmount || 0), 0);

  const totalGstAmount = invoices.reduce((acc, inv) => 
    acc + ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)), 0
  );

  // Dynamic Slab Calculation from actual invoices
  const computedSlabs = [
    { rate: '5% GST', gstRate: 5, color: '#10b981' },
    { rate: '12% GST', gstRate: 12, color: '#3b82f6' },
    { rate: '18% GST', gstRate: 18, color: '#f59e0b' },
    { rate: '28% GST', gstRate: 28, color: '#ef4444' },
  ].map(slab => {
    const sum = invoices
      .filter(inv => Math.round(inv.gstRate || 0) === slab.gstRate)
      .reduce((acc, inv) => acc + ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)), 0);
    const pct = totalGstAmount > 0 ? Math.round((sum / totalGstAmount) * 100) : 0;
    return { ...slab, amount: sum, percentage: pct };
  });

  const filteredInvoices = invoices.filter(inv => {
    if (filterItc === 'ELIGIBLE') return inv.itcEligibility && inv.itcEligibility.includes('Eligible');
    if (filterItc === 'INELIGIBLE') return inv.itcEligibility && inv.itcEligibility.includes('Ineligible');
    if (filterItc === 'RCM') return inv.rcmApplicable;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Automated Tax Engine
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">
            GST Expense Categorization & ITC Reconciler
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Automatically maps uploaded invoice line items for <strong className="text-slate-800">{merchantTradeName || username}</strong>, checks Section 17(5) blocked credit rules, and calculates claimable Input Tax Credit.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block font-semibold">Net Claimable ITC</span>
            <span className="text-xl font-extrabold text-emerald-600 font-mono">
              ₹{eligibleItc.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Eligible ITC</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            ₹{eligibleItc.toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Fully claimable in monthly GSTR-3B return
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Blocked Credit (Sec 17(5))</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            ₹{blockedItc.toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Ineligible for set-off (Added to expense cost)
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Reverse Charge (RCM)</span>
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            ₹{rcmTotal.toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Tax payable directly to Govt via cash ledger
          </p>
        </div>
      </div>

      {/* Tax Slab Distribution Visualizer */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
          <span>GST Rate Slab Breakdown</span>
          <span className="text-xs text-slate-500 font-normal">Based on this account's processed invoices</span>
        </h3>

        {totalGstAmount > 0 ? (
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
            {computedSlabs.filter(s => s.percentage > 0).map((slab, i) => (
              <div
                key={i}
                style={{ width: `${slab.percentage}%`, backgroundColor: slab.color }}
                className="h-full transition-all hover:opacity-80"
                title={`${slab.rate}: ${slab.percentage}% (₹${slab.amount.toLocaleString('en-IN')})`}
              ></div>
            ))}
          </div>
        ) : (
          <div className="w-full h-4 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
            No GST transactions recorded yet
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {computedSlabs.map((slab, i) => (
            <div key={i} className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slab.color }}></div>
              <div>
                <div className="text-xs font-bold text-slate-900">{slab.rate}</div>
                <div className="text-[11px] font-mono text-slate-500">
                  ₹{slab.amount.toLocaleString('en-IN')} ({slab.percentage}%)
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filterable Invoice Table */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Categorized Invoices</h3>
            <p className="text-xs text-slate-500">Review tax breakdown per supplier bill</p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterItc('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterItc === 'ALL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              All Invoices ({invoices.length})
            </button>

            <button
              onClick={() => setFilterItc('ELIGIBLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterItc === 'ELIGIBLE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Eligible ITC
            </button>

            <button
              onClick={() => setFilterItc('INELIGIBLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterItc === 'INELIGIBLE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Blocked Credit
            </button>

            <button
              onClick={() => setFilterItc('RCM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterItc === 'RCM'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Reverse Charge (RCM)
            </button>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 space-y-1">
            <Building2 className="w-8 h-8 mx-auto text-slate-300" />
            <p>No invoices matching this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">HSN/SAC</th>
                  <th className="py-3 px-4">Taxable Value</th>
                  <th className="py-3 px-4">CGST + SGST</th>
                  <th className="py-3 px-4">IGST</th>
                  <th className="py-3 px-4">ITC Classification</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition group">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 group-hover:text-rose-600">{inv.vendorName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{inv.gstin} • {inv.invoiceNumber}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {inv.hsnSac || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      ₹{(inv.taxableAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      ₹{((inv.cgst || 0) + (inv.sgst || 0)).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      ₹{(inv.igst || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        inv.itcEligibility && inv.itcEligibility.includes('Eligible')
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {inv.itcEligibility || 'Unclassified'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectInvoice(inv)}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Details &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
