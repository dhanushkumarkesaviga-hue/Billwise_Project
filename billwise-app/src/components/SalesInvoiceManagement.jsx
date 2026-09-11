import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  Calendar,
  Building2,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Calculator,
  PieChart,
  RefreshCw,
  AlertCircle,
  ScanLine
} from 'lucide-react';
import { salesInvoiceApi } from '../api';
import { getStateName } from '../utils/gstUtils';
import SalesInvoiceForm from './SalesInvoiceForm';
import OcrUploadScanner from './OcrUploadScanner';

export default function SalesInvoiceManagement({
  merchantGstin = '27AAACA1234F1Z5',
  canManage = true,
  salesRefreshTrigger = 0,
  onNavigateToGstr3b,
  onNavigateToGstr1
}) {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplyType, setSelectedSupplyType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchSalesData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedSupplyType !== 'ALL') params.supplyType = selectedSupplyType;

      const [invoicesData, statsData] = await Promise.all([
        salesInvoiceApi.getAll(params),
        salesInvoiceApi.getStats()
      ]);

      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setStats(statsData || null);
    } catch (err) {
      console.error('Failed to load sales invoices:', err);
      setErrorMessage(err.message || 'Failed to fetch sales invoices.');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, selectedStatus, selectedSupplyType]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData, salesRefreshTrigger]);

  // Client-side search filtering
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        inv.customerName?.toLowerCase().includes(term) ||
        inv.invoiceNumber?.toLowerCase().includes(term) ||
        inv.customerGstin?.toLowerCase().includes(term) ||
        inv.id?.toLowerCase().includes(term);

      return matchSearch;
    });
  }, [invoices, searchTerm]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sales invoice? This action cannot be undone.')) {
      return;
    }
    try {
      await salesInvoiceApi.remove(id);
      fetchSalesData();
    } catch (err) {
      alert(err.message || 'Failed to delete sales invoice.');
    }
  };

  const handleExportCsv = () => {
    if (!invoices.length) return;
    const headers = [
      'Invoice ID,Invoice Number,Invoice Date,Customer Name,Customer GSTIN,Supply Type,Place of Supply,HSN/SAC,Taxable Value,CGST,SGST,IGST,Total Amount,Status'
    ];
    const rows = invoices.map((inv) =>
      [
        `"${inv.id}"`,
        `"${inv.invoiceNumber || ''}"`,
        `"${inv.invoiceDate || ''}"`,
        `"${(inv.customerName || '').replace(/"/g, '""')}"`,
        `"${inv.customerGstin || ''}"`,
        `"${inv.supplyType || 'B2B'}"`,
        `"${inv.placeOfSupply || ''}"`,
        `"${inv.hsnSac || ''}"`,
        inv.taxableAmount || 0,
        inv.cgst || 0,
        inv.sgst || 0,
        inv.igst || 0,
        inv.totalAmount || 0,
        `"${inv.status || 'Issued'}"`
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `billwise_sales_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold uppercase tracking-wider">
              Output GST Module
            </span>
            <span className="text-xs text-slate-400 font-medium">Outward Supplies</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Sales Invoices Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create statutory tax invoices, calculate output CGST/SGST/IGST, and prepare for GSTR-1 & GSTR-3B netting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToGstr3b && (
            <button
              onClick={onNavigateToGstr3b}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition hover:scale-[1.01] cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>GSTR-3B Netting</span>
            </button>
          )}

          {onNavigateToGstr1 && (
            <button
              onClick={onNavigateToGstr1}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer"
            >
              <PieChart className="w-4 h-4" />
              <span>GSTR-1 Report</span>
            </button>
          )}

          {canManage && (
            <>
              <button
                onClick={() => setIsScanModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition hover:scale-[1.01] cursor-pointer"
              >
                <ScanLine className="w-4 h-4 text-rose-600" />
                <span>Scan Sales Bill</span>
              </button>

              <button
                onClick={() => {
                  setEditingInvoice(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-2 px-4.5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition hover:scale-[1.01] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Sales Invoice</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Sales</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ₹{Number(stats?.totalSalesValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Gross outward billing</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Output Tax</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 font-mono">
            ₹{Number(stats?.totalOutputTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Tax liability collected</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">B2B Supplies</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {stats?.b2bCount || 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Registered tax invoices</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">B2C Retail</span>
            <FileText className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {stats?.b2cCount || 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Unregistered customers</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Exports</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            {stats?.exportCount || 0}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Zero-rated supplies</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, invoice #, or GSTIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSupplyType}
              onChange={(e) => setSelectedSupplyType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            >
              <option value="ALL">All Supply Types</option>
              <option value="B2B">B2B (Registered)</option>
              <option value="B2C">B2C (Consumer)</option>
              <option value="EXPORT">Exports / SEZ</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="Issued">Issued</option>
              <option value="Draft">Draft</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-[11px] font-medium text-slate-700 focus:outline-none"
              />
            </div>

            <button
              onClick={fetchSalesData}
              title="Refresh sales list"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleExportCsv}
              disabled={!invoices.length}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading sales ledger...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Sales Invoices Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No outward sales invoices match your active filters. Click "New Sales Invoice" to issue your first bill.
            </p>
            {canManage && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setIsScanModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition cursor-pointer"
                >
                  <ScanLine className="w-4 h-4 text-rose-600" />
                  <span>Scan Sales Bill</span>
                </button>
                <button
                  onClick={() => {
                    setEditingInvoice(null);
                    setIsFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Sales Invoice</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Invoice # & Date</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-4">Supply Type</th>
                  <th className="py-3 px-4">Place of Supply</th>
                  <th className="py-3 px-4 text-right">Taxable Amount</th>
                  <th className="py-3 px-4 text-right">Output Tax</th>
                  <th className="py-3 px-4 text-right">Total Value</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredInvoices.map((inv) => {
                  const isInterstate = Number(inv.igst || 0) > 0;
                  const totalTax = (Number(inv.cgst || 0) + Number(inv.sgst || 0) + Number(inv.igst || 0));

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 font-mono">{inv.invoiceNumber}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{inv.invoiceDate || 'N/A'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]">
                          {inv.customerName}
                        </div>
                        {inv.customerGstin ? (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            GSTIN: <span className="font-semibold text-slate-700">{inv.customerGstin}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">Unregistered Consumer</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                            inv.supplyType === 'EXPORT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.supplyType === 'B2C'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {inv.supplyType || 'B2B'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-xs text-slate-700">
                          {getStateName(inv.placeOfSupply)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Code: {inv.placeOfSupply || '27'}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-rose-600">
                          ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isInterstate ? `IGST ${inv.gstRate}%` : `CGST+SGST ${inv.gstRate}%`}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            inv.status === 'Issued'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : inv.status === 'Draft'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {inv.status || 'Issued'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <button
                              onClick={() => {
                                setEditingInvoice(inv);
                                setIsFormOpen(true);
                              }}
                              title="Edit invoice"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canManage && (
                            <button
                              onClick={() => handleDelete(inv.id)}
                              title="Delete invoice"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Form Modal */}
      {isFormOpen && (
        <SalesInvoiceForm
          invoice={editingInvoice}
          merchantGstin={merchantGstin}
          onClose={() => {
            setIsFormOpen(false);
            setEditingInvoice(null);
          }}
          onSaved={() => {
            fetchSalesData();
          }}
        />
      )}

      {/* OCR Scanner Modal (Sales Mode) */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <OcrUploadScanner
              initialScanMode="sales"
              onSalesInvoiceScanned={() => {
                fetchSalesData();
                setIsScanModalOpen(false);
              }}
              onClose={() => setIsScanModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
