/**
 * Localization framework for Ticket Deck.
 * 
 * Architecture:
 * - Translation keys organized by namespace (checkout, email, event, common, etc.)
 * - Each workspace has a default_language; events can inherit or override.
 * - Buyer-facing pages resolve locale: URL param > event locale > workspace default > 'en'
 * - All strings go through t(key, locale, vars) — never hardcoded in UI.
 * - New languages added by adding a translation file and registering here.
 */

// Registry of available locales with metadata
export const SUPPORTED_LOCALES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  es: { name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  fr: { name: 'French', nativeName: 'Français', dir: 'ltr' },
  de: { name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  pt: { name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
  ja: { name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  zh: { name: 'Chinese (Simplified)', nativeName: '中文', dir: 'ltr' },
  ko: { name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', dir: 'ltr' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  he: { name: 'Hebrew', nativeName: 'עברית', dir: 'rtl' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  th: { name: 'Thai', nativeName: 'ไทย', dir: 'ltr' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', dir: 'ltr' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', dir: 'ltr' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', dir: 'ltr' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  pl: { name: 'Polish', nativeName: 'Polski', dir: 'ltr' },
  ru: { name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  sv: { name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  da: { name: 'Danish', nativeName: 'Dansk', dir: 'ltr' },
  nb: { name: 'Norwegian', nativeName: 'Norsk', dir: 'ltr' },
  fi: { name: 'Finnish', nativeName: 'Suomi', dir: 'ltr' },
};

export function getLocaleDirection(locale) {
  return SUPPORTED_LOCALES[locale]?.dir || 'ltr';
}

export function isRtl(locale) {
  return getLocaleDirection(locale) === 'rtl';
}

export function getLocaleOptions() {
  return Object.entries(SUPPORTED_LOCALES).map(([code, meta]) => ({
    value: code,
    label: `${meta.nativeName} (${meta.name})`,
  }));
}