/**
 * Tests for campaign inline card marker parsing functions
 *
 * Covers: parseCampaignDrafts and parseCampaignPerformance
 * from campaign-inline-card.tsx.
 *
 * These are pure string-parsing functions — no component rendering needed.
 */

// ---------------------------------------------------------------------------
// Mocks — the source file imports React components so we mock their deps
// ---------------------------------------------------------------------------

jest.mock('next/navigation', () => ({
    useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
}));

jest.mock('@/types/campaign', () => ({
    CAMPAIGN_GOALS: [],
    CAMPAIGN_STATUS_INFO: {},
}));

jest.mock('@/components/ui/card', () => ({
    Card: 'Card',
    CardContent: 'CardContent',
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: 'Badge',
}));

jest.mock('@/components/ui/button', () => ({
    Button: 'Button',
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import {
    parseCampaignDrafts,
    parseCampaignPerformance,
} from '../campaign-inline-card';

// ---------------------------------------------------------------------------
// parseCampaignDrafts
// ---------------------------------------------------------------------------

describe('parseCampaignDrafts', () => {
    it('parses a valid campaign draft marker', () => {
        const content = [
            ':::campaign:draft:Summer Sale',
            '{"id":"123","name":"Summer Sale","goal":"drive_sales","channels":["email","sms"],"segments":["vip"],"status":"draft"}',
            ':::',
        ].join('\n');

        const { drafts } = parseCampaignDrafts(content);

        expect(drafts).toHaveLength(1);
        expect(drafts[0]).toEqual(
            expect.objectContaining({
                id: '123',
                name: 'Summer Sale',
                goal: 'drive_sales',
                channels: ['email', 'sms'],
                segments: ['vip'],
                status: 'draft',
            }),
        );
    });

    it('returns empty array for content without markers', () => {
        const content = 'Just some plain text with no markers.';
        const { drafts } = parseCampaignDrafts(content);
        expect(drafts).toEqual([]);
    });

    it('cleans the marker from the returned content', () => {
        const marker = [
            ':::campaign:draft:Promo',
            '{"id":"1","name":"Promo","goal":"retention","channels":["sms"],"status":"draft"}',
            ':::',
        ].join('\n');
        const content = `Hello ${marker} world`;

        const { cleanedContent } = parseCampaignDrafts(content);

        expect(cleanedContent).not.toContain(':::campaign:draft');
        expect(cleanedContent).toContain('Hello');
        expect(cleanedContent).toContain('world');
    });

    it('handles invalid JSON gracefully and skips it', () => {
        const content = [
            ':::campaign:draft:Bad',
            '{not-valid-json!!!}',
            ':::',
        ].join('\n');

        const { drafts } = parseCampaignDrafts(content);
        expect(drafts).toEqual([]);
    });

    it('parses multiple drafts in the same content', () => {
        const draft1 = [
            ':::campaign:draft:Draft A',
            '{"id":"a","name":"Draft A","goal":"drive_sales","channels":["email"],"status":"draft"}',
            ':::',
        ].join('\n');
        const draft2 = [
            ':::campaign:draft:Draft B',
            '{"id":"b","name":"Draft B","goal":"winback","channels":["sms"],"status":"draft"}',
            ':::',
        ].join('\n');

        const content = `Intro text ${draft1} middle ${draft2} outro`;

        const { drafts, cleanedContent } = parseCampaignDrafts(content);

        expect(drafts).toHaveLength(2);
        expect(drafts[0].id).toBe('a');
        expect(drafts[1].id).toBe('b');
        expect(cleanedContent).not.toContain(':::campaign:draft');
    });
});

// ---------------------------------------------------------------------------
// parseCampaignPerformance
// ---------------------------------------------------------------------------

describe('parseCampaignPerformance', () => {
    it('parses a valid performance marker', () => {
        const content = [
            ':::campaign:performance:Summer Sale',
            '{"id":"123","name":"Summer Sale","sent":100,"opened":45,"clicked":12,"openRate":45.0,"clickRate":12.0,"revenue":5000}',
            ':::',
        ].join('\n');

        const { performances } = parseCampaignPerformance(content);

        expect(performances).toHaveLength(1);
        expect(performances[0]).toEqual(
            expect.objectContaining({
                id: '123',
                name: 'Summer Sale',
                sent: 100,
                opened: 45,
                clicked: 12,
                openRate: 45.0,
                clickRate: 12.0,
                revenue: 5000,
            }),
        );
    });

    it('returns empty array for content with no performance markers', () => {
        const { performances } = parseCampaignPerformance('No data here.');
        expect(performances).toEqual([]);
    });

    it('cleans the performance marker from content', () => {
        const marker = [
            ':::campaign:performance:Test',
            '{"id":"1","name":"Test","sent":50,"openRate":30}',
            ':::',
        ].join('\n');
        const content = `Before ${marker} After`;

        const { cleanedContent } = parseCampaignPerformance(content);

        expect(cleanedContent).not.toContain(':::campaign:performance');
        expect(cleanedContent).toContain('Before');
        expect(cleanedContent).toContain('After');
    });

    it('handles invalid JSON gracefully', () => {
        const content = [
            ':::campaign:performance:Bad',
            '%%%NOT JSON%%%',
            ':::',
        ].join('\n');

        const { performances } = parseCampaignPerformance(content);
        expect(performances).toEqual([]);
    });
});
