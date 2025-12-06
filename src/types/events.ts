import { FieldValue } from 'firebase-admin/firestore';

export type ActivityType =
    | 'message_sent'
    | 'recommendation_viewed'
    | 'product_synced'
    | 'automation_triggered'
    | 'settings_changed'
    | 'user_login';

export interface ActivityEvent {
    id: string;
    orgId: string;
    userId: string; // Actor
    userName?: string; // Denormalized for display
    type: ActivityType;
    description: string;
    metadata?: Record<string, any>; // e.g. { productId: '123' }
    createdAt: any; // Timestamp
}

export type UsageMetric = 'messages' | 'recommendations' | 'api_calls';

export interface UsageRecord {
    orgId: string;
    metric: UsageMetric;
    period: string; // YYYY-MM (Monthly metering)
    count: number;
    updatedAt: any;
}

export interface UsageSummary {
    messages: number;
    recommendations: number;
    apiCalls: number;
    limitMessages: number; // For progress bars
}
