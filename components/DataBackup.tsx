import React, { useRef, useState } from 'react';
import { Download, Upload, ShieldAlert, Database, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { storageService } from '../services/storageService';
import { formatFinnishDate } from '../services/formatUtils';

const DataBackup: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleExport = () => {
    const data = storageService.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toiminimi_flow_varmuuskopio_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage({ text: 'Backup file (.json) downloaded to your device successfully!', type: 'success' });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storageService.importAllData(content);
      if (success) {
        setStatusMessage({ text: 'Data restored successfully! Refreshing view...', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatusMessage({ text: 'Error: The selected file is not a valid Flow Toiminimi backup.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-12">
      <div className="pb-3 border-b border-slate-200">
        <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block">
          Data Security & Export
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Backup & Restore (Varmuuskopiot)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Safeguard your accounting vouchers, invoices, and mileage log across devices.
        </p>
      </div>

      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-rose-600 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 md:p-8 border border-slate-200/80 space-y-6">
        <div className="flex items-center space-x-3 p-4 bg-[#EDF4FC] rounded-2xl border border-[#BFDBFE]">
          <div className="bg-[#003580] p-2.5 rounded-xl text-white shrink-0">
            <Database size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-[#003580] uppercase tracking-wider">Client-Side Privacy (100% On-Device)</h3>
            <p className="text-xs text-slate-600">Your accounting records remain confidential on your device with no external server tracking.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="p-5 sm:p-6 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
            <div className="bg-white p-3.5 rounded-2xl shadow-2xs text-[#003580]">
              <Download size={24} />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Download Backup (JSON)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export a complete archive containing all invoices, expense vouchers, mileage logs, tax parameters, and clients.
            </p>
            <button 
              onClick={handleExport}
              className="w-full py-2.5 bg-[#003580] hover:bg-[#002868] text-white rounded-xl text-xs font-semibold shadow-xs transition min-h-[44px] flex items-center justify-center space-x-1.5"
            >
              <Download size={15} />
              <span>Download Backup (.json)</span>
            </button>
          </div>

          <div className="p-5 sm:p-6 bg-slate-50/70 rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
            <div className="bg-white p-3.5 rounded-2xl shadow-2xs text-slate-700">
              <Upload size={24} />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Restore from Backup</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Import a previously downloaded .json backup file to restore all your bookkeeping records into your browser.
            </p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition min-h-[44px] flex items-center justify-center space-x-1.5"
            >
              <Upload size={15} />
              <span>Select Backup File</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json"
              onChange={handleImport}
            />
          </div>
        </div>

        <div className="flex items-start bg-amber-50 p-4 rounded-xl border border-amber-200/80 space-x-3">
          <ShieldAlert className="text-amber-700 shrink-0 mt-0.5" size={20} />
          <div className="space-y-1 min-w-0">
            <h5 className="font-bold text-amber-800 text-xs uppercase tracking-wider">Statutory 6-Year Retention Rule</h5>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              Under Finnish accounting law (Kirjanpitolaki), sole traders must preserve accounting records and receipts for at least 6 years from the end of the financial year. We recommend downloading a backup monthly to store in your secure cloud drive (e.g. Google Drive or iCloud).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataBackup;
