/**
 * Toiminimi Flow - Brand & Community Configuration
 *
 * Centralized configuration for open-source branding, author attribution,
 * repository links, sponsorship, and custom domain configuration.
 *
 * All values have safe fallbacks to environment variables where applicable.
 */

export interface BrandConfig {
  appName: string;
  tagline: string;
  authorName: string;
  githubUrl: string;
  kofiUrl: string;
  customDomainUrl: string;
  supportEmail: string;
  license: string;
  isCustomDomainConfigured: boolean;
  hasSponsorLink: boolean;
}

export const BRAND_CONFIG: BrandConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'Toiminimi Flow',
  tagline: 'Privacy-First Accounting & Invoicing for Sole Traders in Finland',
  authorName: import.meta.env.VITE_AUTHOR_NAME || 'Alex & Open Source Contributors',
  githubUrl: import.meta.env.VITE_GITHUB_REPO_URL || 'https://github.com/alexysimus/ToiminimiFlow',
  kofiUrl: import.meta.env.VITE_KOFI_URL || 'https://ko-fi.com/daocongthanh',
  customDomainUrl: import.meta.env.VITE_APP_URL || 'https://toiminimiflow.fi',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@toiminimiflow.fi',
  license: 'MIT',
  get isCustomDomainConfigured(): boolean {
    return Boolean(this.customDomainUrl && !this.customDomainUrl.includes('localhost'));
  },
  get hasSponsorLink(): boolean {
    return Boolean(this.kofiUrl && !this.kofiUrl.includes('your_username'));
  }
};
