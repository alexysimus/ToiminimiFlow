import React, { useState } from 'react';
import { CreditCard, Check, Info } from 'lucide-react';
import { SalesSettlement } from '../types';
import { storageService } from '../services/storageService';
import { formatFinnishCurrency, parseFinnishNumber } from '../services/formatUtils';
import { BottomSheet } from './ui/BottomSheet';

interface SalesSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SalesSettlementModal: React.FC<SalesSettlementModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [provider, setProvider] = useState<SalesSettlement['provider']>('iZettle');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [grossAmount, setGrossAmount] = useState<string>('');
  const [feeAmount, setFeeAmount] = useState<string>('');
  const [vatRate, setVatRate] = useState<number>(25.5);
  const [description, setDescription] = useState<string>('');

  const grossNum = parseFinnishNumber(grossAmount);
  const feeNum = parseFinnishNumber(feeAmount);
  const netNum = Math.max(0, grossNum - feeNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (grossNum <= 0) {
      alert('Please enter a valid gross sales amount.');
      return;
    }

    const newSettlement: SalesSettlement = {
      id: storageService.generateId(),
      date,
      provider,
      grossAmount: grossNum,
      feeAmount: feeNum,
      netAmount: netNum,
      vatRate,
      description: description.trim() || `${provider} daily sales settlement`,
      createdAt: new Date().toISOString()
    };

    storageService.saveSalesSettlement(newSettlement);
    onSuccess();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Record POS / Card Settlement"
      subtitle="Zettle, SumUp, Stripe, Wolt and payment terminals"
      icon={<CreditCard size={20} />}
      maxWidthClass="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as SalesSettlement['provider'])}
              className="w-full text-base sm:text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
            >
              <option value="iZettle">Zettle (PayPal)</option>
              <option value="SumUp">SumUp</option>
              <option value="Stripe">Stripe</option>
              <option value="Wolt">Wolt Merchant</option>
              <option value="Foodora">Foodora</option>
              <option value="Cash">Cash Register</option>
              <option value="Other">Other Provider</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Date</label>
            <input 
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-base sm:text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Gross Sales (incl. VAT)</label>
            <input 
              type="text"
              placeholder="0,00"
              value={grossAmount}
              onChange={(e) => setGrossAmount(e.target.value)}
              className="w-full text-base sm:text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Processing Fee (Expense)</label>
            <input 
              type="text"
              placeholder="0,00"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              className="w-full text-base sm:text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Applicable VAT Rate (2026)</label>
          <div className="grid grid-cols-4 gap-2">
            {[25.5, 13.5, 10, 0].map(rate => (
              <button
                type="button"
                key={rate}
                onClick={() => setVatRate(rate)}
                className={`py-2 text-xs font-medium rounded-xl border transition min-h-[44px] ${
                  vatRate === rate 
                    ? 'bg-[#003580] text-white border-[#003580] shadow-xs font-bold' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {rate.toString().replace('.', ',')}&nbsp;%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Memo (Optional)</label>
          <input 
            type="text"
            placeholder="e.g. Weekend market card sales"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-base sm:text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
          />
        </div>

        {/* Net Calculation Summary */}
        <div className="p-3 bg-[#EDF4FC] border border-[#BFDBFE] rounded-xl flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-600 font-medium">Net Payout to Bank:</span>
          <span className="font-mono font-bold text-[#003580] text-sm sm:text-base tabular-nums">{formatFinnishCurrency(netNum)}</span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 pt-1">
          <Info size={14} className="shrink-0 text-slate-400" />
          <span>The payment processor fee is automatically accounted as a deductible business expense under Form 5 box 374.</span>
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 min-h-[44px]"
          >
            <Check size={16} />
            <span>Save Settlement</span>
          </button>
        </div>
      </form>
    </BottomSheet>
  );
};

export default SalesSettlementModal;
