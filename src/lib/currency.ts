/**
 * Currency utilities — formatting and conversion.
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  SEK: 'kr',
  EUR: '€',
  USD: '$',
  GBP: '£',
  NOK: 'kr',
  DKK: 'kr',
  CHF: 'CHF',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
};

export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  FI: 'EUR',
  ES: 'EUR',
  FR: 'EUR',
  DE: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
  BE: 'EUR',
  GB: 'GBP',
  US: 'USD',
  CH: 'CHF',
  CA: 'CAD',
  AU: 'AUD',
  JP: 'JPY',
};

export const COUNTRY_NAMES: Record<string, string> = {
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  ES: 'Spain',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  NL: 'Netherlands',
  GB: 'United Kingdom',
  US: 'United States',
};

export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    const sym = CURRENCY_SYMBOLS[currency] || currency;
    return `${sym} ${amount.toFixed(2)}`;
  }
}

/**
 * Convert amount from one currency to another using a rates map keyed by base currency.
 * `rates` should contain conversion factors with `base` as 1.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number> | null,
  base: string
): number | null {
  if (!rates) return null;
  if (from === to) return amount;

  // amount(from) -> amount(base): divide by rates[from]
  // amount(base) -> amount(to): multiply by rates[to]
  const ratesWithBase = { ...rates, [base]: 1 };
  const fromRate = ratesWithBase[from];
  const toRate = ratesWithBase[to];
  if (!fromRate || !toRate) return null;
  return (amount / fromRate) * toRate;
}
