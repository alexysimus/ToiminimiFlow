import { 
  Invoice, Expense, SalesSettlement, MileageEntry, HomeOfficeDeduction, 
  TaxSettings, Form5Breakdown, TaxDeadline, ExpenseCategory 
} from '../types';

export const VERO_CONSTANTS = {
  MILEAGE_RATE_2026: 0.55, // €/km in 2026
  MILEAGE_RATE_2025: 0.59, // €/km in 2025
  PASSENGER_RATE_2026: 0.04, // €/km per extra passenger
  HOME_OFFICE_TIER_1: 980, // Over 50% home working days / full-time
  HOME_OFFICE_TIER_2: 490, // 25% - 50% home working days
  HOME_OFFICE_TIER_3: 245, // Occasional but recurring
  STANDARD_VAT_RATE: 25.5, // Standard VAT in Finland since 1.9.2024
  REDUCED_VAT_RATE_2026: 13.5, // Reduced VAT starting 1.1.2026 (food, restaurants, books, transport)
  VAT_EXEMPTION_THRESHOLD: 20000, // Small business threshold 2025/2026 (€20,000)
  YEL_MANDATORY_THRESHOLD: 9208, // Statutory minimum annual YEL income
  ENTREPRENEURIAL_DEDUCTION_RATE: 0.05, // 5% Entrepreneur Relief (Yrittäjävähennys)
};

/**
 * Official working canonical URLs on Vero.fi and official authorities (no 404s)
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
   * Calculate Home Office Deduction amount based on chosen tier
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
    const filtered = year 
      ? entries.filter(e => new Date(e.date).getFullYear() === year)
      : entries;

    const totalKm = filtered.reduce((sum, e) => sum + e.kilometers, 0);
    const totalDeduction = filtered.reduce((sum, e) => {
      const baseRate = e.ratePerKm || VERO_CONSTANTS.MILEAGE_RATE_2026;
      const passengerAdd = (e.passengers || 0) * VERO_CONSTANTS.PASSENGER_RATE_2026;
      return sum + (e.kilometers * (baseRate + passengerAdd));
    }, 0);

    return { totalKm, totalDeduction };
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
    year: number = 2026
  ): Form5Breakdown => {
    // 1. Invoices Net Turnover (Liikevaihto ALV 0%)
    let invoiceNetTurnover = 0;
    invoices
      .filter(inv => new Date(inv.invoiceDate).getFullYear() === year)
      .forEach(inv => {
        inv.items.forEach(item => {
          const gross = item.quantity * item.unitPrice;
          const vatMultiplier = 1 + ((item.vatRate || 0) / 100);
          const net = item.vatRate > 0 ? gross / vatMultiplier : gross;
          invoiceNetTurnover += net;
        });
      });

    // 2. Sales Settlements Net Turnover (e.g. Stripe, iZettle, Wolt)
    let settlementNetTurnover = 0;
    let settlementFees = 0;
    settlements
      .filter(s => new Date(s.date).getFullYear() === year)
      .forEach(s => {
        const vatMultiplier = 1 + ((s.vatRate || 0) / 100);
        const net = s.vatRate > 0 ? s.grossAmount / vatMultiplier : s.grossAmount;
        settlementNetTurnover += net;
        settlementFees += s.feeAmount; // Deductible operating expense
      });

    const turnoverNet = invoiceNetTurnover + settlementNetTurnover;

    // 3. Grants and Subsidies (Starttiraha - ALV 0%, tracked in Form 5 line 340)
    let grantsAndSubsidies = 0;
    let materialsSupplies = 0;
    let operatingExpenses = settlementFees;

    expenses
      .filter(exp => new Date(exp.paymentDate).getFullYear() === year)
      .forEach(exp => {
        exp.items.forEach(item => {
          // Calculate net amount (excluding VAT)
          const vatRate = item.vatRate !== undefined ? item.vatRate : 0;
          const vatMultiplier = 1 + (vatRate / 100);
          const netCost = vatRate > 0 ? item.amount / vatMultiplier : item.amount;

          if (item.category === ExpenseCategory.GRANT) {
            grantsAndSubsidies += item.amount;
          } else if (item.category === ExpenseCategory.MATERIALS) {
            materialsSupplies += netCost;
          } else {
            operatingExpenses += netCost;
          }
        });
      });

    // 4. Additional Deductions (Lisävähennykset: Line 378)
    const { totalDeduction: mileageDeduction } = veroTaxEngine.getMileageDeductionTotal(mileageEntries, year);
    const homeOfficeDeduction = veroTaxEngine.getHomeOfficeAmount(homeOffice);
    const totalLisavahennykset = mileageDeduction + homeOfficeDeduction;

    // 5. Total Business Result (Elinkeinotoiminnan tulos ennen yrittäjävähennystä)
    const totalIncome = turnoverNet + grantsAndSubsidies;
    const totalDirectExpenses = materialsSupplies + operatingExpenses;
    const businessResult = Math.max(0, totalIncome - totalDirectExpenses - totalLisavahennykset);

    // 6. 5% Entrepreneurial Deduction (Yrittäjävähennys Line 380)
    // Vero automatically grants 5% tax-free deduction on positive sole trader business profit!
    const yrittajaVahennys = businessResult > 0 ? businessResult * VERO_CONSTANTS.ENTREPRENEURIAL_DEDUCTION_RATE : 0;
    const taxableBusinessIncome = Math.max(0, businessResult - yrittajaVahennys);

    return {
      turnoverNet,
      grantsAndSubsidies,
      materialsSupplies,
      operatingExpenses,
      mileageDeduction,
      homeOfficeDeduction,
      totalLisavahennykset,
      businessResult,
      yrittajaVahennys,
      taxableBusinessIncome
    };
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
      description: `Verify that your confirmed YEL annual work income meets the statutory threshold (approx. €${VERO_CONSTANTS.YEL_MANDATORY_THRESHOLD}) and reflects your actual entrepreneurial work input.`,
      status: veroTaxEngine.resolveDeadlineStatus(yelDue),
      veroUrl: VERO_LINKS.YEL_INSURANCE
    });

    // Sort by due date ascending
    return deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },

  /**
   * "The Toiminimi Tax Safe" Cashflow Breakdown
   */
  calculateTaxSafe: (
    totalGrossIncome: number,
    totalNetIncome: number,
    totalExpensesGross: number,
    vatPayable: number,
    personalTaxRate: number // e.g. 13%
  ) => {
    const netProfit = Math.max(0, totalNetIncome - totalExpensesGross);
    // Entrepreneur relief reduces taxable base by 5%
    const taxableProfit = netProfit * 0.95;
    // Estimated personal income tax reserve
    const estimatedPrepaymentTax = taxableProfit * (personalTaxRate / 100);

    // Total tax safe reserve: VAT + Income Tax
    const totalTaxReserve = Math.max(0, vatPayable) + estimatedPrepaymentTax;

    // Safe to withdraw: Total gross cash in bank minus business expenses and total tax safe reserve
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
