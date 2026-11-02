import { 
  Invoice, Expense, SalesSettlement, MileageEntry, HomeOfficeDeduction, 
  TaxSettings, Form5Breakdown, TaxDeadline, ExpenseCategory,
  LedgerSummary2026, IncomeCalculationMode
} from '../types';

export const VERO_CONSTANTS = {
  MILEAGE_RATE_2026: 0.55,                // 0,55 €/km (Verohallinnon vahvistama kilometrikorvaus 2026)
  MILEAGE_RATE_2025: 0.59,                // 0,59 €/km (2025)
  PASSENGER_RATE_2026: 0.04,              // +0,04 €/km per additional business passenger (matkustajakorotus)
  TRAILER_RATE_2026: 0.09,                // +0,09 €/km with heavy work trailer (perävaunukorotus)
  HOME_OFFICE_TIER_1: 980,                // 980 €/yr (>50% remote work - Retained for sole traders / toiminimi in 2026!)
  HOME_OFFICE_TIER_2: 490,                // 490 €/yr (25% - 50% remote work)
  HOME_OFFICE_TIER_3: 245,                // 245 €/yr (Occasional remote work)
  STANDARD_VAT_RATE: 25.5,                // 25.5% (Standard VAT in Finland since 1.9.2024)
  REDUCED_VAT_RATE_2026: 13.5,            // 13.5% (Food, restaurants, books, transport, accommodation from 1.1.2026)
  NEWSPAPER_VAT_RATE: 10,                 // 10% (Subscribed newspapers & periodicals)
  VAT_EXEMPTION_THRESHOLD: 20000,         // 20 000 € (Small business threshold / Vähäisen toiminnan alaraja 2026)
  VAT_ANNUAL_FILING_THRESHOLD: 30000,     // 30 000 € (Threshold for calendar-year VAT returns)
  VAT_QUARTERLY_FILING_THRESHOLD: 100000, // 100 000 € (Threshold for quarterly VAT returns)
  YEL_MANDATORY_THRESHOLD: 9423.09,       // 9 423,09 €/yr (Official statutory minimum annual YEL income 2026)
  YEL_UNEMPLOYMENT_THRESHOLD_2026: 15481, // 15 481 €/yr (Statutory threshold for Yrittäjäkassa & Kela unemployment allowance)
  YEL_BASE_RATE_2026: 24.4,               // 24.4% (Standard YEL rate; 22% discount for first 48 months = 19.032%)
  ENTREPRENEURIAL_DEDUCTION_RATE: 0.05    // 5% Entrepreneur Relief (Yrittäjävähennys)
};

/**
 * Official working canonical URLs on Vero.fi and Finnish authorities
 */
export const VERO_LINKS = {
  OMAVERO: 'https://www.vero.fi/omavero/',
  OMAVERO_LOGIN: 'https://omavero.vero.fi',
  PREPAYMENT_TAX: 'https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/tax-prepayment/',
  VAT: 'https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/vat/',
  BUSINESS_TAX_RETURN_FORM_5: 'https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/taxation-of-self-employed-individuals/',
  FORM_5_GUIDE: 'https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/taxation-of-self-employed-individuals/instructions-for-filing/',
  MILEAGE_DEDUCTION: 'https://www.vero.fi/en/individuals/deductions/travel-expenses/',
  HOME_OFFICE_DEDUCTION: 'https://www.vero.fi/en/individuals/deductions/remote-working-and-deductions/',
  YEL_INSURANCE: 'https://www.vero.fi/en/businesses-and-corporations/taxes-and-charges/taxation-of-self-employed-individuals/deductions/pension-premiums-yel/'
};

export interface VatRateOption {
  rate: number;
  label: string;
  categoryTag: string;
  description: string;
  isStandard?: boolean;
}

export const OFFICIAL_VAT_RATES_2026: VatRateOption[] = [
  {
    rate: 25.5,
    label: '25.5 % - Standard VAT Rate',
    categoryTag: 'Services, consulting, general goods',
    description: 'Standard VAT rate in Finland (IT services, consulting, general sales)',
    isStandard: true
  },
  {
    rate: 13.5,
    label: '13.5 % - Reduced VAT Rate (2026)',
    categoryTag: 'Food, restaurants, books, transport, accommodation',
    description: 'Effective 1.1.2026 for groceries, restaurant meals, books, passenger transport, and accommodation'
  },
  {
    rate: 10,
    label: '10 % - Reduced VAT Rate',
    categoryTag: 'Newspapers & periodicals',
    description: 'Applies to subscribed and single-copy newspapers and magazines'
  },
  {
    rate: 0,
    label: '0 % - Zero Rate / Tax Exempt',
    categoryTag: 'International B2B, exports, grants (Starttiraha)',
    description: 'Reverse charge B2B EU sales, export sales, and start-up subsidies'
  }
];

export const veroTaxEngine = {
  /**
   * Timezone-safe year extractor from ISO date string (YYYY-MM-DD)
   */
  extractYear: (dateStr?: string): number => {
    if (!dateStr) return new Date().getFullYear();
    const match = dateStr.match(/^(\d{4})/);
    if (match) return parseInt(match[1], 10);
    const parsed = new Date(dateStr).getFullYear();
    return isNaN(parsed) ? new Date().getFullYear() : parsed;
  },

  /**
   * Calculate Home Office Deduction amount based on chosen tier or actual expenses
   */
  getHomeOfficeAmount: (deduction?: HomeOfficeDeduction): number => {
    if (!deduction) return 0;
    if (deduction.method === 'tier_1') return VERO_CONSTANTS.HOME_OFFICE_TIER_1;
    if (deduction.method === 'tier_2') return VERO_CONSTANTS.HOME_OFFICE_TIER_2;
    if (deduction.method === 'tier_3') return VERO_CONSTANTS.HOME_OFFICE_TIER_3;
    if (deduction.method === 'actual') return deduction.actualAmount || 0;
    return 0;
  },

  /**
   * Calculate Mileage deduction from all trip log entries for the year
   */
  getMileageDeductionTotal: (entries: MileageEntry[], year?: number): { totalKm: number; totalDeduction: number } => {
    const targetYear = year || 2026;
    const filtered = entries.filter(e => veroTaxEngine.extractYear(e.date) === targetYear);

    const totalKm = filtered.reduce((sum, e) => sum + (e.kilometers || 0), 0);
    const totalDeduction = filtered.reduce((sum, e) => {
      const baseRate = e.ratePerKm || (targetYear >= 2026 ? VERO_CONSTANTS.MILEAGE_RATE_2026 : VERO_CONSTANTS.MILEAGE_RATE_2025);
      const passengerAdd = (e.passengers || 0) * VERO_CONSTANTS.PASSENGER_RATE_2026;
      return sum + ((e.kilometers || 0) * (baseRate + passengerAdd));
    }, 0);

    return { totalKm, totalDeduction };
  },

  /**
   * Unified Single Source of Truth for Finnish Sole Trader Accounting (Vero 2026)
   */
  calculateLedgerSummary: (
    invoices: Invoice[],
    expenses: Expense[],
    settlements: SalesSettlement[],
    mileageEntries: MileageEntry[],
    homeOffice?: HomeOfficeDeduction,
    taxSettings?: TaxSettings,
    incomeMode: IncomeCalculationMode = 'all_issued',
    yearOverride?: number
  ): LedgerSummary2026 => {
    const settings: TaxSettings = taxSettings || {
      vatPeriod: 'year',
      personalTaxRate: 13.0,
      prepaymentTaxAssessed: 0,
      financialYear: 2026
    };
    const financialYear = yearOverride || settings.financialYear || 2026;

    // 1. Filter entities by financial year (timezone-safe)
    const yearInvoices = invoices.filter(inv => veroTaxEngine.extractYear(inv.invoiceDate) === financialYear);
    const yearSettlements = settlements.filter(s => veroTaxEngine.extractYear(s.date) === financialYear);
    const yearExpenses = expenses.filter(exp => veroTaxEngine.extractYear(exp.paymentDate) === financialYear);

    // 2. Process Sales Invoices
    const invoicesCount = yearInvoices.length;
    let paidInvoicesCount = 0;
    let unpaidInvoicesCount = 0;
    let unpaidGrossAmount = 0;
    let paidInvoicesGross = 0;

    let invoiceNetTurnover = 0;
    let invoiceGrossTurnover = 0;
    let vatCollectedFromInvoices = 0;

    yearInvoices.forEach(inv => {
      const isPaid = Boolean(inv.isPaid);
      let invGross = 0;
      let invNet = 0;
      let invVat = 0;

      inv.items.forEach(item => {
        const lineGross = (item.quantity || 0) * (item.unitPrice || 0);
        const vatRate = item.vatRate || 0;
        const lineNet = vatRate > 0 ? lineGross / (1 + (vatRate / 100)) : lineGross;
        const lineVat = lineGross - lineNet;

        invGross += lineGross;
        invNet += lineNet;
        invVat += lineVat;
      });

      if (isPaid) {
        paidInvoicesCount++;
        paidInvoicesGross += invGross;
      } else {
        unpaidInvoicesCount++;
        unpaidGrossAmount += invGross;
      }

      // Check whether to include this invoice in current turnover calculation based on incomeMode
      const shouldInclude = incomeMode === 'paid_only' ? isPaid : true;
      if (shouldInclude) {
        invoiceNetTurnover += invNet;
        invoiceGrossTurnover += invGross;
        vatCollectedFromInvoices += invVat;
      }
    });

    // 3. Process Card/Terminal/Platform Settlements (Zettle, SumUp, Stripe, Wolt)
    const settlementsCount = yearSettlements.length;
    let settlementNetTurnover = 0;
    let settlementGrossTurnover = 0;
    let settlementFees = 0;
    let vatCollectedFromSettlements = 0;

    yearSettlements.forEach(s => {
      const gross = s.grossAmount || 0;
      const fee = s.feeAmount || 0;
      const vatRate = s.vatRate || 0;
      const net = vatRate > 0 ? gross / (1 + (vatRate / 100)) : gross;
      const vat = gross - net;

      settlementGrossTurnover += gross;
      settlementNetTurnover += net;
      settlementFees += fee;
      vatCollectedFromSettlements += vat;
    });

    const turnoverNet = invoiceNetTurnover + settlementNetTurnover;
    const turnoverGross = invoiceGrossTurnover + settlementGrossTurnover;

    // 4. Process Expenses and Subsidies/Grants (Starttiraha)
    const expensesCount = yearExpenses.length;
    let grantsAndSubsidies = 0;
    let materialsSuppliesNet = 0;
    let operatingExpensesNet = settlementFees; // Payment gateway fees belong to Form 5 Line 374
    let totalExpensesGross = 0;
    let vatPaidOnPurchases = 0;

    yearExpenses.forEach(exp => {
      exp.items.forEach(item => {
        const amount = item.amount || 0;
        if (item.category === ExpenseCategory.GRANT) {
          // Grants (Starttiraha) are taxable business income (Form 5 Line 340), NOT deductible business expenses, ALV 0%
          grantsAndSubsidies += amount;
        } else {
          totalExpensesGross += amount;
          const vatRate = item.vatRate !== undefined ? item.vatRate : 0;
          const net = vatRate > 0 ? amount / (1 + (vatRate / 100)) : amount;
          const vat = amount - net;

          vatPaidOnPurchases += vat;

          if (item.category === ExpenseCategory.MATERIALS) {
            materialsSuppliesNet += net;
          } else {
            operatingExpensesNet += net;
          }
        }
      });
    });

    const totalDirectExpensesNet = materialsSuppliesNet + operatingExpensesNet;
    const totalGrossIncome = turnoverGross + grantsAndSubsidies;
    const totalNetIncome = turnoverNet + grantsAndSubsidies;

    // 5. Additional Deductions (Form 5 Line 378: Mileage + Home Office)
    const { totalKm: mileageKm, totalDeduction: mileageDeduction } = veroTaxEngine.getMileageDeductionTotal(mileageEntries, financialYear);
    const homeOfficeDeduction = veroTaxEngine.getHomeOfficeAmount(homeOffice);
    const totalLisavahennykset = mileageDeduction + homeOfficeDeduction;

    // 6. Business Results & 5% Entrepreneur Relief (Yrittäjävähennys Line 380)
    const operatingProfitNet = Math.max(0, totalNetIncome - totalDirectExpensesNet);
    const businessResult = Math.max(0, operatingProfitNet - totalLisavahennykset);
    const yrittajaVahennys = businessResult > 0 ? businessResult * VERO_CONSTANTS.ENTREPRENEURIAL_DEDUCTION_RATE : 0;
    const taxableBusinessIncome = Math.max(0, businessResult - yrittajaVahennys);

    // 7. Value Added Tax (ALV)
    const vatCollected = vatCollectedFromInvoices + vatCollectedFromSettlements;
    const isVatExempt = settings.vatPeriod === 'exempt';
    const vatBalance = vatCollected - vatPaidOnPurchases;
    const vatPayable = isVatExempt ? 0 : Math.max(0, vatBalance);
    const vatRefundable = isVatExempt ? 0 : Math.max(0, -vatBalance);

    // 8. The Toiminimi Tax Safe (Verosuoja) & Cashflow
    const personalTaxRate = typeof settings.personalTaxRate === 'number' ? settings.personalTaxRate : 13.0;
    const estimatedIncomeTax = taxableBusinessIncome * (personalTaxRate / 100);
    const totalTaxReserve = vatPayable + estimatedIncomeTax;

    // Actual bank cashflow: gross money received into business bank minus gross expenses paid and fees
    const actualCashCollectedGross = (incomeMode === 'paid_only' ? invoiceGrossTurnover : paidInvoicesGross) 
      + settlementGrossTurnover - settlementFees + grantsAndSubsidies;
    const netCashInBank = Math.max(0, actualCashCollectedGross - totalExpensesGross);
    const safeToWithdraw = Math.max(0, netCashInBank - totalTaxReserve);

    const form5: Form5Breakdown = {
      turnoverNet,
      grantsAndSubsidies,
      materialsSupplies: materialsSuppliesNet,
      operatingExpenses: operatingExpensesNet,
      mileageDeduction,
      homeOfficeDeduction,
      totalLisavahennykset,
      businessResult,
      yrittajaVahennys,
      taxableBusinessIncome
    };

    return {
      financialYear,
      incomeMode,
      invoiceNetTurnover,
      settlementNetTurnover,
      turnoverNet,
      turnoverGross,
      grantsAndSubsidies,
      totalGrossIncome,
      totalNetIncome,
      materialsSuppliesNet,
      operatingExpensesNet,
      settlementFees,
      totalDirectExpensesNet,
      totalExpensesGross,
      mileageDeduction,
      mileageKm,
      homeOfficeDeduction,
      totalLisavahennykset,
      operatingProfitNet,
      businessResult,
      yrittajaVahennys,
      taxableBusinessIncome,
      vatCollected,
      vatPaidOnPurchases,
      vatBalance,
      vatPayable,
      vatRefundable,
      isVatExempt,
      estimatedIncomeTax,
      totalTaxReserve,
      netCashInBank,
      safeToWithdraw,
      invoicesCount,
      paidInvoicesCount,
      unpaidInvoicesCount,
      unpaidGrossAmount,
      expensesCount,
      settlementsCount,
      form5
    };
  },

  /**
   * Break down financial data into Vero Form 5 (Lomake 5) tax lines
   */
  calculateForm5: (
    invoices: Invoice[],
    expenses: Expense[],
    settlements: SalesSettlement[],
    mileageEntries: MileageEntry[],
    homeOffice?: HomeOfficeDeduction,
    year: number = 2026,
    incomeMode: IncomeCalculationMode = 'all_issued'
  ): Form5Breakdown => {
    const summary = veroTaxEngine.calculateLedgerSummary(
      invoices,
      expenses,
      settlements,
      mileageEntries,
      homeOffice,
      { vatPeriod: 'year', personalTaxRate: 13.0, prepaymentTaxAssessed: 0, financialYear: year },
      incomeMode,
      year
    );
    return summary.form5;
  },

  /**
   * Helper to determine dynamic deadline status relative to today's date
   */
  resolveDeadlineStatus: (dueDateStr: string): 'upcoming' | 'due_soon' | 'overdue' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 14) return 'due_soon';
    return 'upcoming';
  },

  /**
   * Helper to calculate days remaining until a deadline
   */
  getDaysRemaining: (dueDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  },

  /**
   * Generate statutory deadlines for VAT, Ennakkovero, Form 5, and Lisäennakko
   */
  generateDeadlines: (
    settings: TaxSettings,
    year: number,
    vatBalance: number,
    estimatedIncomeTax: number
  ): TaxDeadline[] => {
    const deadlines: TaxDeadline[] = [];

    // 1. Additional Prepayment (Lisäennakko)
    const lisaennakkoDue = `${year + 1}-01-15`;
    deadlines.push({
      id: 'lisaennakko',
      title: `Additional Prepayment ${year} (Lisäennakko)`,
      finnishTitle: `Additional Prepayment ${year} (Lisäennakko)`,
      dueDate: lisaennakkoDue,
      type: 'income_tax',
      estimatedAmount: Math.max(0, estimatedIncomeTax - (settings.prepaymentTaxAssessed || 0)),
      description: 'Pay additional prepayment in MyTax (OmaVero) by January 15 to avoid paying interest on higher-than-expected profit.',
      status: veroTaxEngine.resolveDeadlineStatus(lisaennakkoDue),
      veroUrl: VERO_LINKS.PREPAYMENT_TAX
    });

    // 2. VAT Return (Arvonlisäveroilmoitus)
    if (settings.vatPeriod === 'year') {
      const due = `${year + 1}-02-28`;
      deadlines.push({
        id: 'vat_yearly',
        title: `Annual VAT Return ${year} (Vuosi-ilmoitus)`,
        finnishTitle: `Annual VAT Return ${year} (Vuosi-ilmoitus)`,
        dueDate: due,
        type: 'vat',
        estimatedAmount: vatBalance,
        description: 'Annual VAT return and tax payment for small business turnover (under €30,000). The return must be submitted in MyTax even if turnover was €0.',
        status: veroTaxEngine.resolveDeadlineStatus(due),
        veroUrl: VERO_LINKS.VAT
      });
    } else if (settings.vatPeriod === 'quarter') {
      const q4Due = `${year + 1}-02-12`;
      deadlines.push({
        id: 'vat_quarterly',
        title: `Quarterly VAT Return Q4 ${year}`,
        finnishTitle: `Quarterly VAT Return Q4 ${year} (Neljännesvuosi-ilmoitus)`,
        dueDate: q4Due,
        type: 'vat',
        estimatedAmount: vatBalance,
        description: 'Quarterly VAT return and payment due on the 12th day of the second month following the end of the quarter in MyTax.',
        status: veroTaxEngine.resolveDeadlineStatus(q4Due),
        veroUrl: VERO_LINKS.VAT
      });
    } else if (settings.vatPeriod === 'month') {
      const mDue = `${year}-11-12`;
      deadlines.push({
        id: 'vat_monthly',
        title: 'Monthly VAT Return',
        finnishTitle: 'Monthly VAT Return (Kuukausittainen ALV-ilmoitus)',
        dueDate: mDue,
        type: 'vat',
        estimatedAmount: vatBalance,
        description: 'Monthly VAT return and tax payment due by the 12th day of the second month in MyTax.',
        status: veroTaxEngine.resolveDeadlineStatus(mDue),
        veroUrl: VERO_LINKS.VAT
      });
    }

    // 3. Business Tax Return Form 5 (Lomake 5)
    const form5Due = `${year + 1}-04-01`;
    deadlines.push({
      id: 'form5',
      title: `Business Tax Return Form 5 (${year})`,
      finnishTitle: `Business Tax Return Form 5 (${year} Lomake 5)`,
      dueDate: form5Due,
      type: 'form5',
      description: 'The statutory annual business tax return for self-employed individuals (toiminimi). Mandatory for all registered sole proprietors, even if there was no active trade.',
      status: veroTaxEngine.resolveDeadlineStatus(form5Due),
      veroUrl: VERO_LINKS.FORM_5_GUIDE
    });

    // 4. YEL Pension Check
    const yelDue = `${year}-12-31`;
    deadlines.push({
      id: 'yel_check',
      title: 'YEL Pension Insurance Review',
      finnishTitle: `YEL Pension Insurance Review (${year})`,
      dueDate: yelDue,
      type: 'yel',
      description: `Verify that your confirmed YEL annual work income meets the statutory threshold (approx. €${VERO_CONSTANTS.YEL_MANDATORY_THRESHOLD.toLocaleString('fi-FI')}) and reflects your actual entrepreneurial work input.`,
      status: veroTaxEngine.resolveDeadlineStatus(yelDue),
      veroUrl: VERO_LINKS.YEL_INSURANCE
    });

    // Sort by due date ascending
    return deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },

  /**
   * "The Toiminimi Tax Safe" Cashflow Breakdown (Legacy compatibility helper)
   */
  calculateTaxSafe: (
    totalGrossIncome: number,
    totalNetIncome: number,
    totalExpensesGross: number,
    vatPayable: number,
    personalTaxRate: number
  ) => {
    const netProfit = Math.max(0, totalNetIncome - totalExpensesGross);
    const taxableProfit = netProfit * (1 - VERO_CONSTANTS.ENTREPRENEURIAL_DEDUCTION_RATE);
    const estimatedPrepaymentTax = taxableProfit * (personalTaxRate / 100);
    const totalTaxReserve = Math.max(0, vatPayable) + estimatedPrepaymentTax;
    const safeToWithdraw = Math.max(0, totalGrossIncome - totalExpensesGross - totalTaxReserve);

    return {
      netProfit,
      taxableProfit,
      estimatedPrepaymentTax,
      totalTaxReserve,
      safeToWithdraw
    };
  },

  getVeroLegalDisclaimer: () => {
    return 'Official Notice: Flow Toiminimi provides automated calculation aids, deadline schedules, and MyTax filing guides based on current Finnish Tax Administration (Verohallinto / Vero) statutes. This application is an informational tool and does not constitute formal legal, accounting, or tax advice. Regulations change periodically; always verify your final numbers in MyTax prior to official submission.';
  }
};
