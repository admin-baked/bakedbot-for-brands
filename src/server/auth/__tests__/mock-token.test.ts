import type { DecodedIdToken } from 'firebase-admin/auth';
import { buildSyntheticDecodedIdToken } from '../mock-token';

type TestToken = DecodedIdToken & {
    role?: string;
    brandId?: string;
    orgId?: string;
};

describe('buildSyntheticDecodedIdToken', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('normalizes fractional timestamp claims to integer epoch seconds', () => {
        const token = buildSyntheticDecodedIdToken({
            uid: 'user-1',
            email: 'owner@example.com',
            email_verified: false,
            role: 'owner',
            orgId: 'org-1',
            auth_time: 1_710_000_123.9,
            iat: 1_710_000_456.7,
            exp: 1_710_003_789.4,
            aud: 'custom-aud',
            iss: 'custom-iss',
            sub: 'custom-sub',
            firebase: { identities: {}, sign_in_provider: 'password' },
        } as TestToken);

        expect(token.auth_time).toBe(1_710_000_123);
        expect(token.iat).toBe(1_710_000_456);
        expect(token.exp).toBe(1_710_003_789);
        expect(token.email_verified).toBe(false);
        expect(token.aud).toBe('custom-aud');
        expect(token.iss).toBe('custom-iss');
        expect(token.sub).toBe('custom-sub');
        expect(token.brandId).toBe('org-1');
    });

    it('fills missing claims from the current time and explicit brand override', () => {
        jest.spyOn(Date, 'now').mockReturnValue(2_000_000_999_111);

        const token = buildSyntheticDecodedIdToken({
            uid: 'user-2',
            email: '',
            firebase: { identities: {}, sign_in_provider: 'custom' },
        } as TestToken, 'brand-9');

        expect(token.auth_time).toBe(2_000_000_999);
        expect(token.iat).toBe(2_000_000_999);
        expect(token.exp).toBe(2_000_004_599);
        expect(token.email_verified).toBe(true);
        expect(token.role).toBe('customer');
        expect(token.brandId).toBe('brand-9');
        expect(token.aud).toBe('bakedbot');
        expect(token.iss).toBe('https://securetoken.google.com/bakedbot');
        expect(token.sub).toBe('user-2');
    });
});
