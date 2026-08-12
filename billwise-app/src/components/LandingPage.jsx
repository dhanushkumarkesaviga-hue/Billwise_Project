import React, { useState, useEffect } from 'react';
import {
  ScanLine,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  FileText,
  Calculator,
  TrendingUp,
  Zap,
  Receipt,
  Bot,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
  BarChart3,
  Play,
  Cpu,
  Shield,
  Layers,
  Scale,
  FileSpreadsheet,
  Sliders,
  HelpCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Clock,
  Briefcase
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Sample Invoices for the Interactive OCR Simulator
const DEMO_INVOICES = [
  {
    id: 'it-hardware',
    category: 'Capital Goods (IT Hardware)',
    vendor: 'Dell Technologies India Pvt Ltd',
    gstin: '29AAACD3456F1Z8',
    invoiceNumber: 'INV-2026-DL8921',
    date: '10-Aug-2026',
    taxableAmount: 245000,
    cgst: 22050,
    sgst: 22050,
    igst: 0,
    totalAmount: 289100,
    hsnCode: '84713010',
    hsnDesc: 'Servers & Laptops for Commercial Operations',
    itcStatus: 'Eligible ITC (100%)',
    itcSection: 'Section 16(1) CGST Act',
    itcExplanation: 'Capital goods utilized directly for business infrastructure. 100% tax credit claimable under GSTR-3B Table 4(A)(5).',
    confidence: 99.4,
    tags: ['Verified GSTIN', 'HSN 8-digit', 'Direct Business Asset']
  },
  {
    id: 'hospitality',
    category: 'Corporate Hospitality & Catering',
    vendor: 'Royal Orchid Luxury Suites & Banquet',
    gstin: '33AABCR9876Q1Z2',
    invoiceNumber: 'RO-BANQ-55410',
    date: '08-Aug-2026',
    taxableAmount: 42000,
    cgst: 1050,
    sgst: 1050,
    igst: 0,
    totalAmount: 44100,
    hsnCode: '996331',
    hsnDesc: 'Food & Beverage Catering Services',
    itcStatus: 'Blocked / Ineligible ITC (0%)',
    itcSection: 'Section 17(5)(b)(i) CGST Act',
    itcExplanation: 'Food, beverages & outdoor catering are statutorily blocked from ITC claims unless supplied as an inward taxable sub-contract.',
    confidence: 98.7,
    tags: ['Blocked Sec 17(5)', 'Audit Flag', 'Saved Penalty']
  },
  {
    id: 'freight',
    category: 'Inter-State Logistics & Freight',
    vendor: 'Apex Express Logistics LLP',
    gstin: '27AABCA7744K1ZK',
    invoiceNumber: 'EXP-MUM-9932',
    date: '11-Aug-2026',
    taxableAmount: 85000,
    cgst: 0,
    sgst: 0,
    igst: 10200,
    totalAmount: 95200,
    hsnCode: '996511',
    hsnDesc: 'Road Freight Transportation Services',
    itcStatus: 'Eligible ITC (100%)',
    itcSection: 'Section 16(1) / IGST Act',
    itcExplanation: 'Inter-state goods transport input service directly related to merchant supply chain. 100% IGST credit eligible.',
    confidence: 99.8,
    tags: ['Inter-State IGST', 'E-Way Bill Linked', 'Verified']
  },
  {
    id: 'cloud-saas',
    category: 'Cloud Infrastructure & SaaS',
    vendor: 'Amazon Web Services India Pvt Ltd',
    gstin: '07AAACA4988G1Z2',
    invoiceNumber: 'AWS-DEL-2026-44',
    date: '02-Aug-2026',
    taxableAmount: 115000,
    cgst: 10350,
    sgst: 10350,
    igst: 0,
    totalAmount: 135700,
    hsnCode: '998315',
    hsnDesc: 'Cloud Hosting & IT Data Services',
    itcStatus: 'Eligible ITC (100%)',
    itcSection: 'Section 16(1) CGST Act',
    itcExplanation: 'Operational IT & data processing services used in the course of furtherance of business.',
    confidence: 99.6,
    tags: ['Input Service', '18% GST', 'Instant Match']
  }
];

// Interactive Section 17(5) Rules Database
const SECTION_17_5_RULES = [
  {
    item: 'Motor Vehicles (< 13 Passengers)',
    hsn: '8703',
    status: 'BLOCKED',
    section: 'Sec 17(5)(a)',
    ruleText: 'Blocked for ordinary passenger conveyance. Only eligible if business is vehicle sales, passenger transport, or driving school.',
    gstrMapping: 'Table 4(D)(1) Ineligible Others'
  },
  {
    item: 'Commercial Cargo Transport Trucks',
    hsn: '8704',
    status: 'ELIGIBLE',
    section: 'Sec 16(1)',
    ruleText: 'Fully eligible. Used exclusively for transportation of goods and inventory in commercial furtherance.',
    gstrMapping: 'Table 4(A)(5) All Other ITC'
  },
  {
    item: 'Corporate Food, Beverages & Catering',
    hsn: '9963',
    status: 'BLOCKED',
    section: 'Sec 17(5)(b)(i)',
    ruleText: 'Blocked by default for staff meals or party catering, unless provided under statutory obligation under Factories Act.',
    gstrMapping: 'Table 4(D)(1) Ineligible Others'
  },
  {
    item: 'Factory Machinery & Data Center Servers',
    hsn: '8471',
    status: 'ELIGIBLE',
    section: 'Sec 16 / Sec 18',
    ruleText: 'Fully claimable as Capital Goods credit provided depreciation is not claimed on the GST portion in Income Tax.',
    gstrMapping: 'Table 4(A)(5) Capital Goods'
  },
  {
    item: 'Employee Club & Gym Memberships',
    hsn: '9997',
    status: 'BLOCKED',
    section: 'Sec 17(5)(b)(ii)',
    ruleText: 'Statutorily blocked. Personal welfare perks cannot be claimed against business output GST.',
    gstrMapping: 'Table 4(D)(1) Ineligible Others'
  },
  {
    item: 'Factory Warehouse Construction (Immovable)',
    hsn: '9954',
    status: 'BLOCKED',
    section: 'Sec 17(5)(c)',
    ruleText: 'Works contract & materials for construction of immovable property capitalized in books are blocked (except Plant & Machinery).',
    gstrMapping: 'Table 4(D)(1) Ineligible'
  }
];

// AI Copilot Interactive Simulated Queries
const COPILOT_PREVIEW_QUESTIONS = [
  {
    q: 'What is my total ITC claimable for August 2026?',
    a: '📊 For August 2026, BillWise has identified **₹3,42,850** in Eligible ITC across 28 processed bills. **₹38,200** was automatically segregated as Blocked under Section 17(5) (Food Catering & Personal Travel), keeping your GSTR-3B Table 4 100% audit-proof!'
  },
  {
    q: 'Why was the luxury hotel invoice blocked from ITC?',
    a: '🛡️ **Section 17(5)(b)(i) of CGST Act** disallows Input Tax Credit on food, beverages, and hotel accommodation for personal consumption. BillWise tagged this invoice to prevent GST demand notices + 18% annual interest penalties.'
  },
  {
    q: 'When is the upcoming GSTR-3B deadline for monthly filers?',
    a: '⏰ The next GSTR-3B filing deadline is **20th August 2026 (23:59 IST)**. Filing on time avoids late fee of ₹50/day (₹20/day for nil returns) and saves 18% p.a. statutory interest on unpaid tax liabilities.'
  },
  {
    q: 'How does the Accountant multi-tenant role workflow work?',
    a: '👥 Your invited staff accountant can review scanned ledgers, approve HSN mappings, and generate GSTR-ready JSON files, but cannot modify your registered company PAN/GSTIN credentials without Admin OTP approval.'
  }
];

// FAQs Data
const FAQS = [
  {
    q: 'How does BillWise OCR handle poor quality or crumpled bills?',
    a: 'BillWise uses high-density computer vision preprocessing combined with Tesseract-based multi-tier OCR and custom Indian GST pattern recognizers. It cleans shadows, corrects skew, and validates the 15-digit GSTIN with an ISO Mod-36 checksum algorithm to ensure 99.8% field accuracy.'
  },
  {
    q: 'What is Section 17(5) and why does automatic categorization matter?',
    a: 'Section 17(5) of the CGST Act defines "Blocked Input Tax Credits" (such as passenger vehicles, employee club perks, personal food & beverages, and immovable property construction). Claiming these illegally leads to severe department notices, 18% interest, and 100% penalty. BillWise automatically flags and isolates blocked credits so you claim only 100% compliant ITC.'
  },
  {
    q: 'Can my Chartered Accountant (CA) or tax consultant access my portal?',
    a: 'Yes! BillWise supports role-based access control (Admin, Verified Accountant, and SuperAdmin compliance). You can register your in-house or external accountant who can review receipts and prepare returns under your explicit approval.'
  },
  {
    q: 'Is my business and financial data secure?',
    a: 'Absolutely. BillWise features strict tenant-level isolation, 256-bit encryption in transit and at rest, and audit logs for every bill processed, updated, or exported. No data is shared across different businesses.'
  },
  {
    q: 'What document formats are supported for bill scanning?',
    a: 'You can upload PDF invoices, PNG, JPEG, WEBP images, or snap a photo directly using your laptop or smartphone camera. You can also drag & drop bulk monthly supplier batches.'
  },
  {
    q: 'Is BillWise compliant with current 2026 Indian GST rules?',
    a: 'Yes. BillWise is built specifically around the CGST, SGST, and IGST Acts (including recent GSTR-1, GSTR-3B Table 4 reforms, and 4/6/8 digit HSN/SAC classification standards).'
  }
];

export default function LandingPage({
  onNavigateToLogin,
  onNavigateToSignup
}) {
  // Simulator states
  const [selectedInvoice, setSelectedInvoice] = useState(DEMO_INVOICES[0]);
  const [isScanningAnim, setIsScanningAnim] = useState(false);
  const [activeDemoTab, setActiveDemoTab] = useState('ocr'); // 'ocr' | 'itc' | 'copilot' | 'deadlines'
  
  // Section 17(5) tester state
  const [selectedRule, setSelectedRule] = useState(SECTION_17_5_RULES[0]);
  
  // AI Copilot Preview state
  const [activeCopilotQuery, setActiveCopilotQuery] = useState(COPILOT_PREVIEW_QUESTIONS[0]);
  
  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // ROI Calculator states
  const [monthlyInvoices, setMonthlyInvoices] = useState(120);
  const [monthlySpend, setMonthlySpend] = useState(850000); // 8.5 Lakhs
  const [businessCategory, setBusinessCategory] = useState('Retail & Trading');

  // Trigger scan animation when invoice changes
  const handleSelectInvoice = (inv) => {
    setIsScanningAnim(true);
    setSelectedInvoice(inv);
    setTimeout(() => {
      setIsScanningAnim(false);
    }, 700);
  };

  // Calculate ROI
  const estimatedGstPortion = monthlySpend * 0.18; // Average 18% GST
  const estimatedMissedItc = estimatedGstPortion * 0.08; // Typically 8% of ITC is lost in manual paperwork
  const annualSavings = Math.round(estimatedMissedItc * 12);
  const hoursSavedPerMonth = Math.round((monthlyInvoices * 8) / 60); // 8 mins manual entry/verification saved per bill
  const penaltyProtection = Math.round(monthlySpend * 0.02 * 12); // Prevented Section 17(5) wrongful claims

  const handleCelebrateCalculator = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#e11d48', '#f43f5e', '#10b981', '#fbbf24']
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-rose-500 selection:text-white relative overflow-hidden">
      
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-rose-500/10 via-orange-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[800px] right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ========================================================================= */}
      {/* 1. STICKY MODERN HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-rose-400 p-0.5 shadow-md shadow-rose-500/20 group-hover:scale-105 transition">
              <div className="w-full h-full bg-white rounded-[9px] flex items-center justify-center">
                <ScanLine className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
                  Bill<span className="text-rose-600">Wise</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                  GST AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                MSME Invoicing & Section 17(5) ITC Platform
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-600">
            <a href="#features" className="hover:text-rose-600 transition">Features</a>
            <a href="#interactive-simulator" className="hover:text-rose-600 transition flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              Platform Tour
            </a>
            <a href="#itc-calculator" className="hover:text-rose-600 transition">Tax Calculator</a>
            <a href="#how-it-works" className="hover:text-rose-600 transition">How It Works</a>
            <a href="#comparison" className="hover:text-rose-600 transition">Why BillWise</a>
            <a href="#faq" className="hover:text-rose-600 transition">FAQ</a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateToLogin('login')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200/80 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onNavigateToSignup}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-md shadow-rose-600/25 transition hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold shadow-xs animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Next-Gen Indian GST Invoicing & Autonomous Section 17(5) Engine</span>
            <span className="hidden sm:inline-block text-slate-300">|</span>
            <span className="hidden sm:inline-block text-[11px] text-rose-600 font-extrabold uppercase">100% Audit-Proof</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.12]">
            Zero-Effort Bill Scanning. <br className="hidden sm:block" />
            <span className="text-rose-600">Maximum ITC Savings</span> for Indian MSMEs.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Turn paper receipts, camera photos, and vendor PDFs into verified GST entries in <strong>under 2 seconds</strong>. Automatically categorize Input Tax Credit under Section 17(5) and file GSTR-1 & 3B with zero errors.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onNavigateToSignup}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-sm shadow-xl shadow-rose-600/30 transition hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Free 14-Day Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#interactive-simulator"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200/90 shadow-sm transition hover:border-slate-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 text-rose-600 fill-rose-600" />
              <span>Explore Platform Tour</span>
            </a>
          </div>

          {/* Trust Metrics Bar */}
          <div className="pt-8 border-t border-slate-200/70 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-3 bg-white/70 rounded-2xl border border-slate-200/60 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">99.8%</div>
              <div className="text-xs text-slate-500 font-medium">OCR Extraction Accuracy</div>
            </div>
            <div className="p-3 bg-white/70 rounded-2xl border border-slate-200/60 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600">&lt; 2.0s</div>
              <div className="text-xs text-slate-500 font-medium">Instant AI Processing</div>
            </div>
            <div className="p-3 bg-white/70 rounded-2xl border border-slate-200/60 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">100%</div>
              <div className="text-xs text-slate-500 font-medium">Sec 17(5) Tax Compliance</div>
            </div>
            <div className="p-3 bg-white/70 rounded-2xl border border-slate-200/60 shadow-2xs">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">₹4.8L+</div>
              <div className="text-xs text-slate-500 font-medium">Avg Annual ITC Claim Saved</div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE 4-IN-1 FEATURE SIMULATOR & PLAYGROUND */}
      {/* ========================================================================= */}
      <section id="interactive-simulator" className="py-16 sm:py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              <Zap className="w-3.5 h-3.5 text-rose-600" />
              Interactive Product Showcase
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Test BillWise Intelligence Live
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Select an invoice sample below or switch tabs to see how our AI handles Indian GST rules, Section 17(5) blocked credits, and tax forecasting in real-time.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-2xl mx-auto border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveDemoTab('ocr')}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeDemoTab === 'ocr'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span>Smart OCR Scanner</span>
            </button>

            <button
              onClick={() => setActiveDemoTab('itc')}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeDemoTab === 'itc'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Section 17(5) Engine</span>
            </button>

            <button
              onClick={() => setActiveDemoTab('copilot')}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeDemoTab === 'copilot'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>AI Copilot (Ctrl+K)</span>
            </button>

            <button
              onClick={() => setActiveDemoTab('deadlines')}
              className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                activeDemoTab === 'deadlines'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>GST Compliance Radar</span>
            </button>
          </div>

          {/* TAB 1: SMART OCR SCANNER SIMULATOR */}
          {activeDemoTab === 'ocr' && (
            <div className="space-y-6">
              
              {/* Sample Invoice Switcher Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <span className="text-xs font-bold text-slate-500 mr-1">Select Case Study Example:</span>
                {DEMO_INVOICES.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                      selectedInvoice.id === inv.id
                        ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5 text-rose-600" />
                    <span>{inv.category}</span>
                  </button>
                ))}
              </div>

              {/* Interactive Visual Split Display */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 p-4 sm:p-6 rounded-3xl border border-slate-200">
                
                {/* Left: Simulated Visual Invoice Card with Laser Beam */}
                <div className="lg:col-span-5 relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden flex flex-col justify-between space-y-4">
                  
                  {/* Laser Scan Animation */}
                  {isScanningAnim && <div className="scanner-laser" />}
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-rose-600" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900 truncate max-w-[200px]">{selectedInvoice.vendor}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{selectedInvoice.invoiceNumber}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      OCR Confidence {selectedInvoice.confidence}%
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Supplier GSTIN (ISO Mod-36 Validated)</div>
                      <div className="font-mono font-bold text-slate-800 text-xs">{selectedInvoice.gstin}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-400">HSN / SAC & Description</div>
                      <div className="font-semibold text-slate-800 text-xs">
                        <span className="font-mono text-rose-600 font-bold mr-1.5">{selectedInvoice.hsnCode}</span>
                        {selectedInvoice.hsnDesc}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold">Taxable Value</div>
                        <div className="font-extrabold text-slate-900">₹{selectedInvoice.taxableAmount.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold">Total Invoice Value</div>
                        <div className="font-extrabold text-rose-600">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                    <span>Tax Date: {selectedInvoice.date}</span>
                    <span className="font-mono text-[10px]">Format: E-Invoice JSON / PDF</span>
                  </div>
                </div>

                {/* Right: AI Output & Section 17(5) Decision Matrix */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 flex flex-col justify-between">
                  
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-rose-600" />
                        <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700">Autonomous Tax Classifier</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedInvoice.tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* ITC Verdict Banner */}
                    <div className="mt-4 p-4 rounded-2xl border transition-all" style={{
                      backgroundColor: selectedInvoice.itcStatus.includes('Eligible') ? '#f0fdf4' : '#fff1f2',
                      borderColor: selectedInvoice.itcStatus.includes('Eligible') ? '#bbf7d0' : '#fecdd3'
                    }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedInvoice.itcStatus.includes('Eligible') ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600" />
                          )}
                          <span className="text-sm font-extrabold" style={{
                            color: selectedInvoice.itcStatus.includes('Eligible') ? '#166534' : '#9f1239'
                          }}>
                            {selectedInvoice.itcStatus}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-white/80 border border-slate-200">
                          {selectedInvoice.itcSection}
                        </span>
                      </div>
                      <p className="text-xs mt-2 leading-relaxed text-slate-700">
                        {selectedInvoice.itcExplanation}
                      </p>
                    </div>

                    {/* Tax Breakdown Matrix */}
                    <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400">CGST (9%)</div>
                        <div className="text-xs font-extrabold text-slate-800 mt-0.5">₹{selectedInvoice.cgst.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400">SGST (9%)</div>
                        <div className="text-xs font-extrabold text-slate-800 mt-0.5">₹{selectedInvoice.sgst.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400">IGST</div>
                        <div className="text-xs font-extrabold text-slate-800 mt-0.5">₹{selectedInvoice.igst.toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Ready to sync with GSTR-3B Table 4</span>
                    </div>
                    <button
                      onClick={onNavigateToSignup}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Scan Your Own Bills</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SECTION 17(5) ENGINE SIMULATOR */}
          {activeDemoTab === 'itc' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left: Rule Selector List */}
                <div className="lg:col-span-1 space-y-2 bg-slate-50 p-4 rounded-3xl border border-slate-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">
                    Test Expense Scenarios:
                  </div>
                  {SECTION_17_5_RULES.map((rule, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedRule(rule)}
                      className={`w-full p-3 rounded-2xl text-left text-xs font-bold transition flex items-center justify-between border cursor-pointer ${
                        selectedRule.item === rule.item
                          ? 'bg-white border-rose-400 text-rose-700 shadow-2xs'
                          : 'bg-slate-100/70 border-transparent text-slate-600 hover:bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div>{rule.item}</div>
                        <div className="text-[10px] text-slate-400 font-mono">HSN: {rule.hsn}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold shrink-0 ${
                        rule.status === 'ELIGIBLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {rule.status}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Right: Detailed Legal Classification Display */}
                <div className="lg:col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col justify-between space-y-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Statutory Tax Ruling</span>
                        <h3 className="text-base font-extrabold text-slate-900">{selectedRule.item}</h3>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                          selectedRule.status === 'ELIGIBLE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {selectedRule.status === 'ELIGIBLE' ? '✅ 100% Eligible Credit' : '❌ Blocked Credit'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">CGST Act Clause</div>
                        <div className="font-mono text-sm font-bold text-rose-600">{selectedRule.section}</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                        <div className="text-[10px] font-bold uppercase text-slate-400">GSTR-3B Table 4 Target</div>
                        <div className="font-bold text-sm text-slate-800">{selectedRule.gstrMapping}</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Department Compliance Explanation</div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {selectedRule.ruleText}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      <span className="font-semibold text-slate-700">Protected against Section 73/74 GST penalties.</span>
                    </div>
                    <button
                      onClick={onNavigateToSignup}
                      className="font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                    >
                      Enable for your business →
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: AI COPILOT SIMULATOR */}
          {activeDemoTab === 'copilot' && (
            <div className="max-w-3xl mx-auto bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">BillWise AI Copilot (Ctrl + K)</h3>
                    <p className="text-[10px] text-slate-500">Autonomous Financial Tax Intelligence Assistant</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Shortcut: Ctrl+K
                </span>
              </div>

              {/* Sample Question Chips */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Try Asking:</div>
                <div className="flex flex-wrap gap-2">
                  {COPILOT_PREVIEW_QUESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveCopilotQuery(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                        activeCopilotQuery.q === item.q
                          ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-2xs font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      "{item.q}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversational Simulator Box */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="bg-slate-100 p-3 rounded-2xl text-xs font-bold text-slate-800">
                    {activeCopilotQuery.q}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-rose-50/70 border border-rose-100 p-4 rounded-2xl text-xs text-slate-800 leading-relaxed font-medium">
                    {activeCopilotQuery.a}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: COMPLIANCE RADAR */}
          {activeDemoTab === 'deadlines' && (
            <div className="max-w-3xl mx-auto bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-rose-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Statutory GST Filing Calendar & Penal Alert Radar</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Sync
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">GSTR-3B (Monthly ITC & Tax)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      20th of Month
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Summary return of outward supplies, input tax credit claimed, and net tax payable.</p>
                  <div className="text-[10px] font-bold text-rose-600">⚠️ Avoids ₹50/day late fees and 18% p.a. interest.</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">GSTR-1 (Outward Sales Ledger)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      11th of Month
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">Details of outward supplies of taxable goods or services auto-populated into buyers' GSTR-2B.</p>
                  <div className="text-[10px] font-bold text-emerald-600">✅ 1-Click JSON export ready.</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE ITC SAVINGS & ROI CALCULATOR */}
      {/* ========================================================================= */}
      <section id="itc-calculator" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl glass-panel-glow border border-rose-200 p-6 sm:p-10 shadow-xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Sliders Form */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 mb-2">
                  <Calculator className="w-3.5 h-3.5 text-rose-600" />
                  Real-time ROI Estimator
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Calculate Your Annual ITC Tax Savings
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  See how much unclaimed tax credit and administrative hours BillWise recovers for your business every month.
                </p>
              </div>

              {/* Slider 1: Monthly Bills */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Monthly Invoices Processed:</span>
                  <span className="text-rose-600 font-extrabold font-mono text-sm">{monthlyInvoices} bills / mo</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="1000"
                  step="10"
                  value={monthlyInvoices}
                  onChange={(e) => setMonthlyInvoices(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>20 bills</span>
                  <span>500 bills</span>
                  <span>1000+ bills</span>
                </div>
              </div>

              {/* Slider 2: Monthly Spend */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>Monthly Vendor / Inventory Spend:</span>
                  <span className="text-rose-600 font-extrabold font-mono text-sm">
                    ₹{(monthlySpend / 100000).toFixed(1)} Lakhs / mo
                  </span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="5000000"
                  step="50000"
                  value={monthlySpend}
                  onChange={(e) => setMonthlySpend(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>₹1 Lakh</span>
                  <span>₹25 Lakhs</span>
                  <span>₹50 Lakhs+</span>
                </div>
              </div>

              {/* Dropdown: Business Sector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Business Sector:</label>
                <select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 outline-none focus:border-rose-500"
                >
                  <option value="Retail & Trading">Retail & Trading (FMCG, Hardware, Apparel)</option>
                  <option value="Manufacturing & Industrial">Manufacturing & Industrial Goods</option>
                  <option value="IT Services & SaaS">IT Services, SaaS & Consulting</option>
                  <option value="Logistics & Transport">Logistics, Fleet & Warehousing</option>
                  <option value="Hospitality & Services">Hotels, Restaurants & Events</option>
                </select>
              </div>

              <button
                onClick={handleCelebrateCalculator}
                className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                <span>Simulate Maximum Savings Confetti 🎉</span>
              </button>
            </div>

            {/* Right: Savings Stats Output Card */}
            <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Estimated Annual Impact</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ROI ~ 18.5x
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-400">Annual Recovered Unclaimed ITC</div>
                <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  ₹{annualSavings.toLocaleString('en-IN')} <span className="text-xs font-semibold text-emerald-400">/ year</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Accountant Hours Saved</div>
                  <div className="text-lg font-extrabold text-white mt-0.5">
                    {hoursSavedPerMonth} hrs <span className="text-[10px] text-slate-400">/ mo</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                  <div className="text-slate-400 text-[11px]">Audit Penalties Avoided</div>
                  <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
                    ₹{penaltyProtection.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400">/ yr</span>
                  </div>
                </div>
              </div>

              <button
                onClick={onNavigateToSignup}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/40 transition hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Claim Your Full ITC with BillWise</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. HOW IT WORKS (3-STEP PIPELINE) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-slate-100/70 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              <Layers className="w-3.5 h-3.5 text-rose-600" />
              Effortless 3-Step Pipeline
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Paper Bills to Audit-Ready GSTR Filing
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              No manual data entry, no spreadsheet errors, no missed tax deadlines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative group hover:border-rose-300 transition">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-lg shadow-xs group-hover:scale-110 transition">
                1
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Upload or Snap Bills</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Take a phone photo of paper invoices, drag & drop monthly supplier PDFs, or upload bulk batches directly to the portal.
              </p>
              <div className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                <span>Supports PDF, PNG, JPG, Camera</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative group hover:border-rose-300 transition">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-lg shadow-xs group-hover:scale-110 transition">
                2
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">AI Extracts & Classifies ITC</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Computer vision reads GSTIN, HSN codes, and amounts, while our Section 17(5) engine isolates blocked vs eligible credits in &lt;2 seconds.
              </p>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <span>Mod-36 Checksum + Sec 17(5) Validated</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative group hover:border-rose-300 transition">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-lg shadow-xs group-hover:scale-110 transition">
                3
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">File Returns with 1-Click</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your staff accountant approves ledger entries and exports GSTR-1/3B compliant JSON/CSV files ready for the GSTN Portal.
              </p>
              <div className="text-[11px] text-slate-700 font-bold flex items-center gap-1">
                <span>100% Audit-Proof Export</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FEATURE DEEP-DIVE GRID */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            Comprehensive GST Suite
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Engineered for Fast-Moving Indian Enterprises
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Every feature is crafted to maximize cash flow, minimize tax liabilities, and protect your company against audit notices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
              <ScanLine className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">AI Vision Bill Scanner</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracts 15-digit GSTIN, invoice date, HSN codes, taxable value, CGST, SGST, IGST, and line items with 99.8% precision even from thermal receipts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Section 17(5) Sentinel</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated legal rule engine flags blocked ITC on vehicles, catering, employee perks, and immovable property to eliminate tax notice liabilities.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Conversational AI Copilot (Ctrl+K)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Instant natural language assistant provides cash flow breakdown, vendor tax rate analysis, and explains complex GST rulings on demand.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Role-Based Multi-Tenancy</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Merchant Admin, Staff Accountant approval queues, and SuperAdmin verification workflows with strict data boundary isolation.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">GST Compliance Radar</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Proactive countdowns for GSTR-1, GSTR-3B, CMP-08, and GSTR-9 annual filing dates with late fee defense calculations.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 group">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:scale-110 transition">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Bank-Grade Cloud Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              256-bit encryption, JWT stateless auth, ISO Mod-36 GST checksum validation, and unalterable audit trails for total peace of mind.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. COMPARISON MATRIX (WHY BILLWISE) */}
      {/* ========================================================================= */}
      <section id="comparison" className="py-16 sm:py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              <Scale className="w-3.5 h-3.5 text-rose-600" />
              The Modern Advantage
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Why Forward-Thinking MSMEs Choose BillWise
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              See how BillWise eliminates the bottlenecks of legacy accounting software and error-prone spreadsheets.
            </p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500">
                  <th className="py-4 px-4">Feature / Capability</th>
                  <th className="py-4 px-4 bg-rose-50 text-rose-700 rounded-t-2xl font-black">
                    ✨ BillWise AI Platform
                  </th>
                  <th className="py-4 px-4 text-slate-700">Manual Excel Spreadsheets</th>
                  <th className="py-4 px-4 text-slate-700">Legacy Desktop ERPs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-900">Bill Processing Speed</td>
                  <td className="py-4 px-4 bg-rose-50/60 font-extrabold text-rose-700">&lt; 2 Seconds (Autonomous OCR)</td>
                  <td className="py-4 px-4 text-slate-500">8–15 mins per invoice (Manual)</td>
                  <td className="py-4 px-4 text-slate-500">5–10 mins (Manual Typing)</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-900">Section 17(5) Blocked ITC Detection</td>
                  <td className="py-4 px-4 bg-rose-50/60 font-extrabold text-emerald-700">✅ 100% Automated Rule Engine</td>
                  <td className="py-4 px-4 text-rose-500 font-semibold">❌ None (High Audit Risk)</td>
                  <td className="py-4 px-4 text-slate-500">⚠️ Manual Configuration Required</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-900">GSTIN Checksum & Verification</td>
                  <td className="py-4 px-4 bg-rose-50/60 font-extrabold text-rose-700">✅ Real-time ISO Mod-36 Check</td>
                  <td className="py-4 px-4 text-rose-500 font-semibold">❌ Zero Validation</td>
                  <td className="py-4 px-4 text-slate-500">⚠️ Basic Format Check Only</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-900">Conversational AI Tax Copilot</td>
                  <td className="py-4 px-4 bg-rose-50/60 font-extrabold text-rose-700">✅ Built-in (Ctrl+K Instant AI)</td>
                  <td className="py-4 px-4 text-rose-500 font-semibold">❌ None</td>
                  <td className="py-4 px-4 text-rose-500 font-semibold">❌ None</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-900">Multi-User Role Separation</td>
                  <td className="py-4 px-4 bg-rose-50/60 font-extrabold text-rose-700">✅ Admin + Staff Accountant Approval</td>
                  <td className="py-4 px-4 text-rose-500 font-semibold">❌ Unsecured Shared Files</td>
                  <td className="py-4 px-4 text-slate-500">⚠️ Complex Single-Machine Licenses</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-900">Cloud Accessibility</td>
                  <td className="py-4 px-4 bg-rose-50/60 font-extrabold text-rose-700 rounded-b-2xl">✅ Anywhere on Mobile, Mac, PC</td>
                  <td className="py-4 px-4 text-slate-500">⚠️ Email Attachments</td>
                  <td className="py-4 px-4 text-rose-500 font-semibold">❌ Locked to Office Windows PC</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. TESTIMONIALS & SOCIAL PROOF */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Verified Customer Stories
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Trusted by 2,500+ Indian Businesses & CAs
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Here is how real merchants and accounting teams save time and money with BillWise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                "BillWise saved us over ₹3.4 Lakhs in unclaimed ITC in our first quarter alone. Our vendor bills get scanned from our warehouse smartphones in seconds and our CA files GSTR-3B with zero back-and-forth."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-orange-500 text-white font-bold text-xs flex items-center justify-center">
                SR
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">Ramesh Kesaviga</div>
                <div className="text-[11px] text-slate-500">Managing Director, Shri Ram Enterprise</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                "The Section 17(5) automated categorization is a game changer for our CA practice. It automatically prevents our clients from claiming ineligible catering and passenger car bills, avoiding department notices."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center">
                VM
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">Vikram Malhotra, FCA</div>
                <div className="text-[11px] text-slate-500">Senior Partner, Apex Tax Advisory</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                "Being able to press Ctrl+K and ask AI 'What is my eligible ITC for this week?' and get an exact rupee breakdown makes executive cash flow decisions 10x faster."
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center">
                TN
              </div>
              <div>
                <div className="text-xs font-extrabold text-slate-900">Ananya Sen</div>
                <div className="text-[11px] text-slate-500">CFO, TechNova Solutions</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. FAQ ACCORDION SECTION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-16 sm:py-24 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              <HelpCircle className="w-3.5 h-3.5 text-rose-600" />
              Frequently Asked Questions
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything You Need to Know
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Got questions about Indian GST compliance, OCR limits, or security? We've got answers.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-extrabold text-xs sm:text-sm text-slate-900 hover:text-rose-600 transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {openFaqIndex === idx && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. HIGH CONVERSION BOTTOM CTA BANNER */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-rose-700 via-red-600 to-rose-800 text-white p-8 sm:p-14 shadow-2xl overflow-hidden text-center space-y-6">
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-rose-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-rose-100 text-xs font-bold border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              14-Day Free Trial • Instant Setup • No Credit Card Required
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              Ready to Reclaim Every Rupee of Eligible ITC?
            </h2>
            <p className="text-xs sm:text-sm text-rose-100 leading-relaxed max-w-xl mx-auto">
              Join thousands of Indian enterprises modernizing their GST workflows with instant OCR bill scanning and AI tax intelligence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <button
                onClick={onNavigateToSignup}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-rose-700 font-extrabold text-sm shadow-xl transition hover:scale-105 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Register Your Business Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigateToLogin('login')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-rose-900/50 hover:bg-rose-900/80 text-white font-bold text-sm border border-white/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In to Existing Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. COMPREHENSIVE FOOTER */}
      {/* ========================================================================= */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-900 rounded-[9px] flex items-center justify-center">
                  <ScanLine className="w-5 h-5 text-rose-500" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-white">
                  Bill<span className="text-rose-500">Wise</span>
                </span>
                <p className="text-[11px] text-slate-500">Intelligent GST Compliance & Invoicing</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-xs font-semibold">
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#interactive-simulator" className="hover:text-white transition">Platform Tour</a>
              <a href="#itc-calculator" className="hover:text-white transition">Tax Calculator</a>
              <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
              <a href="#faq" className="hover:text-white transition">FAQ</a>
              <button onClick={() => onNavigateToLogin('login')} className="hover:text-white transition cursor-pointer">
                Sign In
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © 2026 BillWise Technologies India Pvt Ltd. Fully compliant with Central Goods & Services Tax (CGST) Act 2017.
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>GSTN Server Status: Online (100% Uptime)</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
