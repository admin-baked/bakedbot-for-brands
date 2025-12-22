import { encrypt, decrypt } from '../encryption';

describe('Encryption Utils', () => {
    // Save original env
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should encrypt and decrypt a string correctly', () => {
        const text = 'Hello World';
        const encrypted = encrypt(text);
        expect(encrypted).not.toBe(text);
        expect(encrypted).toContain(':'); // IV separator

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(text);
    });

    it('should produce different outputs for same input due to random IV', () => {
        const text = 'Secret Metadata';
        const enc1 = encrypt(text);
        const enc2 = encrypt(text);
        expect(enc1).not.toBe(enc2);

        expect(decrypt(enc1)).toBe(text);
        expect(decrypt(enc2)).toBe(text);
    });

    it('should handle empty strings', () => {
        const text = '';
        const encrypted = encrypt(text);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(text);
    });
});
