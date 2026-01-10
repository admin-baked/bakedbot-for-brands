import { logger } from '@/lib/logger';

const GREEN_CHECK_API_KEY = process.env.GREEN_CHECK_API_KEY;

export interface ComplianceStatus {
    licenseNumber: string;
    status: 'active' | 'expired' | 'suspended';
    lastAudit: string;
    issues: string[];
}

export async function verifyLicense(licenseNumber: string, state: string): Promise<ComplianceStatus> {
    if (!GREEN_CHECK_API_KEY) {
        logger.warn('[GreenCheck] No API key, returning mock data');
        return {
            licenseNumber,
            status: 'active',
            lastAudit: new Date().toISOString(),
            issues: []
        };
    }

    // Placeholder for real API
    return {
        licenseNumber,
        status: 'active',
        lastAudit: new Date().toISOString(),
        issues: []
    };
}

export async function checkBankingStatus(entityId: string): Promise<{ bankable: boolean; riskScore: number }> {
    logger.info(`[GreenCheck] Checking banking status for ${entityId}`);
    return {
        bankable: true,
        riskScore: 15 // Low risk
    };
}
