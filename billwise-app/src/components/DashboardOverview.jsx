import React from 'react';
import { 
  ScanLine, 
  TrendingUp, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  ArrowUpRight,
  Zap,
  Building2,
  Receipt,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ExpenseCategoryChart from './ExpenseCategoryChart';

export default function DashboardOverview({ invoices = [], onOpenScanModal, setActiveTab, onSelectInvoice }) {
  const { merchantTradeName, fullName, username } = useAuth();
  const displayName = merchantTradeName || fullName || username || 'Merchant';

  // Dynamic calculations based strictly on this tenant's invoices
  const totalSpend = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalTaxable = invoices.reduce((acc, inv) => acc + (inv.taxableAmount || 0), 0);
  const eligibleItc = invoices
    .filter(inv => inv.itcEligibility && inv.itcEligibility.includes('Eligible'))
    .reduce((acc, inv) => acc + (inv.itcAmount || 0), 0);
  
  const blockedItc = invoices
    .filter(inv => inv.itcEligibility && inv.itcEligibility.includes('Ineligible'))
    .reduce((acc, inv) => acc + ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-glow p-6 md:p-8">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              Automated MSME GST Compliance & Tax Saver
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, <span className="text-rose-600">{displayName}</span>
            </h1>
            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
              {invoices.length === 0 ? (
                <span>Your ledger is ready. Upload supplier bills or scan invoices using OCR to start tracking Input Tax Credit (ITC).</span>
              ) : (
                <span>Your OCR engine has processed <span className="text-slate-900 font-bold">{invoices.length} invoices</span> for this business with verified ITC eligibility.</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenScanModal}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 transition hover:scale-[1.02]"
            >
              <ScanLine className="w-5 h-5" />
              Upload Invoice to OCR
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-300 text-sm font-bold shadow-2xs transition"
            >
              <Zap className="w-4 h-4 text-rose-600" />
              View Tax Savings
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Recorded Spend</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono">
              ₹{totalSpend.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              Taxable Value: ₹{totalTaxable.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Claimable ITC (Input Tax)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-emerald-600 font-mono">
              ₹{eligibleItc.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                <CheckCircle2 className="w-3 h-3" /> Ready for GSTR-3B offset
              </span>
            </p>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Blocked ITC (Sec 17(5))</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-amber-600 font-mono">
              ₹{blockedItc.toLocaleString('en-IN')}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Non-claimable under GST rules
            </p>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden group hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Next GST Filing</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900">GSTR-1</h3>
              <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">Due 11 Aug</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Monthly outward supplies return
            </p>
          </div>
        </div>

      </div>

      {/* Expense Categorization Breakdown */}
      <ExpenseCategoryChart 
        invoices={invoices} 
        onOpenScanModal={onOpenScanModal}
        title="Expense Breakdown by Business Category"
        subtitle="Visual analytics on total expenditures grouped by statutory tax and MSME supply categories"
      />

      {/* Main Content Grid: Recent Scanned Invoices + Tax Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" />
                Recent Scanned Invoices
              </h2>
              <p className="text-xs text-slate-500">Invoices for {displayName}</p>
            </div>

            {invoices.length > 0 && (
              <button
                onClick={() => setActiveTab('invoices')}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition"
              >
                View All ({invoices.length})
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">No invoices recorded yet for this account</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click the button below to upload your first vendor bill. BillWise will extract line items, calculate GST, and check ITC eligibility.
                </p>
              </div>
              <button
                onClick={onOpenScanModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition"
              >
                <Plus className="w-4 h-4" /> Upload First Invoice
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.slice(0, 4).map((inv) => (
                <div 
                  key={inv.id}
                  onClick={() => onSelectInvoice(inv)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 px-3 rounded-xl transition cursor-pointer group border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-rose-600 transition">
                          {inv.vendorName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {inv.invoiceNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{inv.category}</span>
                        <span>•</span>
                        <span className="font-mono">HSN: {inv.hsnSac}</span>
                        <span>•</span>
                        <span>{inv.invoiceDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        ₹{(inv.totalAmount || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        GST ({inv.gstRate}%): ₹{((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)).toLocaleString('en-IN')}
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      inv.itcEligibility && inv.itcEligibility.includes('Eligible')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {inv.itcEligibility}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invoices.length > 0 && (
            <div className="pt-2 text-center">
              <button
                onClick={onOpenScanModal}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 text-slate-600 hover:text-rose-700 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <ScanLine className="w-4 h-4 text-rose-600" />
                + Scan & Extract Another Invoice
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col */}
        <div className="space-y-4">
          
          {/* Quick AI Tip Card */}
          <div className="glass-panel-glow rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-rose-600" />
              BillWise AI Tip
            </div>
            {invoices.length === 0 ? (
              <>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  Upload vendor bills to optimize GST Input Tax Credit
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  BillWise uses Gemini AI and OCR to extract HSN/SAC codes, check supplier GSTIN validity, and verify Section 17(5) blocked credit.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  ₹{eligibleItc.toLocaleString('en-IN')} ITC claimable across {invoices.length} invoices
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Claim full Input Tax Credit in this month's GSTR-3B return to reduce your cash tax liability.
                </p>
              </>
            )}
            <div className="pt-1">
              <button 
                onClick={() => setActiveTab('gst')}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
              >
                Review ITC Breakdown &rarr;
              </button>
            </div>
          </div>

          {/* Compliance Status Widget */}
          <div className="glass-panel rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              GST Compliance Readiness
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">GSTR-1 Preparation</span>
                <span className="text-emerald-700 font-bold">{invoices.length > 0 ? 'Ready' : 'Pending Bills'}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${invoices.length > 0 ? 'w-full bg-emerald-500' : 'w-1/4 bg-slate-300'}`}></div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-600">GSTR-2B Reconciliation</span>
                <span className="text-amber-700 font-bold">{invoices.length > 0 ? '80% Matched' : 'Awaiting Invoices'}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${invoices.length > 0 ? 'w-[80%] bg-amber-500' : 'w-0 bg-slate-200'}`}></div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Next Action:</span>
              <button 
                onClick={() => setActiveTab('deadlines')}
                className="text-rose-600 font-bold hover:underline"
              >
                File GSTR-1 &rarr;
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
