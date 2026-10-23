import React, { useState, useCallback } from 'react';
import { 
  LayoutDashboard, FileText, Receipt, ShieldCheck, 
  Car, Users, Building2, ChevronLeft, ChevronRight, 
  Database, ExternalLink, HelpCircle, MoreHorizontal, ArrowUpRight
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import ExpenseForm from './components/ExpenseForm';
import { TaxCenter } from './components/TaxCenter';
import { DeductionsView } from './components/DeductionsView';
import CustomerManager from './components/CustomerManager';
import BusinessInfoForm from './components/BusinessInfoForm';
import DataBackup from './components/DataBackup';
import { PrepaymentGuideModal } from './components/PrepaymentGuideModal';
import { PullToRefresh } from './components/ui/PullToRefresh';
import { BottomSheet } from './components/ui/BottomSheet';
import { Tab } from './types';
import { VERO_LINKS } from './services/veroTaxEngine';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPrepaymentGuideOpen, setIsPrepaymentGuideOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabSelect = (tab: Tab) => {
    setActiveTab(tab);
    setIsMoreSheetOpen(false);
  };

  const handleGlobalRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshKey((prev) => prev + 1);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case Tab.DASHBOARD: return <Dashboard key={refreshKey} onNavigate={handleTabSelect} />;
      case Tab.TAXES: return <TaxCenter key={refreshKey} />;
      case Tab.DEDUCTIONS: return <DeductionsView key={refreshKey} />;
      case Tab.INVOICE: return <InvoiceForm key={refreshKey} />;
      case Tab.EXPENSE: return <ExpenseForm key={refreshKey} />;
      case Tab.CUSTOMERS: return <CustomerManager key={refreshKey} />;
      case Tab.BUSINESS: return <BusinessInfoForm key={refreshKey} />;
      case Tab.BACKUP: return <DataBackup key={refreshKey} />;
      default: return <Dashboard key={refreshKey} onNavigate={handleTabSelect} />;
    }
  };

  const getTabTitle = (tab: Tab) => {
    switch (tab) {
      case Tab.DASHBOARD: return 'Dashboard';
      case Tab.TAXES: return 'VAT & Taxes';
      case Tab.DEDUCTIONS: return 'Deductions & Travel (378)';
      case Tab.INVOICE: return 'New Invoice';
      case Tab.EXPENSE: return 'Add Expense';
      case Tab.CUSTOMERS: return 'Customers';
      case Tab.BUSINESS: return 'Business Details';
      case Tab.BACKUP: return 'Backup & Export';
      default: return 'Flow Toiminimi';
    }
  };

  const DesktopNavItem = ({ tab, icon: Icon, label, badge }: { tab: Tab, icon: any, label: string, badge?: string }) => (
    <button 
      onClick={() => handleTabSelect(tab)}
      className={`w-full flex items-center px-3.5 py-3 rounded-xl transition-all duration-200 mb-1.5 group relative min-h-[48px] ${
        activeTab === tab 
          ? 'bg-[#003580] text-white font-semibold shadow-xs' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
      }`}
    >
      <div className="flex items-center w-full min-w-0">
        <Icon size={20} strokeWidth={activeTab === tab ? 2.2 : 1.8} className={`shrink-0 ${activeTab === tab ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
        {isSidebarOpen && (
          <div className="ml-3 flex items-center justify-between flex-1 min-w-0">
            <span className="text-sm truncate">{label}</span>
            {badge && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ml-1.5 ${
                activeTab === tab ? 'bg-white/20 text-white' : 'bg-blue-100 text-[#003580]'
              }`}>
                {badge}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );

  const MobileTabButton = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => {
    const isActive = activeTab === tab && !isMoreSheetOpen;
    return (
      <button
        onClick={() => handleTabSelect(tab)}
        className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[50px] active:scale-95 transition-transform ${
          isActive ? 'text-[#003580] font-semibold' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Icon size={22} strokeWidth={isActive ? 2.4 : 1.8} className={isActive ? 'text-[#003580]' : 'text-slate-400'} />
        <span className="text-xs tracking-tight mt-0.5 truncate max-w-[68px]">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-dvh h-dvh bg-[#F2F2F7] md:bg-[#F8FAFC] flex selection:bg-[#003580]/15 selection:text-[#003580] overflow-hidden">
      {/* Desktop Sidebar Navigation (Hidden on mobile < 768px) */}
      <aside 
        className={`
          hidden md:flex flex-col bg-white border-r border-slate-200/80 text-slate-800 flex-shrink-0 
          transition-all duration-300 ease-in-out relative z-40
          ${isSidebarOpen ? 'w-64' : 'w-20'}
        `}
      >
        <div className="h-full flex flex-col p-4">
          {/* Logo / Brand */}
          <div className={`flex items-center mb-8 mt-1 ${isSidebarOpen ? 'px-2' : 'justify-center'}`}>
            <div className="w-10 h-10 rounded-xl bg-[#003580] flex items-center justify-center text-white shadow-sm font-bold text-lg shrink-0">
              🇫🇮
            </div>
            {isSidebarOpen && (
              <div className="ml-3 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none truncate">Flow</h1>
                  <span className="text-xs font-bold text-[#003580] bg-[#EDF4FC] px-2 py-0.5 rounded-full shrink-0">2026</span>
                </div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mt-1 truncate">Sole Trader Suite</p>
              </div>
            )}
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto">
            <DesktopNavItem tab={Tab.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <DesktopNavItem tab={Tab.TAXES} icon={ShieldCheck} label="VAT & Taxes" badge="Vero" />
            <DesktopNavItem tab={Tab.DEDUCTIONS} icon={Car} label="Deductions & Travel" badge="Line 378" />

            <div className="my-3 border-t border-slate-100 mx-2"></div>
            
            <DesktopNavItem tab={Tab.INVOICE} icon={FileText} label="New Invoice" />
            <DesktopNavItem tab={Tab.EXPENSE} icon={Receipt} label="Add Expense" />
            
            <div className="my-3 border-t border-slate-100 mx-2"></div>

            <DesktopNavItem tab={Tab.CUSTOMERS} icon={Users} label="Customers" />
            <DesktopNavItem tab={Tab.BUSINESS} icon={Building2} label="Business Details" />
            <DesktopNavItem tab={Tab.BACKUP} icon={Database} label="Backup & Export" />
          </nav>

          {/* Quick Help & MyTax */}
          {isSidebarOpen ? (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 mt-auto">
              <button
                onClick={() => setIsPrepaymentGuideOpen(true)}
                className="w-full text-left text-xs font-semibold text-slate-700 hover:text-[#003580] flex items-center justify-between min-h-[40px] px-1"
              >
                <span className="truncate">Tax Guide for Beginners</span>
                <HelpCircle size={16} className="text-[#003580] shrink-0 ml-1" />
              </button>
              <a
                href={VERO_LINKS.OMAVERO}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-left text-xs font-semibold text-[#003580] flex items-center justify-between hover:underline min-h-[40px] px-1"
              >
                <span className="truncate">Open MyTax (OmaVero)</span>
                <ExternalLink size={14} className="shrink-0 ml-1" />
              </a>
            </div>
          ) : null}

          {/* Collapse Toggle */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-10 bg-white text-slate-500 hover:text-slate-800 p-1.5 rounded-full shadow-sm hover:scale-105 transition border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 overflow-y-auto h-full bg-[#F2F2F7] md:bg-[#F8FAFC]">
        {/* Apple HIG Frosted Top Bar */}
        <header className="sticky top-0 z-30 ios-glass border-b border-slate-200/70 px-4 md:px-6 py-3 flex items-center justify-between pt-safe">
          <div className="flex items-center space-x-2 text-xs text-slate-600 min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="font-bold text-slate-900 text-base sm:text-lg capitalize truncate">
                {getTabTitle(activeTab)}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-600 font-semibold text-xs shrink-0">2026</span>
            </div>
            <span className="hidden sm:inline text-slate-300">·</span>
            <span className="hidden sm:inline text-[#003580] font-semibold text-xs truncate">Verohallinto Compliant</span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsPrepaymentGuideOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#003580] hover:bg-slate-100 rounded-xl transition flex items-center space-x-1.5 min-h-[40px]"
            >
              <HelpCircle size={16} className="text-[#003580]" />
              <span className="hidden sm:inline">Tax Guide</span>
            </button>

            <a
              href={VERO_LINKS.OMAVERO}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-2xs transition flex items-center space-x-1.5 min-h-[40px]"
            >
              <span>MyTax</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        </header>

        {/* Content Container with Pull-to-Refresh on Mobile */}
        <PullToRefresh onRefresh={handleGlobalRefresh}>
          <div className="max-w-6xl mx-auto p-3.5 sm:p-6 md:p-8 pb-28 md:pb-8">
            {renderContent()}
          </div>
        </PullToRefresh>
      </main>

      {/* Apple HIG Fixed Mobile Bottom Tab Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 ios-glass border-t border-slate-200/80 px-2 py-1 flex items-center justify-around pb-safe shadow-lg">
        <MobileTabButton tab={Tab.DASHBOARD} icon={LayoutDashboard} label="Home" />
        <MobileTabButton tab={Tab.INVOICE} icon={FileText} label="Invoices" />
        <MobileTabButton tab={Tab.EXPENSE} icon={Receipt} label="Expenses" />
        <MobileTabButton tab={Tab.TAXES} icon={ShieldCheck} label="Taxes" />
        
        {/* 5th Tab: iOS "More" Sheet Trigger */}
        <button
          onClick={() => setIsMoreSheetOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] active:scale-95 transition-transform ${
            isMoreSheetOpen ? 'text-[#003580] font-semibold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <MoreHorizontal size={22} strokeWidth={isMoreSheetOpen ? 2.4 : 1.8} />
          <span className="text-xs font-medium tracking-tight mt-0.5">More</span>
        </button>
      </nav>

      {/* Gesture-Driven iOS / Touch "More" BottomSheet Modal */}
      <BottomSheet
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        title="Flow Toiminimi"
        subtitle="Sole Trader accounting tools & settings"
      >
        <div className="space-y-4">
          {/* Inset Grouped Section: Accounting Features */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-200/60">
            <button
              onClick={() => handleTabSelect(Tab.DEDUCTIONS)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white text-left transition min-h-[48px]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#003580] flex items-center justify-center font-bold">
                  <Car size={18} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Deductions & Travel</span>
                  <span className="text-xs text-slate-500">Driver's log, home office (Form 5 line 378)</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>

            <button
              onClick={() => handleTabSelect(Tab.CUSTOMERS)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white text-left transition min-h-[48px]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users size={18} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Customers</span>
                  <span className="text-xs text-slate-500">Client directory and invoicing details</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>

            <button
              onClick={() => handleTabSelect(Tab.BUSINESS)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white text-left transition min-h-[48px]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Building2 size={18} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Business Details</span>
                  <span className="text-xs text-slate-500">Business ID (Y-tunnus), IBAN & tax settings</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>

            <button
              onClick={() => handleTabSelect(Tab.BACKUP)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white text-left transition min-h-[48px]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Database size={18} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Backup & Export</span>
                  <span className="text-xs text-slate-500">Download or restore JSON accounting data</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </div>

          {/* Inset Grouped Section: Official Tax Links */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-200/60">
            <button
              onClick={() => {
                setIsMoreSheetOpen(false);
                setIsPrepaymentGuideOpen(true);
              }}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white text-left transition min-h-[48px]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Beginner's Tax Guide</span>
                  <span className="text-xs text-slate-500">How sole trader taxation works in Finland</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>

            <a
              href={VERO_LINKS.OMAVERO}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white text-left transition min-h-[48px]"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#003580] flex items-center justify-center font-bold">
                  <ArrowUpRight size={18} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">MyTax (OmaVero)</span>
                  <span className="text-xs text-slate-500">Official Finnish Tax Administration portal</span>
                </div>
              </div>
              <ExternalLink size={16} className="text-slate-400" />
            </a>
          </div>
        </div>
      </BottomSheet>

      {/* Global Prepayment Guide Modal */}
      <PrepaymentGuideModal 
        isOpen={isPrepaymentGuideOpen}
        onClose={() => setIsPrepaymentGuideOpen(false)}
        currentTaxRate={13.0}
      />
    </div>
  );
};

export default App;