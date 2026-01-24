/**
 * Customer Import Column Mapping
 *
 * Normalizes various column name formats to standard CustomerProfile fields.
 * Handles common variations from different POS systems and CRMs.
 */

import type { CustomerProfile, CustomerSegment } from '@/types/customers';

// =============================================================================
// COLUMN MAPPING CONFIGURATION
// =============================================================================

/**
 * Importable customer profile fields (subset of CustomerProfile that can be imported)
 */
export type ImportableCustomerField =
    | 'email' | 'phone' | 'firstName' | 'lastName' | 'displayName'
    | 'totalSpent' | 'orderCount' | 'avgOrderValue'
    | 'lastOrderDate' | 'firstOrderDate' | 'birthDate'
    | 'segment' | 'tier' | 'points' | 'lifetimeValue'
    | 'customTags' | 'preferredCategories' | 'preferredProducts' | 'priceRange'
    | 'source' | 'acquisitionCampaign' | 'referralCode'
    | 'equityStatus' | 'notes';

/**
 * Maps common column name variations to standard field names.
 * Order matters - first match wins.
 */
export const COLUMN_MAPPINGS: Record<ImportableCustomerField, string[]> = {
    // Identity Fields
    email: [
        'email', 'e-mail', 'email_address', 'emailaddress', 'customer_email',
        'customeremail', 'contact_email', 'primary_email', 'user_email'
    ],
    phone: [
        'phone', 'phone_number', 'phonenumber', 'telephone', 'tel', 'mobile',
        'cell', 'cellphone', 'cell_phone', 'contact_phone', 'primary_phone',
        'phone1', 'phone_1'
    ],
    firstName: [
        'first_name', 'firstname', 'first', 'fname', 'given_name', 'givenname',
        'forename', 'name_first'
    ],
    lastName: [
        'last_name', 'lastname', 'last', 'lname', 'surname', 'family_name',
        'familyname', 'name_last'
    ],
    displayName: [
        'display_name', 'displayname', 'full_name', 'fullname', 'name',
        'customer_name', 'customername', 'contact_name'
    ],

    // Financial Metrics
    totalSpent: [
        'total_spent', 'totalspent', 'total_spend', 'totalspend', 'lifetime_spend',
        'ltv', 'lifetime_value', 'total_revenue', 'revenue', 'total_purchases',
        'spent', 'amount_spent'
    ],
    orderCount: [
        'order_count', 'ordercount', 'orders', 'total_orders', 'num_orders',
        'number_of_orders', 'purchase_count', 'visits', 'transactions'
    ],
    avgOrderValue: [
        'avg_order_value', 'avgordervalue', 'aov', 'average_order', 'avg_order',
        'average_purchase', 'avg_purchase', 'average_transaction'
    ],

    // Dates
    lastOrderDate: [
        'last_order_date', 'lastorderdate', 'last_purchase', 'last_visit',
        'last_transaction', 'most_recent_order', 'last_activity', 'last_seen'
    ],
    firstOrderDate: [
        'first_order_date', 'firstorderdate', 'first_purchase', 'first_visit',
        'first_transaction', 'signup_date', 'created', 'joined', 'registered'
    ],
    birthDate: [
        'birth_date', 'birthdate', 'birthday', 'dob', 'date_of_birth', 'bday'
    ],

    // Segmentation
    segment: [
        'segment', 'customer_segment', 'customersegment', 'status', 'type',
        'customer_type', 'category'
    ],
    tier: [
        'tier', 'loyalty_tier', 'loyaltytier', 'membership', 'level',
        'membership_level', 'vip_status'
    ],
    points: [
        'points', 'loyalty_points', 'loyaltypoints', 'reward_points', 'rewards',
        'balance', 'point_balance'
    ],
    lifetimeValue: [
        'lifetime_value', 'lifetimevalue', 'ltv', 'clv', 'customer_lifetime_value'
    ],

    // Tags and Preferences
    customTags: [
        'tags', 'custom_tags', 'customtags', 'labels', 'groups', 'categories'
    ],
    preferredCategories: [
        'preferred_categories', 'preferredcategories', 'favorite_categories',
        'categories', 'interests', 'preferences'
    ],
    preferredProducts: [
        'preferred_products', 'preferredproducts', 'favorite_products',
        'favorites', 'top_products'
    ],
    priceRange: [
        'price_range', 'pricerange', 'budget', 'spending_tier', 'price_sensitivity'
    ],

    // Acquisition
    source: [
        'source', 'acquisition_source', 'channel', 'referral_source', 'how_found',
        'marketing_source', 'origin'
    ],
    acquisitionCampaign: [
        'acquisition_campaign', 'campaign', 'marketing_campaign', 'utm_campaign',
        'promo_code', 'coupon_code'
    ],
    referralCode: [
        'referral_code', 'referralcode', 'referral', 'referred_by', 'referrer'
    ],

    // Social Equity
    equityStatus: [
        'equity_status', 'equitystatus', 'equity', 'social_equity',
        'equity_verified', 'equity_applicant'
    ],

    // Notes
    notes: [
        'notes', 'customer_notes', 'comments', 'remarks', 'memo', 'description'
    ],
};

// Flattened reverse mapping for fast lookup
const REVERSE_MAPPING: Map<string, ImportableCustomerField> = new Map();

// Build reverse mapping on module load
Object.entries(COLUMN_MAPPINGS).forEach(([field, variations]) => {
    variations.forEach(variation => {
        REVERSE_MAPPING.set(variation.toLowerCase(), field as ImportableCustomerField);
    });
});

// =============================================================================
// NORMALIZATION FUNCTIONS
// =============================================================================

/**
 * Normalize a column name to its standard field name
 */
export function normalizeColumnName(columnName: string): ImportableCustomerField | null {
    const normalized = columnName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9_]/g, '_') // Replace special chars with underscore
        .replace(/_+/g, '_')          // Collapse multiple underscores
        .replace(/^_|_$/g, '');       // Trim leading/trailing underscores

    return REVERSE_MAPPING.get(normalized) || null;
}

/**
 * Build column mapping from header row
 */
export function buildColumnMapping(headers: string[]): Map<number, ImportableCustomerField> {
    const mapping = new Map<number, ImportableCustomerField>();

    headers.forEach((header, index) => {
        const field = normalizeColumnName(header);
        if (field) {
            mapping.set(index, field);
        }
    });

    return mapping;
}

/**
 * Get unmapped columns for user review
 */
export function getUnmappedColumns(headers: string[]): string[] {
    return headers.filter(header => !normalizeColumnName(header));
}

/**
 * Get mapped columns summary
 */
export function getMappingSummary(headers: string[]): Array<{
    original: string;
    mapped: string | null;
    index: number;
}> {
    return headers.map((header, index) => ({
        original: header,
        mapped: normalizeColumnName(header),
        index
    }));
}

// =============================================================================
// VALUE NORMALIZATION
// =============================================================================

/**
 * Normalize segment value to standard CustomerSegment
 */
export function normalizeSegment(value: string): CustomerSegment {
    const normalized = value.toLowerCase().trim();

    const segmentMap: Record<string, CustomerSegment> = {
        // VIP variations
        'vip': 'vip', 'v.i.p.': 'vip', 'platinum': 'vip', 'elite': 'vip',
        'premium': 'vip', 'top': 'vip', 'gold': 'vip',

        // Loyal variations
        'loyal': 'loyal', 'regular': 'loyal', 'repeat': 'loyal',
        'returning': 'loyal', 'silver': 'loyal',

        // New variations
        'new': 'new', 'first_time': 'new', 'firsttime': 'new',
        'first-time': 'new', 'prospect': 'new', 'bronze': 'new',

        // At risk variations
        'at_risk': 'at_risk', 'at-risk': 'at_risk', 'atrisk': 'at_risk',
        'risk': 'at_risk', 'warning': 'at_risk',

        // Slipping variations
        'slipping': 'slipping', 'declining': 'slipping', 'cooling': 'slipping',
        'inactive': 'slipping',

        // Churned variations
        'churned': 'churned', 'lost': 'churned', 'lapsed': 'churned',
        'dormant': 'churned', 'gone': 'churned',

        // High value variations
        'high_value': 'high_value', 'high-value': 'high_value',
        'highvalue': 'high_value', 'whale': 'high_value',

        // Frequent variations
        'frequent': 'frequent', 'power_user': 'frequent', 'active': 'frequent',
    };

    return segmentMap[normalized] || 'new';
}

/**
 * Normalize tier value
 */
export function normalizeTier(value: string): 'bronze' | 'silver' | 'gold' | 'platinum' {
    const normalized = value.toLowerCase().trim();

    if (['platinum', 'vip', 'elite', '4', 'tier4', 'top'].includes(normalized)) {
        return 'platinum';
    }
    if (['gold', 'premium', '3', 'tier3'].includes(normalized)) {
        return 'gold';
    }
    if (['silver', 'regular', '2', 'tier2'].includes(normalized)) {
        return 'silver';
    }
    return 'bronze';
}

/**
 * Normalize price range value
 */
export function normalizePriceRange(value: string): 'budget' | 'mid' | 'premium' {
    const normalized = value.toLowerCase().trim();

    if (['premium', 'high', 'luxury', 'top', 'expensive'].includes(normalized)) {
        return 'premium';
    }
    if (['mid', 'middle', 'medium', 'average', 'standard'].includes(normalized)) {
        return 'mid';
    }
    return 'budget';
}

/**
 * Normalize source value
 */
export function normalizeSource(value: string): CustomerProfile['source'] {
    const normalized = value.toLowerCase().trim();

    if (['dutchie', 'pos_dutchie'].includes(normalized)) return 'pos_dutchie';
    if (['jane', 'iheartjane', 'pos_jane'].includes(normalized)) return 'pos_jane';
    if (['treez', 'pos_treez'].includes(normalized)) return 'pos_treez';
    if (['brand', 'brand_page', 'website'].includes(normalized)) return 'brand_page';
    if (['dispensary', 'dispensary_page', 'store'].includes(normalized)) return 'dispensary_page';
    if (['manual', 'entered', 'added'].includes(normalized)) return 'manual';

    return 'import';
}

/**
 * Normalize boolean value
 */
export function normalizeBoolean(value: string | boolean | number | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.toLowerCase().trim();
        return ['true', 'yes', '1', 'y', 'on', 'verified', 'active'].includes(normalized);
    }
    return false;
}

/**
 * Normalize numeric value
 */
export function normalizeNumber(value: string | number | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Remove currency symbols and commas
        const cleaned = value.replace(/[$,]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
}

/**
 * Normalize date value
 */
export function normalizeDate(value: string | Date | undefined): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;

    // Try to parse various date formats
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    // Try MM/DD/YYYY format
    const mdyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (mdyMatch) {
        const [, month, day, year] = mdyMatch;
        const fullYear = year.length === 2 ? `20${year}` : year;
        return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }

    return undefined;
}

/**
 * Normalize array value (comma-separated or array)
 */
export function normalizeArray(value: string | string[] | undefined): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    return value
        .split(/[,;|]/)
        .map(v => v.trim())
        .filter(Boolean);
}

/**
 * Clean and normalize phone number
 */
export function normalizePhone(value: string | undefined): string | undefined {
    if (!value) return undefined;

    // Remove all non-numeric characters except +
    const cleaned = value.replace(/[^\d+]/g, '');

    // If it starts with 1 and is 11 digits, it's a US number
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    // If it's 10 digits, assume US and add +1
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }

    // If it starts with +, keep as is
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    return value; // Return original if we can't normalize
}

/**
 * Clean and normalize email
 */
export function normalizeEmail(value: string | undefined): string | undefined {
    if (!value) return undefined;
    return value.toLowerCase().trim();
}
