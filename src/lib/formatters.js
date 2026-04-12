/**
 * Locale-aware formatting utilities for Ticket Deck.
 * 
 * All formatting functions accept a locale or workspace context
 * so they render correctly for any region/currency/timezone.
 */

// ─── CURRENCY ───

/**
 * Format a monetary amount with correct currency symbol and locale.
 * formatCurrency(25.5, 'USD', 'en-US') → "$25.50"
 * formatCurrency(1500, 'JPY', 'ja-JP') → "¥1,500"
 * formatCurrency(25.5, 'EUR', 'de-DE') → "25,50 €"
 */
export function formatCurrency(amount, currency = 'USD', numberLocale = 'en-US') {
  if (amount == null || isNaN(amount)) return '';
  try {
    return new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
      maximumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
    }).format(amount);
  } catch (e) {
    // Fallback for unknown currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Currencies that don't use decimal amounts (like JPY, KRW).
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

export function isZeroDecimalCurrency(currency) {
  return ZERO_DECIMAL_CURRENCIES.has(currency?.toUpperCase());
}

/**
 * Get the currency symbol only.
 */
export function getCurrencySymbol(currency = 'USD', numberLocale = 'en-US') {
  try {
    return new Intl.NumberFormat(numberLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(0).find(p => p.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
}

/**
 * Shorthand: resolve formatting params from a workspace object.
 */
export function formatWorkspaceCurrency(amount, workspace) {
  return formatCurrency(
    amount,
    workspace?.default_currency || 'USD',
    workspace?.default_number_format || 'en-US'
  );
}

// ─── NUMBERS ───

export function formatNumber(value, numberLocale = 'en-US', options = {}) {
  if (value == null || isNaN(value)) return '';
  return new Intl.NumberFormat(numberLocale, options).format(value);
}

export function formatPercent(value, numberLocale = 'en-US') {
  if (value == null || isNaN(value)) return '';
  return new Intl.NumberFormat(numberLocale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

// ─── DATES & TIMES ───

/**
 * Format a date in a specific timezone.
 * formatEventDate('2025-06-15T09:00:00Z', 'America/New_York', 'en-US')
 * → "June 15, 2025"
 */
export function formatEventDate(isoString, timezone, numberLocale = 'en-US', options = {}) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const defaults = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat(numberLocale, {
    ...defaults,
    ...options,
    timeZone: timezone || undefined,
  }).format(date);
}

/**
 * Format a time in a specific timezone.
 * formatEventTime('2025-06-15T09:00:00Z', 'America/New_York', 'en-US')
 * → "5:00 AM"
 */
export function formatEventTime(isoString, timezone, numberLocale = 'en-US') {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(numberLocale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
  }).format(date);
}

/**
 * Format date + time together.
 */
export function formatEventDateTime(isoString, timezone, numberLocale = 'en-US') {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(numberLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || undefined,
  }).format(date);
}

/**
 * Short date format for tables/lists.
 */
export function formatShortDate(isoString, timezone, numberLocale = 'en-US') {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat(numberLocale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone || undefined,
  }).format(date);
}

/**
 * Get the timezone abbreviation for display.
 * getTimezoneAbbr('America/New_York') → "EST" or "EDT"
 */
export function getTimezoneAbbr(timezone) {
  if (!timezone) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value || timezone;
  } catch {
    return timezone;
  }
}

/**
 * Get a friendly timezone label for display.
 * getTimezoneLabel('America/New_York') → "Eastern Time (EST)"
 */
export function getTimezoneLabel(timezone) {
  if (!timezone) return '';
  const abbr = getTimezoneAbbr(timezone);
  const city = timezone.split('/').pop().replace(/_/g, ' ');
  return `${city} (${abbr})`;
}

// ─── TAX CALCULATIONS ───

/**
 * Calculate tax from a price based on tax mode.
 * 
 * If inclusive: tax is embedded in price → taxAmount = price - (price / (1 + rate))
 * If exclusive: tax is added on top → taxAmount = price * rate
 * If none: no tax.
 */
export function calculateTax(price, taxMode, taxRatePercent) {
  if (!taxMode || taxMode === 'none' || !taxRatePercent || taxRatePercent <= 0) {
    return { subtotal: price, taxAmount: 0, total: price };
  }
  
  const rate = taxRatePercent / 100;
  
  if (taxMode === 'inclusive') {
    const subtotal = price / (1 + rate);
    const taxAmount = price - subtotal;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: price,
    };
  }
  
  // exclusive
  const taxAmount = price * rate;
  return {
    subtotal: price,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((price + taxAmount) * 100) / 100,
  };
}

/**
 * Resolve effective tax settings for an event (event override > workspace defaults).
 */
export function resolveEventTax(event, workspace) {
  const mode = (event?.tax_mode_override && event.tax_mode_override !== 'inherit')
    ? event.tax_mode_override
    : (workspace?.tax_mode || 'none');
  
  const rate = (event?.tax_rate_override != null && event?.tax_mode_override !== 'inherit')
    ? event.tax_rate_override
    : (workspace?.tax_rate_percent || 0);
  
  const label = event?.tax_label_override || workspace?.tax_label || 'Tax';
  
  return { taxMode: mode, taxRate: rate, taxLabel: label };
}

/**
 * Resolve effective currency for an event.
 */
export function resolveEventCurrency(event, workspace) {
  return event?.currency || workspace?.default_currency || 'USD';
}

// ─── PHONE FORMATTING ───

/**
 * Format a phone number for display with country code.
 */
export function formatPhone(phone, defaultCountryCode) {
  if (!phone) return '';
  // If already has country code prefix, return as is
  if (phone.startsWith('+')) return phone;
  // Prepend default country code if available
  if (defaultCountryCode) {
    const code = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
    return `${code} ${phone}`;
  }
  return phone;
}

// ─── COMMON CURRENCY LIST ───

export const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
];

export function getCurrencyOptions() {
  return COMMON_CURRENCIES.map(c => ({
    value: c.code,
    label: `${c.code} — ${c.name} (${c.symbol})`,
  }));
}