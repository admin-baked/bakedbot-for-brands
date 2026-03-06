export type InboxLaunchType = 'new_drop' | 'seasonal_promo' | 'restock_push' | 'event_tie_in';

export type InboxLaunchAudience =
    | 'all_customers'
    | 'vip_loyalty'
    | 'new_shoppers'
    | 'repeat_buyers'
    | 'budtenders';

export type InboxLaunchAssetType = 'carousel' | 'bundle' | 'image' | 'video' | 'campaign';

export interface InboxLaunchPlan {
    title: string;
    summary: string;
    launchTypeLabel: string;
    audienceLabel: string;
    launchWindow: string;
    offer: string;
    heroMessage: string;
    recommendedChannels: string[];
    timeline: string[];
    complianceNotes: string[];
    assetPrompts: Record<InboxLaunchAssetType, string>;
}

export interface GenerateInboxLaunchPlanInput {
    tenantId: string;
    brandId: string;
    createdBy: string;
    prompt: string;
    launchType: InboxLaunchType;
    audience: InboxLaunchAudience;
    brandName?: string;
}
