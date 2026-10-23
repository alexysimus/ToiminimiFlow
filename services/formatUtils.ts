/**
 * Finnish Localization Utilities (SFS 4175 Standard)
 * 
 * Rules:
 * - Currency: 18 255,00 € (thousands separated by non-breaking space, decimal comma, trailing €)
 * - Dates: d.m.yyyy (e.g. 2.10.2026, 15.1.2027)
 * - Percentages: 25,5 %, 13,0 % (decimal comma, space before %)
 * - Number parsing: supports both comma (,) and dot (.)
 */

export const formatFinnishCurrency = (amount: number, showSymbol: boolean = true): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return showSymbol ? '0,00 €' : '0,00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Format with Finnish locale (non-breaking space for thousands, comma for decimals)
  const parts = absAmount.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const decimalPart = parts[1];

  const formatted = `${integerPart},${decimalPart}`;
  const sign = isNegative ? '-' : '';

  return showSymbol ? `${sign}${formatted}\u00A0€` : `${sign}${formatted}`;
};

export const formatFinnishNumber = (num: number, minDecimals: number = 0, maxDecimals: number = 2): string => {
  if (isNaN(num) || num === null || num === undefined) return '0';

  return num.toLocaleString('fi-FI', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
};

export const formatFinnishPercent = (pct: number, decimals: number = 1): string => {
  if (isNaN(pct) || pct === null || pct === undefined) return '0,0\u00A0%';
  const numStr = formatFinnishNumber(pct, decimals, decimals);
  return `${numStr}\u00A0%`;
};

export const formatFinnishDate = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
};

export const formatFinnishTime = (dateStr: string | Date | undefined, includeSeconds: boolean = false): string => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (includeSeconds) {
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `klo\u00A0${hours}.${minutes}.${seconds}`;
  }
  return `klo\u00A0${hours}.${minutes}`;
};

export const formatFinnishDateTime = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  return `${formatFinnishDate(d)}\u00A0${formatFinnishTime(d)}`;
};

export const formatFinnishDateRange = (startStr: string, endStr: string): string => {
  return `${formatFinnishDate(startStr)}\u00A0–\u00A0${formatFinnishDate(endStr)}`;
};

/**
 * Format Finnish IBAN with non-breaking spaces in 4-character blocks
 * e.g. FI21 1234 5600 0007 89
 */
export const formatFinnishIban = (iban: string): string => {
  if (!iban) return '';
  const clean = iban.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1\u00A0').trim();
};

/**
 * Format Finnish reference number (viitenumero) with non-breaking spaces in 5-digit groups from right to left
 * e.g. 12345 67890
 */
export const formatFinnishReference = (ref: string): string => {
  if (!ref) return '';
  const clean = ref.replace(/[^0-9]/g, '');
  if (!clean) return ref;
  // Group in blocks of 5 from the right
  const reversed = clean.split('').reverse().join('');
  const groupedReversed = reversed.replace(/(.{5})/g, '$1\u00A0').trim();
  return groupedReversed.split('').reverse().join('');
};

export const parseFinnishNumber = (input: string | number): number => {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  // Replace non-breaking spaces and standard spaces, and swap comma with dot
  const sanitized = input.toString().replace(/[\s\u00A0]/g, '').replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
};
