import {
  IconCurrencyDirham,
  IconCurrencyDollar,
  IconCurrencyEuro,
  IconCurrencyPound,
  IconCurrencyRupee,
} from '@tabler/icons-react';

// The fixed lists from UI-UX.md "Fixed lists and formatting". The values match the backend's enums.

export const CATEGORIES = [
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'CLOUD_STORAGE', label: 'Cloud storage' },
  { value: 'FITNESS', label: 'Fitness' },
  { value: 'NEWS', label: 'News' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'OTHER', label: 'Other' },
];

export const CYCLES = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

export const REMINDER_CHIPS = [
  { value: 7, label: '7 days' },
  { value: 5, label: '5 days' },
  { value: 3, label: '3 days' },
  { value: 1, label: '1 day' },
  { value: 0, label: 'Same day' },
];

// symbol is the short form Create account shows ("INR ₹"); Settings has room for the full name.
export const CURRENCIES = [
  { value: 'INR', label: 'Indian rupee', symbol: '₹', icon: IconCurrencyRupee },
  { value: 'USD', label: 'US dollar', symbol: '$', icon: IconCurrencyDollar },
  { value: 'EUR', label: 'Euro', symbol: '€', icon: IconCurrencyEuro },
  { value: 'GBP', label: 'British pound', symbol: '£', icon: IconCurrencyPound },
  { value: 'AUD', label: 'Australian dollar', symbol: 'A$', icon: IconCurrencyDollar },
  { value: 'CAD', label: 'Canadian dollar', symbol: 'C$', icon: IconCurrencyDollar },
  { value: 'SGD', label: 'Singapore dollar', symbol: 'S$', icon: IconCurrencyDollar },
  { value: 'AED', label: 'UAE dirham', symbol: 'د.إ', icon: IconCurrencyDirham },
];

export const STATUSES = [
  { value: 'ACTIVE', label: 'Active', tone: 'green' },
  { value: 'PAUSED', label: 'Paused', tone: 'amber' },
  { value: 'CANCELLED', label: 'Cancelled', tone: 'red' },
  { value: 'ARCHIVED', label: 'Archived', tone: 'gray' },
];

function labelOf(list, value) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export const categoryLabel = (value) => labelOf(CATEGORIES, value);
export const cycleLabel = (value) => labelOf(CYCLES, value);
export const statusLabel = (value) => labelOf(STATUSES, value);
export const statusTone = (value) => STATUSES.find((item) => item.value === value)?.tone ?? 'gray';

export function currencyIcon(code) {
  return CURRENCIES.find((item) => item.value === code)?.icon ?? IconCurrencyDollar;
}

// Countries that use the euro, for the sign-up pre-fill.
const EURO_REGIONS = ['AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK'];
const REGION_CURRENCIES = { IN: 'INR', US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', SG: 'SGD', AE: 'AED' };

/** Sign-up pre-fill: the currency of the browser's language region (en-IN → INR) when supported, otherwise USD. */
export function browserCurrency() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (EURO_REGIONS.includes(region)) return 'EUR';
    return REGION_CURRENCIES[region] ?? 'USD';
  } catch {
    return 'USD';
  }
}
