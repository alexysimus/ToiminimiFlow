import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Building, ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';
import { BusinessInfo, BankAccount, TaxSettings } from '../types';
import { storageService } from '../services/storageService';
import { formatFinnishIban } from '../services/formatUtils';

const BusinessInfoForm: React.FC = () => {
  const [info, setInfo] = useState<BusinessInfo>({
    name: '',
    businessId: '',
    address: '',
    email: '',
    phone: '',
    bankAccounts: []
  });

  const [taxSettings, setTaxSettings] = useState<TaxSettings>(storageService.getTaxSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setInfo(storageService.getBusinessInfo());
    setTaxSettings(storageService.getTaxSettings());
  }, []);

  const handleSave = () => {
    storageService.saveBusinessInfo(info);
    storageService.saveTaxSettings(taxSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const addBankAccount = () => {
    const newAcc: BankAccount = {
      id: storageService.generateId(),
      label: '',
      iban: '',
      bic: ''
    };
    setInfo({ ...info, bankAccounts: [...info.bankAccounts, newAcc] });
  };

  const updateAccount = (id: string, field: keyof BankAccount, value: string) => {
    setInfo({
      ...info,
      bankAccounts: info.bankAccounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc)
    });
  };

  const removeAccount = (id: string) => {
    setInfo({ ...info, bankAccounts: info.bankAccounts.filter(acc => acc.id !== id) });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block">
            Business Profile & Tax Settings
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Business Details (Omat yritystiedot)
          </h1>
        </div>

        <button 
          onClick={handleSave} 
          className="flex items-center justify-center space-x-2 bg-[#003580] hover:bg-[#002868] text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition min-h-[44px]"
        >
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>Business details and tax parameters saved successfully!</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 md:p-8 border border-slate-200/80 space-y-6">
        {/* Company Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider flex items-center space-x-2">
            <Building className="text-[#003580]" size={16} />
            <span>Sole Trader Details (Toiminimi)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Business Name (Toiminimen nimi) *</label>
              <input 
                value={info.name}
                onChange={(e) => setInfo({...info, name: e.target.value})}
                placeholder="e.g. Tmi Alex Developer"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business ID (Y-tunnus) *</label>
              <input 
                value={info.businessId}
                onChange={(e) => setInfo({...info, businessId: e.target.value})}
                placeholder="1234567-8"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Email</label>
              <input 
                value={info.email}
                onChange={(e) => setInfo({...info, email: e.target.value})}
                placeholder="alex@example.fi"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Postal Address & City</label>
              <input 
                value={info.address}
                onChange={(e) => setInfo({...info, address: e.target.value})}
                placeholder="Mannerheimintie 10 B, 00100 Helsinki"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input 
                value={info.phone}
                onChange={(e) => setInfo({...info, phone: e.target.value})}
                placeholder="+358 40 123 4567"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider flex items-center space-x-2">
            <ShieldCheck className="text-[#003580]" size={16} />
            <span>Taxation & VAT Settings (Verohallinto)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">VAT Tax Period (ALV-kausi)</label>
              <select
                value={taxSettings.vatPeriod}
                onChange={(e) => setTaxSettings({...taxSettings, vatPeriod: e.target.value as TaxSettings['vatPeriod']})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
              >
                <option value="year">Calendar Year (Due Feb 28)</option>
                <option value="quarter">Quarterly (Due May 12, Aug 12, Nov 12, Feb 12)</option>
                <option value="month">Monthly (Due 12th of month + 2)</option>
                <option value="exempt">Not VAT-registered (&lt; €20,000 threshold)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Personal Tax Rate (%)</label>
              <div className="relative">
                <input 
                  type="number"
                  step="0.5"
                  value={taxSettings.personalTaxRate}
                  onChange={(e) => setTaxSettings({...taxSettings, personalTaxRate: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-8 py-2.5 text-base sm:text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assessed Prepayment Tax (€/year)</label>
              <div className="relative">
                <input 
                  type="number"
                  step="10"
                  value={taxSettings.prepaymentTaxAssessed || ''}
                  placeholder="0.00"
                  onChange={(e) => setTaxSettings({...taxSettings, prepaymentTaxAssessed: parseFloat(e.target.value) || 0})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-base sm:text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[44px]"
                />
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">€</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider flex items-center space-x-2">
              <CreditCard className="text-[#003580]" size={16} />
              <span>Billing Bank Accounts (IBAN)</span>
            </h3>
            <button 
              onClick={addBankAccount}
              className="text-xs flex items-center text-[#003580] hover:text-[#002255] font-semibold min-h-[40px] px-2 py-1"
            >
              <Plus size={15} className="mr-1" /> Add Account
            </button>
          </div>

          <div className="space-y-3">
            {info.bankAccounts.map((acc) => (
              <div key={acc.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 relative group space-y-3">
                <div className="flex justify-between items-center pb-1">
                  <span className="text-xs font-bold text-slate-700">Account Details</span>
                  <button 
                    onClick={() => removeAccount(acc.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition min-h-[44px] min-w-[44px] flex items-center justify-end"
                    title="Remove account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Account Label / Bank</label>
                    <input 
                      placeholder="e.g. OP Business Account"
                      value={acc.label}
                      onChange={(e) => updateAccount(acc.id, 'label', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs text-slate-900 font-medium focus:ring-1 focus:ring-[#003580] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">IBAN Account Number</label>
                    <input 
                      placeholder="FI21 1234 5600 0007 89"
                      value={acc.iban}
                      onChange={(e) => updateAccount(acc.id, 'iban', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs font-mono font-medium text-slate-900 focus:ring-1 focus:ring-[#003580] min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">BIC / SWIFT</label>
                    <input 
                      placeholder="OKOYFIHH"
                      value={acc.bic}
                      onChange={(e) => updateAccount(acc.id, 'bic', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-base sm:text-xs font-mono font-medium text-slate-900 focus:ring-1 focus:ring-[#003580] min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
            ))}
            {info.bankAccounts.length === 0 && (
              <p className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                No bank accounts saved yet. Add at least one bank account to print on sales invoices.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessInfoForm;
