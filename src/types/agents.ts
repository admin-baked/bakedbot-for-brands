import { Timestamp } from 'firebase/firestore';

export type UserInteraction = {
    id: string;
    brandId: string;
    userId: string;
    interactionDate: Timestamp;
    query: string;
    recommendedProductIds?: string[];
};

export type Agent =
    | 'smokey'
    | 'reach'
    | 'craig'
    | 'pops'
    | 'ezal'
    | 'mrs_parker'
    | 'money_mike'
    | 'deebo';

export type EventType =
    | 'reach.entry'
    | 'recommendation.shown'
    | 'cart.updated'
    | 'checkout.started'
    | 'checkout.intentCreated'
    | 'checkout.paid'
    | 'checkout.failed'
    | 'order.readyForPickup'
    | 'order.completed'
    | 'subscription.planSelected'
    | 'subscription.paymentAuthorized'
    | 'subscription.updated'
    | 'subscription.failed';

export type AppEvent = {
    id: string;
    type: EventType;
    agent: Agent | 'system';
    orgId: string;
    refId: string | null;
    data: any;
    timestamp: Timestamp;
};

export type Jurisdiction = {
    id: string;
    name: string;
    type: 'state' | 'federal' | 'messaging_standard';
    status: 'active' | 'pending' | 'sunset';
    default_channels: string[];
};

export type RegulationSource = {
    id: string;
    jurisdiction_id: string;
    title: string;
    source_type: 'pdf_upload' | 'pdf_url' | 'html_url';
    url?: string;
    file_path?: string;
    effective_date: Timestamp;
    last_amended_date: Timestamp;
    canonical: boolean;
    topics: string[];
    hash: string;
    // Adding missing properties inferred from original file if any, but looks complete
};

export type ComplianceRule = {
    id: string;
    jurisdiction_id: string;
    source_id: string;
    category: 'marketing' | 'age_verification' | 'packaging_labeling' | 'pos' | 'delivery' | 'testing' | 'recordkeeping';
    channel: 'web' | 'sms' | 'email' | 'social' | 'billboard';
    severity: 'block' | 'warn' | 'info';
    condition: Record<string, any>;
    constraint: Record<string, any>;
    message_template: string;
    effective_date: Timestamp;
    sunset_date?: Timestamp;
    version: number;
};

export type RulePack = {
    id: string;
    jurisdiction_id: string;
    name: string;
    channels: string[];
    categories: string[];
    rule_ids: string[];
    model_version?: string;
    status: 'draft' | 'active' | 'deprecated';
    created_by: string;
    approved_by?: string;
};

export type PlaybookDraft = {
    id: string;
    name: string;
    description: string;
    type: 'signal' | 'automation';
    agents: string[];
    signals: string[];
    targets: string[];
    constraints: string[];
};

export type PlaybookKind = 'signal' | 'automation';

export type Playbook = {
    id: string;
    brandId: string;
    name: string;
    description?: string;
    kind: PlaybookKind;
    tags: string[];
    enabled: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};
