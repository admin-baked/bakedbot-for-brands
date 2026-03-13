import {
    getGoogleSuccessKey,
    normalizeGoogleService,
} from '../service-definitions';

describe('Google service definitions', () => {
    it('normalizes legacy and canonical service aliases', () => {
        expect(normalizeGoogleService('gmail')).toBe('gmail');
        expect(normalizeGoogleService('google_drive')).toBe('drive');
        expect(normalizeGoogleService('drive')).toBe('drive');
        expect(normalizeGoogleService('google_sheets')).toBe('sheets');
        expect(normalizeGoogleService('search_console')).toBe('google_search_console');
        expect(normalizeGoogleService('google_search_console')).toBe('google_search_console');
        expect(normalizeGoogleService('google_analytics')).toBe('google_analytics');
    });

    it('defaults unknown services to gmail', () => {
        expect(normalizeGoogleService(undefined)).toBe('gmail');
        expect(normalizeGoogleService(null)).toBe('gmail');
        expect(normalizeGoogleService('unknown-service')).toBe('gmail');
    });

    it('uses normalized services for redirect success keys', () => {
        expect(getGoogleSuccessKey('gmail')).toBe('gmail');
        expect(getGoogleSuccessKey('google_analytics')).toBe('google_analytics');
        expect(getGoogleSuccessKey('google_search_console')).toBe('google_search_console');
    });
});
