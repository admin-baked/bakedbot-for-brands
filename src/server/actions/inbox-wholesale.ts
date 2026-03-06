'use server';

import { z } from 'zod';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { requireUser } from '@/server/auth/auth';
import { leaflinkAction } from '@/server/tools/leaflink';
import { logger } from '@/lib/logger';
import type {
    GenerateInboxWholesaleInventoryInput,
    InboxWholesaleInventoryInsight,
    InboxWholesaleProduct,
} from '@/types/inbox-wholesale';

const GenerateInboxWholesaleInventoryInputSchema = z.object({
    orgId: z.string().min(3).max(128).refine((value) => !/[\/\\?#\[\]]/.test(value), 'Invalid organization ID'),
    prompt: z.string().max(1000).optional(),
    limit: z.number().int().min(5).max(50).optional(),
});

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function getActorOrgId(user: unknown): string | null {
    if (!user || typeof user !== 'object') return null;
    const token = user as {
        currentOrgId?: string;
        orgId?: string;
        brandId?: string;
        tenantId?: string;
        organizationId?: string;
    };
    return token.currentOrgId || token.orgId || token.brandId || token.tenantId || token.organizationId || null;
}

function assertOrgAccess(user: unknown, orgId: string): void {
    const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
    if (isSuperRole(role)) {
        return;
    }

    const actorOrgId = getActorOrgId(user);
    if (!actorOrgId || actorOrgId !== orgId) {
        throw new Error('Unauthorized');
    }
}

function deriveStockStatus(inventory: number): InboxWholesaleProduct['stockStatus'] {
    if (inventory <= 10) return 'low';
    if (inventory >= 50) return 'strong';
    return 'available';
}

function buildOutreachPrompt(prompt: string | undefined, products: InboxWholesaleProduct[]): string {
    const skuLines = products
        .slice(0, 8)
        .map((product) => `${product.name}${product.sku ? ` (${product.sku})` : ''} - ${product.inventory} units available`)
        .join('; ');

    const trimmedPrompt = prompt?.trim();
    if (trimmedPrompt) {
        return `Draft a wholesale availability outreach note for retail buyers. Focus on this angle: ${trimmedPrompt}. Use these live inventory highlights: ${skuLines}`;
    }

    return `Draft a wholesale availability outreach note for retail buyers using these live inventory highlights: ${skuLines}`;
}

function buildSummary(products: InboxWholesaleProduct[]): {
    totalUnits: number;
    lowStockCount: number;
    strongAvailabilityCount: number;
} {
    return products.reduce((acc, product) => {
        acc.totalUnits += product.inventory;
        if (product.stockStatus === 'low') acc.lowStockCount += 1;
        if (product.stockStatus === 'strong') acc.strongAvailabilityCount += 1;
        return acc;
    }, {
        totalUnits: 0,
        lowStockCount: 0,
        strongAvailabilityCount: 0,
    });
}

export async function generateInboxWholesaleInventoryInsight(
    input: GenerateInboxWholesaleInventoryInput
): Promise<{
    success: boolean;
    insight?: InboxWholesaleInventoryInsight;
    error?: string;
}> {
    try {
        const parsed = GenerateInboxWholesaleInventoryInputSchema.parse(input);
        const user = await requireUser();
        assertOrgAccess(user, parsed.orgId);

        const result = await leaflinkAction({
            action: 'list_products',
            limit: parsed.limit || 25,
        }, user as DecodedIdToken);

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(result.error || 'LeafLink inventory is unavailable.');
        }

        const products = result.data
            .map((item: Record<string, unknown>) => ({
                id: String(item.id || ''),
                name: String(item.name || 'Unnamed SKU'),
                brand: item.brand ? String(item.brand) : undefined,
                sku: item.sku ? String(item.sku) : undefined,
                inventory: typeof item.inventory === 'number' ? item.inventory : Number(item.inventory || 0),
            }))
            .filter((item) => item.id && item.name)
            .sort((a, b) => b.inventory - a.inventory)
            .map((item) => ({
                ...item,
                stockStatus: deriveStockStatus(item.inventory),
            })) as InboxWholesaleProduct[];

        if (products.length === 0) {
            throw new Error('No wholesale products were returned from LeafLink.');
        }

        const summary = buildSummary(products);

        return {
            success: true,
            insight: {
                title: 'Live Wholesale Inventory Snapshot',
                summary: `Loaded ${products.length} live SKUs from LeafLink. ${summary.strongAvailabilityCount} SKUs have deep availability and ${summary.lowStockCount} need allocation discipline before you pitch them hard.`,
                totalSkus: products.length,
                totalUnits: summary.totalUnits,
                lowStockCount: summary.lowStockCount,
                strongAvailabilityCount: summary.strongAvailabilityCount,
                products,
                actions: [
                    {
                        kind: 'outreach',
                        label: 'Open Outreach Draft',
                        prompt: buildOutreachPrompt(parsed.prompt, products),
                    },
                ],
            },
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load wholesale inventory';
        logger.error('[InboxWholesale] generateInboxWholesaleInventoryInsight failed', { error: message });
        return {
            success: false,
            error: message,
        };
    }
}
