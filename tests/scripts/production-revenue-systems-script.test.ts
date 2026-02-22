import fs from 'fs';
import path from 'path';

describe('Production revenue systems script defaults (2026-02-21)', () => {
    const scriptPath = path.join(
        process.cwd(),
        'scripts/test-production-revenue-systems.mjs',
    );
    const source = fs.readFileSync(scriptPath, 'utf-8');

    it('keeps org and App Hosting base URL defaults', () => {
        expect(source).toContain("const ORG_ID = args.org || 'org_thrive_syracuse';");
        expect(source).toContain(
            "const BASE_URL = args.url || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';",
        );
        expect(source).not.toContain("args.url || 'https://bakedbot.ai'");
    });

    it('targets the expected production cron endpoints', () => {
        expect(source).toContain('/api/cron/bundle-transitions');
        expect(source).toContain('/api/cron/churn-prediction?secret=');
        expect(source).toContain('process.env.CRON_SECRET');
    });
});
