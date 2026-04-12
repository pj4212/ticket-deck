/**
 * Hook that provides locale-aware formatting functions scoped to the active workspace.
 * 
 * Usage:
 *   const { fmtCurrency, fmtDate, fmtTime, currency, timezone, locale } = useWorkspaceLocale(workspace);
 *   fmtCurrency(25.5) → "$25.50"
 *   fmtDate('2025-06-15T09:00:00Z') → "June 15, 2025"
 */

import { useMemo } from 'react';
import {
  formatCurrency,
  formatEventDate,
  formatEventTime,
  formatEventDateTime,
  formatShortDate,
  formatNumber,
  resolveEventCurrency,
  resolveEventTax,
} from '@/lib/formatters';

export default function useWorkspaceLocale(workspace, event) {
  return useMemo(() => {
    const currency = resolveEventCurrency(event, workspace);
    const numberLocale = workspace?.default_number_format || 'en-US';
    const timezone = event?.timezone || workspace?.default_timezone || 'UTC';
    const locale = event?.locale || workspace?.default_language || 'en';
    const tax = resolveEventTax(event, workspace);

    return {
      currency,
      numberLocale,
      timezone,
      locale,
      tax,

      fmtCurrency: (amount) => formatCurrency(amount, currency, numberLocale),
      fmtDate: (iso, tz) => formatEventDate(iso, tz || timezone, numberLocale),
      fmtTime: (iso, tz) => formatEventTime(iso, tz || timezone, numberLocale),
      fmtDateTime: (iso, tz) => formatEventDateTime(iso, tz || timezone, numberLocale),
      fmtShortDate: (iso, tz) => formatShortDate(iso, tz || timezone, numberLocale),
      fmtNumber: (val, opts) => formatNumber(val, numberLocale, opts),
    };
  }, [workspace, event]);
}