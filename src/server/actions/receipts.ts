'use server';

import { createServerClient } from '@/firebase/server-client';
import { ReceiptScanner, ExtractedReceipt } from '@/server/services/vision/receipt-scanner';
import { getPassportAction } from './passport';
import { getMembershipAction, joinOrganizationAction } from './membership';
import { getTenantBySlugAction } from './tenant'; // We might need to find org by name

export async function processReceiptAction(imageUrl: string): Promise<{ success: boolean; data?: ExtractedReceipt; pointsEarned?: number; error?: string }> {
    const passport = await getPassportAction();
    if (!passport) {
        return { success: false, error: 'Please log in to scan receipts.' };
    }

    try {
        // 1. Scan Receipt
        const receipt = await ReceiptScanner.scan(imageUrl);
        
        if (!receipt) {
            return { success: false, error: 'Could not recognize receipt.' };
        }

        // 2. Resolve Dispensary (Simplistic matching for prototype)
        // In real world, we'd use address/fuzzy text matching against our database.
        // For now, we just pass the extracted name.
        
        // 3. Award Points (Simulated)
        // Points = $1 spent = 1 point
        const points = Math.floor(receipt.totalAmount);

        // 4. Save Record
        // We'd save this to `users/{uid}/receipts` and update points in `organizations/{orgId}/customers/{profileId}` if we matched the org.
        
        return { success: true, data: receipt, pointsEarned: points };
        
    } catch (error: any) {
        console.error('Process Receipt Error:', error);
        return { success: false, error: error.message || 'Scanning processing failed.' };
    }
}
