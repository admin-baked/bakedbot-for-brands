/**
 * Unit tests for Markets Configuration
 */
import {
    AVAILABLE_MARKETS,
    getEnabledMarkets,
    getMarketByCode,
    isValidMarket,
    getMarketOptions
} from '../markets';

describe('Markets Configuration', () => {
    describe('AVAILABLE_MARKETS', () => {
        it('should have at least 10 markets defined', () => {
            expect(AVAILABLE_MARKETS.length).toBeGreaterThanOrEqual(10);
        });

        it('should have required fields for each market', () => {
            for (const market of AVAILABLE_MARKETS) {
                expect(market.code).toBeDefined();
                expect(market.name).toBeDefined();
                expect(typeof market.enabled).toBe('boolean');
                expect(typeof market.priority).toBe('number');
            }
        });

        it('should have unique codes', () => {
            const codes = AVAILABLE_MARKETS.map(m => m.code);
            const uniqueCodes = new Set(codes);
            expect(codes.length).toBe(uniqueCodes.size);
        });
    });

    describe('getEnabledMarkets', () => {
        it('should return only enabled markets', () => {
            const enabled = getEnabledMarkets();
            expect(enabled.every(m => m.enabled)).toBe(true);
        });

        it('should be sorted by priority (ascending)', () => {
            const enabled = getEnabledMarkets();
            for (let i = 1; i < enabled.length; i++) {
                expect(enabled[i].priority).toBeGreaterThanOrEqual(enabled[i - 1].priority);
            }
        });
    });

    describe('getMarketByCode', () => {
        it('should return market for valid code', () => {
            const market = getMarketByCode('IL');
            expect(market).toBeDefined();
            expect(market?.name).toBe('Illinois');
        });

        it('should return undefined for invalid code', () => {
            const market = getMarketByCode('XX');
            expect(market).toBeUndefined();
        });

        it('should be case-insensitive', () => {
            const upper = getMarketByCode('CA');
            const lower = getMarketByCode('ca');
            expect(upper).toEqual(lower);
        });
    });

    describe('isValidMarket', () => {
        it('should return true for enabled markets', () => {
            expect(isValidMarket('IL')).toBe(true);
            expect(isValidMarket('CA')).toBe(true);
        });

        it('should return false for invalid codes', () => {
            expect(isValidMarket('XX')).toBe(false);
            expect(isValidMarket('')).toBe(false);
        });
    });

    describe('getMarketOptions', () => {
        it('should return options with value and label', () => {
            const options = getMarketOptions();
            expect(options.length).toBeGreaterThan(0);

            for (const option of options) {
                expect(option.value).toBeDefined();
                expect(option.label).toBeDefined();
            }
        });

        it('should format label as "Name (CODE)"', () => {
            const options = getMarketOptions();
            const ilOption = options.find(o => o.value === 'IL');
            expect(ilOption?.label).toBe('Illinois (IL)');
        });
    });
});
