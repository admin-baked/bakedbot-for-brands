import { INBOX_QUICK_ACTIONS, InboxThreadTypeSchema } from '@/types/inbox';

describe('InboxThreadTypeSchema', () => {
    it('accepts all quick action thread types', () => {
        for (const action of INBOX_QUICK_ACTIONS) {
            expect(() => InboxThreadTypeSchema.parse(action.threadType)).not.toThrow();
        }
    });

    it('accepts video and grower thread types', () => {
        expect(InboxThreadTypeSchema.parse('video')).toBe('video');
        expect(InboxThreadTypeSchema.parse('yield_analysis')).toBe('yield_analysis');
        expect(InboxThreadTypeSchema.parse('wholesale_inventory')).toBe('wholesale_inventory');
        expect(InboxThreadTypeSchema.parse('brand_outreach')).toBe('brand_outreach');
    });
});
