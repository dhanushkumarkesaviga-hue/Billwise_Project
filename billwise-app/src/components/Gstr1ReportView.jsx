import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Building2,
  Users,
  Globe2,
  Layers,
  RefreshCw,
  AlertCircle,
  Hash,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { salesInvoiceApi } from '../api';
import { getStateName } from '../utils/gstUtils';

export default function Gstr1ReportView({
  merchantGstin = '27AAACA1234F1Z5',
  onNavigateToSales,
  onNavigateToGstr3b
}) {
  const [activeTab, setActiveTab] = useState('B2B');
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGstr1Data = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesInvoiceApi.getGstr1Summary(fromDate, toDate);
      setReport(data);
    } catch (err) {
      console.error('Failed to load GSTR-1 report:', err);
      setError(err.message || 'Failed to fetch GSTR-1 outward supply report.');
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchGstr1Data();
  }, [fetchGstr1Data]);

  // Export CSV for active table
  const handleExportTableCsv = () => {
    if (!report) return;

    let headers = [];
    let rows = [];
    let filename = `gstr1_${activeTab.toLowerCase()}_${fromDate}_${toDate}.csv`;

    if (activeTab === 'B2B') {
      headers = ['GSTIN of Recipient,Receiver Name,Invoice Number,Invoice Date,Invoice Value,Place of Supply,Rate,Taxable Value,CGST,SGST,IGST'];
      rows = (report.b2bInvoices || []).map((b) =>
        [
          `"${b.customerGstin || ''}"`,
          `"${(b.customerName || '').replace(/"/g, '""')}"`,
          `"${b.invoiceNumber || ''}"`,
          `"${b.invoiceDate || ''}"`,
          b.totalAmount || 0,
          `"${b.placeOfSupply || ''}"`,
          b.gstRate || 0,
          b.taxableAmount || 0,
          b.cgst || 0,
          b.sgst || 0,
          b.igst || 0
        ].join(',')
      );
    } else if (activeTab === 'B2C_LARGE') {
      headers = ['Recipient Name,Invoice Number,Invoice Date,Invoice Value,Place of Supply,Rate,Taxable Value,IGST'];
      rows = (report.b2cLargeInvoices || []).map((b) =>
        [
          `"${(b.customerName || '').replace(/"/g, '""')}"`,
          `"${b.invoiceNumber || ''}"`,
          `"${b.invoiceDate || ''}"`,
          b.totalAmount || 0,
          `"${b.placeOfSupply || ''}"`,
          b.gstRate || 0,
          b.taxableAmount || 0,
          b.igst || 0
        ].join(',')
      );
    } else if (activeTab === 'B2C_SMALL') {
      headers = ['Place of Supply,State Name,Rate,Taxable Value,CGST,SGST,IGST,Total Tax,Count'];
      rows = (report.b2cSmallSummaries || []).map((s) =>
        [
          `"${s.placeOfSupply || ''}"`,
          `"${s.stateName || ''}"`,
          s.gstRate || 0,
          s.totalTaxableAmount || 0,
          s.totalCgst || 0,
          s.totalSgst || 0,
          s.totalIgst || 0,
          s.totalTax || 0,
          s.invoiceCount || 0
        ].join(',')
      );
    } else if (activeTab === 'EXPORTS') {
      headers = ['Customer Name,Invoice Number,Invoice Date,Supply Type,Taxable Value,Rate,Invoice Value'];
      rows = (report.exportInvoices || []).map((e) =>
        [
          `"${(e.customerName || '').replace(/"/g, '""')}"`,
          `"${e.invoiceNumber || ''}"`,
          `"${e.invoiceDate || ''}"`,
          `"${e.supplyType || 'EXPORT'}"`,
          e.taxableAmount || 0,
          e.gstRate || 0,
          e.totalAmount || 0
        ].join(',')
      );
    } else if (activeTab === 'HSN') {
      headers = ['HSN/SAC Code,Rate,Taxable Value,CGST,SGST,IGST,Total Tax,Total Value,Count'];
      rows = (report.hsnSummaries || []).map((h) =>
        [
          `"${h.hsnSac || ''}"`,
          h.gstRate || 0,
          h.totalTaxableAmount || 0,
          h.totalCgst || 0,
          h.totalSgst || 0,
          h.totalIgst || 0,
          h.totalTax || 0,
          h.totalInvoiceAmount || 0,
          h.lineCount || 0
        ].join(',')
      );
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold uppercase tracking-wider">
              Statutory Outward Supplies Report
            </span>
            <span className="text-xs text-slate-400 font-medium">Form GSTR-1</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            GSTR-1 Statutory Filing Reference
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pre-grouped statutory categories ready for manual entry or offline upload to the GST portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs font-semibold text-slate-700 focus:outline-none bg-transparent"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs font-semibold text-slate-700 focus:outline-none bg-transparent"
            />
          </div>

          <button
            onClick={fetchGstr1Data}
            title="Refresh GSTR-1"
            className="p-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportTableCsv}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export {activeTab} CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Aggregate Statistics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Outward Turnover
          </div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">
            ₹{Number(report?.totalTaxableValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Across {report?.totalInvoicesCount || 0} invoices</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-purple-600">
            Integrated Tax (IGST)
          </div>
          <div className="text-xl font-black text-purple-700 mt-1 font-mono">
            ₹{Number(report?.totalIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Interstate & large supplies</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-blue-600">
            Central Tax (CGST)
          </div>
          <div className="text-xl font-black text-blue-700 mt-1 font-mono">
            ₹{Number(report?.totalCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Intrastate supplies</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-blue-600">
            State Tax (SGST)
          </div>
          <div className="text-xl font-black text-blue-700 mt-1 font-mono">
            ₹{Number(report?.totalSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Intrastate supplies</p>
        </div>
      </div>

      {/* Official Section Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('B2B')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === 'B2B'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>4A, 4B, 6B: B2B Invoices ({report?.b2bInvoices?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('B2C_LARGE')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === 'B2C_LARGE'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>5A: B2C Large &gt; ₹2.5L ({report?.b2cLargeInvoices?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('B2C_SMALL')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === 'B2C_SMALL'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>7: B2C Small Details ({report?.b2cSmallSummaries?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('EXPORTS')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === 'EXPORTS'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Globe2 className="w-4 h-4" />
          <span>6A: Exports / SEZ ({report?.exportInvoices?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('HSN')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition shrink-0 cursor-pointer ${
            activeTab === 'HSN'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>12: HSN Summary ({report?.hsnSummaries?.length || 0})</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Compiling GSTR-1 statutory tables...</p>
          </div>
        ) : (
          <div>
            {/* Table 4: B2B Invoices */}
            {activeTab === 'B2B' && (
              <div className="overflow-x-auto">
                {!report?.b2bInvoices?.length ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No B2B invoices recorded in this tax period.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <th className="py-3 px-4">Recipient GSTIN</th>
                        <th className="py-3 px-4">Receiver Name</th>
                        <th className="py-3 px-4">Invoice # & Date</th>
                        <th className="py-3 px-4">Place of Supply</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                        <th className="py-3 px-4 text-center">Rate</th>
                        <th className="py-3 px-4 text-right">Tax Split (IGST / CGST+SGST)</th>
                        <th className="py-3 px-4 text-right">Invoice Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {report.b2bInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {inv.customerGstin}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 truncate max-w-[180px]">
                            {inv.customerName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-400">{inv.invoiceDate}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {getStateName(inv.placeOfSupply)} ({inv.placeOfSupply || '27'})
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {inv.gstRate}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono">
                            {Number(inv.igst || 0) > 0 ? (
                              <span className="text-purple-700 font-bold">
                                IGST: ₹{Number(inv.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-blue-700 font-bold">
                                C+S: ₹{(Number(inv.cgst || 0) + Number(inv.sgst || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                            ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Table 5: B2C Large */}
            {activeTab === 'B2C_LARGE' && (
              <div className="overflow-x-auto">
                {!report?.b2cLargeInvoices?.length ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No interstate B2C large invoices (&gt; ₹2,50,000) in this tax period.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <th className="py-3 px-4">Invoice # & Date</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Place of Supply</th>
                        <th className="py-3 px-4 text-center">Rate</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                        <th className="py-3 px-4 text-right">IGST Amount</th>
                        <th className="py-3 px-4 text-right">Total Invoice Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {report.b2cLargeInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            <div>{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-400">{inv.invoiceDate}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{inv.customerName}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {getStateName(inv.placeOfSupply)} ({inv.placeOfSupply})
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {inv.gstRate}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                            ₹{Number(inv.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                            ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Table 7: B2C Small Details (State & Rate wise) */}
            {activeTab === 'B2C_SMALL' && (
              <div className="overflow-x-auto">
                {!report?.b2cSmallSummaries?.length ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No B2C small retail sales recorded in this period.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <th className="py-3 px-4">Place of Supply</th>
                        <th className="py-3 px-4">State Name</th>
                        <th className="py-3 px-4 text-center">Applicable Rate</th>
                        <th className="py-3 px-4 text-center">Invoices Count</th>
                        <th className="py-3 px-4 text-right">Total Taxable Value</th>
                        <th className="py-3 px-4 text-right">CGST</th>
                        <th className="py-3 px-4 text-right">SGST</th>
                        <th className="py-3 px-4 text-right">IGST</th>
                        <th className="py-3 px-4 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {report.b2cSmallSummaries.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {s.placeOfSupply}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{s.stateName}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {s.gstRate}%
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                            {s.invoiceCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(s.totalTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-700">
                            ₹{Number(s.totalCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-700">
                            ₹{Number(s.totalSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-purple-700">
                            ₹{Number(s.totalIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                            ₹{Number(s.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Table 6A: Exports */}
            {activeTab === 'EXPORTS' && (
              <div className="overflow-x-auto">
                {!report?.exportInvoices?.length ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No export / zero-rated supplies recorded in this tax period.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <th className="py-3 px-4">Invoice # & Date</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Export Type</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                        <th className="py-3 px-4 text-center">Rate</th>
                        <th className="py-3 px-4 text-right">Invoice Value (Zero-Rated)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {report.exportInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            <div>{inv.invoiceNumber}</div>
                            <div className="text-[10px] text-slate-400">{inv.invoiceDate}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{inv.customerName}</td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {inv.supplyType || 'EXPORT'} (LUT/Bond)
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-400">0% (LUT)</td>
                          <td className="py-3 px-4 text-right font-mono font-black text-emerald-700">
                            ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Table 12: HSN Summary */}
            {activeTab === 'HSN' && (
              <div className="overflow-x-auto">
                {!report?.hsnSummaries?.length ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No HSN summary data available for this tax period.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <th className="py-3 px-4">HSN / SAC Code</th>
                        <th className="py-3 px-4 text-center">Applicable Rate</th>
                        <th className="py-3 px-4 text-center">Invoice Count</th>
                        <th className="py-3 px-4 text-right">Taxable Value</th>
                        <th className="py-3 px-4 text-right">Central Tax (CGST)</th>
                        <th className="py-3 px-4 text-right">State Tax (SGST)</th>
                        <th className="py-3 px-4 text-right">Integrated Tax (IGST)</th>
                        <th className="py-3 px-4 text-right">Total Invoice Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {report.hsnSummaries.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-extrabold text-slate-900">
                            {h.hsnSac}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {h.gstRate}%
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-slate-600">
                            {h.lineCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{Number(h.totalTaxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-700">
                            ₹{Number(h.totalCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-blue-700">
                            ₹{Number(h.totalSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-purple-700">
                            ₹{Number(h.totalIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                            ₹{Number(h.totalInvoiceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
