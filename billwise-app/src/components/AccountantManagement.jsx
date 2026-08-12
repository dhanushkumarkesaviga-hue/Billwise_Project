import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  FileText,
  DollarSign,
  Search,
  Filter,
  Eye,
  Power,
  Mail,
  Phone,
  Calendar,
  Clock,
  Trash2,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  Tag,
  ArrowUpRight,
  UserCheck,
  UserX,
  RefreshCw,
  KeyRound,
  Shield,
  Lock
} from 'lucide-react';
import { merchantApi, invoiceApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AccountantManagement({ onSelectInvoice }) {
  const { username: currentAdminUsername } = useAuth();

  const [staffList, setStaffList] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [passwordResets, setPasswordResets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Portal View Tab: 'accountants' | 'password_resets'
  const [activeViewTab, setActiveViewTab] = useState('accountants');

  // Password Reset Actions state
  const [approvingResetId, setApprovingResetId] = useState(null);
  const [rejectingResetId, setRejectingResetId] = useState(null);
  const [resetFilterStatus, setResetFilterStatus] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, VERIFIED, PENDING_VERIFICATION, ACTIVE, DISABLED

  // Selected Accountant for Activity Modal
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [activityTab, setActivityTab] = useState('invoices'); // invoices, deletion_requests, timeline
  const [activitySearch, setActivitySearch] = useState('');
  const [activityStatusFilter, setActivityStatusFilter] = useState('ALL');

  // Add Accountant Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'ACCOUNTANT'
  });
  const [isSubmittingNewStaff, setIsSubmittingNewStaff] = useState(false);

  // Notification / Alert Messages
  const [actionMsg, setActionMsg] = useState(null);
  const [actionError, setActionError] = useState(null);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setActionError(msg);
      setActionMsg(null);
    } else {
      setActionMsg(msg);
      setActionError(null);
    }
    setTimeout(() => {
      setActionMsg(null);
      setActionError(null);
    }, 4000);
  };

  const loadData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [staffRes, invRes, delReqRes, resetReqRes] = await Promise.allSettled([
        merchantApi.getStaff(),
        invoiceApi.getAll(),
        invoiceApi.getDeletionRequests(),
        merchantApi.getAllPasswordResets()
      ]);

      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        setStaffList(staffRes.value);
      }
      if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
        setInvoices(invRes.value);
      }
      if (delReqRes.status === 'fulfilled' && Array.isArray(delReqRes.value)) {
        setDeletionRequests(delReqRes.value);
      }
      if (resetReqRes.status === 'fulfilled' && Array.isArray(resetReqRes.value)) {
        setPasswordResets(resetReqRes.value);
      }
    } catch (err) {
      showNotification(err.message || 'Failed to load accountant data', true);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Only consider accountants
  const accountants = useMemo(() => {
    return staffList.filter(u => u.role === 'ACCOUNTANT');
  }, [staffList]);

  // Aggregate stats across accountants
  const stats = useMemo(() => {
    const total = accountants.length;
    const verified = accountants.filter(a => a.accountantVerified).length;
    const pending = accountants.filter(a => !a.accountantVerified).length;
    const disabled = accountants.filter(a => !a.enabled).length;

    // Invoices created by accountants
    const accountantUsernames = new Set(accountants.map(a => a.username.toLowerCase()));
    const accountantInvoices = invoices.filter(inv => 
      inv.createdBy && accountantUsernames.has(inv.createdBy.toLowerCase())
    );

    const totalInvoiceCount = accountantInvoices.length;
    const totalInvoiceAmount = accountantInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const totalItcAmount = accountantInvoices.reduce((sum, inv) => sum + (Number(inv.itcAmount) || 0), 0);

    return {
      total,
      verified,
      pending,
      disabled,
      totalInvoiceCount,
      totalInvoiceAmount,
      totalItcAmount
    };
  }, [accountants, invoices]);

  // Filtered accountant list
  const filteredAccountants = useMemo(() => {
    return accountants.filter(acc => {
      const matchSearch =
        acc.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.phone?.includes(searchQuery);

      if (!matchSearch) return false;

      if (filterStatus === 'VERIFIED') return acc.accountantVerified;
      if (filterStatus === 'PENDING_VERIFICATION') return !acc.accountantVerified;
      if (filterStatus === 'ACTIVE') return acc.enabled;
      if (filterStatus === 'DISABLED') return !acc.enabled;

      return true;
    });
  }, [accountants, searchQuery, filterStatus]);

  // Accountant Activity Calculations for a specific user
  const getAccountantActivities = (staffUser) => {
    if (!staffUser) return { invoices: [], deletionRequests: [], totalAmount: 0, totalItc: 0 };
    const userInvs = invoices.filter(
      inv => inv.createdBy && inv.createdBy.toLowerCase() === staffUser.username.toLowerCase()
    );
    const userDelReqs = deletionRequests.filter(
      req => req.requestedBy && req.requestedBy.toLowerCase() === staffUser.username.toLowerCase()
    );
    const totalAmount = userInvs.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
    const totalItc = userInvs.reduce((sum, inv) => sum + (Number(inv.itcAmount) || 0), 0);

    return {
      invoices: userInvs,
      deletionRequests: userDelReqs,
      totalAmount,
      totalItc
    };
  };

  // Actions
  const handleVerifyStaff = async (staffId, currentVerified) => {
    try {
      await merchantApi.verifyStaff(staffId, !currentVerified);
      showNotification(`Accountant ${!currentVerified ? 'verified successfully by Admin.' : 'verification revoked.'}`);
      await loadData(true);
      if (selectedStaff && selectedStaff.id === staffId) {
        setSelectedStaff(prev => ({ ...prev, accountantVerified: !currentVerified }));
      }
    } catch (err) {
      showNotification(err.message || 'Failed to update verification status', true);
    }
  };

  const handleToggleStaffStatus = async (staffId, currentStatus) => {
    try {
      await merchantApi.toggleStaffStatus(staffId, !currentStatus);
      showNotification(`Accountant account ${!currentStatus ? 'enabled' : 'disabled'}.`);
      await loadData(true);
      if (selectedStaff && selectedStaff.id === staffId) {
        setSelectedStaff(prev => ({ ...prev, enabled: !currentStatus }));
      }
    } catch (err) {
      showNotification(err.message || 'Failed to toggle account status', true);
    }
  };

  const handleCreateAccountant = async (e) => {
    e.preventDefault();
    setIsSubmittingNewStaff(true);
    try {
      await merchantApi.createStaff(newStaffForm);
      showNotification(`Accountant account @${newStaffForm.username} created successfully!`);
      setNewStaffForm({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'ACCOUNTANT'
      });
      setIsAddModalOpen(false);
      await loadData(true);
    } catch (err) {
      showNotification(err.message || 'Failed to create accountant account', true);
    } finally {
      setIsSubmittingNewStaff(false);
    }
  };

  const handleApproveDeletion = async (requestId) => {
    try {
      await invoiceApi.approveDeletionRequest(requestId, 'Approved by Merchant Admin');
      showNotification('Deletion request approved and invoice permanently deleted.');
      await loadData(true);
    } catch (err) {
      showNotification(err.message || 'Failed to approve deletion request', true);
    }
  };

  const handleApprovePasswordReset = async (requestId) => {
    setApprovingResetId(requestId);
    try {
      await merchantApi.approvePasswordReset(requestId, 'Approved by Merchant Admin');
      showNotification('✓ Password reset request APPROVED. The accountant\'s password has been updated!');
      await loadData(true);
    } catch (err) {
      showNotification(err.message || 'Failed to approve password reset request', true);
    } finally {
      setApprovingResetId(null);
    }
  };

  const handleRejectPasswordReset = async (requestId) => {
    setRejectingResetId(requestId);
    try {
      await merchantApi.rejectPasswordReset(requestId, 'Rejected by Merchant Admin');
      showNotification('Password reset request REJECTED.');
      await loadData(true);
    } catch (err) {
      showNotification(err.message || 'Failed to reject password reset request', true);
    } finally {
      setRejectingResetId(null);
    }
  };

  const pendingPasswordResets = useMemo(() => {
    return passwordResets.filter(r => r.status === 'PENDING');
  }, [passwordResets]);

  const filteredPasswordResets = useMemo(() => {
    return passwordResets.filter(r => {
      if (resetFilterStatus === 'ALL') return true;
      return r.status === resetFilterStatus;
    });
  }, [passwordResets, resetFilterStatus]);

  const activeStaffActivities = selectedStaff ? getAccountantActivities(selectedStaff) : null;

  const filteredSelectedInvoices = useMemo(() => {
    if (!activeStaffActivities) return [];
    return activeStaffActivities.invoices.filter(inv => {
      const matchSearch =
        inv.invoiceNumber?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        inv.vendorName?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        inv.category?.toLowerCase().includes(activitySearch.toLowerCase()) ||
        inv.gstin?.toLowerCase().includes(activitySearch.toLowerCase());

      if (!matchSearch) return false;
      if (activityStatusFilter !== 'ALL' && inv.status !== activityStatusFilter) return false;
      return true;
    });
  }, [activeStaffActivities, activitySearch, activityStatusFilter]);

  return (
    <div className="space-y-6">

      {/* Top Banner Header */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Users className="w-4 h-4 text-rose-600" />
              Merchant Admin Portal
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Accountants & Staff Activities
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Manage your verified enterprise accountants, review their invoice processing history, approve deletion requests, and track operational tax compliance in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-rose-600 hover:border-rose-300 text-xs font-bold transition shadow-2xs disabled:opacity-50"
              title="Refresh staff & activities data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-rose-600' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition hover:scale-[1.02]"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Accountant</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {actionMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionMsg}</span>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
        )}

        {/* View Switcher Tabs (Accountants vs Password Resets) */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveViewTab('accountants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs ${
              activeViewTab === 'accountants'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Accountants Directory ({accountants.length})</span>
          </button>

          <button
            onClick={() => setActiveViewTab('password_resets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs relative ${
              activeViewTab === 'password_resets'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Password Reset Requests</span>
            {pendingPasswordResets.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeViewTab === 'password_resets'
                  ? 'bg-white text-rose-700'
                  : 'bg-amber-500 text-white animate-pulse'
              }`}>
                {pendingPasswordResets.length} Pending
              </span>
            )}
          </button>
        </div>

        {/* Pending Password Resets Quick Banner Alert */}
        {pendingPasswordResets.length > 0 && activeViewTab !== 'password_resets' && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">{pendingPasswordResets.length} Accountant Password Reset {pendingPasswordResets.length > 1 ? 'Requests' : 'Request'} Pending Approval.</span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Accountants cannot log in with their requested new password until you approve their request.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveViewTab('password_resets')}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 shadow-2xs"
            >
              Review Reset Requests
            </button>
          </div>
        )}

        {/* Pending Verification Banner Alert */}
        {stats.pending > 0 && activeViewTab === 'accountants' && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">{stats.pending} Accountant {stats.pending > 1 ? 'Accounts' : 'Account'} Pending Admin Verification.</span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Accountants cannot access invoices or manage GST filings until you verify them.
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterStatus('PENDING_VERIFICATION')}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 shadow-2xs"
            >
              View Pending Accounts
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: ACCOUNTANTS DIRECTORY (KPIs + LIST)              */}
      {/* ======================================================== */}
      {activeViewTab === 'accountants' && (
        <>
          {/* KPI Cards Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Accountants */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Accountants
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{stats.total}</span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {stats.verified} Verified
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {stats.pending} awaiting verification
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Verified Active Operators */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Verified Operators
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-700">{stats.verified}</span>
                  <span className="text-xs font-semibold text-slate-500">of {stats.total}</span>
                </div>
                <span className="text-[10px] text-emerald-600 mt-0.5 font-medium block">
                  {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% compliance rate
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Invoices Processed by Accountants */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Invoices Processed
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{stats.totalInvoiceCount}</span>
                  <span className="text-xs font-semibold text-slate-500">Bills</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Created / Scanned by staff
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Total Volume Handled */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Volume Handled
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-rose-600 font-mono">
                    ₹{stats.totalInvoiceAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 font-medium block">
                  ITC: ₹{stats.totalItcAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Search & Filter Controls */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search accountant name, username, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 focus:bg-white outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 hidden md:inline">
                Filter:
              </span>

              {[
                { key: 'ALL', label: `All (${accountants.length})` },
                { key: 'VERIFIED', label: `Verified (${stats.verified})` },
                { key: 'PENDING_VERIFICATION', label: `Pending (${stats.pending})` },
                { key: 'DISABLED', label: `Disabled (${stats.disabled})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    filterStatus === tab.key
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accountants Directory List / Cards */}
          {isLoading ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-rose-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading accountants and live activities…</p>
            </div>
          ) : filteredAccountants.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <Users className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No Accountants Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || filterStatus !== 'ALL'
                  ? 'No accountant accounts match the current filter or search criteria.'
                  : 'You have not added any accountants yet. Click "+ Add New Accountant" to invite accountants to your merchant organization.'}
              </p>
              {(searchQuery || filterStatus !== 'ALL') ? (
                <button
                  onClick={() => { setSearchQuery(''); setFilterStatus('ALL'); }}
                  className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
                >
                  + Add First Accountant
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAccountants.map((accountant) => {
                const activities = getAccountantActivities(accountant);

                return (
                  <div
                    key={accountant.id}
                    className="glass-panel rounded-3xl p-5 border border-slate-200 hover:border-slate-300 transition duration-200 flex flex-col justify-between space-y-4 shadow-2xs group"
                  >
                    {/* Header Profile Info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        {accountant.profilePhotoUrl ? (
                          <img
                            src={accountant.profilePhotoUrl}
                            alt={accountant.fullName || accountant.username}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white font-bold text-base flex items-center justify-center shadow-2xs">
                            {(accountant.fullName || accountant.username).charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-rose-600 transition">
                              {accountant.fullName || accountant.username}
                            </h3>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                              ACCOUNTANT
                            </span>
                          </div>
                          <span className="text-xs font-mono text-slate-400 block mt-0.5">
                            @{accountant.username}
                          </span>
                        </div>
                      </div>

                      {/* Verification Status Pill */}
                      <div>
                        {accountant.accountantVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Pending Verification
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact & Status details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={accountant.email}>{accountant.email || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{accountant.phone || '—'}</span>
                      </div>
                    </div>

                    {/* Activity Highlights Strip */}
                    <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-rose-50/40 border border-rose-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoices</span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          {activities.invoices.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Value</span>
                        <span className="text-sm font-extrabold text-rose-600 font-mono">
                          ₹{activities.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Del. Requests</span>
                        <span className="text-sm font-extrabold text-slate-700 font-mono">
                          {activities.deletionRequests.length}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      
                      {/* Left: View Activities Button */}
                      <button
                        onClick={() => {
                          setSelectedStaff(accountant);
                          setActivityTab('invoices');
                          setActivitySearch('');
                          setActivityStatusFilter('ALL');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Activities ({activities.invoices.length})</span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>

                      {/* Right: Management Controls */}
                      <div className="flex items-center gap-1.5">
                        {/* Verify / Revoke Button */}
                        <button
                          onClick={() => handleVerifyStaff(accountant.id, accountant.accountantVerified)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            accountant.accountantVerified
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                          }`}
                          title={accountant.accountantVerified ? 'Revoke verification' : 'Verify accountant for shop access'}
                        >
                          {accountant.accountantVerified ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Verify Accountant</span>
                            </>
                          )}
                        </button>

                        {/* Enable / Disable Button */}
                        <button
                          onClick={() => handleToggleStaffStatus(accountant.id, accountant.enabled)}
                          className={`p-1.5 rounded-xl text-xs font-bold transition border ${
                            accountant.enabled
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                          }`}
                          title={accountant.enabled ? 'Disable Account' : 'Enable Account'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: PASSWORD RESET REQUESTS MANAGEMENT               */}
      {/* ======================================================== */}
      {activeViewTab === 'password_resets' && (
        <div className="space-y-4">
          
          {/* Header Strip & Filters */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-rose-600" />
                <span>Accountant Password Change Requests</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Review and approve password resets submitted by accountants and staff users.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { key: 'ALL', label: `All (${passwordResets.length})` },
                { key: 'PENDING', label: `Pending (${pendingPasswordResets.length})` },
                { key: 'APPROVED', label: `Approved (${passwordResets.filter(r => r.status === 'APPROVED').length})` },
                { key: 'REJECTED', label: `Rejected (${passwordResets.filter(r => r.status === 'REJECTED').length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setResetFilterStatus(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    resetFilterStatus === tab.key
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Requests List */}
          {isLoading ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <RefreshCw className="w-8 h-8 mx-auto text-rose-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading password reset requests…</p>
            </div>
          ) : filteredPasswordResets.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <KeyRound className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-sm font-bold text-slate-800">No Password Reset Requests Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {resetFilterStatus !== 'ALL'
                  ? `There are currently no password reset requests in ${resetFilterStatus} status.`
                  : 'No accountants have submitted password reset requests yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPasswordResets.map((req) => (
                <div
                  key={req.id}
                  className={`glass-panel p-5 rounded-2xl border transition-all ${
                    req.status === 'PENDING'
                      ? 'border-amber-300 bg-amber-50/30 shadow-sm'
                      : req.status === 'APPROVED'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${
                        req.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        <KeyRound className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-extrabold text-slate-900">
                            {req.fullName || req.username}
                          </h3>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">
                            @{req.username}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{req.email}</span>
                          {req.phone && <span>• {req.phone}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      req.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1'
                        : req.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1'
                        : 'bg-rose-100 text-rose-800 border-rose-200 flex items-center gap-1'
                    }`}>
                      {req.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                      {req.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {req.status === 'REJECTED' && <X className="w-3 h-3 text-rose-600" />}
                      {req.status}
                    </span>
                  </div>

                  {/* Reason / Note Block */}
                  {req.reason && (
                    <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                        Requester's Note:
                      </span>
                      <p className="italic">{req.reason}</p>
                    </div>
                  )}

                  {/* Submission metadata */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Submitted: {req.createdAt ? new Date(req.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                    </span>
                    {req.reviewedAt && (
                      <span className="font-semibold text-slate-600">
                        Reviewed: {new Date(req.reviewedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons for PENDING */}
                  {req.status === 'PENDING' && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={rejectingResetId === req.id || approvingResetId === req.id}
                        onClick={() => handleRejectPasswordReset(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs transition"
                      >
                        {rejectingResetId === req.id ? 'Rejecting…' : 'Reject'}
                      </button>

                      <button
                        type="button"
                        disabled={approvingResetId === req.id || rejectingResetId === req.id}
                        onClick={() => handleApprovePasswordReset(req.id)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
                      >
                        {approvingResetId === req.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Approve Password Change</span>
                      </button>
                    </div>
                  )}

                  {req.status === 'APPROVED' && (
                    <div className="mt-3 pt-2 border-t border-emerald-200/60 text-xs text-emerald-800 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved by Admin. User can now log in with their new password.</span>
                    </div>
                  )}

                  {req.status === 'REJECTED' && (
                    <div className="mt-3 pt-2 border-t border-rose-200/60 text-xs text-rose-800 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Rejected by Admin. {req.adminNote}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ACCOUNTANT DETAILED ACTIVITY DRAWER / MODAL       */}
      {/* ======================================================== */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                {selectedStaff.profilePhotoUrl ? (
                  <img
                    src={selectedStaff.profilePhotoUrl}
                    alt={selectedStaff.fullName || selectedStaff.username}
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                    {(selectedStaff.fullName || selectedStaff.username).charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">
                      {selectedStaff.fullName || selectedStaff.username}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-rose-300 text-[10px] font-mono font-bold">
                      @{selectedStaff.username}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-3">
                    <span>Email: {selectedStaff.email}</span>
                    {selectedStaff.phone && <span>• Tel: {selectedStaff.phone}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Top Stats Strip */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoices Created</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {activeStaffActivities?.invoices.length || 0}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Invoiced</span>
                <span className="text-base font-black text-rose-600 font-mono">
                  ₹{(activeStaffActivities?.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Eligible ITC</span>
                <span className="text-base font-black text-emerald-600 font-mono">
                  ₹{(activeStaffActivities?.totalItc || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Deletion Requests</span>
                <span className="text-base font-black text-slate-700 font-mono">
                  {activeStaffActivities?.deletionRequests.length || 0}
                </span>
              </div>
            </div>

            {/* Activity Tabs */}
            <div className="px-6 pt-3 bg-white border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivityTab('invoices')}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition ${
                    activityTab === 'invoices'
                      ? 'border-rose-600 text-rose-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Invoices Processed ({activeStaffActivities?.invoices.length || 0})
                </button>

                <button
                  onClick={() => setActivityTab('deletion_requests')}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition ${
                    activityTab === 'deletion_requests'
                      ? 'border-rose-600 text-rose-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Deletion Requests ({activeStaffActivities?.deletionRequests.length || 0})
                </button>

                <button
                  onClick={() => setActivityTab('timeline')}
                  className={`flex items-center gap-1.5 px-4 py-2 border-b-2 text-xs font-bold transition ${
                    activityTab === 'timeline'
                      ? 'border-rose-600 text-rose-600 font-extrabold'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Activity Timeline
                </button>
              </div>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* TAB 1: INVOICES PROCESSED */}
              {activityTab === 'invoices' && (
                <div className="space-y-4">
                  {/* Search inside accountant's invoices */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search invoice number, vendor, category, GSTIN..."
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 outline-none"
                      />
                    </div>

                    <select
                      value={activityStatusFilter}
                      onChange={(e) => setActivityStatusFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 outline-none"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Flagged">Flagged</option>
                    </select>
                  </div>

                  {filteredSelectedInvoices.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-1">
                      <FileText className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-700">No Invoices Found for this Accountant</p>
                      <p className="text-[11px]">When @{selectedStaff.username} scans or uploads invoices, they will automatically appear here with full audit trail.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            <th className="py-2.5">Invoice #</th>
                            <th className="py-2.5">Vendor</th>
                            <th className="py-2.5">Date</th>
                            <th className="py-2.5">Category</th>
                            <th className="py-2.5">Amount</th>
                            <th className="py-2.5">ITC Claim</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSelectedInvoices.map((inv) => (
                            <tr key={inv.id} className="hover:bg-slate-50 group">
                              <td className="py-3 font-mono font-bold text-slate-900">
                                {inv.invoiceNumber || inv.id}
                              </td>
                              <td className="py-3">
                                <div className="font-bold text-slate-800">{inv.vendorName || '—'}</div>
                                <div className="text-[10px] font-mono text-slate-400">{inv.gstin || 'No GSTIN'}</div>
                              </td>
                              <td className="py-3 text-slate-500 font-mono text-[11px]">
                                {inv.invoiceDate || '—'}
                              </td>
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {inv.category || 'General'}
                                </span>
                              </td>
                              <td className="py-3 font-mono font-bold text-rose-600">
                                ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 font-mono text-emerald-700 font-semibold text-[11px]">
                                ₹{Number(inv.itcAmount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  inv.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  inv.status === 'Flagged' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {inv.status || 'Pending'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => {
                                    if (onSelectInvoice) onSelectInvoice(inv);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DELETION REQUESTS */}
              {activityTab === 'deletion_requests' && (
                <div className="space-y-4">
                  {(!activeStaffActivities?.deletionRequests || activeStaffActivities.deletionRequests.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-1">
                      <Trash2 className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-700">No Deletion Requests</p>
                      <p className="text-[11px]">This accountant has not requested deletion for any invoices.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeStaffActivities.deletionRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                Invoice #{req.invoiceNumber || req.invoiceId}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {req.status}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600">
                              <strong>Reason:</strong> {req.reason}
                            </p>

                            <p className="text-[10px] text-slate-400 font-mono">
                              Requested: {req.requestedAt ? new Date(req.requestedAt).toLocaleString() : 'Recent'}
                            </p>
                          </div>

                          {req.status === 'PENDING' && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleApproveDeletion(req.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve Delete
                              </button>
                              <button
                                onClick={() => handleRejectDeletion(req.id)}
                                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ACTIVITY TIMELINE */}
              {activityTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                    
                    {/* Event 1: Verification */}
                    <div className="relative">
                      <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                        selectedStaff.accountantVerified ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          {selectedStaff.accountantVerified ? 'Account Verified by Merchant Admin' : 'Awaiting Merchant Admin Verification'}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {selectedStaff.accountantVerified
                            ? `Authorized for enterprise invoice processing by @${currentAdminUsername || 'admin'}.`
                            : 'Verification pending before accountant can access GST invoices.'}
                        </p>
                      </div>
                    </div>

                    {/* Event 2: Invoices processed timeline */}
                    {activeStaffActivities?.invoices.map((inv) => (
                      <div key={inv.id} className="relative">
                        <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-rose-500 border-2 border-white" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              Uploaded Invoice #{inv.invoiceNumber || inv.id} ({inv.vendorName})
                            </span>
                            <span className="font-mono text-xs font-bold text-rose-600">
                              ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Status: <span className="font-semibold text-slate-700">{inv.status}</span> • Category: {inv.category} • Date: {inv.invoiceDate || 'Recent'}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Event 3: Deletion Requests timeline */}
                    {activeStaffActivities?.deletionRequests.map((req) => (
                      <div key={req.id} className="relative">
                        <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-700 border-2 border-white" />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">
                            Requested Deletion of Invoice #{req.invoiceNumber || req.invoiceId}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Reason: "{req.reason}" • Status: {req.status}
                          </p>
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">
                Accountant ID: {selectedStaff.id}
              </span>
              <button
                onClick={() => setSelectedStaff(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD NEW ACCOUNTANT MODAL                         */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 bg-gradient-to-r from-rose-600 to-red-600 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold">Add New Accountant</h2>
                <p className="text-xs text-rose-100 mt-0.5">Invite an accountant to manage your business invoices.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountant} className="p-6 space-y-4">
              
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newStaffForm.fullName}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="priya_acc"
                    value={newStaffForm.username}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono focus:border-rose-500 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 9820011223"
                    value={newStaffForm.phone}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="accountant@company.com"
                  value={newStaffForm.email}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={newStaffForm.password}
                  onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-rose-500 focus:bg-white outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Role: <strong>Accountant</strong>. Accountants can scan OCR invoices, classify expenses, and request deletion approvals.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewStaff}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition disabled:opacity-60"
                >
                  {isSubmittingNewStaff ? 'Creating…' : 'Create Accountant'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
