<div align="center">

# 🇫🇮 Toiminimi Flow
### Privacy-First Finnish Sole Trader Accounting & Invoicing Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg)](https://vitejs.dev/)
[![Tax Year](https://img.shields.io/badge/Vero%20Compliance-2026%20Statutes-003580.svg)](https://www.vero.fi)

**A 100% free, open-source single-entry bookkeeping (*maksuperusteinen yhdenkertainen kirjanpito*) and invoicing suite built specifically for Finnish sole traders (*toiminimiyrittäjät / yksityiset elinkeinonharjoittajat*).**

[Features](#-key-features) • [Two-Tier Privacy](#-two-tier-privacy-architecture) • [Architecture Guide](docs/ARCHITECTURE.md) • [Design System (Apple HIG)](docs/DESIGN_SYSTEM.md) • [2026 Tax Engine](docs/FINNISH_TAX_ENGINE.md) • [Security Policy](docs/SECURITY.md) • [Contributing](CONTRIBUTING.md)

</div>

---

## 💡 Why Toiminimi Flow?

Finland has over 240,000 registered sole traders. Most freelancers, IT consultants, and gig workers face a harsh dilemma:

| Model | Players | Cost | Trade-offs | Toiminimi Flow Advantage |
| :--- | :--- | :--- | :--- | :--- |
| **Percentage Platforms** | OP Kevytyrittäjä | **5% of turnover** | Costs €1,000–€3,000+/year; locks you into one bank. | **€0/month**. Keep 100% of what you bill; use any bank. |
| **SaaS Light Accounting** | UKKO Toiminimi, Holvi Zen | **€15 – €95 / month** | Hidden fees for mileage logs and depreciation. | **100% Free & Open Source**. No monthly subscriptions. |
| **Accounting Agencies** | Tilitoimistot | **€100 – €250 / month** | Overkill for consultants with 5–30 monthly transactions. | Guided, self-serve single-entry cash-basis ledger. |
| **DIY Spreadsheets** | Excel / Google Sheets | **Free** | Anxiety over OmaVero box numbers and 5% tax deduction. | **Spreadsheet-level privacy with accountant-level tax guidance.** |

---

## 🛡️ Two-Tier Privacy Architecture

Toiminimi Flow is designed with a strict **privacy-first, zero-knowledge** philosophy:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TOIMINIMI FLOW SUITE                                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐
│  Tier 1: Instant Local Mode (Unregistered)   │ │  Tier 2: Registered Cloud Sync (Firebase)    │
├──────────────────────────────────────────────┤ ├──────────────────────────────────────────────┤
│ • Zero signup or login required              │ │ • Google & Apple Sign-In ONLY                │
│ • Runs 100% on-device in browser storage     │ │ • Firebase Authentication backend            │
│ • No backend servers or user tracking        │ │ • Cloud receipt archival (Drive/iCloud/GCS)  │
│ • Receipts stored via Link / File Path       │ │ • Seamless cross-device encrypted sync       │
│ • Complete single-entry bookkeeping & PDF    │ │ • Multimodal Gemini AI Receipt Scanner       │
│ • Form 5 & VAT OmaVero 1-click helpers       │ │ • Total privacy: only Auth ID is preserved   │
└──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘
```

### Tier 1: Instant Guest Mode (Default)
- **Start Immediately**: No account creation or password required. Open the web app and begin invoicing and tracking deductions right away.
- **On-Device Storage**: Data stays entirely on your device (`localStorage` / cache).
- **Lightweight Receipt References**: Because browser `localStorage` has a ~5MB quota, receipts can be referenced via direct **URLs or file paths** (Google Drive, iCloud, Dropbox, or local folders) with zero quota limitations.

### Tier 2: Registered Cloud Sync (Future Firebase Backend)
- **Minimalist Auth**: Strictly **Google OAuth** and **Apple Sign-In** (no custom password databases or email collection).
- **Personal Cloud Storage**: Receipts upload directly to personal cloud storage (Google Drive, iCloud, or Firebase Storage).
- **Gemini Receipt AI**: Automated OCR extraction of payment dates, amounts, and Finnish tax categories via Google Gemini 2.5 Flash.

---

## ⚡ Key Features

- **Finnish Invoicing Engine**:
  - Automatic sequential invoice numbering.
  - Domestic **Finnish reference number (*viitenumero*) generator** using the standard 7-3-1 modulo 10 checksum algorithm.
  - SFS 4175 Finnish currency & number formatting (`18 255,00 €`, `25,5 %`).
  - Professional PDF invoice export with official bank transfer slip (*tilisiirtolomake*) at the bottom.
- **The "Toiminimi Tax Safe" (*Verosuoja*)**:
  - Real-time calculation of **Safe-to-Withdraw Cash (*Turvallinen nostovara*)**.
  - Automatically isolates deductible business expenses and reserves both VAT payable and personal income tax buffer, preventing unexpected year-end tax shocks (*jäännösvero / mätkyt*).
- **Form 5 Assistant (*Lomake 5 -apuri*)**:
  - Automatically maps your transactions to official Finnish Tax Administration (Vero) Form 5 lines:
    - **Line 300**: Net Turnover (*Liikevaihto ALV 0%*)
    - **Line 340**: Grants & Subsidies (*Saadut tuet ja avustukset*, Starttiraha)
    - **Line 350**: Materials & Supplies (*Aineet ja tarvikkeet*)
    - **Line 374**: Operating Expenses (*Muut vähennyskelpoiset kulut*, including payment gateway fees)
    - **Line 378**: Additional Deductions (*Lisävähennykset* - Mileage & Home Office)
    - **Line 380**: **5% Entrepreneur Relief (*Yrittäjävähennys*)** automatically deducted from positive business profit!
  - 1-click clipboard copy buttons with Finnish comma decimal notation for pasting directly into MyTax (*OmaVero*).
- **Driver's Log (*Ajopäiväkirja*)**:
  - Log business travel in personal vehicles (date, route, kilometers, purpose, passengers).
  - Automatically computes Form 5 Line 378 deductions using statutory 2026 rates (**€0.55 / km** + **€0.04 / passenger**).
- **Home Office Deduction (*Työhuonevähennys*)**:
  - Toggle between statutory standard deduction tiers (Tier 1: €980 for >50% remote work; Tier 2: €490 for 25–50%; Tier 3: €245 for occasional) or actual expenses.
- **Merchant & POS Settlements**:
  - Record payouts from card terminals and payment gateways (Zettle, SumUp, Stripe, Wolt, Foodora) tracking gross sales and deductible commission fees.
- **Tax Calendar Sync (.ics)**:
  - Computes statutory deadlines for VAT, Form 5, prepayment tax (*ennakkovero*), and additional prepayment (*lisäennakko*).
  - Export standard RFC 5545 `.ics` iCalendar files with built-in alarms (7 days and 2 days before) for Google Calendar, Apple Calendar, and Outlook.
- **Data Backup & Audit Trail**:
  - Export and restore complete JSON backups.
  - Append-only audit trail logging all invoice and expense creations, updates, and deletions.

---

## 🏛️ 2026 Finnish Tax Compliance Engine

All tax parameters are centralized in [`services/veroTaxEngine.ts`](services/veroTaxEngine.ts) reflecting current Verohallinto statutes:

```typescript
export const VERO_CONSTANTS = {
  MILEAGE_RATE_2026: 0.55,           // €/km in 2026
  PASSENGER_RATE_2026: 0.04,         // €/km per extra passenger
  HOME_OFFICE_TIER_1: 980,           // Over 50% home working days
  HOME_OFFICE_TIER_2: 490,           // 25% - 50% home working days
  HOME_OFFICE_TIER_3: 245,           // Occasional remote work
  STANDARD_VAT_RATE: 25.5,           // Standard VAT in Finland (since 1.9.2024)
  REDUCED_VAT_RATE_2026: 13.5,       // 2026 reduced VAT
  VAT_EXEMPTION_THRESHOLD: 20000,    // Small business threshold (€20,000)
  YEL_MANDATORY_THRESHOLD: 9208,     // Statutory minimum annual YEL income
  ENTREPRENEURIAL_DEDUCTION_RATE: 0.05 // 5% Entrepreneur Relief (Yrittäjävähennys)
};
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher; Node 20+ recommended)
- `npm` or `pnpm`

### Installation & Local Run

```bash
# 1. Clone your repository
git clone https://github.com/YOUR_USERNAME/toiminimi-flow.git
cd toiminimi-flow

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

### Building for Production

```bash
# Type check and build optimized bundle
npm run lint
npm run build

# Preview production build locally
npm run preview
```

The production output is placed in `dist/` ready to be served by any static host.

---

## 🌐 Deployment

Because Toiminimi Flow runs completely client-side in Tier 1, it costs **€0 / month** to host on:

- **Cloudflare Pages**: Connect your GitHub repository; framework preset: `Vite`; build command: `npm run build`; output directory: `dist`.
- **Vercel**: Import repository; build command: `npm run build`; output directory: `dist`.
- **GitHub Pages**: Add a standard GitHub Action to deploy `dist/` on push to `main`.

---

## 🗺️ Roadmap

- [ ] **EPC SEPA QR Code**: Render EPC SEPA QR codes on invoice slips to support mobile banking scans (OP, Nordea, S-Pankki) for Revolut Pro (`LT...`) and Wise (`BE...`) accounts.
- [ ] **ISO 11649 RF Reference Generator**: 1-click toggle between domestic Finnish *viitenumero* and international `RF` references.
- [ ] **Periodic VAT Return Helper**: Dedicated quarterly/monthly OmaVero ALV modal for Box 301, Box 307, and Box 308.
- [ ] **Tier 2 Firebase Integration**: Google & Apple Sign-In, Cloud Storage for receipts, and Gemini 2.5 Flash receipt OCR.
- [ ] **Asset Depreciation (*Poistot*)**: Tracking capital investments over €1,200 depreciated at 25% reducing balance on Form 5 Line 372.

---

## 🤝 Open Source & Contributing

Contributions, bug reports, and feature requests are very welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⚖️ Legal Disclaimer

*Flow Toiminimi is an independent open-source software project and calculation aid. It is not affiliated with or endorsed by the Finnish Tax Administration (Verohallinto / Vero). This software is provided for informational and record-keeping purposes and does not constitute formal legal, accounting, or tax advice. Always review your final figures in MyTax (OmaVero) before official submission.*

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
