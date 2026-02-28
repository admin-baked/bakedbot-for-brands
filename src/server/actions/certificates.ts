/**
 * Certificate Server Actions
 *
 * Generate, verify, and manage training certificates
 */

'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';
import {
    generateCertificatePDF,
    checkCertificateEligibility,
    createCertificateMetadata,
    type CertificateOptions,
    type CertificateMetadata,
} from '@/lib/certificates/generator';
import type { UserTrainingProgress, TrainingCohort } from '@/types/training';

export type ActionResult<T = any> =
    | { success: true; data: T }
    | { success: false; error: string };

function isSuperRole(role: unknown): boolean {
    if (Array.isArray(role)) {
        return role.includes('super_user') || role.includes('super_admin');
    }
    return role === 'super_user' || role === 'super_admin';
}

function isValidDocId(id: string): boolean {
    return !!id && !id.includes('/');
}

/**
 * Generate certificate for user
 */
export async function generateCertificate(userId?: string): Promise<ActionResult<{
    certificateId: string;
    certificateUrl: string;
}>> {
    try {
        const user = await requireUser(['intern', 'super_user']);

        const requestedUserId = userId?.trim();
        const targetUserId = requestedUserId || user.uid;
        const isSuperUser = isSuperRole((user as { role?: unknown }).role);

        if (!isValidDocId(targetUserId)) {
            return { success: false, error: 'Invalid user id' };
        }

        if (targetUserId !== user.uid && !isSuperUser) {
            return { success: false, error: 'Unauthorized' };
        }

        const db = getAdminFirestore();

        // Get user progress
        const progressDoc = await db
            .collection('users')
            .doc(targetUserId)
            .collection('training')
            .doc('current')
            .get();

        if (!progressDoc.exists) {
            return { success: false, error: 'User not enrolled in training' };
        }

        const progress = progressDoc.data() as UserTrainingProgress;

        // Check if already has certificate
        if (progress.certificateEarned && progress.certificateUrl) {
            return {
                success: true,
                data: {
                    certificateId: progress.certificateUrl.split('/').pop()?.split('.')[0] || '',
                    certificateUrl: progress.certificateUrl,
                },
            };
        }

        // Check eligibility
        const eligibility = checkCertificateEligibility(progress);
        if (!eligibility.eligible) {
            return {
                success: false,
                error: `Not eligible for certificate:\n${eligibility.reasons.join('\n')}`,
            };
        }

        // Get user details
        const userDoc = await db.collection('users').doc(targetUserId).get();
        const userData = userDoc.data();

        // Get cohort details
        const cohortDoc = await db.collection('trainingCohorts').doc(progress.cohortId).get();
        const cohort = cohortDoc.data() as TrainingCohort;

        // Prepare certificate options
        const options: CertificateOptions = {
            userId: targetUserId,
            userName: userData?.displayName || userData?.email?.split('@')[0] || 'Intern',
            userEmail: userData?.email || '',
            cohortName: cohort.name,
            cohortStartDate: new Date(cohort.startDate.seconds * 1000),
            cohortEndDate: new Date(cohort.endDate.seconds * 1000),
            completedChallenges: progress.completedChallenges,
        };

        // Generate PDF
        logger.info('[Certificate] Generating PDF', { userId: targetUserId });
        const pdfBuffer = await generateCertificatePDF(options);

        // Upload to Firebase Storage
        const bucket = getStorage().bucket();
        const certificateId = `${targetUserId}-${Date.now()}`;
        const filePath = `certificates/${targetUserId}/${certificateId}.pdf`;
        const file = bucket.file(filePath);

        await file.save(pdfBuffer, {
            metadata: {
                contentType: 'application/pdf',
                cacheControl: 'public, max-age=31536000',
            },
        });

        // Make publicly accessible
        await file.makePublic();

        const certificateUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        // Create certificate metadata
        const metadata = createCertificateMetadata(options, progress, certificateId);

        // Store metadata in Firestore
        await db.collection('certificates').doc(certificateId).set({
            ...metadata,
            createdAt: Timestamp.now(),
        });

        // Update user progress
        await progressDoc.ref.update({
            certificateEarned: true,
            certificateIssuedAt: Timestamp.now(),
            certificateUrl,
            updatedAt: Timestamp.now(),
        });

        logger.info('[Certificate] Generated successfully', {
            userId: targetUserId,
            certificateId,
        });

        return {
            success: true,
            data: {
                certificateId,
                certificateUrl,
            },
        };
    } catch (error) {
        logger.error('[Certificate] Generation failed', { error });
        return {
            success: false,
            error: 'Failed to generate certificate',
        };
    }
}

/**
 * Verify certificate by ID
 */
export async function verifyCertificate(certificateId: string): Promise<ActionResult<CertificateMetadata>> {
    try {
        const normalizedCertificateId = certificateId.trim();
        if (!isValidDocId(normalizedCertificateId)) {
            return { success: false, error: 'Invalid certificate id' };
        }

        const db = getAdminFirestore();

        const certDoc = await db.collection('certificates').doc(normalizedCertificateId).get();

        if (!certDoc.exists) {
            return { success: false, error: 'Certificate not found' };
        }

        const metadata = certDoc.data() as CertificateMetadata & { createdAt: Timestamp };

        return {
            success: true,
            data: {
                ...metadata,
                issueDate: new Date(metadata.issueDate),
            } as CertificateMetadata,
        };
    } catch (error) {
        logger.error('[Certificate] Verification failed', { error });
        return { success: false, error: 'Failed to verify certificate' };
    }
}

/**
 * Check certificate eligibility for current user
 */
export async function checkMyCertificateEligibility(): Promise<ActionResult<{
    eligible: boolean;
    reasons: string[];
    progress: {
        completedChallenges: number;
        totalChallenges: number;
        approvalRate: number;
        reviewsCompleted: number;
    };
}>> {
    try {
        const user = await requireUser(['intern', 'super_user']);
        const db = getAdminFirestore();

        const progressDoc = await db
            .collection('users')
            .doc(user.uid)
            .collection('training')
            .doc('current')
            .get();

        if (!progressDoc.exists) {
            return { success: false, error: 'Not enrolled in training' };
        }

        const progress = progressDoc.data() as UserTrainingProgress;

        const eligibility = checkCertificateEligibility(progress);

        const approvalRate = progress.totalSubmissions > 0
            ? (progress.acceptedSubmissions / progress.totalSubmissions) * 100
            : 0;

        return {
            success: true,
            data: {
                eligible: eligibility.eligible,
                reasons: eligibility.reasons,
                progress: {
                    completedChallenges: progress.completedChallenges.length,
                    totalChallenges: 40, // Total challenges in program
                    approvalRate: Math.round(approvalRate),
                    reviewsCompleted: progress.reviewsCompleted,
                },
            },
        };
    } catch (error) {
        logger.error('[Certificate] Eligibility check failed', { error });
        return { success: false, error: 'Failed to check eligibility' };
    }
}

/**
 * Get my certificate
 */
export async function getMyCertificate(): Promise<ActionResult<{
    certificateUrl: string;
    certificateId: string;
    issuedAt: Date;
}>> {
    try {
        const user = await requireUser(['intern', 'super_user']);
        const db = getAdminFirestore();

        const progressDoc = await db
            .collection('users')
            .doc(user.uid)
            .collection('training')
            .doc('current')
            .get();

        if (!progressDoc.exists) {
            return { success: false, error: 'Not enrolled in training' };
        }

        const progress = progressDoc.data() as UserTrainingProgress;

        if (!progress.certificateEarned || !progress.certificateUrl) {
            return { success: false, error: 'Certificate not yet earned' };
        }

        return {
            success: true,
            data: {
                certificateUrl: progress.certificateUrl,
                certificateId: progress.certificateUrl.split('/').pop()?.split('.')[0] || '',
                issuedAt: progress.certificateIssuedAt
                    ? new Date(progress.certificateIssuedAt.seconds * 1000)
                    : new Date(),
            },
        };
    } catch (error) {
        logger.error('[Certificate] Failed to get certificate', { error });
        return { success: false, error: 'Failed to get certificate' };
    }
}
