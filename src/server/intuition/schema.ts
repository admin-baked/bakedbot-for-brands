/**
 * Intuition OS - Schema Definitions
 * 
 * Core types for the Four Intuition Loops:
 * - Loop 1: Agent Events (Raw Experience)
 * - Loop 2: Agent Memories (Summarized Knowledge)
 * - Loop 3: Heuristics (Fast Rules)
 * - Loop 4: Outcomes (Feedback for Evolution)
 */

// --- Agent Event Types (Loop 1) ---

export type AgentName =
    | 'smokey'      // Budtender - product recommendations
    | 'pops'        // Analytics - metrics and insights
    | 'deebo'       // Compliance - rule enforcement
    | 'craig'       // Marketing - campaigns
    | 'ezal'        // Competitive intel - lookout
    | 'money_mike'  // Pricing - revenue optimization
    | 'linus'       // CTO - system health, deployments
    | 'leo'         // COO - operations orchestration
    | 'jack'        // Sales - lead tracking, churn
    | 'glenda'      // Outreach - academy, vibe studio leads
    | 'openclaw'    // Communications - WhatsApp, Gmail, Calendar
    | 'mrs_parker'  // Customer success - birthdays, at-risk
    | 'day_day';    // Growth - forecasting, partnerships

export type AgentEventType =
    | 'message_in'
    | 'message_out'
    | 'recommendation_shown'
    | 'product_clicked'
    | 'order_completed'
    | 'feedback'
    | 'metric_snapshot'         // Pops
    | 'rule_check'              // Deebo
    | 'alert_issued'
    | 'task_started'
    | 'task_completed';

export interface AgentEvent {
    id: string;
    tenantId: string;

    agent: AgentName;
    sessionId: string;           // stable per chat/task session
    actorId?: string;            // userId, customerId, employeeId, system
    customerId?: string;         // optional for Smokey

    type: AgentEventType;

    payload: Record<string, any>; // keep bounded; large blobs elsewhere
    createdAt: string; // ISO 8601 (Firestore Timestamp in transit)

    // Dual-system metadata
    systemMode?: 'fast' | 'slow';
    confidenceScore?: number;     // 0..1
    traceId?: string;             // for correlating logs across systems
}

// --- Customer Memory Profile (Loop 2) ---

export type PotencyTolerance = 'low' | 'medium' | 'high';

export interface CustomerMemoryProfile {
    id: string;
    tenantId: string;
    customerId: string;
    favoriteEffects: string[];
    avoidEffects: string[];
    preferredFormats: string[];
    potencyTolerance: PotencyTolerance;
    lastProducts: string[];
    favoriteDispensaryIds: string[];
    interactionCount: number;
    embeddingId?: string;
    clusters: string[];
    similarCustomerIds: string[];
    lastUpdated: string;
    createdAt: string;
}

// --- Product Knowledge Node ---

export interface ProductNode {
    id: string;
    tenantId: string;
    name: string;
    chemotype: {
        thc: number;
        cbd: number;
        cbn?: number;
    };
    terpenes: Array<{ name: string; pct: number }>;
    effects: string[];
    flavors: string[];
    form: 'flower' | 'edible' | 'vape' | 'tincture' | 'topical' | 'concentrate';
    inventoryStatus: 'in_stock' | 'low' | 'oos';
    complianceFlags: string[];
    priceUsd?: number;
    marginPct?: number;

    // Ephemeral runtime fields (Heuristics)
    _score?: number;
    _tags?: string[];
    _boosted?: boolean;
}

// --- Heuristics Engine (Loop 3) ---

export type HeuristicSource = 'starter' | 'learned' | 'manual';

export interface HeuristicCondition {
    field: string; // e.g., "customerProfile.potencyTolerance"
    operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'nin' | 'contains';
    value: any;
}

export interface HeuristicAction {
    type: 'filter' | 'boost' | 'bury' | 'warn' | 'block' | 'tag' | 'message_prepend' | 'message_append';
    target: string;
    params: Record<string, any>;
}

export interface Heuristic {
    id: string;
    tenantId: string;
    agent: AgentName;
    name: string;
    description?: string;
    enabled: boolean;
    priority: number;
    conditions: HeuristicCondition[];
    action: HeuristicAction;
    stats: {
        appliedCount: number;
        successCount: number;
        successRate: number;
        lastEvaluatedAt?: string;
    };
    source: HeuristicSource;
    createdAt: string;
    updatedAt: string;
}

// --- Pattern Clusters ---

export interface PatternCluster {
    id: string;
    tenantId: string;
    label: string;
    type: 'customer_cluster' | 'product_cluster' | 'behavior_cluster';
    centroidEmbeddingRef?: string;
    supportCount: number;
    topProducts: string[];
    topEffects: string[];
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

// --- Recommendation Outcomes (Loop 4) ---

export type OutcomeResult = 'converted' | 'rejected' | 'abandoned' | 'returned';

export interface RecommendationOutcome {
    id: string;
    tenantId: string;
    eventId: string;
    sessionId: string;
    customerId?: string;
    recommendedProducts: string[];
    selectedProduct?: string;
    outcome: OutcomeResult;
    heuristicsApplied: string[];
    systemMode: 'fast' | 'slow';
    confidenceScore: number;
    revenueGenerated?: number;
    feedbackRating?: number;
    createdAt: string;
}

// --- Pops Insights ---

export type InsightCategory = 'anomaly' | 'forecast' | 'recommendation' | 'simulation';
export type InsightSeverity = 'low' | 'medium' | 'high';

export interface PopsInsight {
    id: string;
    tenantId: string;
    category: InsightCategory;
    severity: InsightSeverity;
    title: string;
    description: string;
    possibleCauses: string[];
    suggestedActions: string[];
    linkedMetrics: string[];
    acknowledged: boolean;
    acknowledgedBy?: string;
    createdAt: string;
}

// --- Daily Metrics ---

export interface DailyMetrics {
    id: string; // Format: YYYYMMDD
    tenantId: string;
    date: string;
    totalSales: number;
    orders: number;
    avgOrderValue: number;
    newCustomers: number;
    returningCustomers: number;
    channelBreakdown: {
        web: number;
        inStore: number;
        sms: number;
        delivery?: number;
    };
    weather?: {
        temp: number;
        condition: string;
    };
    createdAt: string;
}

// --- Deebo Alerts ---

export type AlertKind = 'structuring_suspected' | 'id_abuse' | 'rule_spike' | 'anomaly' | 'compliance_gap';
export type AlertSeverity = 'info' | 'medium' | 'critical';

export interface DeeboAlert {
    id: string;
    tenantId: string;
    severity: AlertSeverity;
    kind: AlertKind;
    title: string;
    evidence: Record<string, any>;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
    resolved: boolean;
    resolvedAt?: string;
    createdAt: string;
}

// --- Compliance Events ---

export type ComplianceStatus = 'pass' | 'fail' | 'warning';

export interface ComplianceEvent {
    id: string;
    tenantId: string;
    channel: 'sms' | 'email' | 'web' | 'in_store';
    status: ComplianceStatus;
    ruleHits: Array<{ ruleId: string; severity: 'blocker' | 'warning' }>;
    contentHash: string;
    contentPreview?: string;
    checkedBy: AgentName;
    createdAt: string;
}

// --- Agent Messages (Multi-Agent Coordination) ---

export type MessageTopic =
    | 'demand_spike'
    | 'compliance_risk'
    | 'customer_trend'
    | 'anomaly'
    | 'inventory_alert'
    | 'price_change';

export interface AgentMessage {
    id: string;
    tenantId: string;
    fromAgent: AgentName;
    toAgent: AgentName | 'broadcast';
    topic: MessageTopic;
    payload: Record<string, any>;
    requiredReactions: AgentName[];
    reactions: Partial<Record<AgentName, {
        acknowledged: boolean;
        actionTaken?: string;
        timestamp: string;
    }>>;
    expiresAt: string;
    createdAt: string;
}

// --- Starter Packs (Cold Start) ---

export type StarterPackType = 'dispensary_urban' | 'dispensary_rural' | 'brand' | 'delivery';

export interface StarterPack {
    id: string;
    type: StarterPackType;
    name: string;
    description: string;
    defaultHeuristics: Omit<Heuristic, 'id' | 'tenantId' | 'stats' | 'createdAt' | 'updatedAt'>[];
    defaultPatterns: Omit<PatternCluster, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>[];
    baselineMetrics: Partial<DailyMetrics>;
}

// --- Confidence Scoring ---

export interface ConfidenceFactors {
    dataRecency: number;    // 0-1: How recent is the data
    dataDensity: number;    // 0-1: How much data exists
    heuristicCoverage: number; // 0-1: % of heuristics matched
    patternMatch: number;   // 0-1: How well this fits patterns
    anomalyScore: number;   // 0-1: Inverse of anomaly detection
}

export interface ConfidenceScore {
    score: number; // 0-1 final score
    factors: ConfidenceFactors;
    systemMode: 'fast' | 'slow'; // Recommended path
}
