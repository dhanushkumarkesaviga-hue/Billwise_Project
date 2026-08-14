/**
 * Canonical Expense Categories and Color Definitions for BillWise.
 * Keeps category names and UI color swatches stable and consistent across the app.
 */

export const CATEGORY_OPTIONS = [
  "Raw Materials",
  "Capital Goods & Office Assets",
  "Cloud Infrastructure",
  "Software & Subscriptions",
  "Freight & Transport",
  "Food & Entertainment",
  "Professional & Legal Services",
  "Utilities",
  "Rent & Facilities",
  "Marketing & Advertising",
  "Office Supplies & Stationery",
  "Insurance",
  "Travel & Conveyance",
  "Repairs & Maintenance",
  "Other"
];

export const CATEGORY_COLORS = {
  "Raw Materials": "#3b82f6",                  // Blue
  "Capital Goods & Office Assets": "#6366f1",  // Indigo
  "Cloud Infrastructure": "#06b6d4",          // Cyan
  "Software & Subscriptions": "#8b5cf6",      // Purple
  "Freight & Transport": "#f59e0b",           // Amber
  "Food & Entertainment": "#ec4899",          // Pink
  "Professional & Legal Services": "#10b981", // Emerald
  "Utilities": "#14b8a6",                     // Teal
  "Rent & Facilities": "#f97316",             // Orange
  "Marketing & Advertising": "#e11d48",       // Rose / Brand Red
  "Office Supplies & Stationery": "#84cc16",  // Lime
  "Insurance": "#0284c7",                     // Sky Blue
  "Travel & Conveyance": "#a855f7",           // Violet
  "Repairs & Maintenance": "#eab308",         // Yellow
  "Other": "#64748b"                          // Slate
};

/**
 * Returns a stable HEX color for any category string with a fallback.
 */
export function getCategoryColor(category) {
  if (!category) return CATEGORY_COLORS["Other"];
  const trimmed = category.trim();
  return CATEGORY_COLORS[trimmed] || CATEGORY_COLORS["Other"];
}
