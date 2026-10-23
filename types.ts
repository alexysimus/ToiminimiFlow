export type UnitType = 'item' | 'hour';

export enum ExpenseCategory {
  MATERIALS = 'Materials & Supplies (Aineet ja tarvikkeet)',
  SERVICE = 'Software & IT Services (Palvelut ja ohjelmistot)',
  PHONE_INTERNET = 'Phone & Internet (Puhelin ja netti)',
  TRAINING = 'Training & Education (Koulutus)',
  INSURANCE = 'YEL & Business Insurance (YEL ja vakuutukset)',
  MARKETING = 'Marketing & Advertising (Markkinointi)',
  TRAVEL_ACCOMMODATION = 'Travel & Accommodation (Matkakulut)',
  OTHER = 'Other Business Expenses (Muut kulut)',
  GRANT = 'Starttiraha & Grants (Saadut tuet - ALV 0%)'
}

export enum Tab {
  DASHBOARD = 'dashboard',
  TAXES = 'taxes',
  DEDUCTIONS = 'deductions',
  INVOICE = 'invoice',
  EXPENSE = 'expense',
  CUSTOMERS = 'customers',
  BUSINESS = 'business',
  BACKUP = 'backup'
}

export interface BankAccount {
  id: string;
  label: string;
  iban: string;
  bic: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  dateOfWork: string;
  quantity: number;
  unit: UnitType;
  unitPrice: number; // VAT included or net depending on toggle, standard is VAT included in form
  vatRate: number; // e.g. 25.5, 14, 10, 0
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentDuration: number;
  referenceNumber: string;
  isPaid?: boolean;
  paidDate?: string;
  
  senderName: string;
  senderBusinessId: string;
  senderAddress: string;
  senderEmail: string;
  senderPhone: string;
  senderIban: string;
  senderBic: string;

  recipientId?: string;
  recipientName: string;
  recipientBusinessId?: string;
  recipientEmail: string;
  recipientAddress: string;
  
  message: string;
  items: InvoiceItem[];
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number; // Gross amount
  category: ExpenseCategory;
  vatRate?: number; // e.g. 25.5, 14, 10, 0
  isGrant?: boolean; // For Starttiraha / business subsidy
}

export interface Expense {
  id: string;
  receiptUrl?: string;
  paymentDate: string;
  items: ExpenseItem[];
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  businessId: string;
  email: string;
  address: string;
}

export interface BusinessInfo {
  name: string;
  businessId: string;
  address: string;
  email: string;
  phone: string;
  bankAccounts: BankAccount[];
}

export interface TaxSettings {
  vatPeriod: 'year' | 'quarter' | 'month' | 'exempt';
  personalTaxRate: number; // e.g. 13.0 (%)
  prepaymentTaxAssessed: number; // Annual ennakkovero from Vero decision (eur)
  financialYear: number; // e.g. 2026
}

export interface MileageEntry {
  id: string;
  date: string;
  route: string; // e.g., "Otaniemi - Pasila - Otaniemi"
  kilometers: number;
  purpose: string; // Client meeting, deliveries, etc.
  passengers: number;
  ratePerKm: number; // 0.55 for 2026, 0.59 for 2025
  createdAt: string;
}

export interface HomeOfficeDeduction {
  year: number;
  method: 'tier_1' | 'tier_2' | 'tier_3' | 'actual'; // €980 / €490 / €245 / custom
  actualAmount?: number;
  notes?: string;
}

export interface SalesSettlement {
  id: string;
  date: string;
  provider: 'Stripe' | 'iZettle' | 'SumUp' | 'Wolt' | 'Foodora' | 'Cash' | 'Other';
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  vatRate: number; // 25.5, 14, 10, 0
  description: string;
  createdAt: string;
}

export interface Form5Breakdown {
  turnoverNet: number;        // Line 300 (Liikevaihto)
  grantsAndSubsidies: number; // Line 340 (Saadut tuet ja avustukset)
  materialsSupplies: number;  // Line 350 (Aineet ja tarvikkeet)
  operatingExpenses: number;  // Line 374 (Muut vähennyskelpoiset kulut)
  mileageDeduction: number;   // Line 378 (Ajopäiväkirjan lisävähennys)
  homeOfficeDeduction: number;// Line 378 (Työhuonevähennys)
  totalLisavahennykset: number; // Total additional deductions
  businessResult: number;     // Liiketulos ennen yrittäjävähennystä
  yrittajaVahennys: number;   // Line 380 (5% entrepreneurial deduction)
  taxableBusinessIncome: number; // 95% of positive business result
}

export interface TaxDeadline {
  id: string;
  title: string;
  finnishTitle: string;
  dueDate: string;
  type: 'vat' | 'income_tax' | 'form5' | 'yel';
  estimatedAmount?: number;
  description: string;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'filed';
  veroUrl: string;
}

export interface AuditLogEntry {
  id: string;
  entityId: string;
  entityType: 'invoice' | 'expense' | 'settlement' | 'mileage' | 'tax';
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  details: string;
}
