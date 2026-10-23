# Contributing to Toiminimi Flow

Thank you for your interest in contributing to **Toiminimi Flow**! We welcome bug reports, feature implementations, localization improvements, and documentation enhancements from the Finnish entrepreneur and open-source developer community.

---

## Code of Conduct

Please treat all contributors with respect, dignity, and constructive collaboration. Our goal is to empower self-employed workers and sole traders in Finland with free, high-quality, privacy-respecting software.

---

## Local Development Workflow

### 1. Prerequisites
- **Node.js** (v18+; v20 or v24 recommended)
- **npm** or **pnpm**
- **Git**

### 2. Setup
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ToiminimiFlow.git
cd ToiminimiFlow

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will run at `http://localhost:3000`.

---

## Code & Design Standards

Before submitting a Pull Request, please ensure your code follows these project standards:

1. **Design System**:
   - Follow the **Apple Human Interface Guidelines (HIG)** layout principles documented in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).
   - Use the **Finnish Flag color palette** (`#003580` Siniristi Blue, `#EDF4FC` Ice Blue, `#FFFFFF` Snow White).
   - Use the **Commissioner** typeface for all UI text and **JetBrains Mono** for tabular numbers/IBANs.
   - Maintain minimum **44×44px** touch targets on mobile.
2. **Finnish Statutory Exactness**:
   - Follow **SFS 4175** formatting (`formatUtils.ts`): thousands separated by non-breaking spaces, comma decimal, trailing `€` (e.g. `18 255,00 €`).
   - Reference numbers must use the standard 7-3-1 modulo 10 checksum algorithm.
   - Any statutory tax calculations must align with [`docs/FINNISH_TAX_ENGINE.md`](docs/FINNISH_TAX_ENGINE.md).
3. **Privacy & Security**:
   - Maintain the **Zero-Knowledge** architecture: Tier 1 Guest Mode must remain fully operational without requiring server-side logins or external database connections.
   - Never commit real personal or financial data.

---

## The Pre-Push Verification Routine

Every pull request must pass the automated verification checks:

```bash
# 1. Type check
npm run lint

# 2. Production build
npm run build
```

Both commands must exit with code `0` (zero errors).

---

## Submitting Changes

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat: add EPC SEPA QR code rendering to PDF invoice"
   ```
3. Push to your fork:
   ```bash
   git push -u origin feat/your-feature-name
   ```
4. Open a **Pull Request (PR)** against the `main` branch of [alexysimus/ToiminimiFlow](https://github.com/alexysimus/ToiminimiFlow).
5. Describe your change, what problem it solves, and how you verified it.
