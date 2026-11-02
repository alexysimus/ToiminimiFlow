/**
 * snapshotService.ts
 * 
 * Git-Like Ledger Snapshot, Version History & Diff Engine for Toiminimi Flow.
 * 
 * Philosophy:
 * 1. Working Tree = localStorage: Lightning-fast, synchronous 0ms local reads/writes.
 * 2. Version History = IndexedDB (toiminimi_snapshots_db): Stores up to 100 immutable
 *    snapshots without consuming the browser's ~5MB localStorage quota.
 * 3. Deterministic Diff Engine: Computes exact added (+), modified (~), and deleted (-)
 *    records and financial KPI deltas across any two points in time.
 * 4. Zero Data Loss: Restoring or importing always takes an automatic safety snapshot
 *    before touching the active working ledger.
 */

import { storageService } from './storageService';
import { receiptFileService } from './receiptFileService';
import { veroTaxEngine } from './veroTaxEngine';
import { 
  LedgerSnapshot, SnapshotDiffSummary, EntityDiffItem, SnapshotKpiSummary,
  Invoice, Expense, SalesSettlement, MileageEntry, HomeOfficeDeduction, 
  Customer, TaxSettings, BusinessInfo
} from '../types';

const DB_NAME = 'toiminimi_snapshots_db';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

// Helper: Open IndexedDB for Snapshots
const openSnapshotDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not available in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('isPinned', 'isPinned', { unique: false });
        store.createIndex('tag', 'tag', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper: Generate deterministic 6-character hex hash
const generateShortHash = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
};

// Helper: Calculate snapshot KPIs for any ledger state
const calculateStateKpis = (
  invoices: Invoice[] = [],
  expenses: Expense[] = [],
  settlements: SalesSettlement[] = [],
  mileage: MileageEntry[] = [],
  homeOfficeMap: Record<number, HomeOfficeDeduction> = {},
  taxSettings?: TaxSettings
): SnapshotKpiSummary => {
  const currentSettings = taxSettings || storageService.getTaxSettings();
  const yr = currentSettings.financialYear || 2026;
  const ho = homeOfficeMap[yr] || storageService.getHomeOfficeDeduction(yr);

  const activeInvoices = invoices.filter(i => !i.deletedAt);
  const activeExpenses = expenses.filter(e => !e.deletedAt);
  const activeSettlements = settlements.filter(s => !s.deletedAt);
  const activeMileage = mileage.filter(m => !m.deletedAt);

  const summary = veroTaxEngine.calculateLedgerSummary(
    activeInvoices,
    activeExpenses,
    activeSettlements,
    activeMileage,
    ho,
    currentSettings,
    currentSettings.incomeMode || 'all_issued',
    yr
  );

  return {
    netTurnover: summary.turnoverNet,
    totalExpenses: summary.totalDirectExpensesNet,
    vatPayable: summary.vatPayable,
    safeToWithdraw: summary.safeToWithdraw,
    invoiceCount: summary.invoicesCount,
    expenseCount: summary.expensesCount
  };
};

export const snapshotService = {
  /**
   * List all saved LedgerSnapshots sorted newest first
   */
  listSnapshots: async (): Promise<LedgerSnapshot[]> => {
    try {
      const db = await openSnapshotDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list: LedgerSnapshot[] = req.result || [];
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  },

  /**
   * Get the most recent HEAD snapshot
   */
  getLatestSnapshot: async (): Promise<LedgerSnapshot | null> => {
    const list = await snapshotService.listSnapshots();
    return list.length > 0 ? list[0] : null;
  },

  /**
   * Retrieve a specific snapshot by its ID
   */
  getSnapshotById: async (id: string): Promise<LedgerSnapshot | null> => {
    try {
      const db = await openSnapshotDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Deterministic Diff Engine: Compare two ledger states (Base vs Target)
   */
  compareStates: (baseState: any, targetState: any): SnapshotDiffSummary => {
    const items: EntityDiffItem[] = [];

    // Helper: Compare array of entities with id, updatedAt, deletedAt
    const diffEntityArray = <T extends { id: string; updatedAt?: string; createdAt?: string; deletedAt?: string | null }>(
      baseArr: T[] = [],
      targetArr: T[] = [],
      entityType: EntityDiffItem['entityType'],
      getTitle: (item: T) => string,
      getSubtitle: (item: T) => string,
      getAmountDelta?: (itemA?: T, itemB?: T) => number | undefined
    ) => {
      const baseMap = new Map<string, T>();
      baseArr.forEach(i => baseMap.set(i.id, i));

      const targetMap = new Map<string, T>();
      targetArr.forEach(i => targetMap.set(i.id, i));

      // Check additions & modifications in target
      targetMap.forEach((targetItem, id) => {
        const baseItem = baseMap.get(id);
        const isTargetActive = !targetItem.deletedAt;
        const isBaseActive = Boolean(baseItem && !baseItem.deletedAt);

        if (!baseItem || (!isBaseActive && isTargetActive)) {
          if (isTargetActive) {
            items.push({
              entityType,
              changeType: 'added',
              id,
              title: getTitle(targetItem),
              subtitle: getSubtitle(targetItem),
              amountDelta: getAmountDelta ? getAmountDelta(undefined, targetItem) : undefined
            });
          }
        } else if (isBaseActive && !isTargetActive) {
          items.push({
            entityType,
            changeType: 'deleted',
            id,
            title: getTitle(baseItem),
            subtitle: getSubtitle(baseItem),
            amountDelta: getAmountDelta ? getAmountDelta(baseItem, undefined) : undefined
          });
        } else if (isBaseActive && isTargetActive) {
          // Both active: check if modified
          const baseStr = JSON.stringify(baseItem);
          const targetStr = JSON.stringify(targetItem);
          if (baseStr !== targetStr) {
            items.push({
              entityType,
              changeType: 'modified',
              id,
              title: getTitle(targetItem),
              subtitle: getSubtitle(targetItem),
              amountDelta: getAmountDelta ? getAmountDelta(baseItem, targetItem) : undefined
            });
          }
        }
      });

      // Check items deleted in target that were in base
      baseMap.forEach((baseItem, id) => {
        if (!targetMap.has(id) && !baseItem.deletedAt) {
          items.push({
            entityType,
            changeType: 'deleted',
            id,
            title: getTitle(baseItem),
            subtitle: getSubtitle(baseItem),
            amountDelta: getAmountDelta ? getAmountDelta(baseItem, undefined) : undefined
          });
        }
      });
    };

    // 1. Invoices
    diffEntityArray<Invoice>(
      baseState?.invoices,
      targetState?.invoices,
      'invoice',
      (i) => `Invoice #${i.invoiceNumber || 'Draft'} (${i.recipientName || 'No client'})`,
      (i) => {
        const total = (i.items || []).reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
        return `${total.toFixed(2)} € · ${i.isPaid ? 'PAID' : 'UNPAID'}`;
      },
      (base, target) => {
        const getTot = (inv?: Invoice) => (inv?.items || []).reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
        return getTot(target) - getTot(base);
      }
    );

    // 2. Expenses
    diffEntityArray<Expense>(
      baseState?.expenses,
      targetState?.expenses,
      'expense',
      (e) => e.items?.[0]?.description || 'Expense',
      (e) => {
        const total = (e.items || []).reduce((s, it) => s + it.amount, 0);
        return `${total.toFixed(2)} € · ${e.paymentDate || ''}`;
      },
      (base, target) => {
        const getTot = (exp?: Expense) => (exp?.items || []).reduce((s, it) => s + it.amount, 0);
        return getTot(target) - getTot(base);
      }
    );

    // 3. Settlements
    diffEntityArray<SalesSettlement>(
      baseState?.salesSettlements,
      targetState?.salesSettlements,
      'settlement',
      (s) => `${s.provider} Settlement`,
      (s) => `Net: ${s.netAmount} € (Fee: ${s.feeAmount} €)`,
      (base, target) => (target?.netAmount || 0) - (base?.netAmount || 0)
    );

    // 4. Mileage
    diffEntityArray<MileageEntry>(
      baseState?.mileageEntries,
      targetState?.mileageEntries,
      'mileage',
      (m) => `Trip: ${m.route || 'Business Drive'}`,
      (m) => `${m.kilometers} km · ${m.purpose || ''}`
    );

    // 5. Customers
    diffEntityArray<Customer>(
      baseState?.customers,
      targetState?.customers,
      'customer',
      (c) => c.name || 'Customer',
      (c) => c.businessId || c.email || ''
    );

    // 6. Tax Settings
    if (JSON.stringify(baseState?.taxSettings) !== JSON.stringify(targetState?.taxSettings)) {
      items.push({
        entityType: 'taxSettings',
        changeType: 'modified',
        id: 'taxSettings',
        title: 'Tax Settings',
        subtitle: `Rate: ${targetState?.taxSettings?.personalTaxRate || 13}% · Period: ${targetState?.taxSettings?.vatPeriod || 'year'}`
      });
    }

    // 7. Business Info
    if (JSON.stringify(baseState?.businessInfo) !== JSON.stringify(targetState?.businessInfo)) {
      items.push({
        entityType: 'business',
        changeType: 'modified',
        id: 'businessInfo',
        title: 'Business Profile',
        subtitle: targetState?.businessInfo?.name || 'Company Details'
      });
    }

    const addedCount = items.filter(i => i.changeType === 'added').length;
    const modifiedCount = items.filter(i => i.changeType === 'modified').length;
    const deletedCount = items.filter(i => i.changeType === 'deleted').length;

    const kpiBefore = calculateStateKpis(
      baseState?.invoices,
      baseState?.expenses,
      baseState?.salesSettlements,
      baseState?.mileageEntries,
      baseState?.homeOffice,
      baseState?.taxSettings
    );

    const kpiAfter = calculateStateKpis(
      targetState?.invoices,
      targetState?.expenses,
      targetState?.salesSettlements,
      targetState?.mileageEntries,
      targetState?.homeOffice,
      targetState?.taxSettings
    );

    return {
      addedCount,
      modifiedCount,
      deletedCount,
      totalChanges: items.length,
      items,
      kpiBefore,
      kpiAfter
    };
  },

  /**
   * Compare active working ledger (localStorage) against latest HEAD snapshot
   */
  computeWorkingDiff: async (): Promise<SnapshotDiffSummary> => {
    const currentState = storageService.getRawLedgerState();
    const latestSnapshot = await snapshotService.getLatestSnapshot();

    if (!latestSnapshot) {
      // No snapshot exists yet: treat baseline as empty
      return snapshotService.compareStates(
        { invoices: [], expenses: [], salesSettlements: [], mileageEntries: [], customers: [] },
        currentState
      );
    }

    try {
      const basePayload = JSON.parse(latestSnapshot.payload);
      return snapshotService.compareStates(basePayload, currentState);
    } catch {
      return snapshotService.compareStates({}, currentState);
    }
  },

  /**
   * Commit a new LedgerSnapshot (Git commit equivalent)
   */
  createSnapshot: async (options?: {
    note?: string;
    tag?: LedgerSnapshot['tag'];
    isPinned?: boolean;
    syncToFolder?: boolean;
  }): Promise<LedgerSnapshot> => {
    const rawState = storageService.getRawLedgerState();
    const latestSnapshot = await snapshotService.getLatestSnapshot();
    const diff = await snapshotService.computeWorkingDiff();
    const kpi = calculateStateKpis(
      rawState.invoices,
      rawState.expenses,
      rawState.salesSettlements,
      rawState.mileageEntries,
      rawState.homeOffice,
      rawState.taxSettings
    );

    const now = new Date().toISOString();
    const payload = JSON.stringify(rawState);
    const shortHash = generateShortHash(`${now}_${payload.length}_${rawState.syncMeta.deviceId}`);
    const id = storageService.generateId();

    const snapshot: LedgerSnapshot = {
      id,
      shortHash,
      parentSnapshotId: latestSnapshot?.id,
      createdAt: now,
      note: options?.note?.trim() || `Snapshot #${shortHash} (${diff.totalChanges} changes)`,
      tag: options?.tag || 'manual',
      isPinned: Boolean(options?.isPinned),
      deviceId: rawState.syncMeta.deviceId,
      schemaVersion: 2,
      kpiSummary: kpi,
      diffSummary: {
        addedCount: diff.addedCount,
        modifiedCount: diff.modifiedCount,
        deletedCount: diff.deletedCount,
        items: diff.items
      },
      payload
    };

    // Save to IndexedDB
    const db = await openSnapshotDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Update SyncMetadata in localStorage and trigger real-time storage event
    storageService.updateSyncMetadata({
      headSnapshotId: snapshot.id,
      headShortHash: snapshot.shortHash,
      lastBackupAt: snapshot.createdAt,
      dirtyCount: 0
    });

    // Write copy to connected folder if requested and linked
    if (options?.syncToFolder) {
      await receiptFileService.writeBackupToDirectory('toiminimi_latest_backup.json', snapshot.payload);
    }

    storageService.addAuditLog('snapshot', 'tax', 'create', `Created snapshot #${snapshot.shortHash}: ${snapshot.note}`);

    return snapshot;
  },

  /**
   * Safe Time-Travel Restore:
   * If current working ledger has unsaved changes, automatically takes an auto_safety
   * snapshot first so user never loses uncommitted edits!
   */
  restoreSnapshot: async (snapshotId: string): Promise<{
    success: boolean;
    error?: string;
    autoSafetySnapshotId?: string;
  }> => {
    const targetSnapshot = await snapshotService.getSnapshotById(snapshotId);
    if (!targetSnapshot) {
      return { success: false, error: 'Snapshot not found' };
    }

    const syncMeta = storageService.getSyncMetadata();
    const workingDiff = await snapshotService.computeWorkingDiff();

    let autoSafetySnapshotId: string | undefined;

    // Safety guardrail: auto-save current working ledger if dirty
    if (syncMeta.dirtyCount > 0 || workingDiff.totalChanges > 0) {
      const safety = await snapshotService.createSnapshot({
        note: `Auto-saved before restoring #${targetSnapshot.shortHash}`,
        tag: 'auto_safety'
      });
      autoSafetySnapshotId = safety.id;
    }

    // Restore data payload into localStorage
    const importOk = storageService.importAllData(targetSnapshot.payload);
    if (!importOk) {
      return { success: false, error: 'Failed to parse snapshot payload' };
    }

    // Update sync pointers
    storageService.updateSyncMetadata({
      headSnapshotId: targetSnapshot.id,
      headShortHash: targetSnapshot.shortHash,
      dirtyCount: 0
    });

    // Log the restore event as a new snapshot commit for full auditability
    await snapshotService.createSnapshot({
      note: `Restored to snapshot #${targetSnapshot.shortHash} (${targetSnapshot.note})`,
      tag: 'manual'
    });

    return {
      success: true,
      autoSafetySnapshotId
    };
  },

  /**
   * Delete a snapshot from history
   */
  deleteSnapshot: async (snapshotId: string): Promise<boolean> => {
    try {
      const db = await openSnapshotDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(snapshotId);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  },

  /**
   * Toggle pinned status of a milestone snapshot
   */
  togglePinSnapshot: async (snapshotId: string): Promise<boolean> => {
    const snap = await snapshotService.getSnapshotById(snapshotId);
    if (!snap) return false;

    snap.isPinned = !snap.isPinned;
    const db = await openSnapshotDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snap);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  }
};
