import React, { useState } from 'react';
import {
  ScanLine,
  FileText,
  PieChart,
  CalendarClock,
  Bot,
  ShieldCheck,
  Plus,
  Sparkles,
  UserCircle2,
  LogOut,
  Settings,
  Users,
  Menu,
  X,
  ChevronRight,
  Shield,
  Building2
} from 'lucide-react';

const ROLE_STYLES = {
  SUPER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
  ACCOUNTANT: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenScanModal,
  onOpenCopilot,
  totalInvoicesCount,
  username,
  fullName,
  profilePhotoUrl,
  role,
  isSuperAdmin,
  merchantTradeName,
  merchantStatus,
  onLogout,
  canManageInvoices,
  pendingVerificationCount = 0
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top section: Brand, Quick Actions, & Navigation */}
      <div className="space-y-5">
        
        {/* Brand Logo & Merchant Info */}
        <div 
          onClick={() => handleTabClick(isSuperAdmin ? 'verification' : 'overview')}
          className="flex items-center gap-3 cursor-pointer select-none p-2 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200/60"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-rose-400 p-0.5 shadow-md shadow-rose-500/20 shrink-0">
            <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-rose-600 animate-pulse" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Bill<span className="text-rose-600">Wise</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                {isSuperAdmin ? 'SuperAdmin' : 'GST'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {isSuperAdmin
                ? 'Platform Compliance'
                : (merchantTradeName || 'MSME GST Platform')}
            </p>
          </div>
        </div>

        {/* Quick Actions (Scan OCR & AI Copilot) */}
        <div className="space-y-2">
          {canManageInvoices && !isSuperAdmin && (
            <button
              onClick={() => {
                onOpenScanModal();
                setIsMobileOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-red-800 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <ScanLine className="w-4 h-4 shrink-0" />
              <span>Scan OCR Bill</span>
              <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.2 rounded-md font-mono">+New</span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenCopilot();
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform shrink-0" />
            <span>AI Tax Copilot</span>
            <kbd className="ml-auto text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Main Navigation Links */}
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 pb-1">
            Menu
          </div>

          {/* SuperAdmin Queue */}
          {isSuperAdmin ? (
            /* SUPER ADMIN MENU */
            <>
              <button
                onClick={() => handleTabClick('verification')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'verification'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'verification' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>KYC Queue</span>
                </div>
                {pendingVerificationCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500 text-white animate-pulse">
                    {pendingVerificationCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleTabClick('overview')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'overview'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <PieChart className={`w-4 h-4 shrink-0 ${activeTab === 'overview' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>All Merchants Ledger</span>
              </button>
            </>
          ) : (
            /* MERCHANT ADMIN & ACCOUNTANT MENU */
            <>
              <button
                onClick={() => handleTabClick('overview')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'overview'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <PieChart className={`w-4 h-4 shrink-0 ${activeTab === 'overview' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => handleTabClick('invoices')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'invoices'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'invoices' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>Invoices & OCR</span>
                </div>
                {totalInvoicesCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {totalInvoicesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleTabClick('gst')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'gst'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'gst' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>GST & ITC</span>
              </button>

              <button
                onClick={() => handleTabClick('deadlines')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'deadlines'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <CalendarClock className={`w-4 h-4 shrink-0 ${activeTab === 'deadlines' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Tax Calendar</span>
              </button>

              <button
                onClick={() => handleTabClick('insights')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                  activeTab === 'insights'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                }`}
              >
                <Sparkles className={`w-4 h-4 shrink-0 ${activeTab === 'insights' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>AI Summary</span>
              </button>

              {role === 'ADMIN' && (
                <button
                  onClick={() => handleTabClick('accountants')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                    activeTab === 'accountants'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
                  }`}
                >
                  <Users className={`w-4 h-4 shrink-0 ${activeTab === 'accountants' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>Accountants</span>
                </button>
              )}
            </>
          )}

          {/* Settings Tab */}
          <button
            onClick={() => handleTabClick('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
              activeTab === 'settings'
                ? 'bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold'
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'settings' ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Bottom section: User Profile Card & Logout */}
      <div className="pt-4 border-t border-slate-200/80 space-y-2">
        <div 
          onClick={() => handleTabClick('profile')}
          className="flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-100/80 border border-transparent hover:border-slate-200 cursor-pointer transition"
          title="View & Edit Profile"
        >
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={fullName || username}
              className="w-9 h-9 rounded-xl object-cover border border-rose-300 shadow-2xs shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
              {(fullName || username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="leading-tight text-left min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">
              {fullName || username}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full border ${ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {role}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50/60 border border-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => handleTabClick(isSuperAdmin ? 'verification' : 'overview')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-red-500 p-0.5">
            <div className="w-full h-full bg-white rounded-[7px] flex items-center justify-center">
              <ScanLine className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <span className="font-extrabold text-lg text-slate-900">
            Bill<span className="text-rose-600">Wise</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {canManageInvoices && !isSuperAdmin && (
            <button
              onClick={onOpenScanModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Scan</span>
            </button>
          )}

          <button
            onClick={() => setIsMobileOpen((prev) => !prev)}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-over Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-5 shadow-2xl transform transition-transform duration-200 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {navContent}
      </aside>

      {/* Desktop Permanent Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 h-screen sticky top-0 bg-white border-r border-slate-200/80 p-5 shrink-0 z-30 shadow-xs">
        {navContent}
      </aside>
    </>
  );
}
