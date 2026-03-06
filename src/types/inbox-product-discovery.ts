export type InboxProductDiscoveryMode = 'recommend_products' | 'bundle_ideas';

export type InboxProductDiscoveryActionKind = 'bundle';

export interface InboxRecommendedProduct {
    productId: string;
    productName: string;
    reasoning: string;
}

export interface InboxBundleIdeaProduct {
    id: string;
    name: string;
    category: string;
    price: number;
}

export interface InboxBundleIdea {
    name: string;
    description: string;
    savingsPercent: number;
    badgeText?: string;
    marginImpact?: number;
    products: InboxBundleIdeaProduct[];
}

export interface InboxProductDiscoveryAction {
    kind: InboxProductDiscoveryActionKind;
    label: string;
    prompt: string;
}

export interface InboxProductDiscoveryInsight {
    mode: InboxProductDiscoveryMode;
    title: string;
    summary: string;
    overallReasoning: string;
    recommendedProducts?: InboxRecommendedProduct[];
    bundleIdeas?: InboxBundleIdea[];
    actions?: InboxProductDiscoveryAction[];
}

export interface GenerateInboxProductDiscoveryInput {
    orgId: string;
    mode: InboxProductDiscoveryMode;
    prompt?: string;
    customerHistory?: string;
}
