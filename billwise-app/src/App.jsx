import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import DashboardOverview from './components/DashboardOverview';
import InvoiceListTable from './components/InvoiceListTable';
import GstCategorizer from './components/GstCategorizer';
import TaxDeadlineTracker from './components/TaxDeadlineTracker';
import AiFinancialSummary from './components/AiFinancialSummary';
import AiCopilotDrawer from './components/AiCopilotDrawer';
import OcrUploadScanner from './components/OcrUploadScanner';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import SuperAdminVerificationQueue from './components/SuperAdminVerificationQueue';
import VerificationPendingScreen from './components/VerificationPendingScreen';
import AccountantPendingApprovalScreen from './components/AccountantPendingApprovalScreen';
import ProfilePage from './components/ProfilePage';
import SettingsPage from './components/SettingsPage';
import AccountantManagement from './components/AccountantManagement';
import { useAuth } from './context/AuthContext';
import { invoiceApi, merchantApi } from './api';

export default function App() {
  const {
    isAuthenticated,
    isSuperAdmin,
    merchantStatus,
    role,
    accountantVerified,
    username,
    fullName,
    merchantTradeName,
    login,
    logout,
  } = useAuth();

  // Landing Page vs Login vs Signup for unauthenticated visitors
  const [unauthView, setUnauthView] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#login') return 'login';
      if (hash === '#signup' || hash === '#register') return 'signup';
    }
    return 'landing';
  });

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'verification' : 'overview');
  const [invoices, setInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Quick 1-click Demo Login handler from Landing Page
  const handleQuickDemoLogin = async (accountType) => {
    let creds = { username: 'admin', password: 'Admin@123' };
    if (accountType === 'superadmin') {
      creds = { username: 'superadmin', password: 'SuperAdmin@123' };
    } else if (accountType === 'accountant') {
      creds = { username: 'accountant', password: 'Accountant@123' };
    }
    try {
      await login(creds.username, creds.password);
    } catch (err) {
      console.warn("Demo login failed, routing to login page:", err);
      setUnauthView('login');
    }
  };

  // Synchronize SuperAdmin landing tab
  useEffect(() => {
    if (isSuperAdmin && (activeTab === 'overview' || activeTab === 'dashboard' || activeTab === 'verification-queue')) {
      setActiveTab('verification');
    }
  }, [isSuperAdmin]);

  const canManageInvoices = role === 'ADMIN' || role === 'ACCOUNTANT' || isSuperAdmin;

  // Function to load/refresh invoices
  const fetchInvoices = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!isSuperAdmin && merchantStatus && merchantStatus !== 'VERIFIED') return;

    setIsLoadingInvoices(true);
    try {
      const data = await invoiceApi.getAll();
      setInvoices(Array.isArray(data) ? data : []);
      setLoadError(null);
    } catch (err) {
      console.warn("Couldn't fetch invoices from backend:", err);
      setLoadError(err.message);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [isAuthenticated, isSuperAdmin, merchantStatus]);

  // Initial load
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Fetch pending merchants count for SuperAdmin badge
  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      merchantApi.getPending()
        .then(list => setPendingCount(Array.isArray(list) ? list.length : 0))
        .catch(err => console.warn("Failed to fetch pending queue:", err));
    }
  }, [isAuthenticated, isSuperAdmin, activeTab]);

  // Keyboard shortcut Ctrl+K / Cmd+K for AI Copilot
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCopilotOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInvoiceScanned = (scannedInvoice) => {
    // If invoice with this id or number already existed, refresh list to show updated single bill
    fetchInvoices();
    setIsScanModalOpen(false);
  };

  if (!isAuthenticated) {
    if (unauthView === 'landing') {
      return (
        <LandingPage
          onNavigateToLogin={(viewMode = 'login') => setUnauthView(viewMode === 'merchant_signup' ? 'signup' : 'login')}
          onNavigateToSignup={() => setUnauthView('signup')}
          onQuickDemoLogin={handleQuickDemoLogin}
        />
      );
    }
    return (
      <Login
        onBackToLanding={() => setUnauthView('landing')}
        initialView={unauthView === 'signup' ? 'merchant_signup' : 'login'}
      />
    );
  }

  // Gatekeeper 1: Non-SuperAdmin merchants with non-verified status stay in Pending Screen
  if (!isSuperAdmin && merchantStatus && merchantStatus !== 'VERIFIED') {
    return <VerificationPendingScreen />;
  }

  // Gatekeeper 2: Accountants pending Admin approval cannot open shop details
  if (role === 'ACCOUNTANT' && accountantVerified === false) {
    return <AccountantPendingApprovalScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row selection:bg-rose-500 selection:text-white">
      
      {/* Left Sidebar Navigation */}
      <Navbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenScanModal={() => setIsScanModalOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        totalInvoicesCount={invoices.length}
        username={username}
        fullName={fullName}
        role={role}
        isSuperAdmin={isSuperAdmin}
        merchantTradeName={merchantTradeName}
        merchantStatus={merchantStatus}
        onLogout={logout}
        canManageInvoices={canManageInvoices}
        pendingVerificationCount={pendingCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {loadError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-4 py-3">
            Couldn't reach the BillWise backend ({loadError}). Make sure the Spring Boot
            app is running on port 8081.
          </div>
        )}

        {/* SuperAdmin Verification Queue Tab */}
        {activeTab === 'verification' && isSuperAdmin && (
          <SuperAdminVerificationQueue />
        )}

        {/* User Profile Tab */}
        {activeTab === 'profile' && (
          <ProfilePage />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsPage onSelectInvoice={(inv) => setSelectedInvoice(inv)} />
        )}

        {/* Accountants & Staff Activities Tab (Admin Only) */}
        {activeTab === 'accountants' && role === 'ADMIN' && (
          <AccountantManagement onSelectInvoice={(inv) => setSelectedInvoice(inv)} />
        )}

        {/* Overview Tab (Tenant Only) */}
        {!isSuperAdmin && activeTab === 'overview' && (
          <DashboardOverview 
            invoices={invoices}
            onOpenScanModal={() => setIsScanModalOpen(true)}
            setActiveTab={setActiveTab}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          />
        )}

        {/* Invoices Ledger Tab (Tenant Only) */}
        {!isSuperAdmin && activeTab === 'invoices' && (
          <InvoiceListTable 
            invoices={invoices}
            onOpenScanModal={() => setIsScanModalOpen(true)}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            canManageInvoices={canManageInvoices}
            onRefreshInvoices={fetchInvoices}
          />
        )}

        {/* GST & ITC Tab (Tenant Only) */}
        {!isSuperAdmin && activeTab === 'gst' && (
          <GstCategorizer 
            invoices={invoices}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          />
        )}

        {/* Deadlines Tab (Tenant Only) */}
        {!isSuperAdmin && activeTab === 'deadlines' && (
          <TaxDeadlineTracker />
        )}

        {/* AI Financial Insights Tab (Tenant Only) */}
        {!isSuperAdmin && activeTab === 'insights' && (
          <AiFinancialSummary 
            invoices={invoices}
            onOpenCopilot={() => setIsCopilotOpen(true)}
          />
        )}

      </main>
      </div>

      {/* OCR Scanner Upload Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <OcrUploadScanner 
              onInvoiceScanned={handleInvoiceScanned}
              onClose={() => setIsScanModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal 
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* AI Assistant Copilot Drawer */}
      <AiCopilotDrawer 
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />

    </div>
  );
}
