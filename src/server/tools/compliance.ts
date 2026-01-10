import { verifyLicense, checkBankingStatus } from '@/server/services/green-check';

export const ComplianceTools = {
    verifyLicense: async (licenseNumber: string, state: string) => {
        const result = await verifyLicense(licenseNumber, state);
        return {
            status: result.status,
            issues: result.issues
        };
    },

    checkBanking: async (entityId: string) => {
        return await checkBankingStatus(entityId);
    }
};
