# Finnish Tax Engine & Verohallinto Compliance (2026)
## Project: Toiminimi Flow

---

## 1. Regulatory Framework

Toiminimi Flow is tailored for Finnish individual sole proprietors (*toiminimi / yksityinen elinkeinonharjoittaja*) operating under:
1. **The Accounting Act (*Kirjanpitolaki 1336/1997*)**: Chapter 7 permits natural persons to maintain single-entry cash-basis bookkeeping (*maksuperusteinen yhdenkertainen kirjanpito*).
2. **The Business Tax Act (*Laki elinkeinotulon verottamisesta / EVL 360/1968*)**: Governs taxable business turnover, deductible expenses, and depreciation.
3. **The Value Added Tax Act (*Arvonlisäverolaki / AVL 1501/1993*)**: Governs sales tax collection, deductible input VAT, and filing thresholds.
4. **Verohallinto 2026 Decisions**: Annual statutory allowances for travel expenses and home office deductions.

All statutory constants are codified in [`services/veroTaxEngine.ts`](file:///e:/Toiminimi%20Flow/services/veroTaxEngine.ts).

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
Line 340: Grants (Starttiraha)                                  Line 374: Operating Costs & Gateway Fees
                                                                Line 378: Mileage + Home Office
     │                                                                   │
     └─────────────────────────────────┬─────────────────────────────────┘
                                       ▼
                     [BUSINESS PROFIT BEFORE RELIEF]
                Total Income (300 + 340) - Total Deductions
                                       │
                                       ▼
                   [LINE 380: 5% YRITTÄJÄVÄHENNYS]
              Automatic 5% tax-free deduction on profit!
                                       │
                                       ▼
                        [TAXABLE BUSINESS PROFIT]
                    95% of positive business profit
```

### Form 5 Line Specification
| OmaVero Line | Finnish Tax Label | Engine Source | Note |
| :--- | :--- | :--- | :--- |
| **Line 300** | *Liikevaihto* (Turnover) | Net invoice items + Net POS settlements | Reported net of VAT (ALV 0%). |
| **Line 340** | *Saadut tuet ja avustukset* (Grants) | `ExpenseCategory.GRANT` | Starttiraha / TE-toimisto subsidies. ALV 0%, but taxable income. |
| **Line 350** | *Aineet ja tarvikkeet* (Materials) | `ExpenseCategory.MATERIALS` | Physical goods and supplies used in trade. |
| **Line 374** | *Muut vähennyskelpoiset kulut* (Operating Costs) | Software, Phone, Internet, YEL, Marketing, Travel, Bank/POS fees | All general deductible business overhead. |
| **Line 378** | *Lisävähennykset* (Additional Deductions) | Mileage Log total + Home Office tier | Travel in personal vehicle & home office. |
| **Line 380** | *Yrittäjävähennys* (Entrepreneur Relief) | `businessResult * 0.05` | **5% tax-free relief** automatically granted by Vero on positive sole trader profit. |

---

## 3. Value Added Tax (ALV) Engine

Finland introduced updated VAT statutes:

| Rate | Statutory Category | Engine Configuration |
| :--- | :--- | :--- |
| **25.5 %** | Standard VAT Rate (since 1.9.2024) | IT services, consulting, general goods, SaaS, professional trade. |
| **13.5 %** | 2026 Reduced VAT Rate | Groceries, restaurant meals, books, passenger transport, accommodation. |
| **10.0 %** | Reduced VAT Rate | Newspapers and subscribed periodicals. |
| **0.0 %** | Zero Rate / Tax Exempt | EU B2B reverse charge (*käännetty verovelvollisuus*), exports, Starttiraha. |

- **VAT Exemption Threshold**: Turnover under **€20,000 / year** qualifies for VAT exemption.
- **VAT Return Filing Deadlines**:
  - Annual: February 28 of following year (for turnover < €30,000).
  - Quarterly: 12th of the second month after quarter end (May 12, Aug 12, Nov 12, Feb 12).
  - Monthly: 12th of the second month.

---

## 4. Statutory Deductions (Form 5 Line 378)

### Mileage Deduction (*Ajopäiväkirjan lisävähennys*)
- When using a private car for business trips (client visits, deliveries):
  - **2026 Base Rate**: **€0.55 / km** (2025: €0.59 / km).
  - **Passenger Allowance**: **+€0.04 / km** per additional person related to business.
- Commuting between home and a permanent primary office is personal travel (claimed on personal tax return, not Form 5). Trips from home office to client locations are fully deductible business trips!

### Home Office Deduction (*Työhuonevähennys*)
- Sole traders working from home can claim standard statutory tiers without receipts:
  - **Tier 1 (€980 / year)**: Working remotely from home more than 50% of working days.
  - **Tier 2 (€490 / year)**: Working remotely from home 25% to 50% of working days.
  - **Tier 3 (€245 / year)**: Occasional or part-time remote work.

---

## 5. The "Toiminimi Tax Safe" Formula (*Turvallinen nostovara*)

Sole traders pay their personal income tax via advance bank installments (**Prepayment Tax / *Ennakkovero***) rather than per-invoice withholding.

To protect entrepreneurs from back-tax shocks (*jäännösvero / mätkyt*), the Tax Safe calculates the exact cash buffer to hold in reserve:

$$\text{Net Profit} = \text{Total Net Income} - \text{Total Direct Expenses}$$

$$\text{Taxable Profit} = \text{Net Profit} \times 0.95 \quad \text{(after 5\% Entrepreneur Relief)}$$

$$\text{Estimated Prepayment Tax} = \text{Taxable Profit} \times \left(\frac{\text{Personal Tax Rate}}{100}\right)$$

$$\text{Total Tax Safe Reserve} = \max(0, \text{VAT Payable}) + \text{Estimated Prepayment Tax}$$

$$\mathbf{Safe\ to\ Withdraw} = \max(0, \text{Gross Bank Cash} - \text{Direct Expenses} - \text{Total Tax Safe Reserve})$$

This single metric guarantees sole traders know exactly how much money can be transferred to personal accounts as private withdrawals (*yksityisotot*).
