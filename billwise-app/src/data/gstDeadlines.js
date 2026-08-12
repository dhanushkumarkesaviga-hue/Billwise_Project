export const GST_DEADLINES = [
  {
    id: "gstr-1-aug",
    formName: "GSTR-1",
    title: "Outward Supplies Return",
    frequency: "Monthly",
    dueDate: "2026-08-11",
    daysRemaining: 7,
    status: "Upcoming",
    description: "Details of all outward supplies (sales) made during July 2026 for regular taxpayers with turnover > ₹5 Cr.",
    lateFeePerDay: 50,
    maxPenalty: 10000,
    impact: "High - Delay blocks ITC pass-through to your buyers in GSTR-2B"
  },
  {
    id: "gstr-3b-aug",
    formName: "GSTR-3B",
    title: "Summary Tax Return & Payment",
    frequency: "Monthly",
    dueDate: "2026-08-20",
    daysRemaining: 16,
    status: "Upcoming",
    description: "Self-assessed monthly summary return for tax payment and ITC claim for July 2026.",
    lateFeePerDay: 50,
    maxPenalty: 10000,
    impact: "Critical - Requires cash payment or net ITC offset against output liability"
  },
  {
    id: "iff-qrmp",
    formName: "GSTR-1 (IFF)",
    title: "Invoice Furnishing Facility (QRMP)",
    frequency: "Monthly (Optional)",
    dueDate: "2026-08-13",
    daysRemaining: 9,
    status: "Optional",
    description: "Optional facility for quarterly filers to pass ITC to B2B customers for Month 1 & 2.",
    lateFeePerDay: 0,
    maxPenalty: 0,
    impact: "Medium - Facilitates faster ITC claim for buyers"
  },
  {
    id: "cmp-08-q2",
    formName: "CMP-08",
    title: "Composition Tax Payment Statement",
    frequency: "Quarterly",
    dueDate: "2026-10-18",
    daysRemaining: 75,
    status: "Upcoming",
    description: "Quarterly self-assessed tax payment statement for Composition Scheme taxpayers (Q2 FY 2026-27).",
    lateFeePerDay: 50,
    maxPenalty: 2000,
    impact: "Medium - Flat rate tax payment based on turnover"
  },
  {
    id: "gstr-9-fy26",
    formName: "GSTR-9 & 9C",
    title: "Annual GST Return & Reconciliation",
    frequency: "Annual",
    dueDate: "2026-12-31",
    daysRemaining: 149,
    status: "Scheduled",
    description: "Annual consolidated return and audit reconciliation statement for FY 2025-26.",
    lateFeePerDay: 200,
    maxPenalty: 25000,
    impact: "High - Final opportunity to rectify ITC mismatches"
  }
];

export const TAX_SLAB_DISTRIBUTION = [
  { rate: "18% GST", percentage: 55, amount: 153000, color: "#6366f1" },
  { rate: "28% GST", percentage: 25, amount: 69500, color: "#f43f5e" },
  { rate: "5% GST", percentage: 12, amount: 33400, color: "#10b981" },
  { rate: "12% GST", percentage: 8, amount: 22200, color: "#f59e0b" },
];
