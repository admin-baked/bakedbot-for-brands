import { ComplianceTools } from '@/server/tools/compliance';
import { verifyLicense, checkBankingStatus } from '@/server/services/green-check';

jest.mock('@/server/services/green-check', () => ({
    verifyLicense: jest.fn(),
    checkBankingStatus: jest.fn()
}));

describe('ComplianceTools', () => {
    it('should verify license', async () => {
        (verifyLicense as jest.Mock).mockResolvedValue({ status: 'active', issues: [] });
        const result = await ComplianceTools.verifyLicense({ licenseNumber: '123', state: 'CA' });
        expect(result.status).toBe('active');
    });

    it('should check banking', async () => {
        (checkBankingStatus as jest.Mock).mockResolvedValue({ bankable: true, riskScore: 10 });
        const result = await ComplianceTools.checkBanking({ entityId: 'abc' });
        expect(result.bankable).toBe(true);
    });
});
