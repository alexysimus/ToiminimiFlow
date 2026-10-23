import React, { useState } from 'react';
import { 
  X, Copy, Check, ExternalLink, HelpCircle, FileSpreadsheet, 
  ShieldCheck, AlertCircle, ArrowUpRight, CheckCircle2, ChevronRight,
  Calculator, BookOpen, Info
} from 'lucide-react';
import { Form5Breakdown, TaxSettings } from '../types';
import { formatFinnishCurrency, formatFinnishPercent } from '../services/formatUtils';
import { VERO_LINKS, VERO_CONSTANTS } from '../services/veroTaxEngine';

interface Form5AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  form5: Form5Breakdown;
  taxSettings: TaxSettings;
  financialYear: number;
}

export const Form5AssistantModal: React.FC<Form5AssistantModalProps> = ({
  isOpen,
  onClose,
  form5,
  taxSettings,
  financialYear
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (value: number, fieldName: string) => {
    // Format as 2-decimal Finnish comma string or clean integer string for MyTax
    const textToCopy = value.toFixed(2).replace('.', ',');
    navigator.clipboard.writeText(textToCopy);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const estimatedTax = form5.taxableBusinessIncome * (taxSettings.personalTaxRate / 100);

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-2.5 sm:p-5 pt-safe overflow-hidden animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden mt-1 sm:mt-4 md:mt-6 animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#003580] text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block truncate">
                Finnish Tax Administration (Vero) · Tax Year {financialYear}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Business Tax Return Form 5 Helper (Lomake 5)
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={VERO_LINKS.OMAVERO}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#003580] bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition min-h-[40px]"
            >
              <span>Open MyTax (OmaVero)</span>
              <ArrowUpRight size={14} />
            </a>
            <button
              onClick={onClose}
              className="w-11 h-11 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 rounded-full transition flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-700 pb-20 sm:pb-6">
          {/* Beginner Walkthrough Card */}
          <div className="bg-[#EDF4FC]/80 border border-[#B9D7F9] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center space-x-2 text-[#003580] font-bold text-xs sm:text-sm">
              <BookOpen size={17} />
              <span>How to file Form 5 in MyTax (OmaVero)</span>
            </div>
            <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside pl-0.5 leading-relaxed">
              <li>Log in to <strong>MyTax</strong> at <a href={VERO_LINKS.OMAVERO} target="_blank" rel="noopener noreferrer" className="text-[#003580] font-semibold underline">vero.fi/mytax</a> using your online banking codes or Mobile Certificate.</li>
              <li>Under your sole proprietorship (toiminimi), click: <strong>Business tax return for self-employed individuals (Tax return form 5)</strong>.</li>
              <li>Copy each calculated figure below directly into the corresponding box in MyTax using the <strong>Copy</strong> buttons.</li>
              <li>Important: All amounts must be reported <strong>net of VAT (VAT 0%)</strong> if you are registered for VAT.</li>
            </ol>
            <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
              <a 
                href={VERO_LINKS.FORM_5_GUIDE} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#003580] font-semibold hover:underline inline-flex items-center space-x-1 min-h-[32px]"
              >
                <span>Official Tax Administration instructions for Form 5</span>
                <ArrowUpRight size={13} />
              </a>
            </div>
          </div>

          {/* Section 1: Tuotot (Turnover) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                1. Business Income (Tuotot)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">MyTax Income Stage</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Box 300: Liikevaihto */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#003580] bg-blue-50 px-2 py-0.5 rounded">
                      Box 300 / 3000
                    </span>
                    <span className="text-[11px] text-slate-500">VAT 0%</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1.5">Net Turnover (Liikevaihto)</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Total sales from invoices and card terminal / platform settlements excluding VAT.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                    {formatFinnishCurrency(form5.turnoverNet)}
                  </span>
                  <button
                    onClick={() => handleCopy(form5.turnoverNet, 'turnoverNet')}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-white bg-[#003580] hover:bg-[#002868] active:scale-[0.98] rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                  >
                    {copiedField === 'turnoverNet' ? (
                      <>
                        <Check size={16} className="text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy figure</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Box 340: Saadut avustukset ja tuet */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#003580] bg-blue-50 px-2 py-0.5 rounded">
                      Box 340 / 3400
                    </span>
                    <span className="text-[11px] text-slate-500">VAT 0%</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1.5">Subsidies and Grants (Saadut tuet)</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Start-up grant (Starttiraha) or development subsidies. Taxable business income, not subject to VAT.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                    {formatFinnishCurrency(form5.grantsAndSubsidies)}
                  </span>
                  <button
                    onClick={() => handleCopy(form5.grantsAndSubsidies, 'grantsAndSubsidies')}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-white bg-[#003580] hover:bg-[#002868] active:scale-[0.98] rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                  >
                    {copiedField === 'grantsAndSubsidies' ? (
                      <>
                        <Check size={16} className="text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy figure</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Kulut (Expenses) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Deductible Business Expenses (Kulut)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">MyTax Expenses Stage</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Box 350: Aineet ja tarvikkeet */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#003580] bg-blue-50 px-2 py-0.5 rounded">
                      Box 350 / 3500
                    </span>
                    <span className="text-[11px] text-slate-500">Net purchases</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1.5">Materials, Supplies & Goods (Aineet)</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Raw materials, goods purchased for resale, or direct production supplies (excluding VAT).
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                    {formatFinnishCurrency(form5.materialsSupplies)}
                  </span>
                  <button
                    onClick={() => handleCopy(form5.materialsSupplies, 'materialsSupplies')}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-white bg-[#003580] hover:bg-[#002868] active:scale-[0.98] rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                  >
                    {copiedField === 'materialsSupplies' ? (
                      <>
                        <Check size={16} className="text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy figure</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Box 374: Muut vähennyskelpoiset kulut */}
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#003580] bg-blue-50 px-2 py-0.5 rounded">
                      Box 374 / 3740
                    </span>
                    <span className="text-[11px] text-slate-500">Net expenses</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 mt-1.5">Other Operating Expenses (Muut kulut)</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                    Software, IT tools, telephone, internet, marketing, insurance, accounting, and Stripe/payment gateway fees.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                    {formatFinnishCurrency(form5.operatingExpenses)}
                  </span>
                  <button
                    onClick={() => handleCopy(form5.operatingExpenses, 'operatingExpenses')}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-white bg-[#003580] hover:bg-[#002868] active:scale-[0.98] rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                  >
                    {copiedField === 'operatingExpenses' ? (
                      <>
                        <Check size={16} className="text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy figure</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Lisävähennykset (Additional Deductions) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                3. Additional Deductions (Lisävähennykset)
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">MyTax Deductions Stage</span>
            </div>

            <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[11px] font-bold text-[#003580] bg-blue-50 px-2 py-0.5 rounded">
                      Box 378
                    </span>
                    <span className="font-bold text-sm text-slate-900">Total Additional Deductions (Lisävähennykset)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Combined driver's log kilometre allowance and home office workspace deduction.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 sm:pt-0">
                  <span className="text-lg font-bold font-mono text-slate-900 tabular-nums">
                    {formatFinnishCurrency(form5.totalLisavahennykset)}
                  </span>
                  <button
                    onClick={() => handleCopy(form5.totalLisavahennykset, 'totalLisavahennykset')}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-white bg-[#003580] hover:bg-[#002868] active:scale-[0.98] rounded-xl transition flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px]"
                  >
                    {copiedField === 'totalLisavahennykset' ? (
                      <>
                        <Check size={16} className="text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy figure</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Erittely */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/70 text-xs">
                <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">Driver's Log Allowance</span>
                    <span className="text-[10px] text-slate-500">€0.55/km (2026 statutory rate)</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 tabular-nums text-xs">
                    {formatFinnishCurrency(form5.mileageDeduction)}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200/60 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800 block text-xs">Home Office Deduction</span>
                    <span className="text-[10px] text-slate-500">Standard formula or actual expenses</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 tabular-nums text-xs">
                    {formatFinnishCurrency(form5.homeOfficeDeduction)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Yhteenveto & Yrittäjävähennys */}
          <div className="p-4 sm:p-5 bg-slate-900 text-white rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                4. Final Taxable Business Income
              </span>
              <span className="text-[10px] bg-slate-800 text-emerald-400 font-semibold px-2 py-0.5 rounded self-start sm:self-auto">
                Automatic 5% Entrepreneur Relief
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 block">Business Profit before relief</span>
                <span className="text-base font-bold font-mono tabular-nums text-slate-100">
                  {formatFinnishCurrency(form5.businessResult)}
                </span>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-300 block">Entrepreneur Relief 5% (Box 380)</span>
                <span className="text-base font-bold font-mono tabular-nums text-emerald-400">
                  - {formatFinnishCurrency(form5.yrittajaVahennys)}
                </span>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-xl space-y-1 border border-emerald-500/30">
                <span className="text-[10px] text-slate-300 font-semibold block">Taxable Business Income (95%)</span>
                <span className="text-base font-bold font-mono tabular-nums text-white">
                  {formatFinnishCurrency(form5.taxableBusinessIncome)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/50 rounded-xl text-xs text-slate-300 flex items-start space-x-2">
              <Info size={16} className="text-sky-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px] sm:text-xs">
                <strong>Official Tax Administration rule:</strong> The Finnish Tax Administration (Vero) automatically calculates and deducts the 5% entrepreneur relief from positive business income. You do not need to enter this figure manually in MyTax.
              </div>
            </div>
          </div>

          {/* Sole Trader Best Practices Checklist */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Sole Trader Checklist & Requirements</span>
            </h4>
            <ul className="space-y-1.5 text-slate-600 text-[11px] list-disc list-inside leading-relaxed">
              <li><strong>Record retention:</strong> Under the Finnish Accounting Act (Kirjanpitolaki), retain all receipts, invoices, and bank statements for at least 6 years from the end of the calendar year.</li>
              <li><strong>YEL Pension Insurance:</strong> If paid from the business bank account, deduct as an operating expense on Form 5; if paid from your private account, deduct on your personal tax return.</li>
              <li><strong>Filing deadline:</strong> Business tax return 5 must be submitted by early April (or by the specific date stated in your MyTax portal).</li>
            </ul>
          </div>
        </div>

        {/* Pinned Sticky Bottom Toolbar (Apple HIG Mobile Sheet Pattern) */}
        <div className="sticky bottom-0 border-t border-slate-100 p-3 sm:p-4 bg-white/95 backdrop-blur-md flex items-center justify-between gap-2.5 shadow-lg shrink-0">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-xl transition min-h-[44px] flex items-center justify-center"
          >
            Close Helper
          </button>
          <a
            href={VERO_LINKS.OMAVERO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-2 sm:flex-initial px-5 py-2.5 text-xs font-semibold text-white bg-[#003580] hover:bg-[#002868] active:scale-[0.98] rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs min-h-[44px]"
          >
            <span>Open MyTax (OmaVero)</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};
