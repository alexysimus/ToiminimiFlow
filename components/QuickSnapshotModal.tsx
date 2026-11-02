import React, { useState, useEffect } from 'react';
import { 
  Bookmark, Check, Plus, Edit2, Trash2, History
} from 'lucide-react';
import { BottomSheet } from './ui/BottomSheet';
import { snapshotService } from '../services/snapshotService';
import { receiptFileService } from '../services/receiptFileService';
import { formatFinnishCurrency } from '../services/formatUtils';
import { SnapshotDiffSummary, LedgerSnapshot } from '../types';

interface QuickSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToHistory?: () => void;
}

const PRESET_NOTES = [
  'Monthly Bookkeeping',
  'VAT Return Filed (ALV)',
  'Invoice Batch',
  'Before Adjustments'
];

export const QuickSnapshotModal: React.FC<QuickSnapshotModalProps> = ({
  isOpen,
  onClose,
  onNavigateToHistory
}) => {
  const [note, setNote] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [syncToFolder, setSyncToFolder] = useState(true);
  const [linkedFolder, setLinkedFolder] = useState<string | null>(null);
  
  const [diff, setDiff] = useState<SnapshotDiffSummary | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<LedgerSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedHash, setSavedHash] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadState();
    }
  }, [isOpen]);

  const loadState = async () => {
    setIsLoading(true);
    setSavedHash(null);
    setNote('');
    try {
      const [workingDiff, latest, folderName] = await Promise.all([
        snapshotService.computeWorkingDiff(),
        snapshotService.getLatestSnapshot(),
        receiptFileService.getReceiptDirectoryName()
      ]);
      setDiff(workingDiff);
      setLatestSnapshot(latest);
      setLinkedFolder(folderName);
      setSyncToFolder(Boolean(folderName));
    } catch (err) {
      console.warn('Failed to load snapshot diff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newSnap = await snapshotService.createSnapshot({
        note: note.trim() || undefined,
        tag: 'manual',
        isPinned,
        syncToFolder: Boolean(syncToFolder && linkedFolder)
      });
      setSavedHash(newSnap.shortHash);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to save snapshot:', err);
      alert('Error saving snapshot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = diff && diff.totalChanges > 0;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      position="top"
      maxWidthClass="max-w-lg"
      title="Save Snapshot"
      subtitle={
        latestSnapshot 
          ? `HEAD: #${latestSnapshot.shortHash} · ${latestSnapshot.note}`
          : 'Initial ledger baseline checkpoint'
      }
      icon={<Bookmark size={20} />}
    >
      <div className="space-y-4 text-xs">
        {savedHash ? (
          <div className="py-8 text-center space-y-2 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
              <Check size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Snapshot Saved!</h3>
            <p className="text-xs text-slate-600 font-mono">
              Checkpoint #{savedHash} committed to Version History.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-[#003580] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p>Analyzing ledger changes...</p>
          </div>
        ) : (
          <>
            {/* Status & Change Counter */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl border bg-slate-50 border-slate-200/80 shadow-2xs">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${hasChanges ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                <span className="font-semibold text-slate-800">
                  {hasChanges 
                    ? `${diff?.totalChanges} Unsaved Change(s)`
                    : 'Working Ledger is Up to Date'}
                </span>
              </div>
              {hasChanges && diff && (
                <div className="flex items-center space-x-1.5 font-mono text-[11px] font-bold">
                  {diff.addedCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      +{diff.addedCount}
                    </span>
                  )}
                  {diff.modifiedCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                      ~{diff.modifiedCount}
                    </span>
                  )}
                  {diff.deletedCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                      -{diff.deletedCount}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Change List */}
            {hasChanges && diff ? (
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Pending Changes (Muutokset)
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-2xl border border-slate-200/80 p-2 bg-slate-50/50">
                  {diff.items.map((item, idx) => (
                    <div 
                      key={`${item.id}-${idx}`}
                      className="p-2.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        {item.changeType === 'added' && (
                          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Plus size={12} strokeWidth={2.5} />
                          </span>
                        )}
                        {item.changeType === 'modified' && (
                          <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Edit2 size={12} strokeWidth={2.5} />
                          </span>
                        )}
                        {item.changeType === 'deleted' && (
                          <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                            <Trash2 size={12} strokeWidth={2.5} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate leading-tight">
                            {item.title}
                          </span>
                          {item.subtitle && (
                            <span className="text-[11px] text-slate-500 block truncate">
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.amountDelta !== undefined && item.amountDelta !== 0 && (
                        <span className={`font-mono font-bold shrink-0 text-[11px] ${
                          item.amountDelta > 0 ? 'text-emerald-700' : 'text-slate-600'
                        }`}>
                          {item.amountDelta > 0 ? '+' : ''}{formatFinnishCurrency(item.amountDelta)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Note Input & Preset Chips */}
            <div className="space-y-2">
              <label htmlFor="snapshot-note-input" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Snapshot Note (Optional)
              </label>
              <input
                id="snapshot-note-input"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Completed November expenses, Q3 ALV check..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#003580] min-h-[42px]"
              />

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PRESET_NOTES.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNote(preset)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium rounded-lg transition min-h-[30px]"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="pt-2 space-y-2 border-t border-slate-100">
              {linkedFolder && (
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToFolder}
                    onChange={(e) => setSyncToFolder(e.target.checked)}
                    className="rounded text-[#003580] focus:ring-[#003580] h-4 w-4"
                  />
                  <span className="text-slate-700">
                    Write backup copy to folder (<span className="font-mono text-[#003580]">{linkedFolder}</span>)
                  </span>
                </label>
              )}

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-[#003580] focus:ring-[#003580] h-4 w-4"
                />
                <span className="text-slate-700">
                  Pin as Milestone ★ (protects snapshot from pruning)
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateToHistory) onNavigateToHistory();
                }}
                className="text-xs text-[#003580] font-semibold hover:underline flex items-center space-x-1"
              >
                <History size={14} />
                <span>View Version History</span>
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition min-h-[40px] flex-1 sm:flex-initial"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || (Boolean(diff) && !hasChanges)}
                  className={`px-5 py-2 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5 min-h-[40px] flex-1 sm:flex-initial shadow-xs ${
                    !hasChanges && Boolean(diff)
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-[#003580] hover:bg-[#002868] active:scale-95'
                  }`}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Snapshot</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </BottomSheet>
  );
};
