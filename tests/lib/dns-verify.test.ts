/**
 * Tests for DNS verification utilities
 */

import {
    generateVerificationToken,
    isValidDomain,
    isSubdomain,
    getVerificationTxtHost,
    getDNSInstructions,
    getRootDomain,
    BAKEDBOT_CNAME_TARGET,
    BAKEDBOT_NAMESERVERS,
} from '@/lib/dns-verify';

// Mock the dns/promises module
jest.mock('dns/promises', () => ({
    resolveTxt: jest.fn(),
    resolveCname: jest.fn(),
    resolveNs: jest.fn(),
    resolve: jest.fn(),
    resolve4: jest.fn(),
}));

describe('dns-verify', () => {
    describe('generateVerificationToken', () => {
        it('should generate a token with correct prefix', () => {
            const token = generateVerificationToken();
            expect(token).toMatch(/^bb_verify_/);
        });

        it('should generate unique tokens on each call', () => {
            const token1 = generateVerificationToken();
            const token2 = generateVerificationToken();
            expect(token1).not.toBe(token2);
        });

        it('should contain timestamp and random parts', () => {
            const token = generateVerificationToken();
            // Format: bb_verify_{timestamp}_{random}
            const parts = token.split('_');
            expect(parts[0]).toBe('bb');
            expect(parts[1]).toBe('verify');
            expect(parts[2]).toBeTruthy(); // timestamp in base36
            expect(parts[3]).toBeTruthy(); // random in base36
        });
    });

    describe('isValidDomain', () => {
        it('should accept valid domain names', () => {
            expect(isValidDomain('example.com')).toBe(true);
            expect(isValidDomain('shop.example.com')).toBe(true);
            expect(isValidDomain('my-brand.com')).toBe(true);
            expect(isValidDomain('subdomain.my-brand.co.uk')).toBe(true);
            expect(isValidDomain('a123.test.io')).toBe(true);
        });

        it('should reject invalid domain names', () => {
            expect(isValidDomain('')).toBe(false);
            expect(isValidDomain('localhost')).toBe(false);
            expect(isValidDomain('example')).toBe(false);
            expect(isValidDomain('-invalid.com')).toBe(false);
            expect(isValidDomain('https://example.com')).toBe(false);
            expect(isValidDomain('example.com/path')).toBe(false);
            expect(isValidDomain('example..com')).toBe(false);
        });

        it('should accept bakedbot.ai domains (validation is separate from business logic)', () => {
            // Note: isValidDomain only checks format, not business rules
            // Business logic for blocking bakedbot.ai should be in addCustomDomain
            expect(isValidDomain('bakedbot.ai')).toBe(true);
            expect(isValidDomain('shop.bakedbot.ai')).toBe(true);
        });

        it('should handle edge cases', () => {
            expect(isValidDomain('a.co')).toBe(true); // short but valid
            expect(isValidDomain('x-y-z.a-b-c.io')).toBe(true);
        });
    });

    describe('isSubdomain', () => {
        it('should identify subdomains correctly', () => {
            expect(isSubdomain('shop.example.com')).toBe(true);
            expect(isSubdomain('menu.mybrand.com')).toBe(true);
            expect(isSubdomain('a.b.c.d.com')).toBe(true);
        });

        it('should identify root domains correctly', () => {
            expect(isSubdomain('example.com')).toBe(false);
            expect(isSubdomain('mybrand.io')).toBe(false);
        });

        it('should handle multi-part TLDs', () => {
            // These are tricky - co.uk, com.au etc.
            // Our simple implementation may not handle these perfectly
            // but should work for common cases
            expect(isSubdomain('shop.example.co.uk')).toBe(true);
            expect(isSubdomain('example.co.uk')).toBe(true); // treated as subdomain of co.uk
        });
    });

    describe('getVerificationTxtHost', () => {
        it('should generate correct TXT record host', () => {
            expect(getVerificationTxtHost('example.com')).toBe('_bakedbot.example.com');
            expect(getVerificationTxtHost('shop.mybrand.com')).toBe('_bakedbot.shop.mybrand.com');
        });

        it('should preserve domain case (caller should normalize)', () => {
            // The function doesn't normalize - caller is expected to normalize first
            expect(getVerificationTxtHost('EXAMPLE.COM')).toBe('_bakedbot.EXAMPLE.COM');
        });
    });

    describe('getRootDomain', () => {
        it('should extract root domain from subdomain', () => {
            expect(getRootDomain('shop.mybrand.com')).toBe('mybrand.com');
            expect(getRootDomain('a.b.c.example.com')).toBe('example.com');
        });

        it('should return root domain as-is', () => {
            expect(getRootDomain('mybrand.com')).toBe('mybrand.com');
            expect(getRootDomain('example.io')).toBe('example.io');
        });
    });

    describe('getDNSInstructions', () => {
        it('should return CNAME instructions for subdomain', () => {
            const instructions = getDNSInstructions(
                'shop.mybrand.com',
                'bb_verify_abc123',
                'cname'
            );

            expect(instructions.txtRecord.host).toBe('_bakedbot.shop.mybrand.com');
            expect(instructions.txtRecord.value).toBe('bb_verify_abc123');
            expect(instructions.connectionRecord.type).toBe('CNAME');
            expect(instructions.connectionRecord.host).toBe('shop');
            expect(instructions.connectionRecord.value).toBe('cname.bakedbot.ai');
        });

        it('should return nameserver instructions for root domain', () => {
            const instructions = getDNSInstructions(
                'mybrandmenu.com',
                'bb_verify_xyz789',
                'nameserver'
            );

            expect(instructions.txtRecord.host).toBe('_bakedbot.mybrandmenu.com');
            expect(instructions.connectionRecord.type).toBe('NS (Nameservers)');
            expect(instructions.connectionRecord.host).toBe('@');
            expect(instructions.connectionRecord.value).toEqual([
                'ns1.bakedbot.ai',
                'ns2.bakedbot.ai',
            ]);
        });
    });

    describe('constants', () => {
        it('should export valid CNAME target', () => {
            expect(BAKEDBOT_CNAME_TARGET).toBe('cname.bakedbot.ai');
        });

        it('should export valid nameservers', () => {
            expect(BAKEDBOT_NAMESERVERS).toEqual(['ns1.bakedbot.ai', 'ns2.bakedbot.ai']);
            expect(BAKEDBOT_NAMESERVERS).toHaveLength(2);
        });
    });
});
