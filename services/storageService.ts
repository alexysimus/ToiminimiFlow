import { 
  Invoice, Expense, Customer, BusinessInfo, AuditLogEntry, 
  MileageEntry, HomeOfficeDeduction, SalesSettlement, TaxSettings, SyncMetadata 
} from '../types';

const INVOICE_KEY = 'toiminimi_invoices';
const EXPENSE_KEY = 'toiminimi_expenses';
const CUSTOMER_KEY = 'toiminimi_customers';
const BUSINESS_INFO_KEY = 'toiminimi_business_info';
const AUDIT_LOG_KEY = 'toiminimi_audit_logs';
const MILEAGE_KEY = 'toiminimi_mileage_entries';
const HOME_OFFICE_KEY = 'toiminimi_home_office';
const SETTLEMENTS_KEY = 'toiminimi_sales_settlements';
const TAX_SETTINGS_KEY = 'toiminimi_tax_settings';
const SYNC_META_KEY = 'toiminimi_sync_meta';

export const storageService = {
  // --- SYNC METADATA & 2026 LOCAL-FIRST CONFLICT MANAGEMENT ---
  getSyncMetadata: (): SyncMetadata => {
    const data = localStorage.getItem(SYNC_META_KEY);
    if (data) {
      try {
        const parsed: SyncMetadata = JSON.parse(data);
        return {
          ...parsed,
          schemaVersion: 2
        };
      } catch {}
    }
    const newMeta: SyncMetadata = {
      deviceId: 'flow_' + Math.random().toString(36).substring(2, 10),
      lastModifiedAt: new Date().toISOString(),
      dirtyCount: 0,
      schemaVersion: 2
    };
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(newMeta));
    return newMeta;
  },

  updateSyncMetadata: (partial: Partial<SyncMetadata>): SyncMetadata => {
    const current = storageService.getSyncMetadata();
    const updated: SyncMetadata = {
      ...current,
      ...partial,
      lastModifiedAt: new Date().toISOString()
    };
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(updated));
    return updated;
  },

  incrementDirtyCount: (): void => {
    const current = storageService.getSyncMetadata();
    current.dirtyCount = (current.dirtyCount || 0) + 1;
    current.lastModifiedAt = new Date().toISOString();
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(current));
  },

  recordBackupExported: (): void => {
    const current = storageService.getSyncMetadata();
    current.lastBackupAt = new Date().toISOString();
    current.dirtyCount = 0;
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(current));
  },

  // --- AUDIT LOGS ---
  getAuditLogs: (entityId?: string): AuditLogEntry[] => {
    const data = localStorage.getItem(AUDIT_LOG_KEY);
    const logs: AuditLogEntry[] = data ? JSON.parse(data) : [];
    if (entityId) {
      return logs.filter(log => log.entityId === entityId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return logs;
  },

  addAuditLog: (entityId: string, entityType: 'invoice' | 'expense' | 'settlement' | 'mileage' | 'tax', action: 'create' | 'update' | 'delete', details: string) => {
    const logs = storageService.getAuditLogs();
    const newLog: AuditLogEntry = {
      id: storageService.generateId(),
      entityId,
      entityType,
      action,
      timestamp: new Date().toISOString(),
      details
    };
    logs.push(newLog);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  },

  // --- INVOICES (WITH SOFT-DELETE TOMBSTONE SUPPORT) ---
  getRawInvoices: (): Invoice[] => {
    const data = localStorage.getItem(INVOICE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getInvoices: (): Invoice[] => {
    return storageService.getRawInvoices().filter(inv => !inv.deletedAt);
  },

  saveInvoice: (invoice: Invoice): void => {
    const now = new Date().toISOString();
    const raw = storageService.getRawInvoices();
    const existingIndex = raw.findIndex((i) => i.id === invoice.id);
    const updatedInvoice: Invoice = {
      ...invoice,
      createdAt: invoice.createdAt || now,
      updatedAt: now,
      version: (invoice.version || 0) + 1,
      deletedAt: null
    };
    
    if (existingIndex >= 0) {
      raw[existingIndex] = updatedInvoice;
      storageService.addAuditLog(invoice.id, 'invoice', 'update', `Invoice #${invoice.invoiceNumber} updated`);
    } else {
      raw.push(updatedInvoice);
      storageService.addAuditLog(invoice.id, 'invoice', 'create', `Invoice #${invoice.invoiceNumber} created`);
    }
    localStorage.setItem(INVOICE_KEY, JSON.stringify(raw));
    storageService.incrementDirtyCount();
  },

  deleteInvoice: (id: string): void => {
    const raw = storageService.getRawInvoices();
    const invoice = raw.find(i => i.id === id);
    if (invoice) {
      const now = new Date().toISOString();
      invoice.deletedAt = now;
      invoice.updatedAt = now;
      storageService.addAuditLog(id, 'invoice', 'delete', `Invoice #${invoice.invoiceNumber} deleted`);
      localStorage.setItem(INVOICE_KEY, JSON.stringify(raw));
      storageService.incrementDirtyCount();
    }
  },

  // --- EXPENSES (ZERO-BINARY / ZERO-BASE64 QUOTA PROTECTION) ---
  getRawExpenses: (): Expense[] => {
    const data = localStorage.getItem(EXPENSE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getExpenses: (): Expense[] => {
    return storageService.getRawExpenses().filter(exp => !exp.deletedAt);
  },

  saveExpense: (expense: Expense): void => {
    const now = new Date().toISOString();
    const raw = storageService.getRawExpenses();
    const existingIndex = raw.findIndex((e) => e.id === expense.id);
    
    // Sanitize receipt url: block base64 from polluting localStorage
    let sanitizedReceipt = expense.receiptUrl;
    if (sanitizedReceipt && (sanitizedReceipt.startsWith('data:image/') || sanitizedReceipt.startsWith('data:application/'))) {
      sanitizedReceipt = 'receipt_voucher.pdf';
    }

    const updatedExpense: Expense = {
      ...expense,
      receiptUrl: sanitizedReceipt,
      createdAt: expense.createdAt || now,
      updatedAt: now,
      version: (expense.version || 0) + 1,
      deletedAt: null
    };

    if (existingIndex >= 0) {
      raw[existingIndex] = updatedExpense;
      storageService.addAuditLog(expense.id, 'expense', 'update', `Expense updated (${expense.items.length} items)`);
    } else {
      raw.push(updatedExpense);
      storageService.addAuditLog(expense.id, 'expense', 'create', `Expense created (${expense.items.length} items)`);
    }
    localStorage.setItem(EXPENSE_KEY, JSON.stringify(raw));
    storageService.incrementDirtyCount();
  },

  deleteExpense: (id: string): void => {
    const raw = storageService.getRawExpenses();
    const expense = raw.find(e => e.id === id);
    if (expense) {
      const now = new Date().toISOString();
      expense.deletedAt = now;
      expense.updatedAt = now;
      storageService.addAuditLog(id, 'expense', 'delete', 'Expense deleted');
      localStorage.setItem(EXPENSE_KEY, JSON.stringify(raw));
      storageService.incrementDirtyCount();
    }
  },

  // --- SALES SETTLEMENTS (STRIPE / SUMUP / WOLT / CASH) ---
  getRawSalesSettlements: (): SalesSettlement[] => {
    const data = localStorage.getItem(SETTLEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getSalesSettlements: (): SalesSettlement[] => {
    return storageService.getRawSalesSettlements().filter(s => !s.deletedAt);
  },

  saveSalesSettlement: (settlement: SalesSettlement): void => {
    const now = new Date().toISOString();
    const raw = storageService.getRawSalesSettlements();
    const index = raw.findIndex(s => s.id === settlement.id);
    const updated: SalesSettlement = {
      ...settlement,
      createdAt: settlement.createdAt || now,
      updatedAt: now,
      version: (settlement.version || 0) + 1,
      deletedAt: null
    };

    if (index >= 0) {
      raw[index] = updated;
      storageService.addAuditLog(settlement.id, 'settlement', 'update', `Settlement ${settlement.provider} updated`);
    } else {
      raw.push(updated);
      storageService.addAuditLog(settlement.id, 'settlement', 'create', `Settlement ${settlement.provider} added (€${settlement.grossAmount})`);
    }
    localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(raw));
    storageService.incrementDirtyCount();
  },

  deleteSalesSettlement: (id: string): void => {
    const raw = storageService.getRawSalesSettlements();
    const settlement = raw.find(s => s.id === id);
    if (settlement) {
      const now = new Date().toISOString();
      settlement.deletedAt = now;
      settlement.updatedAt = now;
      storageService.addAuditLog(id, 'settlement', 'delete', 'Sales settlement deleted');
      localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(raw));
      storageService.incrementDirtyCount();
    }
  },

  // --- MILEAGE ENTRIES (AJOPÄIVÄKIRJA) ---
  getRawMileageEntries: (): MileageEntry[] => {
    const data = localStorage.getItem(MILEAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  getMileageEntries: (): MileageEntry[] => {
    return storageService.getRawMileageEntries().filter(m => !m.deletedAt);
  },

  saveMileageEntry: (entry: MileageEntry): void => {
    const now = new Date().toISOString();
    const raw = storageService.getRawMileageEntries();
    const index = raw.findIndex(e => e.id === entry.id);
    const updated: MileageEntry = {
      ...entry,
      createdAt: entry.createdAt || now,
      updatedAt: now,
      version: (entry.version || 0) + 1,
      deletedAt: null
    };

    if (index >= 0) {
      raw[index] = updated;
      storageService.addAuditLog(entry.id, 'mileage', 'update', `Trip ${entry.route} updated (${entry.kilometers} km)`);
    } else {
      raw.push(updated);
      storageService.addAuditLog(entry.id, 'mileage', 'create', `Trip ${entry.route} added (${entry.kilometers} km)`);
    }
    localStorage.setItem(MILEAGE_KEY, JSON.stringify(raw));
    storageService.incrementDirtyCount();
  },

  deleteMileageEntry: (id: string): void => {
    const raw = storageService.getRawMileageEntries();
    const entry = raw.find(e => e.id === id);
    if (entry) {
      const now = new Date().toISOString();
      entry.deletedAt = now;
      entry.updatedAt = now;
      storageService.addAuditLog(id, 'mileage', 'delete', 'Trip log entry deleted');
      localStorage.setItem(MILEAGE_KEY, JSON.stringify(raw));
      storageService.incrementDirtyCount();
    }
  },

  // --- HOME OFFICE DEDUCTION (TYÖHUONEVÄHENNYS) ---
  getHomeOfficeDeduction: (year: number = 2026): HomeOfficeDeduction => {
    const data = localStorage.getItem(HOME_OFFICE_KEY);
    if (data) {
      const parsed: Record<number, HomeOfficeDeduction> = JSON.parse(data);
      if (parsed[year]) return parsed[year];
    }
    return {
      year,
      method: 'tier_1', // default over 50% home office €980
      actualAmount: 0,
      notes: 'Full-time remote work / principal place of business'
    };
  },

  saveHomeOfficeDeduction: (deduction: HomeOfficeDeduction): void => {
    const data = localStorage.getItem(HOME_OFFICE_KEY);
    const parsed: Record<number, HomeOfficeDeduction> = data ? JSON.parse(data) : {};
    const updated: HomeOfficeDeduction = {
      ...deduction,
      updatedAt: new Date().toISOString()
    };
    parsed[deduction.year] = updated;
    localStorage.setItem(HOME_OFFICE_KEY, JSON.stringify(parsed));
    storageService.addAuditLog(deduction.year.toString(), 'tax', 'update', `Home office deduction set to ${deduction.method}`);
    storageService.incrementDirtyCount();
  },

  // --- TAX SETTINGS (ALV-KAUSI & ENNAKKOVEROPROSENTTI) ---
  getTaxSettings: (): TaxSettings => {
    const data = localStorage.getItem(TAX_SETTINGS_KEY);
    if (data) {
      const parsed: TaxSettings = JSON.parse(data);
      return {
        ...parsed,
        incomeMode: parsed.incomeMode || 'all_issued',
      };
    }
    return {
      vatPeriod: 'year', // Standard for small toiminimi under €30k
      personalTaxRate: 13.0, // Default 13.0%
      prepaymentTaxAssessed: 0,
      financialYear: 2026,
      incomeMode: 'all_issued'
    };
  },

  saveTaxSettings: (settings: TaxSettings): void => {
    const updated: TaxSettings = {
      ...settings,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(updated));
    storageService.addAuditLog('settings', 'tax', 'update', `Tax settings updated: rate ${settings.personalTaxRate}%, period ${settings.vatPeriod}`);
    storageService.incrementDirtyCount();
  },

  // --- CUSTOMERS ---
  getRawCustomers: (): Customer[] => {
    const data = localStorage.getItem(CUSTOMER_KEY);
    return data ? JSON.parse(data) : [];
  },

  getCustomers: (): Customer[] => {
    return storageService.getRawCustomers().filter(c => !c.deletedAt);
  },

  saveCustomer: (customer: Customer): void => {
    const now = new Date().toISOString();
    const raw = storageService.getRawCustomers();
    const existingIndex = raw.findIndex((c) => c.id === customer.id);
    const updated: Customer = {
      ...customer,
      createdAt: customer.createdAt || now,
      updatedAt: now,
      version: (customer.version || 0) + 1,
      deletedAt: null
    };

    if (existingIndex >= 0) {
      raw[existingIndex] = updated;
    } else {
      raw.push(updated);
    }
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(raw));
    storageService.incrementDirtyCount();
  },

  deleteCustomer: (id: string): void => {
    const raw = storageService.getRawCustomers();
    const customer = raw.find(c => c.id === id);
    if (customer) {
      const now = new Date().toISOString();
      customer.deletedAt = now;
      customer.updatedAt = now;
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(raw));
      storageService.incrementDirtyCount();
    }
  },

  // --- BUSINESS INFO ---
  getBusinessInfo: (): BusinessInfo => {
    const data = localStorage.getItem(BUSINESS_INFO_KEY);
    if (!data) return {
      name: '', businessId: '', address: '', email: '', phone: '',
      bankAccounts: []
    };
    const parsed = JSON.parse(data);
    if (parsed.iban && (!parsed.bankAccounts || parsed.bankAccounts.length === 0)) {
        parsed.bankAccounts = [{ id: '1', label: 'Primary', iban: parsed.iban, bic: parsed.bic }];
        delete parsed.iban;
        delete parsed.bic;
    }
    return parsed;
  },

  saveBusinessInfo: (info: BusinessInfo): void => {
    const updated: BusinessInfo = {
      ...info,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(BUSINESS_INFO_KEY, JSON.stringify(updated));
    storageService.incrementDirtyCount();
  },

  // --- COMPLETE SYNC-READY BACKUP & RESTORE ENGINE ---
  exportAllData: (): string => {
    const syncMeta = storageService.getSyncMetadata();
    const data = {
      schemaVersion: 2,
      appVersion: '2.0-vero-2026',
      deviceId: syncMeta.deviceId,
      exportedAt: new Date().toISOString(),
      invoices: storageService.getInvoices(),
      expenses: storageService.getExpenses(),
      salesSettlements: storageService.getSalesSettlements(),
      mileageEntries: storageService.getMileageEntries(),
      homeOffice: storageService.getHomeOfficeDeduction(2026),
      taxSettings: storageService.getTaxSettings(),
      customers: storageService.getCustomers(),
      businessInfo: storageService.getBusinessInfo(),
      auditLogs: storageService.getAuditLogs()
    };
    storageService.recordBackupExported();
    return JSON.stringify(data, null, 2);
  },

  importAllData: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.invoices && !data.expenses && !data.customers && !data.businessInfo && !data.salesSettlements) {
        throw new Error("Invalid backup file: Missing core bookkeeping entities.");
      }

      // Sanitize legacy base64 in expenses if importing an older backup
      if (Array.isArray(data.expenses)) {
        data.expenses = data.expenses.map((e: Expense) => ({
          ...e,
          receiptUrl: e.receiptUrl?.startsWith('data:') ? 'legacy_receipt.pdf' : e.receiptUrl
        }));
      }

      if (data.invoices) localStorage.setItem(INVOICE_KEY, JSON.stringify(data.invoices));
      if (data.expenses) localStorage.setItem(EXPENSE_KEY, JSON.stringify(data.expenses));
      if (data.salesSettlements) localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(data.salesSettlements));
      if (data.mileageEntries) localStorage.setItem(MILEAGE_KEY, JSON.stringify(data.mileageEntries));
      if (data.homeOffice) {
        const obj = { [data.homeOffice.year || 2026]: data.homeOffice };
        localStorage.setItem(HOME_OFFICE_KEY, JSON.stringify(obj));
      }
      if (data.taxSettings) localStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(data.taxSettings));
      if (data.customers) localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data.customers));
      if (data.businessInfo) localStorage.setItem(BUSINESS_INFO_KEY, JSON.stringify(data.businessInfo));
      if (data.auditLogs) localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(data.auditLogs));

      storageService.updateSyncMetadata({
        lastModifiedAt: new Date().toISOString(),
        dirtyCount: 0
      });
      storageService.addAuditLog('backup', 'tax', 'create', 'Data restored from JSON backup archive');
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
  },

  // --- TOMBSTONE PURGE (FOR RECLAIMING LOCAL STORAGE IF NEEDED) ---
  purgeTombstones: (): number => {
    let purgedCount = 0;
    const filterAndSave = (key: string) => {
      const data = localStorage.getItem(key);
      if (data) {
        const items = JSON.parse(data);
        if (Array.isArray(items)) {
          const active = items.filter((i: any) => !i.deletedAt);
          purgedCount += items.length - active.length;
          localStorage.setItem(key, JSON.stringify(active));
        }
      }
    };
    filterAndSave(INVOICE_KEY);
    filterAndSave(EXPENSE_KEY);
    filterAndSave(SETTLEMENTS_KEY);
    filterAndSave(MILEAGE_KEY);
    filterAndSave(CUSTOMER_KEY);
    return purgedCount;
  },

  calculateFinnishReference: (base: string): string => {
    const weights = [7, 3, 1];
    let sum = 0;
    const reversedBase = base.split('').reverse().join('');
    
    for (let i = 0; i < reversedBase.length; i++) {
      const digit = parseInt(reversedBase[i], 10);
      sum += digit * weights[i % 3];
    }
    
    const checksum = (10 - (sum % 10)) % 10;
    return base + checksum;
  },

  generateId: (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'flow_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  },
  
  getNextInvoiceNumber: (): string => {
    const invoices = storageService.getInvoices();
    const maxNum = invoices.reduce((max, inv) => {
      const num = parseInt(inv.invoiceNumber);
      return isNaN(num) ? max : Math.max(max, num);
    }, 999);
    return (maxNum + 1).toString();
  }
};
