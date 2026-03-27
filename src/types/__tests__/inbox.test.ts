import { INBOX_QUICK_ACTIONS, InboxThreadTypeSchema, getQuickActionsForRoleAsync } from '@/types/inbox';

jest.mock('@/server/actions/role-ground-truth', () => ({
    getPresetPrompts: jest.fn(),
}));

const mockGetPresetPrompts = require('@/server/actions/role-ground-truth').getPresetPrompts;

describe('InboxThreadTypeSchema', () => {
    const originalDbQuickActionsFlag = process.env.NEXT_PUBLIC_USE_DB_QUICK_ACTIONS;

    afterEach(() => {
        process.env.NEXT_PUBLIC_USE_DB_QUICK_ACTIONS = originalDbQuickActionsFlag;
        jest.clearAllMocks();
    });

    it('accepts all quick action thread types', () => {
        for (const action of INBOX_QUICK_ACTIONS) {
            expect(() => InboxThreadTypeSchema.parse(action.threadType)).not.toThrow();
        }
    });

    it('accepts image, video, and grower thread types', () => {
        expect(InboxThreadTypeSchema.parse('image')).toBe('image');
        expect(InboxThreadTypeSchema.parse('video')).toBe('video');
        expect(InboxThreadTypeSchema.parse('yield_analysis')).toBe('yield_analysis');
        expect(InboxThreadTypeSchema.parse('wholesale_inventory')).toBe('wholesale_inventory');
        expect(InboxThreadTypeSchema.parse('brand_outreach')).toBe('brand_outreach');
    });

    it('keeps grower quick actions on the hardcoded set when DB presets are enabled', async () => {
        process.env.NEXT_PUBLIC_USE_DB_QUICK_ACTIONS = 'true';

        const actions = await getQuickActionsForRoleAsync('grower', 'org-grower');

        expect(mockGetPresetPrompts).not.toHaveBeenCalled();
        expect(actions.map((action) => action.id)).toEqual(
            expect.arrayContaining([
                'yield-analysis',
                'wholesale-inventory',
                'grower-brand-outreach',
                'grower-compliance-check',
            ])
        );
    });
});
