# Security Policy & Open Source Guidelines
## Project: Toiminimi Flow

---

## 1. Security Philosophy: Zero-Knowledge by Design

Because Toiminimi Flow manages business invoicing, client databases, and tax data for Finnish sole traders, security and privacy are treated as first-order architectural invariants:

1. **Client-Side Data Ownership**: In Tier 1 (Guest Mode), no financial data, invoice details, client names, or profit numbers are ever sent to an external server. Everything is stored locally in the user's browser.
2. **No Data Mining or Tracking**: Zero analytics trackers, zero advertisement SDKs, and zero telemetry.
3. **Bring Your Own Key (BYOK)**: Any optional cloud AI features (e.g., Gemini receipt scanner) rely on user-owned API keys rather than shared central credentials.

---

## 2. Secrets & Credential Management (Zero-Leak Policy)

When contributing or developing locally:

- **Never Commit `.env` or `.env.local`**:
  - The repository's [`.gitignore`](file:///e:/Toiminimi%20Flow/.gitignore) strictly ignores all `.env*` files except `.env.example`.
  - Always verify git staging with `git status` before committing.
- **Never Hardcode Secrets**:
  - API keys, tokens, or private credentials must never appear in `.ts`, `.tsx`, `.json`, or markdown files.
- **Enable GitHub Push Protection**:
  - In your GitHub repository settings, navigate to **Settings > Code security and analysis > Secret scanning** and ensure **Push protection** is enabled. GitHub will automatically block pushes that contain detected secrets.

---

## 3. Privacy & Test Data Hygiene

When creating test cases, screenshots, or documentation:
- **Never Use Real Financial Data**: Never commit personal Y-tunnus (business IDs), personal bank account numbers (IBANs), personal home addresses, or actual customer contact details.
- **Official Finnish Placeholders**: Always use synthetic, standardized placeholders:
  - Business Name: `Tmi Esimerkki` or `Tmi Alex Developer`
  - Business ID: `1234567-8`
  - IBAN: `FI21 1234 5600 0007 89`
  - Reference Number: `12345 67890`

---

## 4. Reporting a Security Vulnerability

If you discover a security vulnerability in Toiminimi Flow, please do not open a public issue.

Instead, report it privately via GitHub:
1. Go to **Security > Advisories** on the GitHub repository: [github.com/alexysimus/ToiminimiFlow/security/advisories](https://github.com/alexysimus/ToiminimiFlow/security/advisories).
2. Click **New draft security advisory**.
3. Detail the nature of the issue and steps to reproduce.

We will review reports promptly and publish patches with appropriate attribution.
