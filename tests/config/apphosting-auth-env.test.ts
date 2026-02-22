import fs from 'fs';
import path from 'path';

describe('App Hosting auth/env configuration invariants (2026-02-21)', () => {
    const apphostingPath = path.join(process.cwd(), 'apphosting.yaml');
    const source = fs.readFileSync(apphostingPath, 'utf-8');

    it('keeps Linus service account runtime secret configured', () => {
        expect(source).toContain('- variable: LINUS_SERVICE_ACCOUNT_KEY');
        expect(source).toContain('secret: LINUS_SERVICE_ACCOUNT_KEY@1');
        expect(source).toContain('Linus CTO Agent - Service Account');
    });

    it('keeps CRON_SECRET and FIREBASE_SERVICE_ACCOUNT_KEY wired through Secret Manager', () => {
        expect(source).toContain('- variable: CRON_SECRET');
        expect(source).toContain('secret: CRON_SECRET@6');
        expect(source).toContain('- variable: FIREBASE_SERVICE_ACCOUNT_KEY');
        expect(source).toContain('secret: FIREBASE_SERVICE_ACCOUNT_KEY@8');
    });
});
