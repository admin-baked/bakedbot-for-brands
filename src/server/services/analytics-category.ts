function titleCaseCategory(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function normalizeAnalyticsCategory(value: string | null | undefined): string {
  if (!value || value.trim().length === 0) {
    return 'Other';
  }

  const normalized = normalizeToken(value);

  if (
    normalized.includes('flower') ||
    normalized.includes('bud') ||
    normalized.includes('smalls') ||
    normalized.includes('shake')
  ) {
    return 'Flower';
  }

  if (
    normalized.includes('vape') ||
    normalized.includes('cartridge') ||
    normalized.includes('cart') ||
    normalized.includes('disposable')
  ) {
    return 'Vape';
  }

  if (
    normalized.includes('pre-roll') ||
    normalized.includes('pre roll') ||
    normalized.includes('preroll') ||
    normalized.includes('joint')
  ) {
    return 'Pre-Rolls';
  }

  if (
    normalized.includes('edible') ||
    normalized.includes('gummy') ||
    normalized.includes('chocolate')
  ) {
    return 'Edibles';
  }

  if (
    normalized.includes('concentrate') ||
    normalized.includes('wax') ||
    normalized.includes('shatter') ||
    normalized.includes('dab') ||
    normalized.includes('hash') ||
    normalized.includes('rosin') ||
    normalized.includes('resin')
  ) {
    return 'Concentrates';
  }

  if (
    normalized.includes('tincture') ||
    normalized.includes('capsule') ||
    normalized === 'oil'
  ) {
    return 'Tinctures';
  }

  if (
    normalized.includes('topical') ||
    normalized.includes('cream') ||
    normalized.includes('lotion') ||
    normalized.includes('balm') ||
    normalized.includes('transdermal')
  ) {
    return 'Topicals';
  }

  if (
    normalized.includes('beverage') ||
    normalized.includes('drink') ||
    normalized.includes('seltzer')
  ) {
    return 'Beverages';
  }

  if (normalized.includes('accessor')) {
    return 'Accessories';
  }

  if (normalized.includes('gift card')) {
    return 'Gift Cards';
  }

  if (
    normalized === 'other' ||
    normalized === 'uncategorized' ||
    normalized === 'unknown' ||
    normalized === 'misc' ||
    normalized === 'miscellaneous'
  ) {
    return 'Other';
  }

  return titleCaseCategory(normalized);
}
