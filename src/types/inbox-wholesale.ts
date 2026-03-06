export type InboxWholesaleActionKind = 'outreach';

export interface InboxWholesaleProduct {
    id: string;
    name: string;
    brand?: string;
    sku?: string;
    inventory: number;
    stockStatus: 'low' | 'available' | 'strong';
}

export interface InboxWholesaleAction {
    kind: InboxWholesaleActionKind;
    label: string;
    prompt: string;
}

export interface InboxWholesaleInventoryInsight {
    title: string;
    summary: string;
    totalSkus: number;
    totalUnits: number;
    lowStockCount: number;
    strongAvailabilityCount: number;
    products: InboxWholesaleProduct[];
    actions: InboxWholesaleAction[];
}

export interface GenerateInboxWholesaleInventoryInput {
    orgId: string;
    prompt?: string;
    limit?: number;
}
