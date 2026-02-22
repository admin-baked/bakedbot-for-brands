import fs from 'fs';
import path from 'path';

describe('Loyalty configuration scripts invariants (2026-02-21)', () => {
    const loyaltyScriptPath = path.join(process.cwd(), 'scripts/configure-loyalty-settings.mjs');
    const indexesScriptPath = path.join(process.cwd(), 'scripts/create-firestore-indexes.sh');

    const loyaltySource = fs.readFileSync(loyaltyScriptPath, 'utf-8');
    const indexesSource = fs.readFileSync(indexesScriptPath, 'utf-8');

    it('defaults to Thrive Syracuse and defines four loyalty tiers', () => {
        expect(loyaltySource).toContain("const ORG_ID = args.org || 'org_thrive_syracuse'");
        expect(loyaltySource).toContain("name: 'Bronze'");
        expect(loyaltySource).toContain("name: 'Silver'");
        expect(loyaltySource).toContain("name: 'Gold'");
        expect(loyaltySource).toContain("name: 'Platinum'");
    });

    it('keeps point accrual and redemption defaults intact', () => {
        expect(loyaltySource).toContain('pointsPerDollar: 1');
        expect(loyaltySource).toContain('dollarPerPoint: 0.01');
        expect(loyaltySource).toContain('minPointsToRedeem: 100');
        expect(loyaltySource).toContain('tierInactivityDays: 180');
    });

    it('keeps firestore index creation script targeting project and customer churn/tier fields', () => {
        expect(indexesSource).toContain('PROJECT_ID="studio-567050101-bc6e8"');
        expect(indexesSource).toContain('"fieldPath": "tierUpdatedAt"');
        expect(indexesSource).toContain('"fieldPath": "daysSinceLastOrder"');
        expect(indexesSource).toContain('firebase deploy --only firestore:indexes --project=$PROJECT_ID');
    });
});
