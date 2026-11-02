# Finnish Tax Engine & Verohallinto Compliance (2026)
## Project: Toiminimi Flow

---

## 1. Regulatory Framework

Toiminimi Flow is tailored for Finnish individual sole proprietors (*toiminimi / ammatin- ja liikkeenharjoittaja*) operating under:
1. **The Accounting Act (*Kirjanpitolaki 1336/1997*)**: Chapter 7 permits natural persons to maintain single-entry cash-basis bookkeeping (*maksuperusteinen yhdenkertainen kirjanpito*).
2. **The Business Tax Act (*Laki elinkeinotulon verottamisesta / EVL 360/1968*)**: Governs taxable business turnover, deductible expenses, and depreciation.
3. **The Value Added Tax Act (*Arvonlisäverolaki / AVL 1501/1993*)**: Governs sales tax collection, deductible input VAT, and filing thresholds.
4. **Verohallinto 2026 Decisions**: Annual statutory allowances for travel expenses and home office deductions.
5. **Self-Employed Persons' Pensions Act (*Yrittäjän eläkelaki / YEL 1272/2006*)**: Governs statutory pension, social security insurance, and Kela unemployment thresholds.

All statutory constants and calculation methods are codified in [`services/veroTaxEngine.ts`](file:///e:/Toiminimi%20Flow/services/veroTaxEngine.ts).

---

## 2. Business Tax Return Form 5 (Lomake 5) Mapping

The Form 5 engine translates all invoices, card settlements, expenses, and travel logs into official OmaVero fields:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VERO FORM 5 (LOMAKE 5) CALCULATION ENGINE                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┴─────────────────────────────────┐
     ▼                                                                   ▼
[TURNOVER & INCOME]                                             [DEDUCTIBLE EXPENSES]
Line 300: Net Invoices + Settlements (ALV 0%)                   Line 350: Materials & Supplies
Line 340: Grants (Starttiraha - ALV 0%)                         Line 374: Operating Costs & Gateway Fees
                                                                Line 378: Mileage + Home Office
     │                                                                   │
     └─────────────────────────────────┬─────────────────────────────────┘
                                       ▼
                     [BUSINESS PROFIT BEFORE RELIEF]
                Total Income (300 + 340) - Total Direct & Line 378 Deductions
                                       │
                                       ▼
                   [LINE 380: 5% YRITTÄJÄVÄHENNYS]
              Automatic 5% tax-free deduction on positive profit!
                                       │
                                       ▼
                        [TAXABLE BUSINESS PROFIT]
                    95% of positive business profit
```

### Form 5 Line Specification
| OmaVero Line | Finnish Tax Label | Engine Source | Note |
| :--- | :--- | :--- | :--- |
| **Line 300** | *Liikevaihto* (Turnover) | Net invoice items + Net POS settlements | Reported net of VAT (ALV 0%). |
| **Line 340** | *Saadut tuet ja avustukset* (Grants) | `ExpenseCategory.GRANT` | Starttiraha / TE-toimisto subsidies. ALV 0%, but taxable business income. |
| **Line 350** | *Aineet ja tarvikkeet* (Materials) | `ExpenseCategory.MATERIALS` | Physical goods and supplies used in trade. |
| **Line 374** | *Muut vähennyskelpoiset kulut* (Operating Costs) | Software, Phone, Internet, YEL, Marketing, Travel, Bank/POS fees | All general deductible business overhead. |
| **Line 378** | *Lisävähennykset* (Additional Deductions) | Mileage Log total + Home Office tier | Travel in personal vehicle & home office. |
| **Line 380** | *Yrittäjävähennys* (Entrepreneur Relief) | `businessResult * 0.05` | **5% tax-free relief** automatically granted by Vero on positive sole trader profit. |

---

## 3. Cash-Basis vs Accrual Income Modes (*Maksuperusteinen vs Suoriteperusteinen*)

Under the Finnish Accounting Act (*Kirjanpitolaki 1336/1997*, Ch. 7, § 2), sole traders keeping single-entry books are legally entitled to calculate income on a **cash basis** (*maksuperusteinen*):
- **Cash-basis (`paid_only`)**: Revenue is recognized only when customer funds actually reach the business bank account. Unpaid invoices are tracked separately as receivables and excluded from immediate tax reserves.
- **Accrual-basis (`all_issued`)**: All issued invoices are recognized as turnover regardless of payment status.

Toiminimi Flow supports both modes seamlessly with real-time recalculation in [`veroTaxEngine.calculateLedgerSummary`](file:///e:/Toiminimi%20Flow/services/veroTaxEngine.ts).

---

## 4. Value Added Tax (ALV) Engine

Finland operates with updated VAT statutes:

| Rate | Statutory Category | Engine Configuration |
| :--- | :--- | :--- |
| **25.5 %** | Standard VAT Rate (since 1.9.2024) | IT services, consulting, general goods, SaaS, professional trade. |
| **13.5 %** | 2026 Reduced VAT Rate (since 1.1.2026) | Groceries, restaurant meals, books, passenger transport, accommodation. |
| **10.0 %** | Reduced VAT Rate | Newspapers and subscribed periodicals. |
| **0.0 %** | Zero Rate / Tax Exempt | EU B2B reverse charge (*käännetty verovelvollisuus*), exports, Starttiraha. |

- **VAT Exemption Threshold**: Annual turnover under **€20,000 / year** qualifies for small business VAT exemption.
- **VAT Return Filing Deadlines**:
  - Annual: February 28 of following year (for turnover < €30,000).
  - Quarterly: 12th of the second month after quarter end (May 12, Aug 12, Nov 12, Feb 12).
  - Monthly: 12th of the second month.

---

## 5. Statutory Deductions (Form 5 Line 378)

### Mileage Deduction (*Ajopäiväkirjan lisävähennys*)
- When using a private car for business trips (client visits, deliveries):
  - **2026 Base Rate**: **€0.55 / km** (2025: €0.59 / km).
  - **Passenger Allowance**: **+€0.04 / km** per additional business-related passenger.
  - **Trailer Allowance**: **+€0.09 / km** when towing heavy equipment/trailer.
- Commuting between home and a permanent primary office is personal travel (claimed on personal tax return, not Form 5). Trips from a home office directly to client locations or project sites are 100% deductible business trips!

### Home Office Deduction (*Työhuonevähennys*)
> [!IMPORTANT]
> **2026 Legal Statute Preservation**: While the Finnish Government abolished the formula home office deduction for standard wage earners (*palkansaajat*) starting 1.1.2026, **self-employed sole traders (*toiminimiyrittäjät / elinkeinonharjoittajat*) retain the statutory right to claim formula deductions on Form 5 Box 378**.

- **Tier 1 (€980 / year)**: Working remotely from home more than 50% of working days.
- **Tier 2 (€490 / year)**: Working remotely from home 25% to 50% of working days.
- **Tier 3 (€245 / year)**: Occasional or part-time remote work (up to 1 day per week).

---

## 6. Self-Employed Pension Insurance (YEL 2026)

- **Mandatory YEL Threshold (2026)**: Confirmed work income exceeding **€9,423.09 / year** (~€785.26 / month) for entrepreneurial activities exceeding 4 months.
- **Unemployment Security Threshold (2026)**: Confirmed work income exceeding **€15,481 / year** for Yrittäjäkassa / Kela earnings-related coverage.
- **Statutory Contribution Rates**:
  - Base rate: **24.4%** for ages 18–52 and 63–69 (or **25.9%** for ages 53–62).
  - First-time entrepreneurs receive a **22% statutory discount** for the initial 48 months (effective base rate ~**19.03%**).
- **Tax Deductibility**: 100% deductible as an operating expense on Form 5 (Box 374) or individual tax return (Form 1A).

---

## 7. The "Toiminimi Tax Safe" Formula (*Turvallinen nostovara*)

Sole traders pay individual income tax via advance bank installments (**Prepayment Tax / *Ennakkovero***) rather than per-invoice withholding.

To protect entrepreneurs from back-tax shocks (*jäännösvero / mätkyt*), the Tax Safe calculates the exact cash buffer to hold in reserve:

$$\text{Net Operating Profit} = \text{Total Net Inflows} - \text{Total Direct Net Expenses}$$

$$\text{Business Result} = \max(0, \text{Net Operating Profit} - \text{Line 378 Additional Deductions})$$

$$\text{Taxable Business Income} = \text{Business Result} \times 0.95 \quad \text{(after 5\% Entrepreneur Relief)}$$

$$\text{Estimated Prepayment Tax} = \text{Taxable Business Income} \times \left(\frac{\text{Personal Tax Rate}}{100}\right)$$

$$\text{Total Tax Safe Reserve} = \max(0, \text{VAT Payable}) + \text{Estimated Prepayment Tax}$$

$$\mathbf{Safe\ to\ Withdraw} = \max(0, \text{Actual Gross Cash Inflows} - \text{Direct Expenses} - \text{Total Tax Safe Reserve})$$

This single metric guarantees sole traders know exactly how much money can be transferred to personal accounts as private withdrawals (*yksityisotot*).

---

## 8. Finnish Localization & Vero Terminology Guidelines

### A. Number, Currency & Temporal Standards (SFS 4175)
To comply with the Finnish national standard **SFS 4175** and Finnish Tax Administration filing rules:
1. **Numbers**: Space as thousands separator, comma as decimal (`18 255,00`).
2. **Currency**: Trailing symbol separated by non-breaking space (`18 255,00\u00A0€`).
3. **Dates**: Day-month-year separated by dots with no leading zeroes (`23.10.2026`).
4. **Times**: 24-hour clock separated by a period (`klo 18.45` or `18.45`).
5. **MyTax Clipboard Compatibility**: When copying calculated numbers to clipboard for OmaVero (Form 5 Lines 300, 350, 374, 378, 380), the clipboard string must format decimals with a comma `,` (e.g. `2450,00`), ensuring OmaVero form inputs accept the pasted figure without syntax rejection.

### B. The English + Vero Finnish Hybrid Convention
All user interface copy uses English for global accessibility, while retaining exact Finnish legal and tax terms in parentheses or badges. This ensures users can correlate any value directly to their official OmaVero submission documents. See [`docs/DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) for the complete terminology alignment table.
