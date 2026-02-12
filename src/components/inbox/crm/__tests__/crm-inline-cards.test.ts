/**
 * Tests for CRM inline card marker parsing functions
 *
 * Covers:
 *   - parseCrmCustomers / CRM_CUSTOMER_PATTERN  (customer-context-card.tsx)
 *   - parseCrmSegments  / CRM_SEGMENT_PATTERN   (segment-summary-card.tsx)
 *
 * These are pure string-parsing functions -- no component rendering needed.
 */

// ---------------------------------------------------------------------------
// Mocks -- the source files import React UI components, so we stub their deps
// ---------------------------------------------------------------------------

jest.mock('@/components/ui/badge', () => ({ Badge: () => null }));
jest.mock('@/components/ui/button', () => ({ Button: () => null }));
jest.mock('@/lib/utils', () => ({ cn: (...args: string[]) => args.join(' ') }));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
    parseCrmCustomers,
    CRM_CUSTOMER_PATTERN,
} from '../customer-context-card';

import {
    parseCrmSegments,
    CRM_SEGMENT_PATTERN,
} from '../segment-summary-card';

// ---------------------------------------------------------------------------
// parseCrmCustomers
// ---------------------------------------------------------------------------

describe('parseCrmCustomers', () => {
    // Reset the global regex lastIndex before each test so state does not leak
    beforeEach(() => {
        CRM_CUSTOMER_PATTERN.lastIndex = 0;
    });

    it('parses a valid customer marker', () => {
        const content = [
            'Some text',
            ':::crm:customer:John Smith',
            '{"id":"cust-1","displayName":"John Smith","email":"john@example.com","segment":"vip","totalSpent":5000,"orderCount":25}',
            ':::',
            'More text',
        ].join('\n');

        const { customers, cleanedContent } = parseCrmCustomers(content);

        expect(customers).toHaveLength(1);
        expect(customers[0]).toEqual(
            expect.objectContaining({
                id: 'cust-1',
                displayName: 'John Smith',
                email: 'john@example.com',
                segment: 'vip',
                totalSpent: 5000,
                orderCount: 25,
            }),
        );
        expect(cleanedContent).toContain('Some text');
        expect(cleanedContent).toContain('More text');
        expect(cleanedContent).not.toContain(':::crm:customer');
    });

    it('returns empty array for content without markers', () => {
        const content = 'Just some plain text with no CRM markers at all.';
        const { customers, cleanedContent } = parseCrmCustomers(content);

        expect(customers).toEqual([]);
        expect(cleanedContent).toBe(content);
    });

    it('handles multiple customers in one string', () => {
        const customer1 = [
            ':::crm:customer:Alice',
            '{"id":"c1","displayName":"Alice","segment":"loyal","totalSpent":2000,"orderCount":10}',
            ':::',
        ].join('\n');
        const customer2 = [
            ':::crm:customer:Bob',
            '{"id":"c2","displayName":"Bob","segment":"new","totalSpent":150,"orderCount":1}',
            ':::',
        ].join('\n');

        const content = `Here are customers:\n${customer1}\nand also\n${customer2}\nDone.`;
        const { customers, cleanedContent } = parseCrmCustomers(content);

        expect(customers).toHaveLength(2);
        expect(customers[0].id).toBe('c1');
        expect(customers[0].displayName).toBe('Alice');
        expect(customers[1].id).toBe('c2');
        expect(customers[1].displayName).toBe('Bob');
        expect(cleanedContent).not.toContain(':::crm:customer');
    });

    it('handles invalid JSON gracefully and skips it', () => {
        const content = [
            ':::crm:customer:Bad Data',
            '{this is not valid json!!!}',
            ':::',
        ].join('\n');

        const { customers } = parseCrmCustomers(content);
        expect(customers).toEqual([]);
    });

    it('cleans markers from content completely', () => {
        const marker = [
            ':::crm:customer:Jane',
            '{"id":"c3","displayName":"Jane","segment":"vip","totalSpent":9000,"orderCount":50}',
            ':::',
        ].join('\n');

        const content = `Prefix\n${marker}\nSuffix`;
        const { cleanedContent } = parseCrmCustomers(content);

        expect(cleanedContent).not.toContain(':::crm:customer');
        expect(cleanedContent).not.toContain('c3');
        expect(cleanedContent).not.toContain('"displayName"');
    });

    it('preserves surrounding text', () => {
        const marker = [
            ':::crm:customer:Test',
            '{"id":"x","displayName":"Test"}',
            ':::',
        ].join('\n');

        const content = `Important intro paragraph.\n${marker}\nClosing remarks here.`;
        const { cleanedContent } = parseCrmCustomers(content);

        expect(cleanedContent).toContain('Important intro paragraph.');
        expect(cleanedContent).toContain('Closing remarks here.');
    });
});

// ---------------------------------------------------------------------------
// parseCrmSegments
// ---------------------------------------------------------------------------

describe('parseCrmSegments', () => {
    beforeEach(() => {
        CRM_SEGMENT_PATTERN.lastIndex = 0;
    });

    it('parses a valid segment marker', () => {
        const content = [
            ':::crm:segments:Customer Analysis',
            '{"totalCustomers":150,"segments":[{"segment":"vip","count":15,"avgSpend":500,"avgLTV":5000},{"segment":"loyal","count":45,"avgSpend":200,"avgLTV":2000}]}',
            ':::',
        ].join('\n');

        const { segments, cleanedContent } = parseCrmSegments(content);

        expect(segments).toHaveLength(1);
        expect(segments[0].totalCustomers).toBe(150);
        expect(segments[0].segments).toHaveLength(2);
        expect(segments[0].segments[0]).toEqual(
            expect.objectContaining({
                segment: 'vip',
                count: 15,
                avgSpend: 500,
                avgLTV: 5000,
            }),
        );
        expect(segments[0].segments[1]).toEqual(
            expect.objectContaining({
                segment: 'loyal',
                count: 45,
                avgSpend: 200,
                avgLTV: 2000,
            }),
        );
        expect(cleanedContent).not.toContain(':::crm:segments');
    });

    it('returns empty array for content without markers', () => {
        const content = 'Regular text with absolutely no CRM segment data.';
        const { segments, cleanedContent } = parseCrmSegments(content);

        expect(segments).toEqual([]);
        expect(cleanedContent).toBe(content);
    });

    it('handles invalid JSON gracefully and skips it', () => {
        const content = [
            ':::crm:segments:Broken',
            '%%%NOT JSON AT ALL%%%',
            ':::',
        ].join('\n');

        const { segments } = parseCrmSegments(content);
        expect(segments).toEqual([]);
    });

    it('cleans markers from content completely', () => {
        const marker = [
            ':::crm:segments:Overview',
            '{"totalCustomers":80,"segments":[{"segment":"new","count":80,"avgSpend":100,"avgLTV":400}]}',
            ':::',
        ].join('\n');

        const content = `Before segment data.\n${marker}\nAfter segment data.`;
        const { cleanedContent } = parseCrmSegments(content);

        expect(cleanedContent).not.toContain(':::crm:segments');
        expect(cleanedContent).not.toContain('totalCustomers');
        expect(cleanedContent).toContain('Before segment data.');
        expect(cleanedContent).toContain('After segment data.');
    });

    it('parses multiple segment summaries', () => {
        const summary1 = [
            ':::crm:segments:Region A',
            '{"totalCustomers":100,"segments":[{"segment":"vip","count":10,"avgSpend":600,"avgLTV":6000}]}',
            ':::',
        ].join('\n');
        const summary2 = [
            ':::crm:segments:Region B',
            '{"totalCustomers":200,"segments":[{"segment":"loyal","count":80,"avgSpend":250,"avgLTV":2500},{"segment":"at_risk","count":30,"avgSpend":100,"avgLTV":500}]}',
            ':::',
        ].join('\n');

        const content = `Results:\n${summary1}\nAlso:\n${summary2}\nEnd.`;
        const { segments, cleanedContent } = parseCrmSegments(content);

        expect(segments).toHaveLength(2);
        expect(segments[0].totalCustomers).toBe(100);
        expect(segments[0].segments).toHaveLength(1);
        expect(segments[1].totalCustomers).toBe(200);
        expect(segments[1].segments).toHaveLength(2);
        expect(cleanedContent).not.toContain(':::crm:segments');
    });
});
