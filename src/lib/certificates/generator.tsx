/**
 * Certificate Generator
 *
 * Generate PDF certificates for training program graduates
 */

import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { CertificateTemplate } from './template';
import type { UserTrainingProgress } from '@/types/training';

export interface CertificateOptions {
    userId: string;
    userName: string;
    userEmail: string;
    cohortName: string;
    cohortStartDate: Date;
    cohortEndDate: Date;
    completedChallenges: string[];
    certificateId?: string;
}

/**
 * Check if user is eligible for certificate
 */
export function checkCertificateEligibility(progress: UserTrainingProgress): {
    eligible: boolean;
    reasons: string[];
} {
    const reasons: string[] = [];

    // Minimum 30 challenges completed (75% of 40)
    if (progress.completedChallenges.length < 30) {
        reasons.push(`Need 30 completed challenges (have ${progress.completedChallenges.length})`);
    }

    // Minimum 70% approval rate
    const approvalRate = progress.totalSubmissions > 0
        ? (progress.acceptedSubmissions / progress.totalSubmissions) * 100
        : 0;

    if (approvalRate < 70) {
        reasons.push(`Need 70% approval rate (have ${approvalRate.toFixed(1)}%)`);
    }

    // Minimum 3 peer reviews (if peer review enabled)
    if (progress.reviewsCompleted < 3) {
        reasons.push(`Need 3 peer reviews completed (have ${progress.reviewsCompleted})`);
    }

    // Must be in completed or active status (not dropped/paused)
    if (progress.status === 'dropped' || progress.status === 'paused') {
        reasons.push(`Status must be active or completed (currently ${progress.status})`);
    }

    return {
        eligible: reasons.length === 0,
        reasons,
    };
}

/**
 * Extract skills from completed challenges
 */
function extractSkills(completedChallenges: string[]): string[] {
    const skillsMap: Record<string, boolean> = {};

    // Map challenges to skills
    const challengeSkills: Record<string, string[]> = {
        'week1-': ['TypeScript', 'Server Actions', 'Git'],
        'week2-': ['Firestore', 'Data Modeling', 'Zod Validation'],
        'week3-': ['React', 'UI Components', 'Framer Motion'],
        'week4-': ['API Routes', 'Webhooks', 'Email Integration'],
        'week5-': ['Testing', 'Jest', 'Quality Assurance'],
        'week6-': ['Agent Architecture', 'AI Integration'],
        'week7-': ['Letta Memory', 'RTRVR Automation'],
        'week8-': ['Full-Stack Development', 'System Design'],
    };

    for (const challengeId of completedChallenges) {
        for (const [prefix, skills] of Object.entries(challengeSkills)) {
            if (challengeId.startsWith(prefix)) {
                skills.forEach(skill => skillsMap[skill] = true);
            }
        }
    }

    return Object.keys(skillsMap);
}

/**
 * Generate certificate PDF
 */
export async function generateCertificatePDF(options: CertificateOptions): Promise<Buffer> {
    // Generate unique certificate ID
    const certificateId = options.certificateId || generateCertificateId();

    // Generate verification URL
    const verificationUrl = `https://bakedbot.ai/certificates/verify/${certificateId}`;

    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 200,
        margin: 1,
        color: {
            dark: '#667eea',
            light: '#ffffff',
        },
    });

    // Extract skills
    const skills = extractSkills(options.completedChallenges);

    // Prepare certificate data
    const certificateData = {
        userName: options.userName,
        cohortName: options.cohortName,
        startDate: options.cohortStartDate,
        endDate: options.cohortEndDate,
        certificateId,
        issueDate: new Date(),
        skills,
        verificationUrl,
        qrCodeDataUrl,
    };

    // Render PDF
    const pdfBuffer = await renderToBuffer(<CertificateTemplate data={certificateData} />);

    return pdfBuffer;
}

/**
 * Generate unique certificate ID
 */
function generateCertificateId(): string {
    const timestamp = Date.now().toString(36); // Base36 timestamp
    const random = Math.random().toString(36).substring(2, 8); // Random string
    return `CERT-${timestamp}-${random}`.toUpperCase();
}

/**
 * Get certificate metadata (for verification)
 */
export interface CertificateMetadata {
    certificateId: string;
    userId: string;
    userName: string;
    userEmail: string;
    cohortName: string;
    issueDate: Date;
    verificationUrl: string;
    skills: string[];
    completedChallenges: number;
    approvalRate: number;
}

/**
 * Create certificate metadata for storage
 */
export function createCertificateMetadata(
    options: CertificateOptions,
    progress: UserTrainingProgress,
    certificateId: string
): CertificateMetadata {
    const approvalRate = progress.totalSubmissions > 0
        ? (progress.acceptedSubmissions / progress.totalSubmissions) * 100
        : 0;

    return {
        certificateId,
        userId: options.userId,
        userName: options.userName,
        userEmail: options.userEmail,
        cohortName: options.cohortName,
        issueDate: new Date(),
        verificationUrl: `https://bakedbot.ai/certificates/verify/${certificateId}`,
        skills: extractSkills(options.completedChallenges),
        completedChallenges: progress.completedChallenges.length,
        approvalRate: Math.round(approvalRate),
    };
}
