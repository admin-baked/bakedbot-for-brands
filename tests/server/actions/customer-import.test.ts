/**
 * Customer Import Tests
 *
 * Tests for CSV/Excel import functionality including:
 * - Column mapping and normalization
 * - Value normalization
 * - Validation
 * - Import execution
 */

import {
    normalizeColumnName,
    buildColumnMapping,
    getMappingSummary,
    getUnmappedColumns,
    normalizeSegment,
    normalizeTier,
    normalizePriceRange,
    normalizeSource,
    normalizeBoolean,
    normalizeNumber,
    normalizeDate,
    normalizeArray,
    normalizePhone,
    normalizeEmail,
} from '@/lib/customer-import/column-mapping';

// =============================================================================
// COLUMN NAME NORMALIZATION
// =============================================================================

describe('normalizeColumnName', () => {
    describe('email field', () => {
        it('should map common email variations', () => {
            expect(normalizeColumnName('email')).toBe('email');
            expect(normalizeColumnName('Email')).toBe('email');
            expect(normalizeColumnName('EMAIL')).toBe('email');
            expect(normalizeColumnName('email_address')).toBe('email');
            expect(normalizeColumnName('customer_email')).toBe('email');
            expect(normalizeColumnName('customeremail')).toBe('email');
        });
    });

    describe('name fields', () => {
        it('should map first name variations', () => {
            expect(normalizeColumnName('first_name')).toBe('firstName');
            expect(normalizeColumnName('firstname')).toBe('firstName');
            expect(normalizeColumnName('First Name')).toBe('firstName');
            expect(normalizeColumnName('fname')).toBe('firstName');
        });

        it('should map last name variations', () => {
            expect(normalizeColumnName('last_name')).toBe('lastName');
            expect(normalizeColumnName('lastname')).toBe('lastName');
            expect(normalizeColumnName('surname')).toBe('lastName');
        });

        it('should map full name variations', () => {
            expect(normalizeColumnName('name')).toBe('displayName');
            expect(normalizeColumnName('full_name')).toBe('displayName');
            expect(normalizeColumnName('customer_name')).toBe('displayName');
        });
    });

    describe('phone field', () => {
        it('should map phone variations', () => {
            expect(normalizeColumnName('phone')).toBe('phone');
            expect(normalizeColumnName('Phone Number')).toBe('phone');
            expect(normalizeColumnName('mobile')).toBe('phone');
            expect(normalizeColumnName('cell')).toBe('phone');
        });
    });

    describe('financial fields', () => {
        it('should map total spent variations', () => {
            expect(normalizeColumnName('total_spent')).toBe('totalSpent');
            expect(normalizeColumnName('totalspent')).toBe('totalSpent');
            expect(normalizeColumnName('revenue')).toBe('totalSpent');
            expect(normalizeColumnName('spent')).toBe('totalSpent');
        });

        it('should map lifetime value', () => {
            // Note: 'ltv' maps to lifetimeValue, not totalSpent
            expect(normalizeColumnName('ltv')).toBe('lifetimeValue');
            expect(normalizeColumnName('lifetime_value')).toBe('lifetimeValue');
        });

        it('should map order count variations', () => {
            expect(normalizeColumnName('order_count')).toBe('orderCount');
            expect(normalizeColumnName('orders')).toBe('orderCount');
            expect(normalizeColumnName('visits')).toBe('orderCount');
        });
    });

    describe('date fields', () => {
        it('should map date variations', () => {
            expect(normalizeColumnName('last_order_date')).toBe('lastOrderDate');
            expect(normalizeColumnName('last_purchase')).toBe('lastOrderDate');
            expect(normalizeColumnName('first_order_date')).toBe('firstOrderDate');
            expect(normalizeColumnName('birthday')).toBe('birthDate');
        });
    });

    describe('unknown columns', () => {
        it('should return null for unmapped columns', () => {
            expect(normalizeColumnName('random_column')).toBeNull();
            expect(normalizeColumnName('xyz123')).toBeNull();
            expect(normalizeColumnName('')).toBeNull();
        });
    });

    describe('special character handling', () => {
        it('should normalize columns with underscores', () => {
            expect(normalizeColumnName('first_name')).toBe('firstName');
            expect(normalizeColumnName('last_name')).toBe('lastName');
            expect(normalizeColumnName('phone_number')).toBe('phone');
        });

        it('should handle mixed case', () => {
            expect(normalizeColumnName('FirstName')).toBe('firstName');
            expect(normalizeColumnName('PHONE')).toBe('phone');
            expect(normalizeColumnName('Email')).toBe('email');
        });
    });
});

describe('buildColumnMapping', () => {
    it('should build mapping from headers', () => {
        const headers = ['Email', 'First Name', 'Last Name', 'Phone'];
        const mapping = buildColumnMapping(headers);

        expect(mapping.get(0)).toBe('email');
        expect(mapping.get(1)).toBe('firstName');
        expect(mapping.get(2)).toBe('lastName');
        expect(mapping.get(3)).toBe('phone');
    });

    it('should skip unmapped columns', () => {
        const headers = ['Email', 'Random Column', 'Phone'];
        const mapping = buildColumnMapping(headers);

        expect(mapping.size).toBe(2);
        expect(mapping.has(1)).toBe(false);
    });

    it('should handle empty headers', () => {
        const mapping = buildColumnMapping([]);
        expect(mapping.size).toBe(0);
    });
});

describe('getMappingSummary', () => {
    it('should return summary with original and mapped names', () => {
        const headers = ['Email', 'Unknown', 'Phone'];
        const summary = getMappingSummary(headers);

        expect(summary).toHaveLength(3);
        expect(summary[0]).toEqual({ original: 'Email', mapped: 'email', index: 0 });
        expect(summary[1]).toEqual({ original: 'Unknown', mapped: null, index: 1 });
        expect(summary[2]).toEqual({ original: 'Phone', mapped: 'phone', index: 2 });
    });
});

describe('getUnmappedColumns', () => {
    it('should return only unmapped columns', () => {
        const headers = ['Email', 'Unknown1', 'Phone', 'Unknown2'];
        const unmapped = getUnmappedColumns(headers);

        expect(unmapped).toEqual(['Unknown1', 'Unknown2']);
    });

    it('should return empty array if all mapped', () => {
        const headers = ['Email', 'Phone', 'First Name'];
        const unmapped = getUnmappedColumns(headers);

        expect(unmapped).toEqual([]);
    });
});

// =============================================================================
// VALUE NORMALIZATION
// =============================================================================

describe('normalizeSegment', () => {
    it('should normalize VIP variations', () => {
        expect(normalizeSegment('vip')).toBe('vip');
        expect(normalizeSegment('VIP')).toBe('vip');
        expect(normalizeSegment('platinum')).toBe('vip');
        expect(normalizeSegment('elite')).toBe('vip');
    });

    it('should normalize loyal variations', () => {
        expect(normalizeSegment('loyal')).toBe('loyal');
        expect(normalizeSegment('regular')).toBe('loyal');
        expect(normalizeSegment('returning')).toBe('loyal');
    });

    it('should normalize at_risk variations', () => {
        expect(normalizeSegment('at_risk')).toBe('at_risk');
        expect(normalizeSegment('at-risk')).toBe('at_risk');
        expect(normalizeSegment('atrisk')).toBe('at_risk');
    });

    it('should default to new for unknown segments', () => {
        expect(normalizeSegment('unknown')).toBe('new');
        expect(normalizeSegment('')).toBe('new');
    });
});

describe('normalizeTier', () => {
    it('should normalize tier values', () => {
        expect(normalizeTier('platinum')).toBe('platinum');
        expect(normalizeTier('gold')).toBe('gold');
        expect(normalizeTier('silver')).toBe('silver');
        expect(normalizeTier('bronze')).toBe('bronze');
    });

    it('should map alternative names', () => {
        expect(normalizeTier('vip')).toBe('platinum');
        expect(normalizeTier('premium')).toBe('gold');
        expect(normalizeTier('regular')).toBe('silver');
    });

    it('should default to bronze', () => {
        expect(normalizeTier('unknown')).toBe('bronze');
        expect(normalizeTier('')).toBe('bronze');
    });
});

describe('normalizePriceRange', () => {
    it('should normalize price range values', () => {
        expect(normalizePriceRange('premium')).toBe('premium');
        expect(normalizePriceRange('mid')).toBe('mid');
        expect(normalizePriceRange('budget')).toBe('budget');
    });

    it('should map alternative names', () => {
        expect(normalizePriceRange('high')).toBe('premium');
        expect(normalizePriceRange('luxury')).toBe('premium');
        expect(normalizePriceRange('average')).toBe('mid');
    });

    it('should default to budget', () => {
        expect(normalizePriceRange('unknown')).toBe('budget');
    });
});

describe('normalizeSource', () => {
    it('should normalize POS sources', () => {
        expect(normalizeSource('dutchie')).toBe('pos_dutchie');
        expect(normalizeSource('jane')).toBe('pos_jane');
        expect(normalizeSource('treez')).toBe('pos_treez');
    });

    it('should normalize page sources', () => {
        expect(normalizeSource('brand')).toBe('brand_page');
        expect(normalizeSource('website')).toBe('brand_page');
        expect(normalizeSource('dispensary')).toBe('dispensary_page');
    });

    it('should default to import', () => {
        expect(normalizeSource('unknown')).toBe('import');
    });
});

describe('normalizeBoolean', () => {
    it('should handle boolean input', () => {
        expect(normalizeBoolean(true)).toBe(true);
        expect(normalizeBoolean(false)).toBe(false);
    });

    it('should handle number input', () => {
        expect(normalizeBoolean(1)).toBe(true);
        expect(normalizeBoolean(0)).toBe(false);
        expect(normalizeBoolean(-1)).toBe(true);
    });

    it('should handle string input', () => {
        expect(normalizeBoolean('true')).toBe(true);
        expect(normalizeBoolean('yes')).toBe(true);
        expect(normalizeBoolean('1')).toBe(true);
        expect(normalizeBoolean('false')).toBe(false);
        expect(normalizeBoolean('no')).toBe(false);
        expect(normalizeBoolean('0')).toBe(false);
    });

    it('should handle undefined', () => {
        expect(normalizeBoolean(undefined)).toBe(false);
    });
});

describe('normalizeNumber', () => {
    it('should handle number input', () => {
        expect(normalizeNumber(100)).toBe(100);
        expect(normalizeNumber(99.99)).toBe(99.99);
        expect(normalizeNumber(0)).toBe(0);
    });

    it('should parse string numbers', () => {
        expect(normalizeNumber('100')).toBe(100);
        expect(normalizeNumber('99.99')).toBe(99.99);
    });

    it('should handle currency formatting', () => {
        expect(normalizeNumber('$100.00')).toBe(100);
        expect(normalizeNumber('$1,234.56')).toBe(1234.56);
        expect(normalizeNumber('1,000')).toBe(1000);
    });

    it('should return 0 for invalid input', () => {
        expect(normalizeNumber('abc')).toBe(0);
        expect(normalizeNumber(undefined)).toBe(0);
        expect(normalizeNumber('')).toBe(0);
    });
});

describe('normalizeDate', () => {
    it('should handle Date input', () => {
        const date = new Date('2024-01-15');
        expect(normalizeDate(date)).toEqual(date);
    });

    it('should parse ISO date strings', () => {
        const result = normalizeDate('2024-01-15');
        expect(result).toBeInstanceOf(Date);
        expect(result?.toISOString().startsWith('2024-01-15')).toBe(true);
    });

    it('should parse MM/DD/YYYY format', () => {
        const result = normalizeDate('01/15/2024');
        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBe(2024);
        expect(result?.getMonth()).toBe(0); // January
        expect(result?.getDate()).toBe(15);
    });

    it('should handle 2-digit years', () => {
        const result = normalizeDate('01/15/24');
        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBe(2024);
    });

    it('should return undefined for invalid dates', () => {
        expect(normalizeDate('')).toBeUndefined();
        expect(normalizeDate(undefined)).toBeUndefined();
        expect(normalizeDate('not-a-date')).toBeUndefined();
    });
});

describe('normalizeArray', () => {
    it('should handle array input', () => {
        expect(normalizeArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('should split comma-separated strings', () => {
        expect(normalizeArray('a, b, c')).toEqual(['a', 'b', 'c']);
        expect(normalizeArray('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('should handle semicolon and pipe separators', () => {
        expect(normalizeArray('a;b;c')).toEqual(['a', 'b', 'c']);
        expect(normalizeArray('a|b|c')).toEqual(['a', 'b', 'c']);
    });

    it('should filter empty values', () => {
        expect(normalizeArray('a,,b')).toEqual(['a', 'b']);
        expect(normalizeArray(' , a , ')).toEqual(['a']);
    });

    it('should return empty array for empty input', () => {
        expect(normalizeArray('')).toEqual([]);
        expect(normalizeArray(undefined)).toEqual([]);
    });
});

describe('normalizePhone', () => {
    it('should normalize 10-digit US numbers', () => {
        expect(normalizePhone('5551234567')).toBe('+15551234567');
        expect(normalizePhone('555-123-4567')).toBe('+15551234567');
        expect(normalizePhone('(555) 123-4567')).toBe('+15551234567');
    });

    it('should normalize 11-digit US numbers with leading 1', () => {
        expect(normalizePhone('15551234567')).toBe('+15551234567');
        expect(normalizePhone('1-555-123-4567')).toBe('+15551234567');
    });

    it('should preserve numbers starting with +', () => {
        expect(normalizePhone('+15551234567')).toBe('+15551234567');
        expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    });

    it('should return original for unusual formats', () => {
        expect(normalizePhone('123')).toBe('123'); // Too short
    });

    it('should return undefined for empty input', () => {
        expect(normalizePhone('')).toBeUndefined();
        expect(normalizePhone(undefined)).toBeUndefined();
    });
});

describe('normalizeEmail', () => {
    it('should lowercase and trim emails', () => {
        expect(normalizeEmail('Test@Example.com')).toBe('test@example.com');
        expect(normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should return undefined for empty input', () => {
        expect(normalizeEmail('')).toBeUndefined();
        expect(normalizeEmail(undefined)).toBeUndefined();
    });
});

// =============================================================================
// INTEGRATION TESTS (Column + Value together)
// =============================================================================

describe('Column mapping integration', () => {
    it('should map a typical CSV header row', () => {
        const headers = [
            'email',
            'first_name',
            'last_name',
            'phone',
            'total_spent',
            'orders',
            'last_order_date',
            'segment',
            'tags'
        ];

        const mapping = buildColumnMapping(headers);

        expect(mapping.get(0)).toBe('email');
        expect(mapping.get(1)).toBe('firstName');
        expect(mapping.get(2)).toBe('lastName');
        expect(mapping.get(3)).toBe('phone');
        expect(mapping.get(4)).toBe('totalSpent');
        expect(mapping.get(5)).toBe('orderCount');
        expect(mapping.get(6)).toBe('lastOrderDate');
        expect(mapping.get(7)).toBe('segment');
        expect(mapping.get(8)).toBe('customTags');
    });

    it('should handle POS export format (Dutchie-style)', () => {
        const headers = [
            'customer_email',
            'fname',
            'lname',
            'mobile',
            'lifetime_value',
            'total_orders',
            'last_visit'
        ];

        const mapping = buildColumnMapping(headers);

        expect(mapping.get(0)).toBe('email');
        expect(mapping.get(1)).toBe('firstName');
        expect(mapping.get(2)).toBe('lastName');
        expect(mapping.get(3)).toBe('phone');
        expect(mapping.get(4)).toBe('lifetimeValue');
        expect(mapping.get(5)).toBe('orderCount');
        expect(mapping.get(6)).toBe('lastOrderDate');
    });
});
