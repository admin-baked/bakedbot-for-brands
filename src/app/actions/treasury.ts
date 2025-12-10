'use server';

import { treasuryMemory } from '@/treasury/memory/adapter';
import { revalidatePath } from 'next/cache';

export async function getTreasuryOverview() {
    // In a real implementation, we would add AUTH check here
    // e.g. if (!isSuperAdmin()) throw new Error("Unauthorized");

    try {
        const memory = await treasuryMemory.read();

        // Mock Snapshot for visualization (since we don't have real live portfolio data yet)
        const mockSnapshot = {
            totalPortfolioUsd: 125000,
            runwayMonths: 14.5,
            riskBucketUsagePct: {
                green: 12, // Cap 20
                yellow: 8, // Cap 15
                red: 0     // Cap 5
            }
        };

        return {
            success: true,
            data: {
                policy: memory.allocation_policy,
                strategies: memory.strategy_registry,
                snapshot: mockSnapshot,
                updatedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Failed to fetch treasury overview:', error);
        return { success: false, error: 'Failed to fetch treasury data' };
    }
}
