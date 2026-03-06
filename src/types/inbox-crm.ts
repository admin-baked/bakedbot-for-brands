export type InboxCrmWorkflow =
    | 'winback'
    | 'birthday'
    | 'vip'
    | 'segment_analysis'
    | 'restock'
    | 'comms_review';

export type InboxCrmActionKind = 'campaign' | 'outreach' | 'performance';

export interface InboxCrmMetric {
    label: string;
    value: string;
    tone?: 'neutral' | 'good' | 'warning';
}

export interface InboxCrmCustomerInsight {
    id: string;
    name: string;
    email?: string;
    segment?: string;
    totalSpent?: number;
    daysSinceLastOrder?: number;
    birthday?: string;
    daysAway?: number;
}

export interface InboxCrmCampaignInsight {
    id: string;
    name: string;
    goal?: string;
    channels?: string[];
    status?: string;
    sent?: number;
    openRate?: number;
    clickRate?: number;
    revenue?: number;
}

export interface InboxCrmActionSuggestion {
    kind: InboxCrmActionKind;
    label: string;
    prompt: string;
}

export interface InboxCrmInsight {
    workflow: InboxCrmWorkflow;
    title: string;
    summary: string;
    metrics: InboxCrmMetric[];
    customers?: InboxCrmCustomerInsight[];
    campaigns?: InboxCrmCampaignInsight[];
    actions: InboxCrmActionSuggestion[];
}

export interface GenerateInboxCrmInsightInput {
    orgId: string;
    workflow: InboxCrmWorkflow;
    prompt?: string;
    customerId?: string;
    customerEmail?: string;
}
