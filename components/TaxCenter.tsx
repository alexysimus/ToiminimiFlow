import React, { useState, useEffect } from 'react';
import { 
  Calendar, ShieldAlert, CheckCircle2, AlertCircle, Clock, 
  ExternalLink, Copy, Check, FileSpreadsheet, ChevronRight, 
  Info, HelpCircle, FileText, ArrowUpRight, DollarSign, Calculator,
  Download, Bell
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { veroTaxEngine, VERO_LINKS, VERO_CONSTANTS } from '../services/veroTaxEngine';
import { PrepaymentGuideModal } from './PrepaymentGuideModal';
import { Form5AssistantModal } from './Form5AssistantModal';
import { calendarService } from '../services/calendarService';
import { 
  formatFinnishCurrency, formatFinnishDate, formatFinnishPercent, formatFinnishNumber 
} from '../services/formatUtils';
import { 
  Invoice, Expense, SalesSettlement, MileageEntry, 
  HomeOfficeDeduction, TaxSettings, Form5Breakdown, TaxDeadline 
} from '../types';

export const TaxCenter: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<SalesSettlement[]>([]);
  const [mileageEntries, setMileageEntries] = useState<MileageEntry[]>([]);
  const [homeOffice, setHomeOffice] = useState<HomeOfficeDeduction>();
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(storageService.getTaxSettings());
  
  // UI states
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isForm5ModalOpen, setIsForm5ModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState<string>(taxSettings.personalTaxRate.toString());
  const [calendarDownloaded, setCalendarDownloaded] = useState(false);

  const currentYear = taxSettings.financialYear || 2026;

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setInvoices(storageService.getInvoices());
    setExpenses(storageService.getExpenses());
    setSettlements(storageService.getSalesSettlements());
    setMileageEntries(storageService.getMileageEntries());
    setHomeOffice(storageService.getHomeOfficeDeduction(currentYear));
    const settings = storageService.getTaxSettings();
    setTaxSettings(settings);
    setTempRate(settings.personalTaxRate.toString());
  };

  // VAT calculations
  let vatCollected = 0;
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      const gross = item.quantity * item.unitPrice;
      const vatRate = item.vatRate || 0;
      if (vatRate > 0) {
        const net = gross / (1 + (vatRate / 100));
        vatCollected += (gross - net);
      }
    });
  });

  settlements.forEach(s => {
    const vatRate = s.vatRate || 0;
    if (vatRate > 0) {
      const net = s.grossAmount / (1 + (vatRate / 100));
      vatCollected += (s.grossAmount - net);
    }
  });

  let vatPaidOnPurchases = 0;
  expenses.forEach(exp => {
    exp.items.forEach(item => {
      const vatRate = item.vatRate !== undefined ? item.vatRate : 0;
      if (vatRate > 0) {
        const net = item.amount / (1 + (vatRate / 100));
        vatPaidOnPurchases += (item.amount - net);
      }
    });
  });

  const vatPayable = Math.max(0, vatCollected - vatPaidOnPurchases);

  // Form 5 calculation
  const form5: Form5Breakdown = veroTaxEngine.calculateForm5(
    invoices,
    expenses,
    settlements,
    mileageEntries,
    homeOffice,
    currentYear
  );

  // Estimated personal prepayment tax
  const estimatedPrepayment = form5.taxableBusinessIncome * (taxSettings.personalTaxRate / 100);

  // Deadlines
  const deadlines: TaxDeadline[] = veroTaxEngine.generateDeadlines(
    taxSettings,
    currentYear,
    vatPayable,
    estimatedPrepayment
  );

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveTaxRate = () => {
    const parsed = parseFloat(tempRate.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      const updated = { ...taxSettings, personalTaxRate: parsed };
      storageService.saveTaxSettings(updated);
      setTaxSettings(updated);
      setIsEditingRate(false);
    } else {
      alert("Please enter a valid tax percentage (e.g. 13 or 15.5).");
    }
  };

  const handleVatPeriodChange = (period: TaxSettings['vatPeriod']) => {
    const updated = { ...taxSettings, vatPeriod: period };
    storageService.saveTaxSettings(updated);
    setTaxSettings(updated);
  };

  const handleExportCalendar = () => {
    calendarService.exportTaxCalendar(deadlines, currentYear);
    setCalendarDownloaded(true);
    setTimeout(() => setCalendarDownloaded(false), 3000);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-[#003580] bg-[#EDF4FC] px-2 py-0.5 rounded uppercase tracking-wider">
              Finnish Tax Administration (Vero) Compliant · 2026
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
            VAT & Tax Center
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            Real-time tracking of Finnish tax obligations, prepayment tax estimates, and Form 5 return breakdown according to Finnish Tax Administration statutes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExportCalendar}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 rounded-xl transition flex items-center justify-center space-x-1.5 min-h-[44px] shadow-2xs"
            title="Download tax deadlines into your phone or computer calendar"
          >
            {calendarDownloaded ? (
              <>
                <Check size={16} className="text-emerald-600" />
                <span className="text-emerald-700">Calendar Saved!</span>
              </>
            ) : (
              <>
                <Calendar size={16} className="text-[#003580]" />
                <span>Export Calendar (.ics)</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] border border-slate-200 rounded-xl transition flex items-center justify-center space-x-1.5 min-h-[44px]"
          >
            <HelpCircle size={16} className="text-[#003580]" />
            <span>Beginner's Tax Guide</span>
          </button>

          <button
            onClick={() => setIsForm5ModalOpen(true)}
            className="px-4 py-2.5 bg-[#003580] hover:bg-[#002868] active:scale-[0.98] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
          >
            <FileSpreadsheet size={16} />
            <span>Form 5 Helper</span>
          </button>
        </div>
      </div>

      {/* 2. Core Tax Metrics (2x2 Grid on Mobile) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-white">
          {/* 1. Prepayment Taxes */}
          <div className="p-4 sm:p-5 space-y-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Prepayment Tax (Estimate)
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight truncate">
              {formatFinnishCurrency(estimatedPrepayment)}
            </div>
            <p className="text-xs text-slate-500 truncate">
              Tax on profit ({formatFinnishPercent(taxSettings.personalTaxRate)})
            </p>
          </div>

          {/* 2. Value Added Tax */}
          <div className="p-4 sm:p-5 space-y-1 min-w-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              Value Added Tax (VAT / ALV)
            </span>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#003580] tracking-tight truncate">
              {formatFinnishCurrency(vatPayable)}
            </div>
            <p className="text-xs text-slate-500 truncate">
              VAT payable to Tax Administration
            </p>
          </div>

          {/* 3. VAT Period */}
          <div className="p-4 sm:p-5 space-y-2 min-w-0">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
              VAT Tax Period
            </span>
            <select
              value={taxSettings.vatPeriod}
              onChange={(e) => handleVatPeriodChange(e.target.value as TaxSettings['vatPeriod'])}
              className="text-base sm:text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 w-full focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
            >
              <option value="year">Annual (Feb 28)</option>
              <option value="quarter">Quarterly</option>
              <option value="month">Monthly</option>
              <option value="exempt">VAT Exempt (Under €20k)</option>
            </select>
          </div>

          {/* 4. Current Tax Rate */}
          <div className="p-4 sm:p-5 space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block truncate">
                Personal Tax Rate
              </span>
              {!isEditingRate && (
                <button
                  onClick={() => setIsEditingRate(true)}
                  className="text-xs text-[#003580] font-semibold hover:underline min-h-[28px] flex items-center"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingRate ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={tempRate}
                  onChange={(e) => setTempRate(e.target.value)}
                  className="w-16 text-base sm:text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-slate-800 min-h-[36px]"
                />
                <span className="text-sm font-bold text-slate-500">%</span>
                <button
                  onClick={handleSaveTaxRate}
                  className="px-3 py-1.5 bg-[#003580] text-white text-xs font-bold rounded-lg min-h-[36px]"
                >
                  OK
                </button>
              </div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900 tracking-tight truncate">
                {formatFinnishPercent(taxSettings.personalTaxRate)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Upcoming Tax Returns Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Upcoming Tax Returns & Deadlines
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              All sole trader tax returns and payments are submitted electronically via MyTax (OmaVero).
            </p>
          </div>
          <button
            onClick={handleExportCalendar}
            className="self-start sm:self-auto text-xs font-semibold text-[#003580] hover:text-[#002868] flex items-center space-x-1 hover:underline min-h-[32px]"
          >
            <Calendar size={14} />
            <span>Sync all to Calendar (.ics)</span>
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Obligation / Return</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Estimated Tax</th>
                <th className="py-3 px-4 text-right">Guide & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deadlines.map((dl) => {
                const daysRemaining = veroTaxEngine.getDaysRemaining(dl.dueDate);
                const isOverdue = daysRemaining < 0;
                const isDueSoon = daysRemaining >= 0 && daysRemaining <= 14;

                return (
                  <tr key={dl.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-sm">{dl.title}</div>
                      <p className="text-[11px] text-slate-600 max-w-md leading-relaxed mt-1">{dl.description}</p>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-800 text-xs">
                        {formatFinnishDate(dl.dueDate)}
                      </div>
                      <div className="mt-1 flex items-center space-x-1">
                        {isOverdue ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                            Overdue
                          </span>
                        ) : isDueSoon ? (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                            Due soon · {daysRemaining} d
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-500">
                            {daysRemaining} days left
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-slate-900 tabular-nums">
                      {dl.estimatedAmount !== undefined ? formatFinnishCurrency(dl.estimatedAmount) : '—'}
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <a
                        href={dl.veroUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-[#003580] hover:text-[#002255] hover:underline min-h-[32px]"
                      >
                        <span>Vero Guide</span>
                        <ArrowUpRight size={14} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Grouped Inset Cards View */}
        <div className="block md:hidden space-y-3">
          {deadlines.map((dl) => {
            const daysRemaining = veroTaxEngine.getDaysRemaining(dl.dueDate);
            const isOverdue = daysRemaining < 0;
            const isDueSoon = daysRemaining >= 0 && daysRemaining <= 14;

            return (
              <div key={dl.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{dl.title}</h4>
                  </div>
                  {isOverdue ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 shrink-0">
                      Overdue
                    </span>
                  ) : isDueSoon ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 shrink-0">
                      Due soon · {daysRemaining} d
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium shrink-0">
                      {daysRemaining} d
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-500 text-xs block">Due Date</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{formatFinnishDate(dl.dueDate)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-xs block">Estimated Tax</span>
                    <span className="font-mono font-bold text-base text-[#003580] tabular-nums">
                      {dl.estimatedAmount !== undefined ? formatFinnishCurrency(dl.estimatedAmount) : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {dl.description}
                </p>

                <div className="pt-3 flex items-center justify-between border-t border-slate-200/50 gap-2">
                  <button
                    onClick={handleExportCalendar}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 rounded-xl transition flex items-center justify-center space-x-1.5 min-h-[44px]"
                  >
                    <Calendar size={15} className="text-[#003580]" />
                    <span>To Calendar</span>
                  </button>

                  <a
                    href={dl.veroUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 text-xs font-semibold text-[#003580] bg-blue-50 hover:bg-blue-100 active:scale-[0.98] border border-blue-200/60 rounded-xl transition flex items-center justify-center space-x-1.5 min-h-[44px]"
                  >
                    <span>Vero Guide</span>
                    <ArrowUpRight size={15} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Helpful Vero Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <a 
          href={VERO_LINKS.OMAVERO}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-[#003580] transition group space-y-1.5 block min-w-0"
        >
          <div className="flex items-center justify-between text-[#003580]">
            <span className="font-bold text-xs sm:text-sm truncate">MyTax (OmaVero)</span>
            <ExternalLink size={15} className="group-hover:translate-x-0.5 transition shrink-0" />
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
            The Finnish Tax Administration online portal for VAT returns, prepayment tax, and Form 5.
          </p>
        </a>

        <a 
          href={VERO_LINKS.VAT}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-[#003580] transition group space-y-1.5 block min-w-0"
        >
          <div className="flex items-center justify-between text-[#003580]">
            <span className="font-bold text-xs sm:text-sm truncate">VAT Rates 2026</span>
            <ExternalLink size={15} className="group-hover:translate-x-0.5 transition shrink-0" />
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
            Standard VAT rate 25.5 % and reduced rates 13.5 % and 10 %.
          </p>
        </a>

        <a 
          href={VERO_LINKS.PREPAYMENT_TAX}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-[#003580] transition group space-y-1.5 block min-w-0"
        >
          <div className="flex items-center justify-between text-[#003580]">
            <span className="font-bold text-xs sm:text-sm truncate">Prepayment Tax Request</span>
            <ExternalLink size={15} className="group-hover:translate-x-0.5 transition shrink-0" />
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
            How to apply for or adjust your advance income tax when your earnings fluctuate.
          </p>
        </a>
      </div>

      {/* Guide Modal */}
      <PrepaymentGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        currentTaxRate={taxSettings.personalTaxRate}
      />

      {/* Form 5 Assistant Modal */}
      <Form5AssistantModal
        isOpen={isForm5ModalOpen}
        onClose={() => setIsForm5ModalOpen(false)}
        form5={form5}
        taxSettings={taxSettings}
        financialYear={currentYear}
      />
    </div>
  );
};

export default TaxCenter;
