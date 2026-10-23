import React, { useState, useEffect } from 'react';
import { 
  Car, Home, Shield, Plus, Trash2, ExternalLink, 
  Info, Check, AlertCircle, HelpCircle, ArrowRight 
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { VERO_CONSTANTS, VERO_LINKS, veroTaxEngine } from '../services/veroTaxEngine';
import { 
  formatFinnishCurrency, formatFinnishDate, formatFinnishPercent, formatFinnishNumber, parseFinnishNumber 
} from '../services/formatUtils';
import { MileageEntry, HomeOfficeDeduction } from '../types';

export const DeductionsView: React.FC = () => {
  const currentYear = 2026;
  const [mileageEntries, setMileageEntries] = useState<MileageEntry[]>([]);
  const [homeOffice, setHomeOffice] = useState<HomeOfficeDeduction>(storageService.getHomeOfficeDeduction(currentYear));
  
  // Trip form state
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [route, setRoute] = useState<string>('');
  const [kilometers, setKilometers] = useState<string>('');
  const [purpose, setPurpose] = useState<string>('');
  const [passengers, setPassengers] = useState<number>(0);
  const [activeSection, setActiveSection] = useState<'mileage' | 'office' | 'yel'>('mileage');

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setMileageEntries(storageService.getMileageEntries());
    setHomeOffice(storageService.getHomeOfficeDeduction(currentYear));
  };

  const handleAddTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const kmNum = parseFinnishNumber(kilometers);
    if (!route.trim() || isNaN(kmNum) || kmNum <= 0) {
      alert('Please enter a valid route and number of kilometres.');
      return;
    }

    const newTrip: MileageEntry = {
      id: storageService.generateId(),
      date,
      route: route.trim(),
      kilometers: kmNum,
      purpose: purpose.trim() || 'Client meeting / business travel',
      passengers,
      ratePerKm: VERO_CONSTANTS.MILEAGE_RATE_2026,
      createdAt: new Date().toISOString()
    };

    storageService.saveMileageEntry(newTrip);
    setRoute('');
    setKilometers('');
    setPurpose('');
    setPassengers(0);
    refreshData();
  };

  const handleDeleteTrip = (id: string) => {
    if (confirm('Are you sure you want to delete this trip from the driver\'s log?')) {
      storageService.deleteMileageEntry(id);
      refreshData();
    }
  };

  const handleUpdateHomeOfficeTier = (method: HomeOfficeDeduction['method'], actualAmount?: number) => {
    const updated: HomeOfficeDeduction = {
      year: currentYear,
      method,
      actualAmount: actualAmount !== undefined ? actualAmount : homeOffice.actualAmount,
      notes: method === 'tier_1' 
        ? 'Full-time / over 50% remote work' 
        : method === 'tier_2' 
        ? 'Regular 25–50% remote work' 
        : 'Occasional remote work'
    };
    storageService.saveHomeOfficeDeduction(updated);
    setHomeOffice(updated);
  };

  const { totalKm, totalDeduction } = veroTaxEngine.getMileageDeductionTotal(mileageEntries, currentYear);
  const homeOfficeAmount = veroTaxEngine.getHomeOfficeAmount(homeOffice);
  const grandTotalDeductions = totalDeduction + homeOfficeAmount;

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* Top Banner Disclaimer */}
      <div className="bg-[#EDF4FC] border border-[#BFDBFE] rounded-2xl p-4 md:p-5 flex items-start space-x-3.5 shadow-xs">
        <Info className="text-[#003580] shrink-0 mt-0.5" size={20} />
        <div className="space-y-1 min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#003580]">
            Statutory Additional Deductions (Form 5 Box 378)
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Business travel in a private vehicle and home office deductions are claimed on <strong>Form 5, Box 378 (Lisävähennykset)</strong>. They directly reduce your taxable business profit and your individual income tax.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Total Additional Deductions (Box 378)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#003580] tracking-tight truncate">
            {formatFinnishCurrency(grandTotalDeductions)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            Deducted from taxable profit
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Mileage Allowance ({totalKm} km)
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight truncate">
            {formatFinnishCurrency(totalDeduction)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            €0.55/km (Vero 2026 statutory rate)
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
            Home Office Deduction
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight truncate">
            {formatFinnishCurrency(homeOfficeAmount)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
            {homeOffice.method === 'tier_1' ? 'Full-Time (€980)' : homeOffice.method === 'tier_2' ? 'Part-Time (€490)' : 'Occasional (€245)'}
          </p>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveSection('mileage')}
          className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap min-h-[40px] flex items-center justify-center space-x-1.5 ${
            activeSection === 'mileage'
              ? 'bg-white text-[#003580] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car size={15} />
          <span>Driver's Log ({mileageEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('office')}
          className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap min-h-[40px] flex items-center justify-center space-x-1.5 ${
            activeSection === 'office'
              ? 'bg-white text-[#003580] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home size={15} />
          <span>Home Office Deduction</span>
        </button>

        <button
          onClick={() => setActiveSection('yel')}
          className={`flex-1 px-4 py-2 text-xs font-semibold rounded-lg transition whitespace-nowrap min-h-[40px] flex items-center justify-center space-x-1.5 ${
            activeSection === 'yel'
              ? 'bg-white text-[#003580] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield size={15} />
          <span>YEL Pension Insurance</span>
        </button>
      </div>

      {/* Section 1: Mileage Log (Ajopäiväkirja) */}
      {activeSection === 'mileage' && (
        <div className="space-y-4">
          {/* Add Trip Form */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">
              Add Business Trip to Driver's Log
            </h3>

            <form onSubmit={handleAddTrip} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[40px]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Route (From – To)</label>
                <input
                  type="text"
                  placeholder="e.g. Helsinki – Tampere – Helsinki"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[40px]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Distance (km)</label>
                <input
                  type="text"
                  placeholder="e.g. 42"
                  value={kilometers}
                  onChange={(e) => setKilometers(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[40px]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Business Purpose / Client</label>
                <input
                  type="text"
                  placeholder="e.g. Client consultation meeting"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[40px]"
                />
              </div>

              <div className="flex items-end sm:col-span-2 md:col-span-1">
                <button
                  type="submit"
                  className="w-full py-2 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center space-x-1 min-h-[40px]"
                >
                  <Plus size={16} />
                  <span>Add Trip</span>
                </button>
              </div>
            </form>
          </div>

          {/* Trips List / Table Container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Driver's Log Records ({mileageEntries.length})</h3>
                <p className="text-xs text-slate-500">Statutory travel log required for Finnish Tax Administration audits</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-slate-900 font-mono tabular-nums">{formatFinnishNumber(totalKm, 1, 1)} km</span>
                <span className="text-xs text-slate-400"> · </span>
                <span className="text-xs font-bold text-[#003580] font-mono tabular-nums">{formatFinnishCurrency(totalDeduction)}</span>
              </div>
            </div>

            {mileageEntries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No trips recorded. Add your first business trip using the form above.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-semibold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Route</th>
                        <th className="py-2.5 px-3">Purpose</th>
                        <th className="py-2.5 px-3 text-right">Distance</th>
                        <th className="py-2.5 px-3 text-right">Deduction</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mileageEntries.map(trip => {
                        const tripDeduction = trip.kilometers * ((trip.ratePerKm || VERO_CONSTANTS.MILEAGE_RATE_2026) + (trip.passengers || 0) * VERO_CONSTANTS.PASSENGER_RATE_2026);
                        return (
                          <tr key={trip.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {formatFinnishDate(trip.date)}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900">{trip.route}</td>
                            <td className="py-3 px-3 text-slate-500">{trip.purpose}</td>
                            <td className="py-3 px-3 text-right font-mono font-medium text-slate-800 whitespace-nowrap tabular-nums">
                              {formatFinnishNumber(trip.kilometers, 1, 1)} km
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-[#003580] whitespace-nowrap tabular-nums">
                              {formatFinnishCurrency(tripDeduction)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleDeleteTrip(trip.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg min-h-[32px] min-w-[32px]"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Grouped Inset Cards View */}
                <div className="block md:hidden divide-y divide-slate-100">
                  {mileageEntries.map(trip => {
                    const tripDeduction = trip.kilometers * ((trip.ratePerKm || VERO_CONSTANTS.MILEAGE_RATE_2026) + (trip.passengers || 0) * VERO_CONSTANTS.PASSENGER_RATE_2026);
                    return (
                      <div key={trip.id} className="py-3 space-y-1.5">
                        <div className="flex items-center justify-between min-w-0">
                          <span className="font-semibold text-xs text-slate-900 truncate pr-2">
                            {trip.route}
                          </span>
                          <span className="font-mono font-bold text-xs text-[#003580] tabular-nums whitespace-nowrap">
                            {formatFinnishCurrency(tripDeduction)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[200px]">{trip.purpose}</span>
                          <span className="font-mono">{formatFinnishNumber(trip.kilometers, 1, 1)} km</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span className="font-mono">{formatFinnishDate(trip.date)}</span>
                          <button
                            onClick={() => handleDeleteTrip(trip.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 min-h-[32px] min-w-[32px] flex items-center justify-end"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Home Office Deduction */}
      {activeSection === 'office' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center space-x-2">
                <Home className="text-[#003580]" size={18} />
                <span>Finnish Tax Administration Standard Home Office Deductions 2026</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sole proprietors can claim a statutory formula deduction without itemizing individual electricity, rent, or heating receipts.
              </p>
            </div>
            <a
              href={VERO_LINKS.HOME_OFFICE_DEDUCTION}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#003580] hover:underline font-semibold flex items-center space-x-1 self-start sm:self-auto min-h-[32px]"
            >
              <span>Vero.fi Home Office Guide</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* 3 Tier Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div 
              onClick={() => handleUpdateHomeOfficeTier('tier_1')}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition cursor-pointer space-y-2 relative min-h-[44px] ${
                homeOffice.method === 'tier_1'
                  ? 'border-[#003580] bg-[#EDF4FC]/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {homeOffice.method === 'tier_1' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#003580] text-white flex items-center justify-center">
                  <Check size={12} />
                </div>
              )}
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#003580] block">
                Tier 1 · Full-Time
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {formatFinnishCurrency(VERO_CONSTANTS.HOME_OFFICE_TIER_1)} <span className="text-xs font-normal text-slate-500">/ yr</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The home is used continuously and primarily for business activities (more than 50% of working days).
              </p>
            </div>

            <div 
              onClick={() => handleUpdateHomeOfficeTier('tier_2')}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition cursor-pointer space-y-2 relative min-h-[44px] ${
                homeOffice.method === 'tier_2'
                  ? 'border-[#003580] bg-[#EDF4FC]/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {homeOffice.method === 'tier_2' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#003580] text-white flex items-center justify-center">
                  <Check size={12} />
                </div>
              )}
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                Tier 2 · Regular Part-Time
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {formatFinnishCurrency(VERO_CONSTANTS.HOME_OFFICE_TIER_2)} <span className="text-xs font-normal text-slate-500">/ yr</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Regular remote work or side business activity (approximately 2–3 days per week).
              </p>
            </div>

            <div 
              onClick={() => handleUpdateHomeOfficeTier('tier_3')}
              className={`p-4 sm:p-5 rounded-2xl border-2 transition cursor-pointer space-y-2 relative min-h-[44px] ${
                homeOffice.method === 'tier_3'
                  ? 'border-[#003580] bg-[#EDF4FC]/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              {homeOffice.method === 'tier_3' && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#003580] text-white flex items-center justify-center">
                  <Check size={12} />
                </div>
              )}
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Tier 3 · Occasional
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tabular-nums">
                {formatFinnishCurrency(VERO_CONSTANTS.HOME_OFFICE_TIER_3)} <span className="text-xs font-normal text-slate-500">/ yr</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Occasional invoicing, bookkeeping, and administrative tasks at home (up to 1 day per week).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: YEL */}
      {activeSection === 'yel' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
            <Shield className="text-[#003580]" size={20} />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              Self-Employed Person's Pension Insurance (YEL)
            </h3>
          </div>
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              YEL insurance is statutory pension and social security coverage for sole traders in Finland if your confirmed work income exceeds <strong>€9,010.28 per year (2026 threshold)</strong> and your entrepreneurial activity lasts over 4 months.
            </p>
            <p>
              YEL premiums can be deducted either as business expenses on Form 5 (Lomake 5) or on your individual tax return (Form 1A). For most sole traders, deducting them on Form 5 is the most straightforward.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeductionsView;
