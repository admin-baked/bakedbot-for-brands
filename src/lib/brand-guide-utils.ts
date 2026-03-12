/**
 * Brand Guide Utility Functions
 *
 * Shared utilities for brand guide processing including:
 * - AI placeholder filtering
 * - TLD stripping
 * - Brand name extraction
 */

import type {
  BrandBusinessModel,
  BrandOrganizationType,
} from '@/types/brand-guide';

export const BRAND_ORGANIZATION_TYPE_LABELS: Record<BrandOrganizationType, string> = {
  dispensary: 'Dispensary',
  cannabis_brand: 'Cannabis Brand',
  technology_platform: 'Technology Platform',
  agency_service: 'Agency / Services',
  community_organization: 'Community Organization',
  other: 'Other',
};

export const BRAND_BUSINESS_MODEL_LABELS: Record<BrandBusinessModel, string> = {
  retail: 'Retail',
  product_brand: 'Product Brand',
  saas_ai_platform: 'SaaS / AI Platform',
  services: 'Services',
  media_education: 'Media / Education',
  mixed: 'Mixed',
};

export function formatOrganizationTypeLabel(
  organizationType: BrandOrganizationType | undefined
): string {
  return organizationType ? BRAND_ORGANIZATION_TYPE_LABELS[organizationType] : '';
}

export function formatBusinessModelLabel(
  businessModel: BrandBusinessModel | undefined
): string {
  return businessModel ? BRAND_BUSINESS_MODEL_LABELS[businessModel] : '';
}

export function inferOrganizationTypeFromText(
  value: string | undefined
): BrandOrganizationType | undefined {
  if (!value) return undefined;

  const lower = value.toLowerCase();

  if (/(software|saas|artificial intelligence|machine learning|\bai\b|platform|crm|automation|analytics|data platform|technology)/.test(lower)) {
    return 'technology_platform';
  }

  if (/(agency|studio|consulting|consultancy|services|fractional|advisory)/.test(lower)) {
    return 'agency_service';
  }

  if (/(community|coalition|nonprofit|non-profit|social equity|education program|advocacy)/.test(lower)) {
    return 'community_organization';
  }

  if (/(dispensary|adult-use|recreational|medical cannabis|menu|pickup|delivery|budtender|flower|pre-roll|edibles)/.test(lower)) {
    return 'dispensary';
  }

  if (/(cannabis brand|product brand|cultivar|consumer brand|wellness brand|packaging|drops)/.test(lower)) {
    return 'cannabis_brand';
  }

  return undefined;
}

export function inferBusinessModelFromText(
  value: string | undefined,
  organizationType?: BrandOrganizationType
): BrandBusinessModel | undefined {
  if (!value && !organizationType) return undefined;

  const lower = value?.toLowerCase() || '';

  if (/(software|saas|subscription|platform|api|assistant|automation|copilot|crm|dashboard|analytics|\bai\b)/.test(lower)) {
    return 'saas_ai_platform';
  }

  if (/(services|consulting|agency|advisory|fractional|managed service)/.test(lower)) {
    return 'services';
  }

  if (/(education|academy|media|newsletter|content|research|reports)/.test(lower)) {
    return 'media_education';
  }

  if (/(products|sku|merchandise|brand|wholesale|consumer packaged)/.test(lower)) {
    return 'product_brand';
  }

  if (/(retail|menu|shop|pickup|delivery|storefront)/.test(lower)) {
    return 'retail';
  }

  if (organizationType === 'technology_platform') return 'saas_ai_platform';
  if (organizationType === 'agency_service') return 'services';
  if (organizationType === 'cannabis_brand') return 'product_brand';
  if (organizationType === 'dispensary') return 'retail';

  return undefined;
}

export function isRetailCannabisOrganization(
  organizationType: BrandOrganizationType | undefined,
  dispensaryType?: string
): boolean {
  return organizationType === 'dispensary'
    || organizationType === 'cannabis_brand'
    || Boolean(dispensaryType);
}

export function buildOrganizationDescriptor(input: {
  organizationType?: BrandOrganizationType;
  businessModel?: BrandBusinessModel;
  dispensaryType?: 'recreational' | 'medical' | 'both';
  city?: string;
  state?: string;
}): string {
  const location = [input.city, input.state].filter(Boolean).join(', ');

  if (input.organizationType === 'dispensary') {
    const typeLabel = input.dispensaryType
      ? `${input.dispensaryType} dispensary`
      : 'dispensary';
    return location ? `${typeLabel} in ${location}` : typeLabel;
  }

  const orgLabel = formatOrganizationTypeLabel(input.organizationType);
  const modelLabel = formatBusinessModelLabel(input.businessModel);
  const base = [orgLabel, modelLabel].filter(Boolean).join(' - ');

  if (!base) return location ? `organization in ${location}` : 'organization';
  return location ? `${base} in ${location}` : base;
}

/**
 * Clean AI-extracted values by filtering out placeholder values.
 * Returns empty string if the value is an AI placeholder like "Unknown", "Unable to extract", etc.
 *
 * @param value - The extracted value to clean
 * @returns Cleaned value or empty string if it's a placeholder
 */
export function cleanExtractedValue(value: string | undefined): string {
  if (!value) return '';

  const lower = value.toLowerCase().trim();

  // List of AI placeholder patterns to filter
  const placeholderPatterns = [
    'unknown',
    'unable',
    'n/a',
    'unable to extract',
    'no content',
    'insufficient',
    'not found',
    'not available',
    'cannabis brand',
    'dispensary name',
    'brand name',
    'your brand',
    'company name',
  ];

  // Check if value matches any placeholder pattern
  if (placeholderPatterns.some((pattern) => lower.includes(pattern))) {
    return '';
  }

  return value;
}

/**
 * Strip TLD suffix from domain-based brand names.
 * Converts "thrivesyracuse.com" -> "thrivesyracuse"
 *
 * @param value - The value to process
 * @returns Value with TLD suffix removed
 */
export function stripTldSuffix(value: string): string {
  if (!value) return '';

  return value
    .replace(/\.(com|net|org|io|co|ca|us|biz|info|edu|gov)(\s.*)?$/i, '')
    .trim();
}

/**
 * Extract brand name from website title.
 * Handles common title formats like "Brand Name | Tagline" or "Brand Name - Description"
 *
 * @param websiteTitle - The full website title
 * @returns Extracted brand name with TLD stripped
 */
export function extractBrandNameFromTitle(websiteTitle: string | undefined): string {
  if (!websiteTitle) return '';

  // Split on common separators and take first part
  const brandPart = websiteTitle
    .split(/\s*[\|\-–]\s*/)[0]
    .trim();

  // Strip TLD if the title is just the domain
  return stripTldSuffix(brandPart);
}

/**
 * Extract brand name from domain URL.
 * Converts "https://thrivesyracuse.com" -> "thrivesyracuse"
 *
 * @param domain - The domain URL
 * @returns Domain without protocol, www, and TLD
 */
export function extractBrandNameFromDomain(domain: string): string {
  if (!domain) return '';

  try {
    const url = new URL(domain);
    let hostname = url.hostname;

    // Remove www prefix
    hostname = hostname.replace(/^www\./, '');

    // Remove TLD suffix
    return stripTldSuffix(hostname);
  } catch {
    // If URL parsing fails, just strip TLD from raw domain
    return stripTldSuffix(domain.replace(/^www\./, ''));
  }
}

/**
 * Build brand name with fallback chain.
 * Priority: AI extracted -> title-derived -> domain-fallback
 *
 * @param aiExtracted - Brand name extracted by AI
 * @param websiteTitle - Website title from metadata
 * @param domain - Website domain URL
 * @returns Best available brand name
 */
export function buildBrandName(
  aiExtracted: string | undefined,
  websiteTitle: string | undefined,
  domain: string
): string {
  // Try AI-extracted name first (after cleaning)
  const cleanedAi = cleanExtractedValue(aiExtracted);
  if (cleanedAi) return cleanedAi;

  // Try title-derived name
  const titleDerived = extractBrandNameFromTitle(websiteTitle);
  if (titleDerived) return titleDerived;

  // Fall back to domain-based name
  return extractBrandNameFromDomain(domain);
}

/**
 * Calculate completeness score for a brand guide section.
 * Returns percentage (0-100) of non-empty fields.
 *
 * @param obj - Object to check
 * @param requiredFields - List of required field paths
 * @returns Completeness percentage
 */
export function calculateSectionCompleteness(
  obj: Record<string, any> | undefined,
  requiredFields: string[]
): number {
  if (!obj) return 0;

  let filledCount = 0;

  for (const field of requiredFields) {
    const value = getNestedValue(obj, field);
    if (isValueFilled(value)) {
      filledCount++;
    }
  }

  return Math.round((filledCount / requiredFields.length) * 100);
}

/**
 * Get nested value from object using dot notation.
 * Example: getNestedValue(obj, 'colors.primary.hex') -> obj.colors.primary.hex
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check if a value is considered "filled" (not empty/null/undefined).
 */
function isValueFilled(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}
