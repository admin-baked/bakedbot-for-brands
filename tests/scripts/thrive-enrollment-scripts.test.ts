import fs from 'fs';
import path from 'path';

function countPlaybooks(scriptContent: string): number {
    const match = scriptContent.match(/const EMPIRE_PLAYBOOKS = \[([\s\S]*?)\];/);
    if (!match) return 0;
    const arrayBody = match[1];
    const entries = arrayBody.match(/'[^']+'|"[^"]+"/g) || [];
    return entries.length;
}

describe('Thrive Syracuse enrollment scripts (2026-02-22)', () => {
    const enrollPath = path.join(process.cwd(), 'scripts/enroll-thrive-customers.mjs');
    const syncPath = path.join(process.cwd(), 'scripts/sync-and-enroll-thrive.mjs');
    const schedulerPath = path.join(process.cwd(), 'scripts/create-thrive-scheduler-jobs.sh');

    const enrollSource = fs.readFileSync(enrollPath, 'utf-8');
    const syncSource = fs.readFileSync(syncPath, 'utf-8');
    const schedulerSource = fs.readFileSync(schedulerPath, 'utf-8');

    it('defines Thrive Syracuse org and 22 Empire playbooks in enrollment scripts', () => {
        expect(enrollSource).toContain("const ORG_ID = 'org_thrive_syracuse'");
        expect(syncSource).toContain("const ORG_ID = 'org_thrive_syracuse'");

        expect(countPlaybooks(enrollSource)).toBe(22);
        expect(countPlaybooks(syncSource)).toBe(22);
        expect(enrollSource).toContain("'usage-alert'");
        expect(syncSource).toContain("'usage-alert'");
    });

    it('creates playbook assignments in paused state pending Mailjet setup', () => {
        expect(enrollSource).toContain("status: 'paused'");
        expect(syncSource).toContain("status: 'paused'");
        expect(enrollSource).toContain('Mailjet');
        expect(syncSource).toContain('Mailjet');
    });

    it('uses Firebase App Hosting URL format and defines all three Thrive scheduler jobs', () => {
        expect(schedulerSource).toContain('hosted.app');
        expect(schedulerSource).toContain('pos-sync-thrive');
        expect(schedulerSource).toContain('loyalty-sync-thrive');
        expect(schedulerSource).toContain('playbook-runner-thrive');
    });
});
