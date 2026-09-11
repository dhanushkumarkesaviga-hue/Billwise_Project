import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Building2,
  Calendar,
  Hash,
  Layers,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Globe2,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import {
  INDIAN_STATE_CODES,
  COMMON_GST_RATES,
  calculateGstBreakdown,
  extractStateCode,
  isValidGstinFormat,
  getStateName
} from '../utils/gstUtils';
import { salesInvoiceApi } from '../api';

const POPULAR_HSN_CODES = [
  { code: '998313', label: 'IT & Cloud Infrastructure Consulting' },
  { code: '998315', label: 'Software & SaaS Subscriptions' },
  { code: '9982', label: 'Legal & Professional Services' },
  { code: '996511', label: 'Freight & Transportation' },
  { code: '9972', label: 'Commercial Rent & Lease' },
  { code: '8471', label: 'Computers, Laptops & Servers' },
  { code: '4820', label: 'Stationery & Paper Supplies' },
  { code: '7208', label: 'Raw Materials (Iron & Steel)' }
];

export default function SalesInvoiceForm({
  invoice,
  merchantGstin = '27AAACA1234F1Z5',
  onClose,
  onSaved
}) {
  const isEditing = Boolean(invoice?.id);

  // Form State
  const [customerName, setCustomerName] = useState(invoice?.customerName || '');
  const [customerGstin, setCustomerGstin] = useState(invoice?.customerGstin || '');
  const [supplyType, setSupplyType] = useState(invoice?.supplyType || (invoice?.customerGstin ? 'B2B' : 'B2B'));
  const [invoiceNumber, setInvoiceNumber] = useState(
    invoice?.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoiceDate || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(
    invoice?.dueDate ||
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [hsnSac, setHsnSac] = useState(invoice?.hsnSac || '998313');
  const [taxableAmount, setTaxableAmount] = useState(
    invoice?.taxableAmount !== undefined ? String(invoice.taxableAmount) : ''
  );
  const [gstRate, setGstRate] = useState(
    invoice?.gstRate !== undefined ? Number(invoice.gstRate) : 18
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    invoice?.placeOfSupply || extractStateCode(invoice?.customerGstin) || extractStateCode(merchantGstin) || '27'
  );
  const [status, setStatus] = useState(invoice?.status || 'Issued');
  const [notes, setNotes] = useState(invoice?.notes || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Auto-handle customer GSTIN input: uppercase and auto-derive state & B2B
  const handleGstinChange = (val) => {
    const clean = val.toUpperCase().trim();
    setCustomerGstin(clean);

    if (clean.length >= 2 && /^\d{2}/.test(clean)) {
      const detectedState = clean.substring(0, 2);
      if (INDIAN_STATE_CODES[detectedState]) {
        setPlaceOfSupply(detectedState);
      }
      if (supplyType !== 'EXPORT' && supplyType !== 'SEZ') {
        setSupplyType('B2B');
      }
    }
  };

  // Real-time GST calculation breakdown
  const taxBreakdown = useMemo(() => {
    return calculateGstBreakdown({
      taxableAmount: parseFloat(taxableAmount) || 0,
      gstRate,
      supplierStateCode: merchantGstin,
      customerGstin,
      placeOfSupply,
      supplyType
    });
  }, [taxableAmount, gstRate, merchantGstin, customerGstin, placeOfSupply, supplyType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Customer Name is required.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setFormError('Invoice Number is required.');
      return;
    }
    if (!taxableAmount || parseFloat(taxableAmount) <= 0) {
      setFormError('Please enter a valid taxable amount greater than zero.');
      return;
    }

    if (supplyType === 'B2B' && customerGstin && !isValidGstinFormat(customerGstin)) {
      setFormError('Customer GSTIN format is invalid. Should be 15 characters (e.g. 27AAACT2727Q1ZW).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerGstin: customerGstin ? customerGstin.trim().toUpperCase() : null,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate ? invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: dueDate ? dueDate.split('T')[0] : null,
        hsnSac: hsnSac.trim(),
        taxableAmount: taxBreakdown.taxableAmount,
        gstRate: taxBreakdown.gstRate,
        cgst: taxBreakdown.cgst,
        sgst: taxBreakdown.sgst,
        igst: taxBreakdown.igst,
        totalAmount: taxBreakdown.totalAmount,
        supplyType,
        status,
        placeOfSupply,
        notes: notes.trim()
      };

      let result;
      if (isEditing) {
        result = await salesInvoiceApi.update(invoice.id, payload);
      } else {
        result = await salesInvoiceApi.create(payload);
      }

      if (onSaved) onSaved(result);
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to save sales invoice:', err);
      setFormError(err.message || 'Failed to save sales invoice. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isEditing ? 'Edit Sales Invoice' : 'Create New Sales Invoice'}
              </h2>
              <p className="text-xs text-slate-400">
                Record outward supply for output GST liability & GSTR-1/3B filing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Customer & Supply Type */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-rose-500" />
              Customer & Transaction Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Recipient Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supply Classification <span className="text-rose-600">*</span>
                </label>
                <select
                  value={supplyType}
                  onChange={(e) => setSupplyType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                >
                  <option value="B2B">B2B Supply (To Registered Business)</option>
                  <option value="B2C">B2C Supply (To Unregistered Consumer)</option>
                  <option value="EXPORT">Export Outward Supply (Zero-Rated)</option>
                  <option value="SEZ">Special Economic Zone (SEZ Supply)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer GSTIN {supplyType === 'B2B' ? '(Recommended)' : '(Optional for B2C)'}
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AAACT2727Q1ZW"
                  value={customerGstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-medium focus:outline-none transition ${
                    customerGstin && !isValidGstinFormat(customerGstin)
                      ? 'border-amber-400 bg-amber-50/40 text-amber-900 focus:ring-2 focus:ring-amber-400/20'
                      : 'border-slate-200 text-slate-900 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
                  }`}
                />
                {customerGstin && !isValidGstinFormat(customerGstin) && (
                  <p className="text-[10px] text-amber-600 mt-1">15-digit alphanumeric format required for GST compliance.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Place of Supply (State) <span className="text-rose-600">*</span>
                </label>
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                >
                  {Object.entries(INDIAN_STATE_CODES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {code} - {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Invoice Number & Dates */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Hash className="w-4 h-4 text-rose-500" />
              Invoice Identifiers & Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Number <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV/2026/001"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Invoice Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                >
                  <option value="Issued">Issued (Active)</option>
                  <option value="Draft">Draft</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Dynamic GST Calculations */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-rose-500" />
                Line Value & Statutory Tax Breakdown
              </h3>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  taxBreakdown.isInterstate
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {taxBreakdown.taxDistributionLabel}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  HSN / SAC Code
                </label>
                <input
                  type="text"
                  list="hsnSuggestions"
                  placeholder="e.g. 998313"
                  value={hsnSac}
                  onChange={(e) => setHsnSac(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                />
                <datalist id="hsnSuggestions">
                  {POPULAR_HSN_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} - {item.label}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Taxable Value (₹) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={taxableAmount}
                    onChange={(e) => setTaxableAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  GST Rate (%) <span className="text-rose-600">*</span>
                </label>
                <select
                  value={gstRate}
                  onChange={(e) => setGstRate(Number(e.target.value))}
                  disabled={supplyType === 'EXPORT'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition disabled:bg-slate-100"
                >
                  {COMMON_GST_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}% {rate === 0 ? '(Exempt / Zero-Rated)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Calculated Tax Summary Card */}
            <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Computed Statutory Output Tax
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                  <div className="text-[10px] text-slate-400 font-semibold">Taxable Amount</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5 font-mono">
                    ₹{taxBreakdown.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {!taxBreakdown.isInterstate ? (
                  <>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <div className="text-[10px] text-blue-600 font-semibold">
                        CGST ({taxBreakdown.gstRate / 2}%)
                      </div>
                      <div className="text-sm font-extrabold text-blue-700 mt-0.5 font-mono">
                        ₹{taxBreakdown.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                      <div className="text-[10px] text-blue-600 font-semibold">
                        SGST ({taxBreakdown.gstRate / 2}%)
                      </div>
                      <div className="text-sm font-extrabold text-blue-700 mt-0.5 font-mono">
                        ₹{taxBreakdown.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-2xs col-span-2">
                    <div className="text-[10px] text-purple-600 font-semibold">
                      IGST ({taxBreakdown.gstRate}%)
                    </div>
                    <div className="text-sm font-extrabold text-purple-700 mt-0.5 font-mono">
                      ₹{taxBreakdown.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gradient-to-tr from-rose-50 to-red-50 rounded-xl border border-rose-200 shadow-2xs">
                  <div className="text-[10px] text-rose-700 font-semibold">Total Invoice Amount</div>
                  <div className="text-sm font-black text-rose-800 mt-0.5 font-mono">
                    ₹{taxBreakdown.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Notes / Item Description
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Monthly enterprise cloud maintenance retainer contract"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving Invoice...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Update Invoice' : 'Save Sales Invoice'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
