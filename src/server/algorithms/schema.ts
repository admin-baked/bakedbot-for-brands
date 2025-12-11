/**
 * Algorithm Event Schema
 * Defines the structure of all algorithm-related events for instrumentation.
 * These events feed into the learning loops in Phase 2+.
 */

// --- Base Event Types ---

export type AlgorithmEventType =
    | 'smokey_rec'
    | 'smokey_feedback'
    | 'craig_send'
    | 'craig_engagement'
    | 'pops_metric'
    | 'deebo_decision';

export interface AlgorithmEventBase {
    event_id: string;
    event_type: AlgorithmEventType;
    brand_id: string;
    timestamp: string; // ISO 8601
    session_id?: string;
    user_id?: string;
}

// --- Smokey Events ---

export interface SmokeyRecEvent extends AlgorithmEventBase {
    event_type: 'smokey_rec';
    payload: {
        query: string;
        user_context: {
            intent?: string;
            tolerance_level?: 'low' | 'medium' | 'high';
            preferred_effects?: string[];
            price_preference?: 'budget' | 'mid' | 'premium';
        };
        skus_considered: string[]; // SKU IDs
        skus_ranked: Array<{
            sku_id: string;
            score: number;
            rank: number;
        }>;
        skus_shown: string[]; // Final picks sent to user
        scoring_weights: ScoringWeights;
    };
}

export interface SmokeyFeedbackEvent extends AlgorithmEventBase {
    event_type: 'smokey_feedback';
    payload: {
        recommendation_event_id: string; // Links to SmokeyRecEvent
        sku_id: string;
        action: 'click' | 'add_to_cart' | 'purchase' | 'thumbs_up' | 'thumbs_down' | 'dismiss';
        value?: number; // e.g., purchase amount
    };
}

// --- Craig Events ---

export interface CraigSendEvent extends AlgorithmEventBase {
    event_type: 'craig_send';
    payload: {
        campaign_id: string;
        segment_id: string;
        variant_id: string; // Subject/creative variant
        send_time: string; // ISO 8601
        priority_score: number;
        recipient_count: number;
    };
}

export interface CraigEngagementEvent extends AlgorithmEventBase {
    event_type: 'craig_engagement';
    payload: {
        campaign_id: string;
        variant_id: string;
        action: 'open' | 'click' | 'unsubscribe' | 'conversion';
        value?: number;
    };
}

// --- Pops Events ---

export interface PopsMetricEvent extends AlgorithmEventBase {
    event_type: 'pops_metric';
    payload: {
        metric_name: string;
        value: number;
        dimensions: {
            store_id?: string;
            category?: string;
            sku_id?: string;
            period?: 'hourly' | 'daily' | 'weekly';
        };
        is_anomaly?: boolean;
        anomaly_deviation_pct?: number;
    };
}

// --- Deebo Events ---

export interface DeeboDecisionEvent extends AlgorithmEventBase {
    event_type: 'deebo_decision';
    payload: {
        content_hash: string;
        content_type: 'message' | 'campaign' | 'recommendation';
        rule_pack_id: string;
        rule_pack_version: string;
        decision: 'pass' | 'fail' | 'warn';
        violated_rules?: string[];
        risk_score: number;
    };
}

// --- Union Type ---

export type AlgorithmEvent =
    | SmokeyRecEvent
    | SmokeyFeedbackEvent
    | CraigSendEvent
    | CraigEngagementEvent
    | PopsMetricEvent
    | DeeboDecisionEvent;

// --- Scoring Types ---

export interface ScoringWeights {
    effect_match: number;
    chemotype_match: number;
    business_score: number;
    risk_penalty: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
    effect_match: 0.35,
    chemotype_match: 0.25,
    business_score: 0.25,
    risk_penalty: 0.15,
};

// --- Campaign Priority Types ---

export interface CampaignPriorityInput {
    campaign_id: string;
    impact_score: number;    // 0-100: Projected revenue/margin impact
    urgency_score: number;   // 0-100: Time sensitivity (1=low, 100=critical)
    fatigue_score: number;   // 0-100: How "spammed" the segment is
}

// --- Anomaly Detection Types ---

export interface AnomalyResult {
    is_anomaly: boolean;
    deviation_pct: number;
    direction: 'up' | 'down' | 'stable';
    baseline_value: number;
    current_value: number;
    threshold_used: number;
}
