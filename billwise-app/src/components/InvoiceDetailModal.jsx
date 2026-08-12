import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  ShieldCheck, 
  Receipt,
  Trash2,
  AlertCircle,
  MessageSquare,
  Send
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { invoiceApi } from '../api';

export default function InvoiceDetailModal({ invoice, onClose, onInvoiceDeleted }) {
  if (!invoice) return null;

  const { role, isSuperAdmin } = useAuth();
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isAccountant = role === 'ACCOUNTANT';

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showRequestDelete, setShowRequestDelete] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handlePrint = () => {
    window.print();
  };

  const handleAdminDirectDelete = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await invoiceApi.remove(invoice.id);
      if (onInvoiceDeleted) onInvoiceDeleted(invoice.id);
      if (onClose) onClose();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete invoice.' });
      setIsSubmitting(false);
    }
  };

  const handleAccountantRequestDelete = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await invoiceApi.requestDeletion(invoice.id, reason.trim());
      setFeedback({ type: 'success', message: 'Deletion request sent to Admin.' });
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit request.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-rose-200 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Tax Invoice Audit View</h2>
              <p className="text-xs text-slate-500 font-mono">Invoice ID: {invoice.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition"
              title="Print Tax Invoice"
            >
              <Printer className="w-4 h-4" />
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition"
                title="Delete Invoice (Admin)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {isAccountant && (
              <button
                onClick={() => setShowRequestDelete(true)}
                className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition"
                title="Request Deletion from Admin"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`p-3 rounded-xl border text-xs font-bold ${
            feedback.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Printable Tax Invoice Container */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-6 text-slate-800 text-xs">
          
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">Supplier Details</span>
              <h4 className="font-extrabold text-sm text-slate-900">{invoice.vendorName}</h4>
              <p className="font-mono text-[11px] text-slate-700 mt-1">GSTIN: {invoice.gstin}</p>
              <p className="text-slate-500 mt-1">HSN/SAC: {invoice.hsnSac || '—'}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">Billed To</span>
              <h4 className="font-extrabold text-sm text-slate-900">Shri Ram Enterprise</h4>
              <p className="font-mono text-[11px] text-slate-700 mt-1">GSTIN: 27AABCS9912E1Z8</p>
              <p className="text-slate-500 mt-1">Place of Supply: Maharashtra (27)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-white border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px]">Invoice Number</span>
              <span className="font-mono font-bold text-slate-900 text-xs">{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Invoice Date</span>
              <span className="font-mono font-semibold text-slate-900 text-xs">{invoice.invoiceDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Payment Due Date</span>
              <span className="font-mono font-semibold text-rose-600 text-xs">{invoice.dueDate}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-slate-900 block mb-2">Item Breakdown & Tax Computation</span>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <th className="py-2">Description / Category</th>
                  <th className="py-2 font-mono">Taxable Value</th>
                  <th className="py-2 font-mono">GST Rate</th>
                  <th className="py-2 font-mono text-right">Tax Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2.5">
                    <div className="font-bold text-slate-900">{invoice.category}</div>
                    <div className="text-[10px] text-slate-500">{invoice.notes}</div>
                  </td>
                  <td className="py-2.5 font-mono text-slate-700">₹{(invoice.taxableAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 font-mono text-slate-700">{invoice.gstRate}%</td>
                  <td className="py-2.5 font-mono text-slate-700 text-right">₹{((invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0)).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end">
            <div className="w-64 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value:</span>
                <span>₹{(invoice.taxableAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>CGST:</span>
                <span>₹{(invoice.cgst || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>SGST:</span>
                <span>₹{(invoice.sgst || 0).toLocaleString('en-IN')}</span>
              </div>
              {invoice.igst > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>IGST:</span>
                  <span>₹{(invoice.igst || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-2 border-t border-slate-200">
                <span>Total Amount:</span>
                <span className="text-emerald-600">₹{(invoice.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">ITC Claim Status:</span>
            </div>
            <span className="text-xs font-bold text-emerald-700 font-mono">
              {invoice.itcEligibility} (₹{(invoice.itcAmount || 0).toLocaleString('en-IN')})
            </span>
          </div>

        </div>

        {/* Modal: Admin Confirm Direct Delete */}
        {showConfirmDelete && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Confirm Permanent Deletion as Admin
            </div>
            <p className="text-xs text-rose-700">
              Are you sure you want to delete invoice #{invoice.invoiceNumber}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdminDirectDelete}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        )}

        {/* Modal: Accountant Request Deletion */}
        {showRequestDelete && (
          <form onSubmit={handleAccountantRequestDelete} className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <MessageSquare className="w-4 h-4 text-amber-700" />
              Request Invoice Deletion from Admin
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-amber-800 block mb-1">
                Reason / Justification *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Explain why this invoice should be deleted..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-white border border-amber-300 text-xs text-slate-900 outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRequestDelete(false)}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                {isSubmitting ? 'Submitting...' : 'Send Request'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
