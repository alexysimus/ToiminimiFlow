# Design System & UI Specifications
## Project: Toiminimi Flow

---

## 1. Design Philosophy: Apple HIG × Finnish Minimalist Precision

Toiminimi Flow pairs the clarity and tactile elegance of **Apple Human Interface Guidelines (HIG)** with the uncluttered, functional precision of **Finnish design**.

### Core Tenets
1. **Clarity & Dignity**: Financial applications must convey trust and authority. No garish banner ads, no animated clutter, and no dark patterns.
2. **Tactile & Ergonomic**: Touch targets adhere to Apple's 44×44 pt minimum. Native spring drag gestures, haptic feedback pulses, and pull-to-refresh feel at home on mobile screens.
3. **Materials & Depth**: Subdued frosted glass (`ios-glass` backdrop blur 20px, saturation 180%), hairline 1px borders, and soft layered shadows create visual hierarchy without visual noise.
4. **Adaptive Tiered Density**: Layouts adapt dynamically to screen size, using progressive disclosure so dense tax tables never overwhelm small displays.

---

## 2. Color Palette (Finnish Flag Identity)

The palette is derived directly from the statutory colors of the **Finnish Flag (*Siniristilippu*)** and Nordic winter landscape:

| Token Name | Hex Code | Visual Swatch | Semantic Usage |
| :--- | :--- | :--- | :--- |
| **Finnish Flag Blue** | `#003580` / `#002F6C` | 🟦 Siniristi | Primary brand accent, primary CTA buttons, active sidebar tabs, key badges. |
| **Deep Flag Navy** | `#001D4A` | ⬛ Deep Navy | High-contrast header text, brand logo mark, dark button hover states. |
| **Ice Blue Tint** | `#EDF4FC` | 🧊 Ice Blue | Inset summary cards, info callout banners, secondary button backgrounds. |
| **Ice Border Blue** | `#BFDBFE` | 🔷 Ice Border | Hairline borders for tax callouts, active focus rings, selected card outlines. |
| **Snow White** | `#FFFFFF` | ⬜ Pure White | Card backgrounds, modal surfaces, table row backgrounds. |
| **Nordic Canvas Slate** | `#F8FAFC` / `#F2F2F7` | ◽ System Gray | Global viewport canvas (desktop slate `#F8FAFC`, iOS system gray `#F2F2F7`). |
| **Safe Emerald** | `#059669` / `#10B981` | 🟩 Green | "Safe to Withdraw" cash, paid invoice status, positive net margin. |
| **Tax Safe Amber** | `#D97706` / `#F59E0B` | 🟧 Amber | VAT reserve holdings, upcoming tax deadlines (within 14 days). |
| **Overdue Rose** | `#E11D48` / `#F43F5E` | 🟥 Rose | Overdue tax returns, unpaid invoices past due date, deletion actions. |

---

## 3. Typography: Commissioner & JetBrains Mono

### Primary Typeface: Commissioner
- **Source**: [Google Fonts (Commissioner)](https://fonts.google.com/specimen/Commissioner)
- **Role**: All application UI, headings, labels, button text, and body copy.
- **Why Commissioner**: Designed by Kostas Bartsokas, Commissioner is a low-contrast geometric grotesque with humanist construction. It provides:
  - **Exceptional Finnish Diacritics**: Perfect vertical proportions and clear dots for Finnish characters (`ä`, `ö`, `å`, `Ä`, `Ö`, `Å`).
  - **Legibility in Dense Tables**: Clear distinguishability between numbers, uppercase, and punctuation.
  - **Weights in Use**: 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold).

### Monospace Typeface: JetBrains Mono
- **Role**: IBAN bank accounts, Finnish reference numbers (*viitenumero*), Y-tunnus, and currency displays.
- **Key Feature**: Enables `.tabular-nums` so numbers align vertically without layout jitter when sums update.

```css
body {
  font-family: 'Commissioner', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.font-mono {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}
```

---

## 4. Responsive Viewport Tiers & Adaptive Layouts

The application adapts across four screen-size tiers:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              RESPONSIVE VIEWPORT TIERS                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
 [Tier A: Mobile Phone]          [Tier B: Tablet / Foldable]       [Tier C: Desktop / Wide]
  320px – 767px                   768px – 1023px                    1024px – 2560px+
  ┌───────────────────┐           ┌───────────────────────┐         ┌────────────────────────┐
  │ [Header]          │           │ [Side] [Content]      │         │ [Sidebar] [2-Col Grid] │
  │ [Main Content]    │           │        [2-Col Grid]   │         │           [Tables]     │
  │                   │           │                       │         │           [Tax Safe]   │
  │ [Bottom Tab Bar]  │           └───────────────────────┘         └────────────────────────┘
  └───────────────────┘
```

### Tier A: Mobile (< 768px - Touch-First iPhone & Android)
- **Navigation**: Apple HIG bottom tab bar with 4 core tabs (Home, Invoices, Expenses, Taxes) + 5th tab opening an iOS "More" bottom sheet.
- **Touch Ergonomics**: All tappable elements adhere to `>= 44×44px` with active scale compression (`active:scale-95`).
- **Gestures**: Spring-based pull-to-refresh (`PullToRefresh.tsx`) with haptic pulse (12ms), and swipeable bottom sheets (`BottomSheet.tsx`).
- **Safe-Area Insets**: Incorporates `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to protect against notch and home indicator cutoffs.

### Tier B: Tablet & Foldable (768px – 1023px)
- **Navigation**: Collapsible left navigation drawer.
- **Layout**: 2-column dashboard layout (Cashflow metrics on left, Tax Safe & Deadlines on right).

### Tier C: Desktop & Ultrawide (1024px+)
- **Navigation**: Persistent left sidebar with instant 1-click OmaVero external drawer.
- **Layout**: Full multi-column view with detailed data tables, month-by-month Recharts bar chart, and side-by-side tax calculators.

---

## 5. Tiered Density for Crowded Components

Financial applications become crowded very quickly. To prevent visual fatigue:

### 1. Progressive Disclosure
- **Dashboard**: High-level financial cards show the immediate takeaway ("Safe to Withdraw €3,450"). Clicking or expanding unveils the full breakdown (Gross Income → Expenses → VAT reserve → Income tax reserve).
- **Form 5 Assistant**: Summary totals are displayed first; users can drill down into individual expense categories or click "Copy" without reading 50 table rows.

### 2. Inspection Popover (`TextReveal.tsx`)
- Long Finnish compound words (*arvonlisäveroilmoitus*, *elinkeinotoiminnan tulos*) or long client addresses easily break card layouts on mobile.
- `TextReveal` renders clean 1-line or 2-line truncated text on mobile. Tapping it summons an iOS-style translucent floating popover displaying the full text with a 1-tap clipboard copy button.

### 3. Modal Workspaces for Multi-Step Tasks
- Complex calculations (e.g., Recording POS card batch settlements, consulting the beginner's tax guide, or filing Form 5) are isolated in dedicated `BottomSheet` / modal workspaces, keeping the primary viewport clean.

---

## 6. Finnish Localization Standards (SFS 4175 Standard)

All numerical, temporal, and financial values must adhere to the Finnish national standard **SFS 4175** (`services/formatUtils.ts`):

| Format Type | Finnish SFS 4175 Standard | Incorrect / Non-Compliant | Utility Function |
| :--- | :--- | :--- | :--- |
| **Currency** | `18 255,00 €` (non-breaking space thousands, comma decimal, trailing €) | `€18,255.00` or `18.255,00 €` | `formatFinnishCurrency(num)` |
| **Decimals** | `25,5 %`, `0,55 €/km` (comma decimal separator) | `25.5%`, `0.55` | `formatFinnishPercent(num)` |
| **Dates** | `d.m.yyyy` (`23.10.2026`, `2.2.2026` no leading zero on day/month) | `2026-10-23`, `10/23/2026` | `formatFinnishDate(date)` |
| **Date Ranges** | `2.10.2026 – 15.1.2027` (en-dash with spaces) | `2.10.2026-15.1.2027` | `formatFinnishDateRange(s, e)` |
| **Time** | `klo 18.45` or `18.45` (24-hour clock, period separator) | `6:45 PM`, `18:45` | `formatFinnishTime(date)` |
| **IBAN** | `FI21 1234 5600 0007 89` (4-character space-separated blocks) | `FI2112345600000789` | `formatFinnishIban(iban)` |
| **Viitenumero** | `12345 67890` (5-digit groups right-to-left, Modulo 10 7-3-1) | `1234567890` | `formatFinnishReference(ref)` |

---

## 7. Bilingual Hybrid Terminology Pattern & Vero Guidelines

### Design Rationale: Why English UI + Official Finnish Terms?
1. **Accessibility for Immigrant Entrepreneurs**: Over 30% of new toiminimi businesses in the Helsinki capital region and tech hubs are founded by non-native Finnish speakers. English UI makes the application accessible to developers, designers, Wolt couriers, and international consultants.
2. **Statutory Alignment with OmaVero**: Sole traders must report their taxes in Finnish inside the official **MyTax (OmaVero)** portal. If the app only used English translations, users would be lost when trying to locate the matching box in OmaVero.
3. **The Solution**: All essential financial and regulatory concepts use the **Bilingual Hybrid Pattern**: the English conceptual term is paired immediately with the official Finnish statutory term in parentheses, sub-labels, or badges.

### Official Verohallinto Terminology Alignment Table

| Application UI Term (English) | Official Finnish Statutory Term (Verohallinto) | Context / OmaVero Field |
| :--- | :--- | :--- |
| **Business Tax Return Form 5** | *Elinkeinotoiminnan veroilmoitus (Lomake 5)* | Annual statutory business return |
| **Prepayment Tax** | *Ennakkovero* | Advance income tax installments |
| **Additional Prepayment** | *Lisäennakko* | Voluntary top-up before Jan 15 to avoid interest |
| **Back Tax / Residual Tax** | *Jäännösvero (Mätkyt)* | Unpaid tax assessed after final tax decision |
| **Entrepreneur Relief** | *Yrittäjävähennys* | Statutory 5% tax-free deduction on profit (Line 380) |
| **Net Turnover** | *Liikevaihto (ALV 0 %)* | Sales excluding VAT (Line 300) |
| **Grants & Subsidies** | *Saadut tuet ja avustukset* | Starttiraha / TE-toimisto subsidies (Line 340) |
| **Materials & Supplies** | *Aineet ja tarvikkeet* | Raw materials and physical supplies (Line 350) |
| **Operating Expenses** | *Muut vähennyskelpoiset kulut* | Software, marketing, insurance, fees (Line 374) |
| **Additional Deductions** | *Lisävähennykset* | Mileage log + Home office claims (Line 378) |
| **Driver's Log (Mileage)** | *Ajopäiväkirja (Matkakulut)* | Personal car business trips (€0.55/km 2026) |
| **Home Office Deduction** | *Työhuonevähennys* | Standard workspace tiers (€980 / €490 / €245) |
| **Pension Insurance** | *YEL-vakuutus (Yrittäjän eläkevakuutus)* | Statutory self-employed pension |
| **Value Added Tax (VAT)** | *Arvonlisävero (ALV)* | Indirect consumption tax |
| **Standard VAT Rate** | *Yleinen arvonlisäverokanta (25,5 %)* | Goods and services since 1.9.2024 |
| **Single-Entry Bookkeeping** | *Yhdenkertainen kirjanpito* | Cash-basis accounting permitted for toiminimi |
| **Cash-Basis Accounting** | *Maksuperusteinen kirjanpito* | Income/expenses booked on transaction date |
| **Safe to Withdraw** | *Turvallinen nostovara* | Real net profit minus tax reserves |
| **Private Withdrawal** | *Yksityisotto* | Transfer from business bank to personal account |
| **Business ID** | *Y-tunnus* | Finnish business registration number |
| **Reference Number** | *Viitenumero* | Finnish national bank invoice reference |
| **Due Date** | *Eräpäivä* | Last payment date of an invoice |
| **Payment Terms** | *Maksuehto* | Payment window in days (e.g. 14 pv) |
| **Payment Slip** | *Tilisiirtolomake* | Standard invoice bottom payment slip |
| **MyTax Portal** | *OmaVero* | Official Vero.fi electronic portal |

