import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, Upload, ShieldAlert, Database, Check, CheckCircle2, 
  AlertCircle, Folder, FolderOpen, Trash2, Clock, Bookmark, 
  History, GitBranch, RotateCcw, Pin, ChevronDown, ChevronUp, 
  Plus, Edit2, Layers, Eye
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { receiptFileService } from '../services/receiptFileService';
import { snapshotService } from '../services/snapshotService';
import { formatFinnishDate, formatFinnishCurrency } from '../services/formatUtils';
import { SyncMetadata, LedgerSnapshot, SnapshotDiffSummary } from '../types';

const DataBackup: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata>(() => storageService.getSyncMetadata());
  const [linkedFolder, setLinkedFolder] = useState<string | null>(null);
  const [isConnectingFolder, setIsConnectingFolder] = useState(false);
  
  // Version History State
  const [snapshots, setSnapshots] = useState<LedgerSnapshot[]>([]);
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);
  const [workingDiff, setWorkingDiff] = useState<SnapshotDiffSummary | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Smart Merge Modal State
  const [pendingImportContent, setPendingImportContent] = useState<string | null>(null);
  const [importDiffSummary, setImportDiffSummary] = useState<SnapshotDiffSummary | null>(null);

  useEffect(() => {
    refreshState();

    const handleStorageUpdated = () => {
      refreshState();
    };
    window.addEventListener('toiminimi-storage-updated', handleStorageUpdated);
    return () => window.removeEventListener('toiminimi-storage-updated', handleStorageUpdated);
  }, []);

  const refreshState = async () => {
    setSyncMeta(storageService.getSyncMetadata());
    receiptFileService.getReceiptDirectoryName().then(setLinkedFolder);
    
    setIsLoadingHistory(true);
    try {
      const [list, diff] = await Promise.all([
        snapshotService.listSnapshots(),
        snapshotService.computeWorkingDiff()
      ]);
      setSnapshots(list);
      setWorkingDiff(diff);
    } catch (e) {
      console.warn('Failed to refresh history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
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

  const handleSelectImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        const currentState = storageService.getRawLedgerState();
        const diff = snapshotService.compareStates(currentState, parsed);

        setPendingImportContent(content);
        setImportDiffSummary(diff);
      } catch {
        setStatusMessage({ text: 'Error: The selected file is not a valid JSON backup.', type: 'error' });
      }
    };
    reader.readAsText(file);
    // Reset file input so user can pick the same file again if desired
    e.target.value = '';
  };

  const handleExecuteMerge = async (mode: 'smart_merge' | 'replace') => {
    if (!pendingImportContent) return;

    try {
      // 1. Auto-save safety snapshot of current data before modifying
      await snapshotService.createSnapshot({
        note: `Auto-saved before ${mode === 'smart_merge' ? 'Smart Merge' : 'Data Restore'}`,
        tag: 'auto_safety'
      });

      if (mode === 'smart_merge') {
        const res = storageService.smartMergeLedgerData(pendingImportContent);
        await snapshotService.createSnapshot({
          note: `Smart Merge completed (+${res.addedCount} added, ~${res.updatedCount} updated)`,
          tag: 'merged'
        });
        setStatusMessage({ 
          text: `Smart Merge successful: combined ${res.addedCount} new and ${res.updatedCount} updated records without overwriting local changes!`, 
          type: 'success' 
        });
      } else {
        storageService.importAllData(pendingImportContent);
        await snapshotService.createSnapshot({
          note: 'Restored from imported JSON backup archive',
          tag: 'imported'
        });
        setStatusMessage({ text: 'Data restored successfully! Current state updated.', type: 'success' });
      }

      setPendingImportContent(null);
      setImportDiffSummary(null);
      refreshState();
    } catch (e: any) {
      setStatusMessage({ text: 'Import failed: ' + (e?.message || 'Unknown error'), type: 'error' });
    }
  };

  const handleSyncFromFolder = async () => {
    if (!linkedFolder) return;
    setStatusMessage({ text: `Checking linked folder "${linkedFolder}" for backups...`, type: 'success' });
    
    const res = await receiptFileService.readBackupFromDirectory('toiminimi_latest_backup.json');
    if (res.success && res.content) {
      try {
        const parsed = JSON.parse(res.content);
        const currentState = storageService.getRawLedgerState();
        const diff = snapshotService.compareStates(currentState, parsed);
        setPendingImportContent(res.content);
        setImportDiffSummary(diff);
      } catch {
        setStatusMessage({ text: 'Found backup file in folder, but content is invalid JSON.', type: 'error' });
      }
    } else {
      setStatusMessage({ 
        text: 'No "toiminimi_latest_backup.json" found in connected folder. Save a snapshot with folder sync first.', 
        type: 'error' 
      });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSaveWorkingSnapshot = async () => {
    try {
      const snap = await snapshotService.createSnapshot({
        note: 'Manual Snapshot from Backup view',
        tag: 'manual',
        syncToFolder: Boolean(linkedFolder)
      });
      setStatusMessage({ text: `Snapshot #${snap.shortHash} saved to Version History!`, type: 'success' });
      refreshState();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e) {
      setStatusMessage({ text: 'Failed to create snapshot.', type: 'error' });
    }
  };

  const handleRestoreSnapshot = async (snap: LedgerSnapshot) => {
    if (confirm(`Restore ledger to snapshot #${snap.shortHash} ("${snap.note}")?\n\nAn automatic safety snapshot of your current state will be saved first so no work is lost.`)) {
      const res = await snapshotService.restoreSnapshot(snap.id);
      if (res.success) {
        setStatusMessage({ 
          text: `Restored to snapshot #${snap.shortHash}! ${res.autoSafetySnapshotId ? '(Current state auto-saved to history).' : ''}`, 
          type: 'success' 
        });
        refreshState();
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        setStatusMessage({ text: 'Restore failed: ' + res.error, type: 'error' });
      }
    }
  };

  const handleTogglePin = async (id: string) => {
    await snapshotService.togglePinSnapshot(id);
    refreshState();
  };

  const handleDownloadSnapshotJson = (snap: LedgerSnapshot) => {
    const blob = new Blob([snap.payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `toiminimi_snapshot_${snap.shortHash}_${snap.createdAt.split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
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

  const handleClearAllLocal = () => {
    if (confirm('WARNING: Clear ALL local accounting records on this device?\n\nOnly do this on a shared or public computer. Your historical snapshots and backup files remain safe.')) {
      storageService.clearAllLocalData();
      refreshState();
      setStatusMessage({ text: 'Local device records cleared.', type: 'success' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const hasWorkingChanges = workingDiff && workingDiff.totalChanges > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fadeIn pb-16">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <span className="text-[10px] font-bold text-[#003580] uppercase tracking-wider block">
          Local-First Architecture & Version Control
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Backup, Version History & Receipts
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Git-like checkpointing: All financial records stay 100% on your device with immutable version history.
        </p>
      </div>

      {statusMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center space-x-2 animate-in fade-in shadow-2xs ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-rose-600 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. Working Ledger Status & Quick Snapshot Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#003580] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#003580] block">
                Local-First Working Tree (Schema v{syncMeta.schemaVersion})
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                {hasWorkingChanges 
                  ? `${workingDiff.totalChanges} Unsaved Change(s)` 
                  : `Working Ledger Up to Date (#${syncMeta.headShortHash || 'baseline'})`}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={handleSaveWorkingSnapshot}
              disabled={!hasWorkingChanges}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 min-h-[38px] shadow-2xs ${
                hasWorkingChanges 
                  ? 'bg-[#003580] hover:bg-[#002868] text-white active:scale-95' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Bookmark size={14} />
              <span>Save Snapshot</span>
            </button>

            {linkedFolder && (
              <button
                onClick={handleSyncFromFolder}
                className="px-3 py-1.5 bg-[#EDF4FC] hover:bg-blue-100/70 text-[#003580] text-xs font-semibold rounded-xl border border-blue-200/70 transition flex items-center space-x-1 min-h-[38px]"
                title="Check connected folder for newer backup files"
              >
                <RotateCcw size={13} />
                <span>Sync from Folder</span>
              </button>
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
            <span className="text-slate-400 font-medium block text-[11px]">Latest Checkpoint</span>
            <span className="font-mono font-bold text-slate-800 block truncate">
              {syncMeta.headShortHash ? `#${syncMeta.headShortHash}` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Version History & Audit Trail Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <History size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                Git-Like Immutable Checkpoints
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Version History ({snapshots.length})
              </h3>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Saved in IndexedDB (0MB localStorage used)
          </span>
        </div>

        {isLoadingHistory ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs">Loading version history...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-1.5 border border-dashed border-slate-200 rounded-2xl">
            <GitBranch size={24} className="mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700 text-xs">No snapshots saved yet.</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Click "Save Snapshot" in the top header or above to create your first restore checkpoint.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => {
              const isExpanded = expandedSnapshotId === snap.id;
              return (
                <div 
                  key={snap.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'border-purple-300 bg-purple-50/20 shadow-xs' 
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Snapshot Row Header */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200/80">
                          #{snap.shortHash}
                        </span>

                        {snap.tag === 'milestone' || snap.isPinned ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] uppercase">
                            ★ Milestone
                          </span>
                        ) : snap.tag === 'auto_safety' ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-medium text-[10px]">
                            Auto-Safety
                          </span>
                        ) : snap.tag === 'merged' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[10px]">
                            Merged
                          </span>
                        ) : null}

                        <span className="text-slate-400 font-mono text-[11px]">
                          {formatFinnishDate(snap.createdAt)}
                        </span>
                      </div>

                      <h4 className="font-semibold text-slate-900 truncate text-sm">
                        {snap.note}
                      </h4>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                        <span>Turnover: {formatFinnishCurrency(snap.kpiSummary.netTurnover)}</span>
                        <span>·</span>
                        <span className="text-emerald-700 font-semibold">
                          Safe: {formatFinnishCurrency(snap.kpiSummary.safeToWithdraw)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => setExpandedSnapshotId(isExpanded ? null : snap.id)}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-medium flex items-center space-x-1 min-h-[34px]"
                        title="View changes included in this snapshot"
                      >
                        <Eye size={13} />
                        <span className="hidden md:inline">Compare</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <button
                        onClick={() => handleTogglePin(snap.id)}
                        className={`p-1.5 rounded-lg border transition min-h-[34px] min-w-[34px] flex items-center justify-center ${
                          snap.isPinned 
                            ? 'bg-amber-100 text-amber-800 border-amber-300' 
                            : 'bg-slate-50 text-slate-400 hover:text-slate-700 border-slate-200'
                        }`}
                        title={snap.isPinned ? "Unpin milestone" : "Pin as milestone"}
                      >
                        <Pin size={14} className={snap.isPinned ? "fill-amber-600" : ""} />
                      </button>

                      <button
                        onClick={() => handleDownloadSnapshotJson(snap)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition min-h-[34px] min-w-[34px] flex items-center justify-center"
                        title="Download snapshot JSON"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-3 py-1.5 bg-[#003580] hover:bg-[#002868] text-white rounded-lg font-semibold transition flex items-center space-x-1 min-h-[34px] shadow-2xs active:scale-95"
                        title="Restore ledger to this snapshot"
                      >
                        <RotateCcw size={13} />
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Diff Viewer */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200/80 space-y-3 animate-fadeIn text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                          Snapshot Details & Delta
                        </span>
                        <div className="flex items-center space-x-1.5 font-mono text-[10px] font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            +{snap.diffSummary.addedCount} added
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            ~{snap.diffSummary.modifiedCount} modified
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                            -{snap.diffSummary.deletedCount} deleted
                          </span>
                        </div>
                      </div>

                      {snap.diffSummary.items.length === 0 ? (
                        <p className="text-slate-400 italic text-[11px]">No entity deltas recorded for this commit.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {snap.diffSummary.items.map((it, idx) => (
                            <div 
                              key={`${it.id}-${idx}`}
                              className="p-2 bg-white rounded-lg border border-slate-200/70 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2 min-w-0">
                                {it.changeType === 'added' && <Plus size={12} className="text-emerald-600 shrink-0" />}
                                {it.changeType === 'modified' && <Edit2 size={12} className="text-amber-600 shrink-0" />}
                                {it.changeType === 'deleted' && <Trash2 size={12} className="text-rose-600 shrink-0" />}
                                <span className="font-semibold text-slate-800 truncate">{it.title}</span>
                                {it.subtitle && <span className="text-slate-400 text-[11px] truncate">({it.subtitle})</span>}
                              </div>
                              {it.amountDelta !== undefined && (
                                <span className="font-mono font-bold text-slate-700 shrink-0">
                                  {it.amountDelta > 0 ? '+' : ''}{formatFinnishCurrency(it.amountDelta)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Zero-Storage Local Receipts Folder Connector */}
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
            Connecting a local folder (e.g. <code>Google Drive/ToiminimiFlow</code> or <code>Documents/Kuitit</code>) allows 1-click viewing of receipts and auto-syncing of backup files between computers.
          </p>
        </div>
      </div>

      {/* 4. Export & Import JSON Backup */}
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
              Restore previously exported records. Supports Smart Merge to combine offline edits from another device.
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
              onChange={handleSelectImportFile}
            />
          </div>
        </div>
      </div>

      {/* Smart Merge Selection Modal */}
      {pendingImportContent && importDiffSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <GitBranch size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Backup File Detected</h3>
                <p className="text-xs text-slate-500">
                  {importDiffSummary.totalChanges} difference(s) found between this device and the backup file.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <span className="font-semibold text-slate-700 block">How would you like to apply this data?</span>
              
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleExecuteMerge('smart_merge')}
                  className="w-full p-3 bg-white hover:bg-emerald-50/50 border-2 border-emerald-500 rounded-xl text-left transition flex items-start space-x-3 group"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-emerald-800">
                      Smart Merge (Recommended)
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      Combines new records from both devices using UUID matching. No offline edits are lost.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteMerge('replace')}
                  className="w-full p-3 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition flex items-start space-x-3 group"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-rose-100 text-slate-600 group-hover:text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-rose-800">
                      Replace This Device's Data
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      Overwrites local data with the backup file. Current state is auto-saved as a safety snapshot.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPendingImportContent(null);
                  setImportDiffSummary(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Statutory 6-Year Retention Reminder */}
      <div className="flex items-start bg-amber-50 p-4 rounded-2xl border border-amber-200/80 space-x-3">
        <ShieldAlert className="text-amber-700 shrink-0 mt-0.5" size={20} />
        <div className="space-y-1 min-w-0">
          <h5 className="font-bold text-amber-800 text-xs uppercase tracking-wider">Statutory 6-Year Retention Rule (Kirjanpitolaki)</h5>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            Under Finnish accounting law (Kirjanpitolaki 1336/1997), sole traders must preserve accounting records and receipts for at least <strong>6 years</strong> from the end of the financial year.
          </p>
        </div>
      </div>

      {/* 6. Storage Maintenance Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
        <button
          onClick={handlePurgeTombstones}
          className="text-slate-500 hover:text-slate-800 transition flex items-center space-x-1 hover:underline min-h-[32px]"
          title="Clean up deleted records"
        >
          <Trash2 size={13} />
          <span>Purge Deleted Records (Tombstones)</span>
        </button>

        <button
          onClick={handleClearAllLocal}
          className="text-slate-400 hover:text-rose-600 transition flex items-center space-x-1 hover:underline min-h-[32px]"
          title="Wipe local browser data on shared PC"
        >
          <RotateCcw size={13} />
          <span>Clear Local Device Data (Shared PC)</span>
        </button>
      </div>
    </div>
  );
};

export default DataBackup;
