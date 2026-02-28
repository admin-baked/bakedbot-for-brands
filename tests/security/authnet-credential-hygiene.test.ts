import fs from 'fs';
import path from 'path';

describe('AuthNet credential hygiene regression guards', () => {
    it('keeps apphosting AuthNet secret references on @latest', () => {
        const source = fs.readFileSync(path.join(process.cwd(), 'apphosting.yaml'), 'utf-8');

        expect(source).toContain('- variable: AUTHNET_API_LOGIN_ID');
        expect(source).toContain('secret: AUTHNET_API_LOGIN_ID@latest');
        expect(source).toContain('- variable: AUTHNET_TRANSACTION_KEY');
        expect(source).toContain('secret: AUTHNET_TRANSACTION_KEY@latest');
        expect(source).toContain('- variable: AUTHNET_SIGNATURE_KEY');
        expect(source).toContain('secret: AUTHNET_SIGNATURE_KEY@latest');
        expect(source).toContain('- variable: NEXT_PUBLIC_AUTHNET_API_LOGIN_ID');
        expect(source).toContain('secret: AUTHNET_API_LOGIN_ID@latest');
    });

    it('does not hardcode AuthNet credential values in setup scripts', () => {
        const createScript = fs.readFileSync(
            path.join(process.cwd(), 'scripts/create-authnet-secrets.ps1'),
            'utf-8'
        );
        const setupScript = fs.readFileSync(
            path.join(process.cwd(), 'scripts/setup-authnet-secrets.ps1'),
            'utf-8'
        );

        // Prevent old leaked literals from ever returning.
        expect(createScript).not.toContain('3F9PchQ873');
        expect(createScript).not.toContain('3vfV77648dCYw4pf');

        // Reject direct string assignments like: $FOO = "secret-value"
        expect(createScript).not.toMatch(/\$(?:API_LOGIN_ID|TRANSACTION_KEY|SIGNATURE_KEY)\s*=\s*['"][^'"]+['"]/);
        expect(createScript).not.toMatch(/\$(?:ApiLoginId|TransactionKey|SignatureKey)\s*=\s*['"][^'"]+['"]/);
        expect(setupScript).not.toMatch(/\$(?:apiLoginId|transactionKey)\s*=\s*['"][^'"]+['"]/);
    });
});

