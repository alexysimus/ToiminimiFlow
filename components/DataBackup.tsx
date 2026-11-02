import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, Upload, ShieldAlert, Database, Check, CheckCircle2, 
  AlertCircle, Folder, FolderOpen, RefreshCw, Trash2, ShieldCheck, HardDrive, Clock
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { receiptFileService } from '../services/receiptFileService';
import { formatFinnishDate } from '../services/formatUtils';
import { SyncMetadata } from '../types';

const DataBackup: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata>(() => storageService.getSyncMetadata());
  const [linkedFolder, setLinkedFolder] = useState<string | null>(null);
  const [isConnectingFolder, setIsConnectingFolder] = useState(false);

  useEffect(() => {
    refreshState();
  }, []);

  const refreshState = () => {
    setSyncMeta(storageService.getSyncMetadata());
    receiptFileService.getReceiptDirectoryName().then(setLinkedFolder);
  };

  const handleExport = () => {
    const data = storageService.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toiminimi_flow_varmuuskopio_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    refreshState();
    setStatusMessage({ text: 'Backup archive (.json) downloaded to your device successfully!', type: 'success' });
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
        setStatusMessage({ text: 'Bookkeeping data restored successfully! Refreshing view...', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setStatusMessage({ text: 'Error: The selected file is not a valid Toiminimi Flow backup.', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const handleConnectFolder = async () => {
    setIsConnectingFolder(true);
    const res = await receiptFileService.linkReceiptDirectory();
    setIsConnectingFolder(false);
    if (res.success && res.dirName) {
      setLinkedFolder(res.dirName);
      refreshState();
      setStatusMessage({ text: `Connected local receipts folder "${res.dirName}" successfully!`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 3500);
    } else if (res.error && res.error !== 'USER_CANCELLED') {
      if (res.error === 'NOT_SUPPORTED') {
        setStatusMessage({ text: 'Your browser does not support folder access. Use file paths and "Copy Path" instead.', type: 'error' });
      } else {
        setStatusMessage({ text: 'Could not connect folder: ' + res.error, type: 'error' });
      }
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDisconnectFolder = async () => {
    if (confirm('Disconnect the linked receipts folder? (Your files remain completely untouched on your PC).')) {
      await receiptFileService.unlinkReceiptDirectory();
      setLinkedFolder(null);
      refreshState();
      setStatusMessage({ text: 'Folder disconnected.', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handlePurgeTombstones = () => {
    if (confirm('Permanently remove deleted records (tombstones) from local browser memory?')) {
      const purged = storageService.purgeTombstones();
      refreshState();
      setStatusMessage({ text: `Cleaned ${purged} deleted record(s) from local browser storage.`, type: 'success' });
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block">
          Local-First Architecture & Data Sovereignty
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Backup, Sync & Local Receipts (Varmuuskopiot)
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Zero-knowledge storage: All financial vouchers, invoices, and settings remain 100% on your device.
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

      {/* 1. Sync-Readiness & Storage Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#003580] text-white flex items-center justify-center shrink-0">
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#003580] block">
                Local-First Standard 2026
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                Sync-Ready Ledger (Schema v{syncMeta.schemaVersion})
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {syncMeta.dirtyCount === 0 ? (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold flex items-center space-x-1.5">
                <Check size={13} />
                <span>Backup Up to Date</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold flex items-center space-x-1.5">
                <Clock size={13} />
                <span>{syncMeta.dirtyCount} unsaved change(s)</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium block text-[11px]">Device Identifier</span>
            <span className="font-mono font-bold text-slate-800 block truncate">{syncMeta.deviceId}</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium block text-[11px]">Last Modified</span>
            <span className="font-mono font-bold text-slate-800 block truncate">
              {formatFinnishDate(syncMeta.lastModifiedAt)}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium block text-[11px]">Last Backup Download</span>
            <span className="font-mono font-bold text-slate-800 block truncate">
              {syncMeta.lastBackupAt ? formatFinnishDate(syncMeta.lastBackupAt) : 'Never'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Zero-Storage Local Receipts Folder Connector */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#EDF4FC] text-[#003580] flex items-center justify-center shrink-0">
              <FolderOpen size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#003580] block">
                Zero-Quota Receipt Storage
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                Local Receipts Folder (Kansio)
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {linkedFolder ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleConnectFolder}
                  disabled={isConnectingFolder}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition min-h-[36px]"
                >
                  Change Folder
                </button>
                <button
                  onClick={handleDisconnectFolder}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl transition min-h-[36px]"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectFolder}
                disabled={isConnectingFolder}
                className="px-4 py-2 bg-[#003580] hover:bg-[#002868] text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5 min-h-[40px]"
              >
                <Folder size={15} />
                <span>Connect Receipts Folder</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Connected Folder Status:</span>
            {linkedFolder ? (
              <span className="font-mono font-bold text-[#003580] bg-blue-100/70 px-2.5 py-0.5 rounded-md">
                📁 {linkedFolder}
              </span>
            ) : (
              <span className="text-slate-400 font-medium italic">No folder connected</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            Connecting a local folder (e.g. <code>E:\Toiminimi\Kuitit</code>) saves a read-only handle in your browser's IndexedDB. When recording expenses, pick a receipt and view it in 1-click without uploading anything to a server or consuming local storage limits.
          </p>
        </div>
      </div>

      {/* 3. Export & Import JSON Backup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Export Card */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003580] flex items-center justify-center">
              <Download size={20} />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Download Backup (.json)</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export an encrypted, conflict-ready JSON archive containing all invoices, receipts, tax settings, and mileage records.
            </p>
          </div>
          <button 
            onClick={handleExport}
            className="w-full py-2.5 bg-[#003580] hover:bg-[#002868] active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition min-h-[44px] flex items-center justify-center space-x-1.5"
          >
            <Download size={15} />
            <span>Download Backup (.json)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Upload size={20} />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Restore from Backup</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Restore previously exported bookkeeping records. Existing records are validated and merged cleanly.
            </p>
          </div>
          <div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition min-h-[44px] flex items-center justify-center space-x-1.5"
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
      </div>

      {/* 4. Statutory 6-Year Retention Reminder */}
      <div className="flex items-start bg-amber-50 p-4 rounded-2xl border border-amber-200/80 space-x-3">
        <ShieldAlert className="text-amber-700 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1 min-w-0">
          <h5 className="font-bold text-amber-800 text-xs uppercase tracking-wider">Statutory 6-Year Retention Rule (Kirjanpitolaki)</h5>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            Under Finnish accounting law (Kirjanpitolaki 1336/1997), sole traders must preserve accounting records and receipts for at least <strong>6 years</strong> from the end of the financial year. Download backups regularly and store them in your personal cloud or offline drive.
          </p>
        </div>
      </div>

      {/* 5. Storage Maintenance: Purge Tombstones */}
      <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
        <span>Clean up permanently deleted items to reclaim browser memory</span>
        <button
          onClick={handlePurgeTombstones}
          className="text-slate-500 hover:text-rose-600 transition flex items-center space-x-1 hover:underline min-h-[32px]"
        >
          <Trash2 size={13} />
          <span>Purge Deleted Items</span>
        </button>
      </div>
    </div>
  );
};

export default DataBackup;
