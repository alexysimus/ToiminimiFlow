import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Wallet, FileText, Receipt, 
  Copy, Trash2, Search, Eye, X, Download, Calendar, 
  CreditCard, Tag, ArrowRight, ExternalLink, Edit3, CheckCircle2, 
  Circle, Clock, History, Plus, ShieldCheck, HelpCircle, ArrowUpRight,
  ChevronRight, Check
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { veroTaxEngine } from '../services/veroTaxEngine';
import { generateInvoicePDF } from '../services/pdfService';
import { PrepaymentGuideModal } from './PrepaymentGuideModal';
import { SalesSettlementModal } from './SalesSettlementModal';
import { TextReveal } from './ui/TextReveal';
import { BottomSheet } from './ui/BottomSheet';
import { 
  formatFinnishCurrency, formatFinnishDate, formatFinnishPercent, formatFinnishNumber, formatFinnishIban, formatFinnishReference 
} from '../services/formatUtils';
import { 
  Invoice, Expense, SalesSettlement, Tab, AuditLogEntry, TaxSettings 
} from '../types';
import { calendarService } from '../services/calendarService';
import { VERO_LINKS } from '../services/veroTaxEngine';

interface DashboardProps {
  onNavigate: (tab: Tab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<SalesSettlement[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(storageService.getTaxSettings());
  
  // Controls & Toggles
  const [vatViewMode, setVatViewMode] = useState<'vat_0' | 'vat_incl'>('vat_0');
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses' | 'settlements'>('invoices');
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  
  // Modals
  const [selectedItem, setSelectedItem] = useState<{ item: Invoice | Expense | SalesSettlement, type: 'invoice' | 'expense' | 'settlement' } | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isPrepaymentGuideOpen, setIsPrepaymentGuideOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCalendarDownloaded, setIsCalendarDownloaded] = useState(false);
  const [isDeadlineBannerDismissed, setIsDeadlineBannerDismissed] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setInvoices(storageService.getInvoices());
    setExpenses(storageService.getExpenses());
    setSettlements(storageService.getSalesSettlements());
    setTaxSettings(storageService.getTaxSettings());
  };

  useEffect(() => {
    if (selectedItem) {
      setAuditLogs(storageService.getAuditLogs(selectedItem.item.id));
    }
  }, [selectedItem]);

  // Income calculations
  let invoiceNet = 0;
  let invoiceGross = 0;
  invoices.forEach(inv => {
    inv.items.forEach(i => {
      const gross = i.quantity * i.unitPrice;
      const vatRate = i.vatRate || 0;
      const net = vatRate > 0 ? gross / (1 + (vatRate / 100)) : gross;
      invoiceGross += gross;
      invoiceNet += net;
    });
  });

  let settlementNet = 0;
  let settlementGross = 0;
  let settlementFees = 0;
  settlements.forEach(s => {
    const vatRate = s.vatRate || 0;
    const net = vatRate > 0 ? s.grossAmount / (1 + (vatRate / 100)) : s.grossAmount;
    settlementGross += s.grossAmount;
    settlementNet += net;
    settlementFees += s.feeAmount;
  });

  const totalGrossIncome = invoiceGross + settlementGross;
  const totalNetIncome = invoiceNet + settlementNet;
  const displayedIncome = vatViewMode === 'vat_0' ? totalNetIncome : totalGrossIncome;

  // Expense calculations
  let expenseNet = 0;
  let expenseGross = 0;
  expenses.forEach(exp => {
    exp.items.forEach(i => {
      const vatRate = i.vatRate || 0;
      const gross = i.amount;
      const net = vatRate > 0 ? gross / (1 + (vatRate / 100)) : gross;
      expenseGross += gross;
      expenseNet += net;
    });
  });

  const displayedExpense = vatViewMode === 'vat_0' ? expenseNet : expenseGross;

  // VAT calculations
  let vatCollected = 0;
  invoices.forEach(inv => {
    inv.items.forEach(i => {
      const gross = i.quantity * i.unitPrice;
      const vatRate = i.vatRate || 0;
      if (vatRate > 0) vatCollected += gross - (gross / (1 + (vatRate / 100)));
    });
  });
  settlements.forEach(s => {
    const vatRate = s.vatRate || 0;
    if (vatRate > 0) vatCollected += s.grossAmount - (s.grossAmount / (1 + (vatRate / 100)));
  });

  let vatPaidOnPurchases = 0;
  expenses.forEach(exp => {
    exp.items.forEach(i => {
      const vatRate = i.vatRate || 0;
      if (vatRate > 0) vatPaidOnPurchases += i.amount - (i.amount / (1 + (vatRate / 100)));
    });
  });

  const vatPayable = Math.max(0, vatCollected - vatPaidOnPurchases);

  // Real-time Vero Tax Safe Engine
  const mileageEntries = storageService.getMileageEntries();
  const homeOffice = storageService.getHomeOfficeDeduction(taxSettings.financialYear || 2026);

  const taxSafe = veroTaxEngine.calculateTaxSafe(
    totalGrossIncome,
    totalNetIncome,
    expenseGross,
    vatPayable,
    taxSettings.personalTaxRate
  );

  const currentYear = taxSettings.financialYear || 2026;
  const deadlines = veroTaxEngine.generateDeadlines(
    taxSettings,
    currentYear,
    vatPayable,
    taxSafe.estimatedPrepaymentTax
  );

  const upcomingDeadlines = deadlines.filter(d => veroTaxEngine.getDaysRemaining(d.dueDate) >= 0);
  const nextDeadline = upcomingDeadlines.length > 0 ? upcomingDeadlines[0] : deadlines[0];
  const daysRemaining = nextDeadline ? veroTaxEngine.getDaysRemaining(nextDeadline.dueDate) : 0;
  const isOverdue = daysRemaining < 0;
  const isDueSoon = daysRemaining >= 0 && daysRemaining <= 14;

  // Quick Actions Handlers
  const handleTogglePaid = (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation();
    const updatedInvoice = { ...inv, isPaid: !inv.isPaid };
    storageService.saveInvoice(updatedInvoice);
    refreshData();
    if (selectedItem?.item.id === inv.id) {
      setSelectedItem({
        item: updatedInvoice,
        type: 'invoice'
      });
    }
  };

  const handleCopy = (id: string, type: 'invoice' | 'expense') => {
    localStorage.setItem(`flow_copy_${type}_id`, id);
    onNavigate(type === 'invoice' ? Tab.INVOICE : Tab.EXPENSE);
  };

  const handleEdit = (id: string, type: 'invoice' | 'expense') => {
    localStorage.setItem(`flow_edit_${type}_id`, id);
    setSelectedItem(null);
    onNavigate(type === 'invoice' ? Tab.INVOICE : Tab.EXPENSE);
  };

  const handleDelete = (id: string, type: 'invoice' | 'expense' | 'settlement') => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      if (type === 'invoice') storageService.deleteInvoice(id);
      else if (type === 'expense') storageService.deleteExpense(id);
      else storageService.deleteSalesSettlement(id);
      setSelectedItem(null);
      refreshData();
    }
  };

  // Filter lists
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.recipientName.toLowerCase().includes(search.toLowerCase()) || 
                          inv.invoiceNumber.includes(search);
    if (!matchesSearch) return false;
    if (invoiceFilter === 'unpaid') return !inv.isPaid;
    if (invoiceFilter === 'paid') return !!inv.isPaid;
    return true;
  }).sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

  const filteredExpenses = expenses.filter(exp => 
    exp.items.some(i => i.description.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const filteredSettlements = settlements.filter(s =>
    s.provider.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn max-w-6xl mx-auto">
      {/* 1. TOP ACTION STRIP (Apple HIG Inset Hero Card) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#003580] text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            🇫🇮
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 tracking-tight truncate">Flow Toiminimi</h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">Tax Year 1 Jan 2026 – 31 Dec 2026 · Finnish Tax Administration</p>
          </div>
        </div>

        {/* Primary Action Buttons (44px min touch target) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <button 
            onClick={() => onNavigate(Tab.INVOICE)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
          >
            <Plus size={16} />
            <span className="whitespace-nowrap">New Invoice</span>
          </button>

          <button 
            onClick={() => onNavigate(Tab.EXPENSE)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
          >
            <Receipt size={16} className="text-slate-500" />
            <span className="whitespace-nowrap">Add Expense</span>
          </button>

          <button 
            onClick={() => setIsSettlementModalOpen(true)}
            className="w-full sm:w-auto px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
          >
            <CreditCard size={16} className="text-[#003580]" />
            <span className="whitespace-nowrap">Record Settlement</span>
          </button>
        </div>
      </div>

      {/* 2. GRACEFUL TAX DEADLINE ALERT BANNER */}
      {nextDeadline && !isDeadlineBannerDismissed && (
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition ${
          isOverdue 
            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
            : isDueSoon 
              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
              : 'bg-white border-slate-200/80 text-slate-900'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                isOverdue 
                  ? 'bg-rose-600 text-white' 
                  : isDueSoon 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-[#003580] text-white'
              }`}>
                <Calendar size={18} />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">
                    Tax Calendar · Due Date Reminder
                  </span>
                  {isOverdue ? (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                      Overdue ({Math.abs(daysRemaining)} days ago)
                    </span>
                  ) : isDueSoon ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                      Due soon · {daysRemaining} days left
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500">
                      {daysRemaining} days remaining
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold tracking-tight truncate">
                  {nextDeadline.title}
                </h3>
                <p className="text-xs opacity-80 leading-relaxed max-w-xl">
                  Due date: <strong className="font-mono">{formatFinnishDate(nextDeadline.dueDate)}</strong>
                  {nextDeadline.estimatedAmount !== undefined && nextDeadline.estimatedAmount > 0 && (
                    <> · Estimated tax payable: <strong className="font-mono tabular-nums">{formatFinnishCurrency(nextDeadline.estimatedAmount)}</strong></>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <button
                  onClick={() => {
                    calendarService.exportTaxCalendar(deadlines, currentYear);
                    setIsCalendarDownloaded(true);
                    setTimeout(() => setIsCalendarDownloaded(false), 3000);
                  }}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 text-xs font-semibold bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 border border-slate-200 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                  title="Download and sync tax deadlines into your calendar"
                >
                  {isCalendarDownloaded ? (
                    <>
                      <Check size={15} className="text-emerald-600" />
                      <span className="text-emerald-700">Calendar Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download size={15} className="text-slate-500" />
                      <span>Sync Calendar (.ics)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onNavigate(Tab.TAXES)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold bg-[#003580] hover:bg-[#002868] active:scale-[0.98] text-white rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                >
                  <span>Tax Center</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              <button
                onClick={() => setIsDeadlineBannerDismissed(true)}
                className="w-11 h-11 text-slate-400 hover:text-slate-700 active:scale-95 rounded-full hover:bg-slate-100 transition flex items-center justify-center shrink-0"
                title="Dismiss reminder for now"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. THE TOIMINIMI TAX SAFE (Apple HIG Metric Cards with Tabular Numerals) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block">
              Tax Year 1 Jan 2026 – 31 Dec 2026
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">The Sole Trader Tax Safe (Tax Reserve)</h2>
          </div>

          {/* Interactive VAT Toggle (44px min touch target) */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto justify-center">
            <button
              onClick={() => setVatViewMode('vat_0')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition min-h-[36px] flex items-center justify-center ${
                vatViewMode === 'vat_0'
                  ? 'bg-white text-[#003580] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              VAT 0% (Net)
            </button>
            <button
              onClick={() => setVatViewMode('vat_incl')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition min-h-[36px] flex items-center justify-center ${
                vatViewMode === 'vat_incl'
                  ? 'bg-white text-[#003580] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Incl. VAT (Gross)
            </button>
          </div>
        </div>

        {/* 4 Key Metric Cards in Finnish Format */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Revenue */}
          <div className="p-3.5 sm:p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Net Sales / Turnover ({vatViewMode === 'vat_0' ? 'VAT 0%' : 'Incl. VAT'})
            </span>
            <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight truncate">
              {formatFinnishCurrency(displayedIncome)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {invoices.length} invoices · {settlements.length} settlements
            </p>
          </div>

          {/* Card 2: Total Expenses */}
          <div className="p-3.5 sm:p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
              Expenses ({vatViewMode === 'vat_0' ? 'VAT 0%' : 'Incl. VAT'})
            </span>
            <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight truncate">
              {formatFinnishCurrency(displayedExpense)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {expenses.length} receipts recorded
            </p>
          </div>

          {/* Card 3: Net Profit */}
          <div className="p-3.5 sm:p-4 bg-[#EDF4FC] border border-[#BFDBFE] rounded-2xl space-y-1 min-w-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-[#003580] uppercase tracking-wider block truncate">
              Operating Profit (Result)
            </span>
            <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-[#003580] tracking-tight truncate">
              {formatFinnishCurrency(taxSafe.netProfit)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-600 truncate">
              Taxable (after 5% relief): {formatFinnishCurrency(taxSafe.taxableProfit)}
            </p>
          </div>

          {/* Card 4: Safe Take-Home Pay */}
          <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 min-w-0">
            <div className="flex items-center justify-between min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider block truncate">
                Safe to Withdraw (Owner's Draw)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0 ml-1"></span>
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-emerald-700 tracking-tight truncate">
              {formatFinnishCurrency(taxSafe.safeToWithdraw)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-800 font-medium truncate">
              100% safe for personal drawings
            </p>
          </div>
        </div>

        {/* Tax Reserve Strip (How much to hold back in bank!) */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="text-blue-400 shrink-0" size={18} />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Tax Safe Reserve: Keep in bank account for tax deadlines
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Total tax buffer to retain for Tax Administration: <strong className="font-mono tabular-nums text-white text-sm whitespace-nowrap">{formatFinnishCurrency(taxSafe.totalTaxReserve)}</strong>
              <span className="hidden sm:inline text-slate-400"> (VAT: {formatFinnishCurrency(vatPayable)} · Prepayment Tax: {formatFinnishCurrency(taxSafe.estimatedPrepaymentTax)})</span>
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsPrepaymentGuideOpen(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1.5 min-h-[40px]"
            >
              <HelpCircle size={14} />
              <span>Prepayment Tax Guide</span>
            </button>

            <button
              onClick={() => onNavigate(Tab.TAXES)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-1 min-h-[40px]"
            >
              <span>All Deadlines</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. TRANSACTIONS & RECORDS CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Controls Bar: Segmented Tabs & Search */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Control */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl self-stretch md:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap min-h-[36px] ${
                activeTab === 'invoices' ? 'bg-white text-[#003580] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Invoices ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap min-h-[36px] ${
                activeTab === 'expenses' ? 'bg-white text-[#003580] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expenses ({expenses.length})
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`flex-1 md:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap min-h-[36px] ${
                activeTab === 'settlements' ? 'bg-white text-[#003580] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settlements ({settlements.length})
            </button>
          </div>

          {/* Search Input & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by customer, invoice #, item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[38px]"
              />
            </div>

            {activeTab === 'invoices' && (
              <div className="flex items-center space-x-1 self-center">
                {(['all', 'unpaid', 'paid'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setInvoiceFilter(filter)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition min-h-[36px] ${
                      invoiceFilter === filter
                        ? 'bg-[#003580] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter === 'unpaid' ? 'Unpaid' : 'Paid'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- VIEW 1: DESKTOP TABLE (Hidden on Mobile) --- */}
        <div className="hidden md:block overflow-x-auto">
          {activeTab === 'invoices' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount (incl. VAT)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No invoices found. Create your first invoice by clicking "New Invoice".
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const gross = inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
                    return (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedItem({ item: inv, type: 'invoice' })}
                        className="hover:bg-slate-50/80 transition cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          #{inv.invoiceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-xs min-w-0">
                          <TextReveal text={inv.recipientName} label="Customer" />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono whitespace-nowrap">
                          {formatFinnishDate(inv.dueDate)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatFinnishCurrency(gross)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={(e) => handleTogglePaid(e, inv)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition min-h-[28px] ${
                              inv.isPaid 
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {inv.isPaid ? 'PAID' : 'UNPAID'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => generateInvoicePDF(inv)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title="Download PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => handleCopy(inv.id, 'invoice')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title="Copy"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => handleEdit(inv.id, 'invoice')}
                            className="p-1.5 text-slate-400 hover:text-[#003580] hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id, 'invoice')}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'expenses' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount (incl. VAT)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No expenses recorded. Add an expense by clicking "Add Expense".
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const total = exp.items.reduce((s, i) => s + i.amount, 0);
                    const desc = exp.items.map(i => i.description).join(', ') || 'Receipt';
                    return (
                      <tr 
                        key={exp.id} 
                        onClick={() => setSelectedItem({ item: exp, type: 'expense' })}
                        className="hover:bg-slate-50/80 transition cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatFinnishDate(exp.paymentDate)}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-xs min-w-0">
                          <TextReveal text={desc} label="Description" />
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {exp.items[0]?.category.split('(')[0] || 'Expense'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatFinnishCurrency(total)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleCopy(exp.id, 'expense')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title="Copy"
                          >
                            <Copy size={15} />
                          </button>
                          <button
                            onClick={() => handleEdit(exp.id, 'expense')}
                            className="p-1.5 text-slate-400 hover:text-[#003580] hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id, 'expense')}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'settlements' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Gateway</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Gross Sales</th>
                  <th className="py-3 px-4 text-right">Fee (Expense)</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No sales settlements recorded.
                    </td>
                  </tr>
                ) : (
                  filteredSettlements.map((s) => (
                    <tr 
                      key={s.id} 
                      onClick={() => setSelectedItem({ item: s, type: 'settlement' })}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formatFinnishDate(s.date)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#003580] whitespace-nowrap">
                        {s.provider}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs min-w-0">
                        <TextReveal text={s.description} label="Description" />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-900 tabular-nums whitespace-nowrap">
                        {formatFinnishCurrency(s.grossAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {formatFinnishCurrency(s.feeAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                        {formatFinnishCurrency(s.netAmount)}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDelete(s.id, 'settlement')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* --- VIEW 2: MOBILE INSET GROUPED LIST CARDS (Visible on Mobile < 768px) --- */}
        <div className="block md:hidden divide-y divide-slate-100">
          {activeTab === 'invoices' && (
            filteredInvoices.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 text-xs">
                No invoices yet. Tap "New Invoice" above.
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const gross = inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedItem({ item: inv, type: 'invoice' })}
                    className="p-4 active:bg-slate-50 transition cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="font-mono font-bold text-xs text-[#003580] bg-blue-50 px-2 py-0.5 rounded-lg shrink-0">
                          #{inv.invoiceNumber}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {inv.recipientName || 'Unnamed Customer'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-slate-900 tabular-nums whitespace-nowrap shrink-0 ml-2">
                        {formatFinnishCurrency(gross)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <span>Due date:</span>
                        <span className="font-mono text-slate-700">{formatFinnishDate(inv.dueDate)}</span>
                      </div>
                      <button
                        onClick={(e) => handleTogglePaid(e, inv)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition min-h-[28px] ${
                          inv.isPaid 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {inv.isPaid ? 'PAID' : 'UNPAID'}
                      </button>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => generateInvoicePDF(inv)}
                        className="px-2.5 py-1 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 min-h-[36px]"
                      >
                        <Download size={14} />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleEdit(inv.id, 'invoice')}
                        className="px-2.5 py-1 text-[#003580] bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center space-x-1 min-h-[36px]"
                      >
                        <Edit3 size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id, 'invoice')}
                        className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'expenses' && (
            filteredExpenses.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 text-xs">
                No expenses yet. Tap "Add Expense" above.
              </div>
            ) : (
              filteredExpenses.map((exp) => {
                const total = exp.items.reduce((s, i) => s + i.amount, 0);
                const desc = exp.items.map(i => i.description).join(', ') || 'Receipt';
                return (
                  <div
                    key={exp.id}
                    onClick={() => setSelectedItem({ item: exp, type: 'expense' })}
                    className="p-4 active:bg-slate-50 transition cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-xs text-slate-900 block truncate">
                          {desc}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {exp.items[0]?.category.split('(')[0] || 'Expense'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-slate-900 tabular-nums whitespace-nowrap shrink-0">
                        {formatFinnishCurrency(total)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                      <div className="flex items-center space-x-1 font-mono text-slate-600">
                        <span>Payment Date:</span>
                        <span>{formatFinnishDate(exp.paymentDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(exp.id, 'expense')}
                          className="px-2.5 py-1 text-[#003580] bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center space-x-1 min-h-[36px]"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id, 'expense')}
                          className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'settlements' && (
            filteredSettlements.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-400 text-xs">
                No sales settlements recorded.
              </div>
            ) : (
              filteredSettlements.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedItem({ item: s, type: 'settlement' })}
                  className="p-4 active:bg-slate-50 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between min-w-0">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-xs text-[#003580] block truncate">
                        {s.provider}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {s.description}
                      </span>
                    </div>
                    <div className="text-right whitespace-nowrap shrink-0">
                      <span className="font-mono font-bold text-sm text-emerald-700 tabular-nums block">
                        {formatFinnishCurrency(s.netAmount)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Gross {formatFinnishCurrency(s.grossAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                    <span className="font-mono">{formatFinnishDate(s.date)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(s.id, 'settlement');
                      }}
                      className="p-1.5 text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* 4. APPLE-GRADE DETAIL INSPECTOR SHEET / MODAL */}
      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.type === 'invoice' ? `Invoice #${(selectedItem.item as Invoice).invoiceNumber}` : selectedItem?.type === 'expense' ? 'Expense Record' : (selectedItem?.item as SalesSettlement)?.provider || 'Details'}
        subtitle={selectedItem?.type === 'invoice' ? 'Invoice details and actions' : selectedItem?.type === 'expense' ? 'Receipt and expense details' : 'Settlement details'}
      >
        {selectedItem && (
          <div className="space-y-4">

            {/* Invoice Specific Detailed Inspector */}
            {selectedItem.type === 'invoice' && (() => {
              const inv = selectedItem.item as Invoice;
              const gross = inv.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
              return (
                <div className="space-y-4 text-xs">
                  {/* Big Number Card */}
                  <div className="p-4 bg-[#EDF4FC] rounded-2xl border border-[#BFDBFE] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block">Total Amount Due</span>
                      <div className="text-2xl font-bold font-mono text-[#003580] tabular-nums">
                        {formatFinnishCurrency(gross)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleTogglePaid(e, inv)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition min-h-[36px] ${
                        inv.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.isPaid ? 'PAID' : 'UNPAID'}
                    </button>
                  </div>

                  {/* Metadata Inset List */}
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200/70">
                    <div className="flex justify-between items-start">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-semibold text-slate-900 text-right max-w-[220px]">
                        <TextReveal text={inv.recipientName} label="Customer" />
                      </span>
                    </div>
                    {inv.recipientBusinessId && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Business ID (Y-tunnus):</span>
                        <span className="font-mono text-slate-900">{inv.recipientBusinessId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">Invoice Date:</span>
                      <span className="font-mono text-slate-900">{formatFinnishDate(inv.invoiceDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due Date:</span>
                      <span className="font-mono font-bold text-slate-900">{formatFinnishDate(inv.dueDate)}</span>
                    </div>
                    {inv.referenceNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Reference Number:</span>
                        <TextReveal text={formatFinnishReference(inv.referenceNumber)} label="Reference Number" isMonospace copyable />
                      </div>
                    )}
                    {inv.senderIban && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Bank Account (IBAN):</span>
                        <TextReveal text={formatFinnishIban(inv.senderIban)} label="Bank Account (IBAN)" isMonospace copyable />
                      </div>
                    )}
                  </div>

                  {/* Line Items Breakdown */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Line Items ({inv.items.length})</span>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {inv.items.map((item, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-start text-xs">
                          <div className="min-w-0 pr-2">
                            <span className="font-semibold text-slate-800 block truncate">{item.description}</span>
                            <span className="text-[10px] text-slate-500">{item.quantity} {item.unit} · VAT {item.vatRate}%</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                            {formatFinnishCurrency(item.quantity * item.unitPrice)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => generateInvoicePDF(inv)}
                      className="flex-1 py-2.5 bg-[#003580] hover:bg-[#002868] text-white rounded-xl font-semibold flex items-center justify-center space-x-1.5 min-h-[44px]"
                    >
                      <Download size={15} />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => handleEdit(inv.id, 'invoice')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold flex items-center justify-center space-x-1.5 min-h-[44px]"
                    >
                      <Edit3 size={15} />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Expense Detailed Inspector */}
            {selectedItem.type === 'expense' && (() => {
              const exp = selectedItem.item as Expense;
              const total = exp.items.reduce((s, i) => s + i.amount, 0);
              return (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Amount</span>
                      <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                        {formatFinnishCurrency(total)}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{formatFinnishDate(exp.paymentDate)}</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expense Line Items</span>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {exp.items.map((i, idx) => (
                        <div key={idx} className="p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block">{i.description}</span>
                            <span className="text-[10px] text-slate-500">{i.category} · VAT {i.vatRate || 25.5}%</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatFinnishCurrency(i.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {exp.receiptUrl && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receipt Voucher</span>
                      {exp.receiptUrl.startsWith('data:') ? (
                        <img src={exp.receiptUrl} alt="Receipt" className="max-h-48 rounded-xl border border-slate-200 mx-auto object-contain" />
                      ) : exp.receiptUrl.startsWith('http') ? (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-2 bg-blue-50 text-[#003580] border border-blue-200 rounded-xl text-xs font-semibold hover:bg-blue-100 transition"
                        >
                          <span>Open Receipt (Drive / iCloud / Cloud Link)</span>
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all break-all">
                          {exp.receiptUrl}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={() => handleEdit(exp.id, 'expense')}
                      className="flex-1 py-2.5 bg-[#003580] hover:bg-[#002868] text-white rounded-xl font-semibold flex items-center justify-center space-x-1.5 min-h-[44px]"
                    >
                      <Edit3 size={15} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id, 'expense')}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-semibold flex items-center justify-center space-x-1.5 min-h-[44px]"
                    >
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Settlement Detailed Inspector */}
            {selectedItem.type === 'settlement' && (() => {
              const s = selectedItem.item as SalesSettlement;
              return (
                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Net Payout to Bank</span>
                      <div className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                        {formatFinnishCurrency(s.netAmount)}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{formatFinnishDate(s.date)}</span>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-200/70">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Provider:</span>
                      <span className="font-bold text-[#003580]">{s.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Description:</span>
                      <span className="font-medium text-slate-800">{s.description}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Sales:</span>
                      <span className="font-mono tabular-nums text-slate-900">{formatFinnishCurrency(s.grossAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gateway Fee (Deductible Expense):</span>
                      <span className="font-mono tabular-nums text-slate-500">{formatFinnishCurrency(s.feeAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">VAT Rate:</span>
                      <span className="font-mono">{s.vatRate}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(s.id, 'settlement')}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-semibold flex items-center justify-center space-x-1.5 min-h-[44px]"
                  >
                    <Trash2 size={15} />
                    <span>Delete Settlement</span>
                  </button>
                </div>
              );
            })()}

            {/* Audit Logs */}
            {auditLogs.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <span className="font-bold text-slate-400 uppercase tracking-wider block">Audit History</span>
                {auditLogs.map(log => (
                  <div key={log.id} className="text-slate-500 flex items-center space-x-2">
                    <span className="font-mono text-slate-400">{formatFinnishDate(log.timestamp)}</span>
                    <span>{log.details}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* Global Modals */}
      <PrepaymentGuideModal
        isOpen={isPrepaymentGuideOpen}
        onClose={() => setIsPrepaymentGuideOpen(false)}
        currentTaxRate={taxSettings.personalTaxRate}
      />

      <SalesSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
};

export default Dashboard;
