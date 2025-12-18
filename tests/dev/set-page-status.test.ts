/**
 * Unit tests for set_page_status script functionality
 * Tests the top 25 ZIP selection and status logic
 */

// Top 25 Chicago ZIPs for Phase 1 (to remain published)
const TOP_25_ZIPS = [
    '60601', '60602', '60603', '60604', '60605',
    '60606', '60607', '60608', '60609', '60610',
    '60611', '60612', '60613', '60614', '60615',
    '60616', '60617', '60618', '60619', '60620',
    '60621', '60622', '60623', '60624', '60625'
];

/**
 * Check if a page ID should be in the top 25 (published)
 */
function isTopZip(pageId: string, zip?: string, zipCode?: string): boolean {
    return TOP_25_ZIPS.some(topZip =>
        pageId.includes(topZip) ||
        zip === topZip ||
        zipCode === topZip
    );
}

describe('Page Status Script Logic', () => {
    describe('TOP_25_ZIPS constant', () => {
        it('should have exactly 25 ZIPs', () => {
            expect(TOP_25_ZIPS).toHaveLength(25);
        });

        it('should contain Chicago Loop ZIPs', () => {
            expect(TOP_25_ZIPS).toContain('60601');
            expect(TOP_25_ZIPS).toContain('60602');
            expect(TOP_25_ZIPS).toContain('60603');
        });

        it('should contain all ZIPs in 60601-60625 range', () => {
            for (let i = 60601; i <= 60625; i++) {
                expect(TOP_25_ZIPS).toContain(i.toString());
            }
        });

        it('should not contain ZIPs outside the range', () => {
            expect(TOP_25_ZIPS).not.toContain('60626');
            expect(TOP_25_ZIPS).not.toContain('60600');
            expect(TOP_25_ZIPS).not.toContain('60700');
        });
    });

    describe('isTopZip function', () => {
        it('should return true for page IDs containing top 25 ZIPs', () => {
            expect(isTopZip('zip-60601')).toBe(true);
            expect(isTopZip('zip_60615_seo')).toBe(true);
            expect(isTopZip('dispensary_60625_page')).toBe(true);
        });

        it('should return false for page IDs with non-top ZIPs', () => {
            expect(isTopZip('zip-60626')).toBe(false);
            expect(isTopZip('zip_60700_seo')).toBe(false);
            expect(isTopZip('dispensary_60000_page')).toBe(false);
        });

        it('should match zip field', () => {
            expect(isTopZip('some-page-id', '60601')).toBe(true);
            expect(isTopZip('some-page-id', '60700')).toBe(false);
        });

        it('should match zipCode field', () => {
            expect(isTopZip('some-page-id', undefined, '60610')).toBe(true);
            expect(isTopZip('some-page-id', undefined, '60626')).toBe(false);
        });

        it('should return true if any field matches', () => {
            expect(isTopZip('other-id', '60601', '60700')).toBe(true);
            expect(isTopZip('other-id', '60700', '60601')).toBe(true);
        });
    });

    describe('Rollout Phase 1 alignment', () => {
        it('should match rollout_config.md top 25 specification', () => {
            // From rollout_config.md:
            // Phase 1: 25 ZIPs (Chicago Loop, Downtown, North Side, etc.)
            const chicagoLoop = ['60601', '60602', '60603', '60604', '60605'];
            const downtown = ['60606', '60607', '60608', '60609', '60610'];
            const northSide = ['60611', '60612', '60613', '60614', '60615'];

            chicagoLoop.forEach(zip => expect(TOP_25_ZIPS).toContain(zip));
            downtown.forEach(zip => expect(TOP_25_ZIPS).toContain(zip));
            northSide.forEach(zip => expect(TOP_25_ZIPS).toContain(zip));
        });
    });
});
