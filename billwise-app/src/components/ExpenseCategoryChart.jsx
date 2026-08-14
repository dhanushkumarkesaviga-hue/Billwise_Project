import React, { useState, useMemo } from 'react';
import { 
  PieChart as LucidePieChart, 
  ScanLine, 
  TrendingUp, 
  Receipt, 
  Layers, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { getCategoryColor } from '../utils/categoryConstants';

/**
 * Custom Tooltip for Recharts Pie Donut
 */
function CustomChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md text-xs space-y-1.5 min-w-[170px] pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
            style={{ backgroundColor: item.color }} 
          />
          <span className="font-bold text-slate-100 truncate max-w-[140px]">
            {item.name}
          </span>
        </div>
        <div className="pt-1 border-t border-slate-800 flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-slate-400">Total Spend:</span>
          <span className="font-mono font-bold text-white text-sm">
            ₹{item.value.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{item.count} {item.count === 1 ? 'invoice' : 'invoices'}</span>
          <span className="font-bold text-rose-400 px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/40">
            {item.percent}% of spend
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export default function ExpenseCategoryChart({ 
  invoices = [], 
  onOpenScanModal,
  title = "Expense Categorization",
  subtitle = "Breakdown of business spend across statutory MSME categories"
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  // Aggregate invoice data by category
  const { categoryData, totalSpend, totalInvoicesCount } = useMemo(() => {
    let spendSum = 0;
    const categoryMap = {};

    (invoices || []).forEach(inv => {
      // Exclude invalid/voided invoices if any status distinction exists
      if (inv.status && (inv.status === 'VOID' || inv.status === 'REJECTED')) {
        return;
      }

      const categoryName = (inv.category && inv.category.trim()) ? inv.category.trim() : 'Other';
      
      const invTotal = Number(inv.totalAmount) || 
        (Number(inv.taxableAmount || 0) + Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0)) || 
        0;

      spendSum += invTotal;

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          value: 0,
          count: 0,
          color: getCategoryColor(categoryName)
        };
      }

      categoryMap[categoryName].value += invTotal;
      categoryMap[categoryName].count += 1;
    });

    const categoriesArray = Object.values(categoryMap)
      .map(item => ({
        ...item,
        percent: spendSum > 0 ? Number(((item.value / spendSum) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);

    return {
      categoryData: categoriesArray,
      totalSpend: spendSum,
      totalInvoicesCount: invoices.length
    };
  }, [invoices]);

  const activeCategory = activeIndex !== null && categoryData[activeIndex] ? categoryData[activeIndex] : null;

  // Empty State: When no invoices or expenses exist
  if (!invoices || invoices.length === 0 || totalSpend === 0 || categoryData.length === 0) {
    return (
      <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <LucidePieChart className="w-4 h-4 text-rose-600" />
              {title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-xs">
            <LucidePieChart className="w-8 h-8 opacity-80" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900">No expenses recorded yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your vendor bills or scan receipts with OCR to automatically generate expense category spend breakdowns and ITC tracking.
            </p>
          </div>
          {onOpenScanModal && (
            <button
              type="button"
              onClick={onOpenScanModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan & Upload Invoice</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <LucidePieChart className="w-4 h-4" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
            {categoryData.length} {categoryData.length === 1 ? 'Category' : 'Categories'}
          </span>
          <span className="text-xs font-mono font-extrabold text-slate-900 bg-rose-50/70 border border-rose-100 px-3 py-1 rounded-xl">
            Total: ₹{totalSpend.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Main Grid: Donut Chart on Left, Side Legend Breakdown on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* LEFT COLUMN: Donut Chart with Dynamic Center Label (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[280px]">
          
          <div className="w-full h-[270px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomChartTooltip />} />
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={98}
                  paddingAngle={3}
                  animationDuration={600}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {categoryData.map((entry, index) => {
                    const isHovered = activeIndex === index;
                    const isAnyHovered = activeIndex !== null;
                    return (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={entry.color}
                        opacity={!isAnyHovered || isHovered ? 1 : 0.35}
                        stroke={isHovered ? '#ffffff' : 'rgba(255,255,255,0.7)'}
                        strokeWidth={isHovered ? 3 : 1.5}
                        style={{
                          cursor: 'pointer',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                          transformOrigin: 'center center',
                          filter: isHovered ? 'drop-shadow(0 6px 12px rgba(0,0,0,0.18))' : 'none'
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Hole Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {activeCategory ? (
                <div className="space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <span 
                    className="inline-block w-2 h-2 rounded-full mb-0.5" 
                    style={{ backgroundColor: activeCategory.color }} 
                  />
                  <p className="text-[10px] font-bold text-slate-500 truncate max-w-[110px] uppercase tracking-wider">
                    {activeCategory.name}
                  </p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                    ₹{activeCategory.value.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-slate-900 text-white inline-block">
                    {activeCategory.percent}%
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Spend
                  </p>
                  <p className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                    ₹{totalSpend.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {totalInvoicesCount} {totalInvoicesCount === 1 ? 'bill' : 'bills'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-1">
            Hover over a slice or category to inspect spend share
          </p>
        </div>

        {/* RIGHT COLUMN: Interactive Side Legend / Breakdown List (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
            <span>Category Name</span>
            <span className="text-right">Spend Amount / Share</span>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {categoryData.map((cat, idx) => {
              const isHovered = activeIndex === idx;
              return (
                <div
                  key={cat.name}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-2 ${
                    isHovered
                      ? 'bg-slate-50 border-rose-300 shadow-sm scale-[1.01]'
                      : 'bg-white hover:bg-slate-50/60 border-slate-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-lg shrink-0 shadow-2xs transition-transform duration-200"
                        style={{ 
                          backgroundColor: cat.color,
                          transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                        }}
                      />
                      <span className={`text-xs font-bold truncate ${isHovered ? 'text-slate-900' : 'text-slate-700'}`}>
                        {cat.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-semibold shrink-0">
                        {cat.count} {cat.count === 1 ? 'bill' : 'bills'}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-slate-900">
                        ₹{cat.value.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 ml-2">
                        ({cat.percent}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
