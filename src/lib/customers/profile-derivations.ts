const SEGMENT_LABELS: Record<string, string> = {
    vip: 'VIP',
    loyal: 'Loyal',
    new: 'New',
    at_risk: 'At Risk',
    slipping: 'Slipping',
    churned: 'Churned',
    high_value: 'High Value',
    frequent: 'Frequent',
};

export interface CustomerIdentityInput {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    fallbackId?: string | null;
}

export interface AlleavesCustomerIdentity {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    birthDate?: string | null;
    loyaltyPoints?: number | null;
}

export interface DerivedCustomerTagInput {
    segment?: string | null;
    tier?: string | null;
    priceRange?: string | null;
    orderCount?: number | null;
    totalSpent?: number | null;
    daysSinceLastOrder?: number | null;
    preferredCategories?: string[] | null;
    preferredProducts?: string[] | null;
}

function normalizeValue(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function getPhoneLast4(value: string | null | undefined): string | null {
    const digits = normalizeValue(value).replace(/\D/g, '');
    if (digits.length < 4) {
        return null;
    }

    return digits.slice(-4);
}

function toTitleCase(value: string): string {
    return value
        .replace(/[_-]+/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function getFirstMeaningfulValue(values: Array<string | null | undefined>): string | null {
    for (const value of values) {
        const normalized = normalizeValue(value);
        if (normalized) {
            return normalized;
        }
    }
    return null;
}

function isSyntheticCustomerToken(value: string): boolean {
    return /^(alleaves|customer|cid)[_-]\d+$/i.test(value);
}

export function isPlaceholderCustomerEmail(value: string | null | undefined): boolean {
    const normalized = normalizeValue(value).toLowerCase();
    if (!normalized) {
        return false;
    }

    const atIndex = normalized.lastIndexOf('@');
    if (atIndex <= 0) {
        return false;
    }

    const localPart = normalized.slice(0, atIndex);
    const domain = normalized.slice(atIndex + 1);

    if (domain === 'unknown.local') {
        return true;
    }

    return domain === 'alleaves.local' && isSyntheticCustomerToken(localPart);
}

export function isPlaceholderCustomerIdentity(
    value: string | null | undefined,
    input?: Pick<CustomerIdentityInput, 'email' | 'fallbackId'>,
): boolean {
    const normalized = normalizeValue(value);
    if (!normalized) {
        return false;
    }

    const lower = normalized.toLowerCase();
    if (lower === 'unknown' || lower === 'unknown customer' || lower === 'customer') {
        return true;
    }

    if (isSyntheticCustomerToken(normalized)) {
        return true;
    }

    const fallbackId = normalizeValue(input?.fallbackId).toLowerCase();
    if (fallbackId && lower === fallbackId) {
        return true;
    }

    const email = normalizeValue(input?.email).toLowerCase();
    if (email && lower === email) {
        return true;
    }

    if (email && isPlaceholderCustomerEmail(email)) {
        const localPart = email.split('@')[0];
        if (lower === localPart) {
            return true;
        }
    }

    return false;
}

function getRecordStringValue(record: Record<string, unknown>, keys: string[]): string | null {
    const nestedCustomer = record.customer;
    const sources: Record<string, unknown>[] = [record];

    if (nestedCustomer && typeof nestedCustomer === 'object' && !Array.isArray(nestedCustomer)) {
        sources.push(nestedCustomer as Record<string, unknown>);
    }

    for (const source of sources) {
        for (const key of keys) {
            const value = source[key];
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
    }

    return null;
}

function getRecordNumberValue(record: Record<string, unknown>, keys: string[]): number | null {
    const nestedCustomer = record.customer;
    const sources: Record<string, unknown>[] = [record];

    if (nestedCustomer && typeof nestedCustomer === 'object' && !Array.isArray(nestedCustomer)) {
        sources.push(nestedCustomer as Record<string, unknown>);
    }

    for (const source of sources) {
        for (const key of keys) {
            const rawValue = source[key];
            if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
                return rawValue;
            }
            if (typeof rawValue === 'string' && rawValue.trim()) {
                const parsed = Number(rawValue);
                if (Number.isFinite(parsed)) {
                    return parsed;
                }
            }
        }
    }

    return null;
}

export function extractAlleavesCustomerIdentity(record: Record<string, unknown>): AlleavesCustomerIdentity {
    return {
        displayName: getRecordStringValue(record, ['customer_name', 'name', 'full_name']),
        firstName: getRecordStringValue(record, ['name_first', 'first_name', 'customer_first_name']),
        lastName: getRecordStringValue(record, ['name_last', 'last_name', 'customer_last_name']),
        email: getRecordStringValue(record, ['email', 'customer_email']),
        phone: getRecordStringValue(record, ['phone', 'customer_phone']),
        birthDate: getRecordStringValue(record, ['date_of_birth', 'birthday']),
        loyaltyPoints: getRecordNumberValue(record, ['loyalty_points']),
    };
}

export function resolveCustomerDisplayName(input: CustomerIdentityInput): string {
    const displayName = normalizeValue(input.displayName);
    if (displayName && !isPlaceholderCustomerIdentity(displayName, input)) {
        return displayName;
    }

    const combinedName = [normalizeValue(input.firstName), normalizeValue(input.lastName)]
        .filter(Boolean)
        .join(' ')
        .trim();
    if (combinedName) {
        return combinedName;
    }

    const firstName = normalizeValue(input.firstName);
    if (firstName) {
        return firstName;
    }

    return getFirstMeaningfulValue([displayName, input.email, input.fallbackId]) ?? 'Unknown Customer';
}

export function buildAutoCustomerTags(input: DerivedCustomerTagInput): string[] {
    const tags: string[] = [];
    const seen = new Set<string>();

    const pushTag = (value: string | null | undefined) => {
        const normalized = normalizeValue(value);
        if (!normalized) {
            return;
        }

        const key = normalized.toLowerCase();
        if (seen.has(key) || tags.length >= 6) {
            return;
        }

        seen.add(key);
        tags.push(normalized);
    };

    const segmentLabel = input.segment ? SEGMENT_LABELS[input.segment] ?? toTitleCase(input.segment) : null;
    pushTag(segmentLabel);

    const tier = normalizeValue(input.tier);
    if (tier) {
        pushTag(`${toTitleCase(tier)} Tier`);
    }

    const priceRange = normalizeValue(input.priceRange);
    if (priceRange) {
        pushTag(`${toTitleCase(priceRange)} Buyer`);
    }

    const preferredCategory = (input.preferredCategories ?? [])
        .map((value) => normalizeValue(value))
        .find((value) => value && value.toLowerCase() !== 'other');
    if (preferredCategory) {
        pushTag(`Prefers ${toTitleCase(preferredCategory)}`);
    }

    const preferredProduct = (input.preferredProducts ?? [])
        .map((value) => normalizeValue(value))
        .find(Boolean);
    if (preferredProduct) {
        pushTag(`Buys ${preferredProduct}`);
    }

    if ((input.orderCount ?? 0) >= 5) {
        pushTag('Repeat Buyer');
    }

    if ((input.totalSpent ?? 0) >= 500) {
        pushTag('High LTV');
    }

    const daysSinceLastOrder = input.daysSinceLastOrder ?? null;
    if (typeof daysSinceLastOrder === 'number') {
        if (daysSinceLastOrder >= 90) {
            pushTag('Churn Risk');
        } else if (daysSinceLastOrder >= 60) {
            pushTag('Needs Win-Back');
        } else if (daysSinceLastOrder <= 14 && (input.orderCount ?? 0) > 0) {
            pushTag('Recently Active');
        }
    }

    return tags;
}

export function mergeCustomerTags(
    manualTags: string[] | null | undefined,
    autoTags: string[] | null | undefined,
): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();

    for (const source of [manualTags ?? [], autoTags ?? []]) {
        for (const rawTag of source) {
            const tag = normalizeValue(rawTag);
            if (!tag) {
                continue;
            }

            const key = tag.toLowerCase();
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            merged.push(tag);
        }
    }

    return merged;
}
