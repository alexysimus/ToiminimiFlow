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
