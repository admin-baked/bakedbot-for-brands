import { alpineClient } from '@/server/integrations/alpine-iq/client';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { CustomerProfile } from '@/types/customers';

export const LoyaltyTools = {
    /**
     * Check loyalty points from both sources (hybrid system)
     * Returns calculated points from orders + Alpine IQ points
     */
    checkPoints: async (phone: string, orgId?: string) => {
        try {
            // 1. Fetch Alpine IQ profile (source of truth)
            const alpineProfile = await alpineClient.getLoyaltyProfile(phone);

            // 2. If orgId provided, fetch calculated points from Firestore
            let calculated: {
                points: number;
                tier: string;
                source: string;
            } | undefined;

            if (orgId) {
                const firestore = getAdminFirestore();

                // Find customer by phone
                const customersRef = firestore
                    .collection('customers')
                    .where('orgId', '==', orgId)
                    .where('phone', '==', phone)
                    .limit(1);

                const snapshot = await customersRef.get();

                if (!snapshot.empty) {
                    const customerData = snapshot.docs[0].data() as CustomerProfile;

                    calculated = {
                        points: customerData.pointsFromOrders || 0,
                        tier: customerData.tier,
                        source: 'orders'
                    };
                }
            }

            // 3. Return combined data
            if (!alpineProfile && !calculated) {
                throw new Error('Customer not found in any system');
            }

            const response: {
                primary: {
                    points: number;
                    tier: string;
                    source: string;
                    lastVisit?: string;
                };
                calculated?: {
                    points: number;
                    tier: string;
                    source: string;
                };
                reconciliation?: {
                    reconciled: boolean;
                    discrepancy: number;
                    needsReview: boolean;
                };
            } = {
                primary: alpineProfile
                    ? {
                          points: alpineProfile.points,
                          tier: alpineProfile.tier,
                          source: 'alpine_iq',
                          lastVisit: alpineProfile.lastVisit
                      }
                    : {
                          points: calculated!.points,
                          tier: calculated!.tier,
                          source: 'calculated'
                      }
            };

            // Add calculated data if both exist
            if (alpineProfile && calculated) {
                response.calculated = calculated;

                // Calculate discrepancy
                const discrepancy = Math.abs(alpineProfile.points - calculated.points);
                const discrepancyPercent = alpineProfile.points > 0
                    ? discrepancy / alpineProfile.points
                    : 0;

                response.reconciliation = {
                    reconciled: discrepancyPercent <= 0.10, // 10% threshold
                    discrepancy,
                    needsReview: discrepancyPercent > 0.10
                };
            }

            return response;

        } catch (error) {
            logger.error('[LoyaltyTools] Failed to check points', {
                phone,
                orgId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw error;
        }
    },

    /**
     * Send SMS via Blackleaf
     */
    sendSms: async (phone: string, message: string) => {
        const success = await blackleafService.sendCustomMessage(phone, message);
        return { success };
    }
};
