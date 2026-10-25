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

---

## 5. Open-Source Environment Variables & Secret Separation Standard

To adhere to industry-standard open-source governance and Twelve-Factor App principles, all project configuration follows strict classification:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        OPEN-SOURCE CREDENTIAL CLASSIFICATION                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
  [Tier A: Public in Git]        [Tier B: Local / Env Secret]      [Tier C: Cloud Console ONLY]
  • .env.example (template)      • .env / .env.local               • Apple Auth Key (.p8 file)
  • config/brand.ts              • Real VITE_FIREBASE_API_KEY      • OAuth Client Secrets
  • .github/FUNDING.yml          • Real VITE_GA_MEASUREMENT_ID     • Firebase Service Account JSON
  • firebase.json routing        • Local test Gemini API keys      • DNS Registrar API tokens
```

### 1. Distinction Between Public Identifiers and Private Credentials
- **Client Identifiers (Public-Facing)**:
  - In browser single-page applications (SPAs), Firebase `apiKey`, `authDomain`, `projectId`, and Google Analytics `measurementId` are bundled into client-side JavaScript.
  - While they are public identifiers rather than access tokens, in open-source projects they must **never be hardcoded** in source files.
  - Hardcoding client IDs allows forks or malicious actors to direct test traffic, spam registrations, or quota-exhaustion attacks against your personal Firebase project.
  - Always use `import.meta.env.VITE_*` with graceful offline fallback when variables are empty.

- **Private Credentials (Strictly Secret)**:
  - Apple Native Sign-In `.p8` private keys, Key IDs, Team IDs, Firebase Admin Service Account JSONs, and domain registrar tokens must **never** be checked into git or placed in client `.env` files.
  - Apple Developer authentication keys are entered directly and exclusively into the **Firebase Console** (*Authentication > Sign-in method > Apple*). The client app only interfaces through Firebase Auth SDK.

---

## 6. GDPR Compliance & Cookieless Analytics Standard (No Cookie Banner)

In the European Union and Finland, digital privacy is governed by the **General Data Protection Regulation (GDPR)** and the **ePrivacy Directive** (enforced by the Finnish Transport and Communications Agency *Traficom* and the Office of the Data Protection Ombudsman *Tietosuojavaltuutettu*):

### 1. Why Standard Google Analytics Requires a Banner
- Standard GA4 configurations write first-party persistent cookies (`_ga`, `_ga_<container-id>`) and pseudonymous client identifiers (`clientId`) to user devices to track individuals across sessions.
- Under Finnish and EU regulations, accessing or storing any non-essential data on a user's terminal equipment requires **prior, explicit, affirmative consent** (opt-in cookie banner).

### 2. The Cookieless / Zero-Consent Solution
To maintain 100% legal compliance **without subjecting sole traders to disruptive cookie banners**:
- **Default Consent Denial (Google Consent Mode v2)**:
  ```javascript
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'analytics_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied'
  });
  ```
- **Operational Effect**:
  1. No cookies (`_ga`, etc.) or `localStorage` tokens are created on the user's browser.
  2. Analytics requests are transmitted as stateless, anonymous statistical pings without persistent identifiers.
  3. No cross-site or cross-session tracking occurs.
  4. Fully compliant with EU ePrivacy rules without requiring a cookie consent banner.
- **Graceful Open-Source Fallback**:
  - In Toiminimi Flow, telemetry is 100% disabled if `VITE_GA_MEASUREMENT_ID` is empty. Anyone self-hosting or cloning the application runs a completely untracked, offline instance by default.

