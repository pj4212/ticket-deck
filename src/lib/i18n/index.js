/**
 * Core i18n engine for Ticket Deck.
 * 
 * Usage:
 *   import { t, useLocale } from '@/lib/i18n';
 *   t('checkout.payNow', 'en', { amount: '$25.00' })  // "Pay $25.00"
 *   const { t, locale, dir } = useLocale(workspace, event);
 */

import { useState, useMemo, useCallback } from 'react';
import en from './translations/en';
import es from './translations/es';
import fr from './translations/fr';
import de from './translations/de';
import { SUPPORTED_LOCALES, getLocaleDirection } from './locales';

// Translation registry
const translations = { en, es, fr, de };

/**
 * Get a nested key from an object: getNestedKey(obj, 'checkout.payNow')
 */
function getNestedKey(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

/**
 * Interpolate variables: "Pay {amount}" + {amount:"$25"} → "Pay $25"
 */
function interpolate(template, vars) {
  if (!vars || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{${key}}`));
}

/**
 * Core translate function.
 * Falls back: requested locale → 'en' → key itself
 */
export function t(key, locale = 'en', vars = {}) {
  const lang = translations[locale] || translations.en;
  let value = getNestedKey(lang, key);
  if (value === undefined) {
    // fallback to English
    value = getNestedKey(translations.en, key);
  }
  if (value === undefined) {
    // return the key itself as last resort
    return key;
  }
  return interpolate(value, vars);
}

/**
 * Resolve effective locale for a buyer-facing page.
 * Priority: URL ?lang= > event.locale > workspace.default_language > 'en'
 */
export function resolveLocale(workspace, event) {
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get('lang');
  
  if (urlLang && SUPPORTED_LOCALES[urlLang]) return urlLang;
  if (event?.locale && SUPPORTED_LOCALES[event.locale]) return event.locale;
  if (workspace?.default_language && SUPPORTED_LOCALES[workspace.default_language]) return workspace.default_language;
  return 'en';
}

/**
 * React hook for locale-aware pages.
 * Returns { locale, dir, t: boundTranslate }
 */
export function useLocale(workspace, event) {
  const locale = useMemo(() => resolveLocale(workspace, event), [workspace, event]);
  const dir = useMemo(() => getLocaleDirection(locale), [locale]);
  
  const translate = useCallback(
    (key, vars) => t(key, locale, vars),
    [locale]
  );

  return { locale, dir, t: translate };
}

/**
 * Get list of supported languages for a workspace.
 * Returns the workspace's configured languages, or all if not configured.
 */
export function getWorkspaceLanguages(workspace) {
  if (workspace?.supported_languages_json) {
    try {
      const langs = JSON.parse(workspace.supported_languages_json);
      if (Array.isArray(langs) && langs.length > 0) {
        return langs.filter(l => SUPPORTED_LOCALES[l]);
      }
    } catch (_) {}
  }
  return ['en'];
}

// Re-export locale utilities
export { SUPPORTED_LOCALES, getLocaleDirection, getLocaleOptions } from './locales';