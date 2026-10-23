import { 
  Invoice, Expense, Customer, BusinessInfo, AuditLogEntry, 
  MileageEntry, HomeOfficeDeduction, SalesSettlement, TaxSettings 
} from '../types';
import { VERO_CONSTANTS } from './veroTaxEngine';

const INVOICE_KEY = 'toiminimi_invoices';
const EXPENSE_KEY = 'toiminimi_expenses';
const CUSTOMER_KEY = 'toiminimi_customers';
const BUSINESS_INFO_KEY = 'toiminimi_business_info';
const AUDIT_LOG_KEY = 'toiminimi_audit_logs';
const MILEAGE_KEY = 'toiminimi_mileage_entries';
const HOME_OFFICE_KEY = 'toiminimi_home_office';
const SETTLEMENTS_KEY = 'toiminimi_sales_settlements';
const TAX_SETTINGS_KEY = 'toiminimi_tax_settings';

export const storageService = {
  // Audit Logs
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

  // Invoices
  getInvoices: (): Invoice[] => {
    const data = localStorage.getItem(INVOICE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveInvoice: (invoice: Invoice): void => {
    const invoices = storageService.getInvoices();
    const existingIndex = invoices.findIndex((i) => i.id === invoice.id);
    
    if (existingIndex >= 0) {
      invoices[existingIndex] = invoice;
      storageService.addAuditLog(invoice.id, 'invoice', 'update', `Invoice #${invoice.invoiceNumber} updated`);
    } else {
      invoices.push(invoice);
      storageService.addAuditLog(invoice.id, 'invoice', 'create', `Invoice #${invoice.invoiceNumber} created`);
    }
    localStorage.setItem(INVOICE_KEY, JSON.stringify(invoices));
  },

  deleteInvoice: (id: string): void => {
    const invoices = storageService.getInvoices();
    const invoice = invoices.find(i => i.id === id);
    if (invoice) {
        storageService.addAuditLog(id, 'invoice', 'delete', `Invoice #${invoice.invoiceNumber} deleted`);
    }
    localStorage.setItem(INVOICE_KEY, JSON.stringify(invoices.filter(i => i.id !== id)));
  },

  // Expenses
  getExpenses: (): Expense[] => {
    const data = localStorage.getItem(EXPENSE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveExpense: (expense: Expense): void => {
    const expenses = storageService.getExpenses();
    const existingIndex = expenses.findIndex((e) => e.id === expense.id);
    
    if (existingIndex >= 0) {
      expenses[existingIndex] = expense;
      storageService.addAuditLog(expense.id, 'expense', 'update', `Expense updated (${expense.items.length} items)`);
    } else {
      expenses.push(expense);
      storageService.addAuditLog(expense.id, 'expense', 'create', `Expense created (${expense.items.length} items)`);
    }
    localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
  },

  deleteExpense: (id: string): void => {
    storageService.addAuditLog(id, 'expense', 'delete', 'Expense deleted');
    const expenses = storageService.getExpenses();
    localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses.filter(e => e.id !== id)));
  },

  // Sales Settlements (Myyntilitykset: Stripe, iZettle, SumUp, Wolt, Cash)
  getSalesSettlements: (): SalesSettlement[] => {
    const data = localStorage.getItem(SETTLEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSalesSettlement: (settlement: SalesSettlement): void => {
    const settlements = storageService.getSalesSettlements();
    const index = settlements.findIndex(s => s.id === settlement.id);
    if (index >= 0) {
      settlements[index] = settlement;
      storageService.addAuditLog(settlement.id, 'settlement', 'update', `Settlement ${settlement.provider} updated`);
    } else {
      settlements.push(settlement);
      storageService.addAuditLog(settlement.id, 'settlement', 'create', `Settlement ${settlement.provider} added (€${settlement.grossAmount})`);
    }
    localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(settlements));
  },

  deleteSalesSettlement: (id: string): void => {
    const settlements = storageService.getSalesSettlements();
    storageService.addAuditLog(id, 'settlement', 'delete', 'Sales settlement deleted');
    localStorage.setItem(SETTLEMENTS_KEY, JSON.stringify(settlements.filter(s => s.id !== id)));
  },

  // Mileage Entries (Ajopäiväkirja)
  getMileageEntries: (): MileageEntry[] => {
    const data = localStorage.getItem(MILEAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveMileageEntry: (entry: MileageEntry): void => {
    const entries = storageService.getMileageEntries();
    const index = entries.findIndex(e => e.id === entry.id);
    if (index >= 0) {
      entries[index] = entry;
      storageService.addAuditLog(entry.id, 'mileage', 'update', `Trip ${entry.route} updated (${entry.kilometers} km)`);
    } else {
      entries.push(entry);
      storageService.addAuditLog(entry.id, 'mileage', 'create', `Trip ${entry.route} added (${entry.kilometers} km)`);
    }
    localStorage.setItem(MILEAGE_KEY, JSON.stringify(entries));
  },

  deleteMileageEntry: (id: string): void => {
    const entries = storageService.getMileageEntries();
    storageService.addAuditLog(id, 'mileage', 'delete', 'Trip log entry deleted');
    localStorage.setItem(MILEAGE_KEY, JSON.stringify(entries.filter(e => e.id !== id)));
  },

  // Home Office Deduction (Työhuonevähennys)
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
    parsed[deduction.year] = deduction;
    localStorage.setItem(HOME_OFFICE_KEY, JSON.stringify(parsed));
    storageService.addAuditLog(deduction.year.toString(), 'tax', 'update', `Home office deduction set to ${deduction.method}`);
  },

  // Tax Settings (Alv-kausi & Ennakkoveroprosentti)
  getTaxSettings: (): TaxSettings => {
    const data = localStorage.getItem(TAX_SETTINGS_KEY);
    if (data) return JSON.parse(data);
    return {
      vatPeriod: 'year', // Standard for small toiminimi under €30k
      personalTaxRate: 13.0, // Default 13.0% as shown in OP screenshot
      prepaymentTaxAssessed: 0,
      financialYear: 2026
    };
  },

  saveTaxSettings: (settings: TaxSettings): void => {
    localStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(settings));
    storageService.addAuditLog('settings', 'tax', 'update', `Tax settings updated: rate ${settings.personalTaxRate}%, period ${settings.vatPeriod}`);
  },

  // Customers
  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(CUSTOMER_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveCustomer: (customer: Customer): void => {
    const customers = storageService.getCustomers();
    const existingIndex = customers.findIndex((c) => c.id === customer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.push(customer);
    }
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customers));
  },

  deleteCustomer: (id: string): void => {
    const customers = storageService.getCustomers();
    const newCustomers = customers.filter(c => c.id !== id);
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(newCustomers));
  },

  // Business Info
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
    localStorage.setItem(BUSINESS_INFO_KEY, JSON.stringify(info));
  },

  // Complete Backup & Restore Engine
  exportAllData: (): string => {
    const data = {
      invoices: storageService.getInvoices(),
      expenses: storageService.getExpenses(),
      salesSettlements: storageService.getSalesSettlements(),
      mileageEntries: storageService.getMileageEntries(),
      homeOffice: storageService.getHomeOfficeDeduction(2026),
      taxSettings: storageService.getTaxSettings(),
      customers: storageService.getCustomers(),
      businessInfo: storageService.getBusinessInfo(),
      auditLogs: storageService.getAuditLogs(),
      appVersion: '2.0-vero-2026',
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData: (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.invoices && !data.expenses && !data.customers && !data.businessInfo && !data.salesSettlements) {
        throw new Error("Invalid backup file");
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
      return true;
    } catch (e) {
      console.error("Import failed:", e);
      return false;
    }
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

  generateId: (): string => Math.random().toString(36).substr(2, 9),
  
  getNextInvoiceNumber: (): string => {
      const invoices = storageService.getInvoices();
      const maxNum = invoices.reduce((max, inv) => {
          const num = parseInt(inv.invoiceNumber);
          return isNaN(num) ? max : Math.max(max, num);
      }, 999);
      return (maxNum + 1).toString();
  }
};
