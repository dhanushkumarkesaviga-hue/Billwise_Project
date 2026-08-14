import React, { useMemo } from 'react';
import { 
  Trophy, 
  Building2, 
  ArrowUpRight, 
  Receipt, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Layers
} from 'lucide-react';

export default function TopVendorLeaderboard({
  invoices = [],
  limit = 10,
  onSelectVendor,
  title = "Top Vendor Leaderboard",
  subtitle = "Ranked supplier expenditures and purchase concentration for this period"
}) {
  // Aggregate vendor totals
  const { topVendors, totalPeriodSpend, maxSpend, totalUniqueVendors } = useMemo(() => {
    let periodSpendSum = 0;
    const vendorMap = {};

    (invoices || []).forEach(inv => {
      // Exclude voided/rejected invoices
      if (inv.status && (inv.status === 'VOID' || inv.status === 'REJECTED')) {
        return;
      }

      const rawVendor = inv.vendorName ? inv.vendorName.trim() : '';
      const rawGstin = inv.gstin ? inv.gstin.trim().toUpperCase() : '';

      // Normalize key
      let key = 'UNKNOWN';
      let displayName = 'Unknown Vendor';

      if (rawGstin && rawGstin.length >= 10) {
        key = rawGstin;
        displayName = rawVendor || `Vendor (${rawGstin.slice(0, 10)}...)`;
      } else if (rawVendor) {
        key = rawVendor.toLowerCase();
        displayName = rawVendor;
      }

      const invTotal = Number(inv.totalAmount) || 
        (Number(inv.taxableAmount || 0) + Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0)) || 
        0;

      periodSpendSum += invTotal;

      if (!vendorMap[key]) {
        vendorMap[key] = {
          key,
          name: displayName,
          gstin: rawGstin || null,
          totalSpend: 0,
          invoiceCount: 0,
          categories: new Set()
        };
      }

      // Pick the more complete name if multiple variations exist for same GSTIN
      if (rawVendor && rawVendor.length > vendorMap[key].name.length && !vendorMap[key].name.includes('...')) {
        vendorMap[key].name = rawVendor;
      }
      if (rawGstin && !vendorMap[key].gstin) {
        vendorMap[key].gstin = rawGstin;
      }
      if (inv.category) {
        vendorMap[key].categories.add(inv.category);
      }

      vendorMap[key].totalSpend += invTotal;
      vendorMap[key].invoiceCount += 1;
    });

    const vendorsArray = Object.values(vendorMap)
      .map(v => ({
        ...v,
        percent: periodSpendSum > 0 ? Number(((v.totalSpend / periodSpendSum) * 100).toFixed(1)) : 0,
        primaryCategory: Array.from(v.categories)[0] || 'General'
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    const topList = vendorsArray.slice(0, limit);
    const highestSpend = topList[0]?.totalSpend || 1;

    return {
      topVendors: topList,
      totalPeriodSpend: periodSpendSum,
      maxSpend: highestSpend,
      totalUniqueVendors: vendorsArray.length
    };
  }, [invoices, limit]);

  // Empty State: When no vendor spend exists in the selected period
  if (!invoices || invoices.length === 0 || topVendors.length === 0 || totalPeriodSpend === 0) {
    return (
      <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs h-full flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              {title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 max-w-sm mx-auto my-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-xs">
            <Building2 className="w-8 h-8 opacity-80" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900">No vendor spend in this period</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No purchase records match the active date selection. Try picking "All Time" or adjusting the custom date filter.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Trophy className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
            Top {topVendors.length} of {totalUniqueVendors} {totalUniqueVendors === 1 ? 'Vendor' : 'Vendors'}
          </span>
        </div>
      </div>

      {/* Leaderboard Rows */}
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
        {topVendors.map((vendor, index) => {
          const rank = index + 1;
          const proportionalWidth = Math.max(6, Math.min(100, (vendor.totalSpend / maxSpend) * 100));

          // Rank styling badges
          let rankBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
          if (rank === 1) {
            rankBadgeClass = 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-xs border-amber-300 font-black';
          } else if (rank === 2) {
            rankBadgeClass = 'bg-gradient-to-tr from-slate-400 to-slate-300 text-white shadow-xs border-slate-300 font-black';
          } else if (rank === 3) {
            rankBadgeClass = 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white shadow-xs border-amber-600 font-black';
          }

          return (
            <div
              key={vendor.key}
              onClick={() => onSelectVendor && onSelectVendor(vendor.name)}
              className={`p-3 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/80 transition-all duration-200 space-y-2 group shadow-2xs ${
                onSelectVendor ? 'cursor-pointer hover:border-rose-300' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                
                {/* Left: Rank & Vendor Name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs border shrink-0 ${rankBadgeClass}`}>
                    #{rank}
                  </span>

                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-rose-600 transition">
                      {vendor.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      {vendor.gstin && (
                        <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 border border-slate-200">
                          {vendor.gstin}
                        </span>
                      )}
                      <span>
                        {vendor.invoiceCount} {vendor.invoiceCount === 1 ? 'bill' : 'bills'}
                      </span>
                      <span>• {vendor.primaryCategory}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Spend Amount & Share */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-extrabold text-slate-900 font-mono">
                    ₹{vendor.totalSpend.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                    {vendor.percent}% of spend
                  </span>
                </div>

              </div>

              {/* Relative Proportional Bar (Relative to #1 Top Vendor) */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    rank === 1
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                      : rank === 2
                      ? 'bg-gradient-to-r from-slate-400 to-rose-500'
                      : rank === 3
                      ? 'bg-gradient-to-r from-amber-700 to-rose-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${proportionalWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Insight */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Showing top {topVendors.length} spend destinations</span>
        <span className="font-bold text-slate-700">
          Concentration: {topVendors[0]?.percent || 0}% at #1
        </span>
      </div>
    </div>
  );
}
