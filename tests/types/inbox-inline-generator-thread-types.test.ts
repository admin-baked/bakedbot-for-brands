import { INLINE_GENERATOR_THREAD_TYPES } from '@/types/inbox';

describe('INLINE_GENERATOR_THREAD_TYPES', () => {
    it('includes launch so launch presets use inline workflow handling', () => {
        expect(INLINE_GENERATOR_THREAD_TYPES.has('launch')).toBe(true);
        expect(INLINE_GENERATOR_THREAD_TYPES.has('launch_campaign')).toBe(true);
        expect(INLINE_GENERATOR_THREAD_TYPES.has('crm_customer')).toBe(true);
        expect(INLINE_GENERATOR_THREAD_TYPES.has('product_discovery')).toBe(true);
        expect(INLINE_GENERATOR_THREAD_TYPES.has('wholesale_inventory')).toBe(true);
    });
});
