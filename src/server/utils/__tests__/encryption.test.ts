describe('Encryption Utils', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('encrypts and decrypts a string correctly', async () => {
        process.env.TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
        const { encrypt, decrypt } = await import('../encryption');

        const text = 'Hello World';
        const encrypted = encrypt(text);
        expect(encrypted).not.toBe(text);
        expect(encrypted).toContain(':');

        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(text);
    });

    it('produces different outputs for same input due to random IV', async () => {
        process.env.TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
        const { encrypt, decrypt } = await import('../encryption');

        const text = 'Secret Metadata';
        const enc1 = encrypt(text);
        const enc2 = encrypt(text);
        expect(enc1).not.toBe(enc2);

        expect(decrypt(enc1)).toBe(text);
        expect(decrypt(enc2)).toBe(text);
    });

    it('supports variable-length secrets by hashing to a 32-byte key', async () => {
        process.env.TOKEN_ENCRYPTION_KEY = 'short-dev-key';
        const { encrypt, decrypt } = await import('../encryption');

        const text = 'hello';
        const encrypted = encrypt(text);
        expect(decrypt(encrypted)).toBe(text);
    });

    it('throws when TOKEN_ENCRYPTION_KEY is missing', async () => {
        delete process.env.TOKEN_ENCRYPTION_KEY;
        const { encrypt } = await import('../encryption');

        expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY is required');
    });

    it('rejects malformed encrypted payloads', async () => {
        process.env.TOKEN_ENCRYPTION_KEY = '12345678901234567890123456789012';
        const { decrypt } = await import('../encryption');

        expect(() => decrypt('not-a-valid-payload')).toThrow('Invalid encrypted payload');
    });
});
