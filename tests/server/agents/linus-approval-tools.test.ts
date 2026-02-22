import fs from 'fs';
import path from 'path';

describe('Linus approval tool wiring (Phase 3)', () => {
    const linusPath = path.join(process.cwd(), 'src/server/agents/linus.ts');
    const linusSource = fs.readFileSync(linusPath, 'utf-8');

    it('implements create_approval_request tool case using approval queue service', () => {
        expect(linusSource).toContain("case 'create_approval_request'");
        expect(linusSource).toContain('createApprovalRequest(');
        expect(linusSource).toContain("'linus-agent'");
        expect(linusSource).toContain('estimatedMonthlyCost');
        expect(linusSource).toContain('estimatedCost');
        expect(linusSource).toContain('dashboard/linus-approvals?request=');
    });

    it('implements check_approval_status tool case with status-specific messages', () => {
        expect(linusSource).toContain("case 'check_approval_status'");
        expect(linusSource).toContain('getApprovalRequest(requestId)');
        expect(linusSource).toContain('Awaiting Super User approval');
        expect(linusSource).toContain('Approved. Ready to execute.');
        expect(linusSource).toContain('Executed successfully');
        expect(linusSource).toContain('Execution failed');
    });
});
