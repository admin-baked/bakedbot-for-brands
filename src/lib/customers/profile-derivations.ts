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

export function resolveCustomerDisplayName(input: CustomerIdentityInput): string {
    const displayName = normalizeValue(input.displayName);
    if (displayName) {
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

    return getFirstMeaningfulValue([input.email, input.fallbackId]) ?? 'Unknown Customer';
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
