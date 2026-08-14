import { useState, useMemo, useCallback } from 'react';

/**
 * Safely parses an invoice date string into a Date object.
 * Supports ISO (YYYY-MM-DD), timestamps, and standard date strings.
 */
export function parseInvoiceDate(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  const str = String(dateInput).trim();
  if (!str) return null;

  // Handle YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    return new Date(year, month, day);
  }

  // Handle DD/MM/YYYY
  const inMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (inMatch) {
    const day = parseInt(inMatch[1], 10);
    const month = parseInt(inMatch[2], 10) - 1;
    const year = parseInt(inMatch[3], 10);
    return new Date(year, month, day);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a Date object into a YYYY-MM key (e.g. "2026-08")
 */
export function toMonthKey(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Formats a Date or YYYY-MM string into a display label (e.g. "Aug 2026")
 */
export function toMonthLabel(dateOrKey) {
  if (!dateOrKey) return '';
  if (typeof dateOrKey === 'string' && dateOrKey.includes('-')) {
    const [y, m] = dateOrKey.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  if (dateOrKey instanceof Date) {
    return dateOrKey.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
  return String(dateOrKey);
}

/**
 * Custom React Hook for shared invoice date and month filtering across charts and tables.
 */
export function useInvoiceDateFilter(invoices = []) {
  const [filterState, setFilterState] = useState({
    mode: 'preset', // 'preset' | 'custom'
    presetKey: 'ALL', // 'ALL' | 'YYYY-MM'
    customFrom: '', // 'YYYY-MM-DD'
    customTo: '' // 'YYYY-MM-DD'
  });

  // Extract all distinct year-month pairs present in the invoices dataset
  const availableMonths = useMemo(() => {
    const monthMap = {};

    (invoices || []).forEach(inv => {
      const d = parseInvoiceDate(inv.invoiceDate || inv.createdAt);
      if (!d) return;

      const key = toMonthKey(d);
      if (!monthMap[key]) {
        monthMap[key] = {
          key,
          label: toMonthLabel(d),
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          count: 0,
          spend: 0
        };
      }
      monthMap[key].count += 1;
      monthMap[key].spend += Number(inv.totalAmount || inv.taxableAmount || 0);
    });

    // Sort months chronologically descending (newest month first)
    const sortedMonths = Object.values(monthMap).sort((a, b) => b.key.localeCompare(a.key));

    return [
      { key: 'ALL', label: 'All Time', count: invoices.length },
      ...sortedMonths
    ];
  }, [invoices]);

  // Compute filtered invoices based on active filter criteria
  const filteredInvoices = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];

    return invoices.filter(inv => {
      // Exclude voided/rejected if marked
      if (inv.status && (inv.status === 'VOID' || inv.status === 'REJECTED')) {
        return false;
      }

      const d = parseInvoiceDate(inv.invoiceDate || inv.createdAt);
      if (!d) {
        // Invoices with completely missing date are kept when viewing 'ALL'
        return filterState.mode === 'preset' && filterState.presetKey === 'ALL';
      }

      if (filterState.mode === 'preset') {
        if (filterState.presetKey === 'ALL') return true;
        return toMonthKey(d) === filterState.presetKey;
      }

      if (filterState.mode === 'custom') {
        const invDateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
        if (filterState.customFrom && invDateStr < filterState.customFrom) return false;
        if (filterState.customTo && invDateStr > filterState.customTo) return false;
        return true;
      }

      return true;
    });
  }, [invoices, filterState]);

  // Total period spend calculation
  const totalPeriodSpend = useMemo(() => {
    return filteredInvoices.reduce((acc, inv) => {
      const amt = Number(inv.totalAmount) || 
        (Number(inv.taxableAmount || 0) + Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0)) || 
        0;
      return acc + amt;
    }, 0);
  }, [filteredInvoices]);

  // Handler: Select a month preset pill
  const setPreset = useCallback((presetKey) => {
    setFilterState({
      mode: 'preset',
      presetKey: presetKey || 'ALL',
      customFrom: '',
      customTo: ''
    });
  }, []);

  // Handler: Set custom date range
  const setCustomRange = useCallback((from, to) => {
    setFilterState({
      mode: 'custom',
      presetKey: 'ALL',
      customFrom: from || '',
      customTo: to || ''
    });
  }, []);

  // Handler: Reset filter back to 'All Time'
  const resetFilter = useCallback(() => {
    setFilterState({
      mode: 'preset',
      presetKey: 'ALL',
      customFrom: '',
      customTo: ''
    });
  }, []);

  const isFiltered = filterState.mode === 'custom' || (filterState.mode === 'preset' && filterState.presetKey !== 'ALL');

  const activeLabel = useMemo(() => {
    if (filterState.mode === 'preset') {
      if (filterState.presetKey === 'ALL') return 'All Time';
      return toMonthLabel(filterState.presetKey);
    }
    if (filterState.mode === 'custom') {
      if (filterState.customFrom && filterState.customTo) {
        return `${filterState.customFrom} to ${filterState.customTo}`;
      }
      if (filterState.customFrom) return `From ${filterState.customFrom}`;
      if (filterState.customTo) return `Until ${filterState.customTo}`;
      return 'Custom Range';
    }
    return 'All Time';
  }, [filterState]);

  return {
    filterState,
    filteredInvoices,
    availableMonths,
    setPreset,
    setCustomRange,
    resetFilter,
    isFiltered,
    activeLabel,
    totalPeriodSpend,
    totalPeriodCount: filteredInvoices.length
  };
}
