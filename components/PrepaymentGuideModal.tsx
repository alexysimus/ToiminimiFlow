import React from 'react';
import { ExternalLink, HelpCircle, ShieldCheck, CheckCircle, ArrowRight } from 'lucide-react';
import { BottomSheet } from './ui/BottomSheet';
import { VERO_LINKS } from '../services/veroTaxEngine';

interface PrepaymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTaxRate: number;
}

export const PrepaymentGuideModal: React.FC<PrepaymentGuideModalProps> = ({
  isOpen,
  onClose,
  currentTaxRate
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      position="top"
      title="How Sole Trader Income Tax & Prepayment Tax Work"
      subtitle="A guide for self-employed individuals (toiminimi) in Finland"
      icon={<ShieldCheck size={20} />}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6 text-slate-700 text-xs sm:text-sm">
        {/* Critical Concept Alert - Finnish Ice Blue & Deep Navy Accent */}
        <div className="bg-[#EDF4FC] border border-[#BFDBFE] p-4 sm:p-5 rounded-2xl shadow-2xs">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-white text-[#003580] flex items-center justify-center shrink-0 shadow-2xs border border-[#BFDBFE]">
              <HelpCircle size={18} />
            </div>
            <div className="space-y-1.5 min-w-0">
              <h4 className="font-bold text-[#003580] text-sm sm:text-base leading-snug">
                Why isn't income tax withheld from every invoice?
              </h4>
              <p className="text-slate-600 leading-relaxed text-xs">
                As a self-employed <strong>sole trader (toiminimiyrittäjä)</strong>, the Finnish Tax Administration (Vero) does <em>not</em> withhold income tax per invoice. Instead, your business income tax is paid via bank transfer as <strong>Prepayment Tax (Ennakkovero)</strong> according to your advance tax assessment decision in MyTax.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Steps - Crisp White Inset Cards with Finnish Flag Blue Accents */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              4 Golden Tax Rules for Sole Traders
            </h3>
            <span className="text-[11px] font-semibold text-[#003580] bg-[#EDF4FC] px-2.5 py-0.5 rounded-full">
              Verohallinto 2026
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Step 1 */}
            <div className="p-4 border border-slate-200/90 rounded-2xl bg-white shadow-2xs space-y-2 hover:border-[#BFDBFE] transition">
              <div className="flex items-center space-x-2 text-[#003580] font-bold text-xs uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#003580] text-white flex items-center justify-center text-[10px] font-mono">1</span>
                <span>Prepayment Tax Decision</span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Estimate in MyTax</h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Log in to <strong>MyTax (OmaVero)</strong>. Choose <em>Tax matters &gt; Request or adjust prepayment tax</em>. Estimate your expected annual net profit (e.g. €20,000).
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 border border-slate-200/90 rounded-2xl bg-white shadow-2xs space-y-2 hover:border-[#BFDBFE] transition">
              <div className="flex items-center space-x-2 text-[#003580] font-bold text-xs uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#003580] text-white flex items-center justify-center text-[10px] font-mono">2</span>
                <span>Tax Safe Bank Reserve</span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Reserve Tax in Account</h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                The <strong>Tax Safe Reserve</strong> in this app calculates the exact cash buffer (VAT + income tax) that you should keep in your business account for upcoming deadlines.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 border border-slate-200/90 rounded-2xl bg-white shadow-2xs space-y-2 hover:border-[#BFDBFE] transition">
              <div className="flex items-center space-x-2 text-[#003580] font-bold text-xs uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#003580] text-white flex items-center justify-center text-[10px] font-mono">3</span>
                <span>Pay Installments on Time</span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Quarterly Installments</h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Vero generates payment slips in MyTax. Prepayment tax typically falls due 2 to 4 times a year (February, May, August, November).
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 border border-slate-200/90 rounded-2xl bg-white shadow-2xs space-y-2 hover:border-[#BFDBFE] transition">
              <div className="flex items-center space-x-2 text-[#003580] font-bold text-xs uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-[#003580] text-white flex items-center justify-center text-[10px] font-mono">4</span>
                <span>Review Profit</span>
              </div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Adjust when Revenue Changes</h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                If your business revenue rises or drops noticeably, adjust your estimate in MyTax to avoid back taxes (jäännösvero / mätkyt) or overpaying.
              </p>
            </div>
          </div>
        </div>

        {/* Money Withdrawal / Yksityisotto */}
        <div className="p-4 sm:p-5 border border-emerald-200/80 rounded-2xl bg-emerald-50/40 space-y-2">
          <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle className="text-emerald-600 shrink-0" size={16} />
            <span>How do I take money out for personal use? (Owner's Drawings / Yksityisotto)</span>
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
            As a sole trader, you do not pay yourself a traditional employee payslip or salary. The portion displayed in green as <strong>"Safe to Withdraw (Owner's Draw)"</strong> is money you can transfer from your business bank account to your personal account at any time without filing a separate tax report.
          </p>
        </div>

        {/* Action Links */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <a 
            href={VERO_LINKS.PREPAYMENT_TAX} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-[#003580] hover:text-[#002868] font-semibold text-xs min-h-[40px] px-1"
          >
            <span>Tax Administration Prepayment Tax Guide</span>
            <ExternalLink size={14} />
          </a>

          <a 
            href={VERO_LINKS.OMAVERO} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
          >
            <span>Open MyTax (OmaVero)</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </BottomSheet>
  );
};

export default PrepaymentGuideModal;
