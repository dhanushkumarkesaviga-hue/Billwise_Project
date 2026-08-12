import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Calendar, 
  ArrowUpDown, 
  ScanLine, 
  Building2, 
  Plus, 
  CopyCheck, 
  CheckCircle2, 
  RefreshCw,
  Trash2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Check,
  X,
  Send,
  MessageSquare,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { invoiceApi } from '../api';

export default function InvoiceListTable({ 
  invoices = [], 
  onOpenScanModal, 
  onSelectInvoice, 
  canManageInvoices, 
  onRefreshInvoices 
}) {
  const { merchantTradeName, role, isSuperAdmin } = useAuth();
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isAccountant = role === 'ACCOUNTANT';

  const [activeLedgerTab, setActiveLedgerTab] = useState('invoices'); // 'invoices' | 'deletion-requests'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortField, setSortField] = useState('invoiceDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [dedupNotice, setDedupNotice] = useState(null);

  // Deletion Requests State
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [requestFilterStatus, setRequestFilterStatus] = useState('ALL');

  // Modals State
  const [adminDeleteTarget, setAdminDeleteTarget] = useState(null); // Invoice object for direct deletion
  const [accountantRequestTarget, setAccountantRequestTarget] = useState(null); // Invoice object for deletion request
  const [deletionReason, setDeletionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Load Deletion Requests
  const loadDeletionRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const data = await invoiceApi.getDeletionRequests();
      setDeletionRequests(data || []);
    } catch (err) {
      console.warn("Failed to load deletion requests:", err);
      setDeletionRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadDeletionRequests();
  }, [invoices]);

  const pendingRequestsCount = deletionRequests.filter(r => r.status === 'PENDING').length;

  // Direct Admin Invoice Deletion
  const handleConfirmAdminDelete = async () => {
    if (!adminDeleteTarget) return;
    setIsSubmittingAction(true);
    setActionFeedback(null);
    try {
      await invoiceApi.remove(adminDeleteTarget.id);
      setActionFeedback({ type: 'success', message: `Invoice #${adminDeleteTarget.invoiceNumber} permanently deleted.` });
      setAdminDeleteTarget(null);
      if (onRefreshInvoices) onRefreshInvoices();
      await loadDeletionRequests();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to delete invoice.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Accountant Deletion Request Submission
  const handleSubmitDeletionRequest = async (e) => {
    e.preventDefault();
    if (!accountantRequestTarget || !deletionReason.trim()) return;
    setIsSubmittingAction(true);
    setActionFeedback(null);
    try {
      await invoiceApi.requestDeletion(accountantRequestTarget.id, deletionReason.trim());
      setActionFeedback({ 
        type: 'success', 
        message: `Deletion request for invoice #${accountantRequestTarget.invoiceNumber} submitted to Admin.` 
      });
      setAccountantRequestTarget(null);
      setDeletionReason('');
      await loadDeletionRequests();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to submit deletion request.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Admin Approve Request (Deletes invoice)
  const handleApproveRequest = async (requestId, invNumber) => {
    setIsSubmittingAction(true);
    try {
      await invoiceApi.approveDeletionRequest(requestId, "Approved by Admin — invoice deleted.");
      setActionFeedback({ type: 'success', message: `Deletion request approved. Invoice #${invNumber || ''} has been deleted.` });
      await loadDeletionRequests();
      if (onRefreshInvoices) onRefreshInvoices();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to approve deletion.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Admin Reject Request
  const handleRejectRequest = async (requestId, invNumber) => {
    setIsSubmittingAction(true);
    try {
      await invoiceApi.rejectDeletionRequest(requestId, "Rejected by Admin.");
      setActionFeedback({ type: 'info', message: `Deletion request for invoice #${invNumber || ''} was rejected.` });
      await loadDeletionRequests();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message || 'Failed to reject deletion.' });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      (inv.vendorName && inv.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.gstin && inv.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.hsnSac && inv.hsnSac.includes(searchTerm));

    const matchesCategory = selectedCategory === 'ALL' || inv.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || inv.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    let valA = a[sortField] || '';
    let valB = b[sortField] || '';

    if (typeof valA === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortOrder === 'asc' ? valA - valB : valB - valA;
  });

  const filteredRequests = deletionRequests.filter(req => {
    if (requestFilterStatus === 'ALL') return true;
    return req.status === requestFilterStatus;
  });

  const exportToCsv = () => {
    if (filteredInvoices.length === 0) return;
    const headers = ["Invoice ID,Vendor Name,GSTIN,Invoice No,Date,Category,HSN,Taxable,CGST,SGST,IGST,Total,ITC Status"];
    const rows = filteredInvoices.map(i => 
      `"${i.id}","${i.vendorName || ''}","${i.gstin || ''}","${i.invoiceNumber || ''}","${i.invoiceDate || ''}","${i.category || ''}","${i.hsnSac || ''}",${i.taxableAmount || 0},${i.cgst || 0},${i.sgst || 0},${i.igst || 0},${i.totalAmount || 0},"${i.itcEligibility || ''}"`
    );
    
    const blob = new Blob([[headers, ...rows].join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `BillWise_${merchantTradeName ? merchantTradeName.replace(/\s+/g, '_') : 'Invoices'}_Export_${dateStr}.csv`;
    a.click();
  };

  const handleDeduplicate = async () => {
    setIsDeduplicating(true);
    setDedupNotice(null);
    try {
      const res = await invoiceApi.deduplicate();
      setDedupNotice({
        type: res.removedCount > 0 ? 'success' : 'info',
        message: res.message
      });
      if (onRefreshInvoices) onRefreshInvoices();
      setTimeout(() => setDedupNotice(null), 5000);
    } catch (err) {
      setDedupNotice({
        type: 'error',
        message: err.message || 'Failed to deduplicate bills.'
      });
    } finally {
      setIsDeduplicating(false);
    }
  };

  const categoriesList = Array.from(new Set(invoices.map(i => i.category).filter(Boolean)));

  return (
    <div className="space-y-6">

      {/* Global Action Feedback Alert */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold shadow-sm transition animate-in fade-in ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : actionFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Ledger Header & Sub-Navigation */}
      <div className="glass-panel rounded-3xl p-6 space-y-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-600" />
              Invoice Management Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {merchantTradeName ? `${merchantTradeName} — ` : ''}
              Auditable GST records, automatic categorization & deletion approvals.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canManageInvoices && (
              <button
                onClick={handleDeduplicate}
                disabled={isDeduplicating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50"
                title="Detect & remove duplicate invoice numbers"
              >
                <CopyCheck className="w-3.5 h-3.5 text-rose-600" />
                {isDeduplicating ? 'Cleaning...' : 'Deduplicate'}
              </button>
            )}

            <button
              onClick={exportToCsv}
              disabled={filteredInvoices.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>

            {canManageInvoices && (
              <button
                onClick={onOpenScanModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5" />
                Scan Invoice
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation: Invoices Ledger vs Deletion Requests Queue */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={() => setActiveLedgerTab('invoices')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeLedgerTab === 'invoices'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            All Invoices ({invoices.length})
          </button>

          <button
            onClick={() => { setActiveLedgerTab('deletion-requests'); loadDeletionRequests(); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition relative ${
              activeLedgerTab === 'deletion-requests'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isAdmin ? 'Invoice Deletion Requests' : 'My Deletion Requests'}
            {pendingRequestsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeLedgerTab === 'deletion-requests' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
              }`}>
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: ALL INVOICES TABLE */}
      {activeLedgerTab === 'invoices' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vendor, invoice #, GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Categories</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Flagged">Flagged</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-700">No invoices found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {invoices.length === 0
                      ? "No invoices recorded yet. Click '+ Scan Invoice' to upload receipts."
                      : "No invoices match the selected filter criteria."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
                      <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900" onClick={() => { setSortField('vendorName'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        Vendor / Supplier <ArrowUpDown className="w-3 h-3 inline ml-1" />
                      </th>
                      <th className="py-3.5 px-4">Invoice # & Date</th>
                      <th className="py-3.5 px-4">HSN / Category</th>
                      <th className="py-3.5 px-4 cursor-pointer hover:text-slate-900" onClick={() => { setSortField('totalAmount'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
                        Total Amount <ArrowUpDown className="w-3 h-3 inline ml-1" />
                      </th>
                      <th className="py-3.5 px-4">GST Tax</th>
                      <th className="py-3.5 px-4">ITC Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition group">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-rose-600 transition">
                            {inv.vendorName}
                          </div>
                          <div className="text-[10px] font-mono text-rose-700 font-semibold mt-0.5">
                            GSTIN: {inv.gstin}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono text-slate-800 font-bold">{inv.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {inv.invoiceDate}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{inv.category}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            HSN: {inv.hsnSac || '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                          ₹{(inv.totalAmount || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          <div>₹{((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)).toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-500">Rate: {inv.gstRate}%</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            inv.itcEligibility && inv.itcEligibility.includes('Eligible')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {inv.itcEligibility || 'Unclassified'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          <button
                            onClick={() => onSelectInvoice(inv)}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition shadow-2xs"
                            title="View Invoice Audit"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Admin Direct Delete */}
                          {isAdmin && (
                            <button
                              onClick={() => setAdminDeleteTarget(inv)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition shadow-2xs"
                              title="Delete Invoice (Admin Direct)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Accountant Request Deletion */}
                          {isAccountant && (
                            <button
                              onClick={() => { setAccountantRequestTarget(inv); setDeletionReason(''); }}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 transition shadow-2xs"
                              title="Request Invoice Deletion from Admin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: DELETION REQUESTS QUEUE */}
      {activeLedgerTab === 'deletion-requests' && (
        <div className="space-y-4">
          
          <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Requests:</span>
              <div className="flex items-center gap-1.5">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(st => (
                  <button
                    key={st}
                    onClick={() => setRequestFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      requestFilterStatus === st
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={loadDeletionRequests}
              disabled={isLoadingRequests}
              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingRequests ? 'animate-spin' : ''}`} />
              Refresh Queue
            </button>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden border border-slate-200">
            {filteredRequests.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Trash2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No deletion requests</h3>
                <p className="text-xs text-slate-400">
                  {isAdmin 
                    ? "No deletion requests submitted by accountants."
                    : "You have not submitted any invoice deletion requests."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-50">
                      <th className="py-3 px-4">Invoice Info</th>
                      <th className="py-3 px-4">Requested By</th>
                      <th className="py-3 px-4">Reason / Remarks</th>
                      <th className="py-3 px-4">Status</th>
                      {isAdmin && <th className="py-3 px-4 text-right">Admin Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRequests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">Invoice #{req.invoiceNumber}</div>
                          <div className="text-[11px] text-slate-600">{req.vendorName}</div>
                          <div className="font-mono text-rose-700 font-bold mt-0.5">₹{(req.totalAmount || 0).toLocaleString('en-IN')}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">@{req.requestedByUsername}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-800">
                            "{req.reason}"
                          </div>
                          {req.reviewRemarks && (
                            <div className="text-[10px] text-slate-500 mt-1 italic">
                              Admin note: {req.reviewRemarks}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {req.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                              <Clock className="w-3 h-3" /> Pending Admin Review
                            </span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              <Check className="w-3 h-3" /> Approved (Deleted)
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </td>

                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            {req.status === 'PENDING' ? (
                              <>
                                <button
                                  onClick={() => handleApproveRequest(req.id, req.invoiceNumber)}
                                  disabled={isSubmittingAction}
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs transition"
                                >
                                  Approve & Delete
                                </button>
                                <button
                                  onClick={() => handleRejectRequest(req.id, req.invoiceNumber)}
                                  disabled={isSubmittingAction}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-medium">Completed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Admin Direct Delete Confirmation Modal */}
      {adminDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-rose-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Permanently Delete Invoice?
              </h3>
              <p className="text-xs text-slate-500">
                You are about to delete invoice <span className="font-mono font-bold text-slate-800">#{adminDeleteTarget.invoiceNumber}</span> from <span className="font-bold text-slate-800">{adminDeleteTarget.vendorName}</span> (₹{adminDeleteTarget.totalAmount?.toLocaleString('en-IN')}).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              ⚠️ This will remove the transaction from your tax ledger and recalculate GST Input Tax Credit figures immediately.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdminDeleteTarget(null)}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAdminDelete}
                disabled={isSubmittingAction}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20"
              >
                {isSubmittingAction ? 'Deleting...' : 'Confirm & Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Accountant Deletion Request Modal */}
      {accountantRequestTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSubmitDeletionRequest} className="bg-white rounded-3xl p-6 max-w-md w-full border border-amber-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
              <MessageSquare className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">
                Request Invoice Deletion
              </h3>
              <p className="text-xs text-slate-500">
                As an Accountant, submitting this will send an approval request to your organization's Admin.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">Invoice: #{accountantRequestTarget.invoiceNumber}</div>
              <div className="text-slate-600">{accountantRequestTarget.vendorName} — ₹{accountantRequestTarget.totalAmount?.toLocaleString('en-IN')}</div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Reason for Deletion Request *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Duplicate entry, wrong vendor billing, or cancelled shipment..."
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccountantRequestTarget(null)}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction || !deletionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmittingAction ? 'Submitting...' : 'Send Request to Admin'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
