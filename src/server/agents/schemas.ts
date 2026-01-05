import { z } from 'zod';

// --- Shared Primitives ---

export const TimestampSchema = z.union([
    z.string(), // ISO String
    z.date(),
    z.object({ seconds: z.number(), nanoseconds: z.number() }) // Firestore Timestamp
]);

export const StatusSchema = z.enum(['active', 'paused', 'archived', 'completed', 'failing', 'passing', 'running', 'queued']);

// --- Brand Domain Memory Schemas ---

export const BrandObjectiveSchema = z.object({
    id: z.string(),
    description: z.string(),
    deadline: z.string().optional(),
    owner: z.string().optional(), // agent name or 'human'
    status: z.enum(['active', 'achieved', 'paused', 'abandoned']),
});

export const BrandConstraintsSchema = z.object({
    jurisdictions: z.array(z.string()),
    discount_floor_margin_pct: z.number().optional(),
    max_daily_outbound_messages_per_user: z.number().optional(),
    max_weekly_outbound_messages_per_user: z.number().optional(),
    prohibited_phrases: z.array(z.string()).optional(),
    sensitive_audiences: z.array(z.string()).optional(),
}).passthrough(); // Allow extra constraints

export const BrandSegmentSchema = z.object({
    id: z.string(),
    description: z.string(),
    definition: z.record(z.any()), // flexible definition for now
    status: z.enum(['active', 'inactive']),
});

export const ExperimentIndexSchema = z.object({
    id: z.string(),
    domain: z.string(), // e.g. 'craig', 'smokey'
    objective_id: z.string().optional(),
    status: z.enum(['running', 'completed', 'scheduled']),
});

export const BrandDomainMemorySchema = z.object({
    brand_profile: z.object({
        name: z.string(),
        tone_of_voice: z.string().optional(),
        target_markets: z.array(z.string()).optional(),
        product_focus: z.array(z.string()).optional(),
        positioning: z.string().optional(),
    }),
    priority_objectives: z.array(BrandObjectiveSchema),
    constraints: BrandConstraintsSchema,
    segments: z.array(BrandSegmentSchema),
    experiments_index: z.array(ExperimentIndexSchema),
    playbooks: z.record(z.string()), // name -> filename/id map
});

export type BrandDomainMemory = z.infer<typeof BrandDomainMemorySchema>;

// --- Agent Memory Schemas (Generic) ---

export const AgentMemorySchema = z.object({
    // Agents will extend this with their specific fields
    last_active: TimestampSchema.optional(),
    current_task_id: z.string().optional(),
}).passthrough();

export type AgentMemory = z.infer<typeof AgentMemorySchema>;

// --- Craig (Marketing) Schemas ---

export const CampaignSchema = z.object({
    id: z.string(),
    objective: z.string(),
    objective_id: z.string().optional(),
    audience_segment: z.string(),
    status: z.enum(['queued', 'running', 'passing', 'failing', 'completed', 'paused']),
    kpi: z.object({
        metric: z.string(),
        target: z.number(),
        current: z.number(),
        test_window_days: z.number(),
    }),
    constraints: z.object({
        channels: z.array(z.string()),
        max_messages_per_week: z.number().optional(),
        requires_deebo_check: z.boolean(),
        jurisdictions: z.array(z.string()),
    }),
    variants: z.array(z.object({
        id: z.string(),
        status: z.enum(['running', 'paused', 'winning', 'losing']),
        content_body: z.string().optional(), // For checking
    })),
    last_run: z.string().optional(),
    notes: z.array(z.string()).optional(),
});

export const CraigMemorySchema = AgentMemorySchema.extend({
    campaigns: z.array(CampaignSchema),
});

export type CraigMemory = z.infer<typeof CraigMemorySchema>;

// --- Smokey (Budtender) Schemas ---

export const RecPolicySchema = z.object({
    id: z.string(),
    description: z.string(),
    criteria: z.record(z.any()), // flexible
    constraints: z.record(z.any()),
    status: z.enum(['passing', 'failing', 'experimental']),
});

export const UXExperimentSchema = z.object({
    id: z.string(),
    objective: z.string(),
    status: z.enum(['queued', 'running', 'completed']),
    variants: z.array(z.object({
        name: z.string(),
        sessions: z.number(),
        add_to_cart_rate: z.number(),
    })),
    winner: z.string().nullable(),
});

export const SmokeyMemorySchema = AgentMemorySchema.extend({
    rec_policies: z.array(RecPolicySchema),
    ux_experiments: z.array(UXExperimentSchema),
    faq_coverage: z.object({
        unanswered_questions_last_7d: z.array(z.string()),
        todo_items: z.array(z.object({
            id: z.string(),
            status: z.enum(['open', 'closed']),
        })),
    }),
});

export type SmokeyMemory = z.infer<typeof SmokeyMemorySchema>;

// --- Pops (Business Intelligence) Schemas ---

export const HypothesisSchema = z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['proposed', 'running', 'validated', 'invalidated']),
    owner_agent: z.string(),
    linked_experiment_id: z.string().optional(),
    metrics: z.object({
        primary: z.string(),
        secondary: z.string().optional(),
    }),
});

export const DecisionEntrySchema = z.object({
    id: z.string(),
    hypothesis_id: z.string(),
    decision: z.enum(['validated', 'invalidated']),
    summary: z.string(),
    timestamp: TimestampSchema,
});

export const PopsMemorySchema = AgentMemorySchema.extend({
    hypotheses_backlog: z.array(HypothesisSchema),
    decision_journal: z.array(DecisionEntrySchema),
});

export type PopsMemory = z.infer<typeof PopsMemorySchema>;

// --- Ezal (Competitive Intelligence) Schemas ---

export const CompetitorSchema = z.object({
    id: z.string(),
    name: z.string(),
    jurisdiction: z.string(),
    last_discovery: TimestampSchema.optional(),
});

export const MenuSnapshotSchema = z.object({
    id: z.string(),
    competitor_id: z.string(),
    timestamp: TimestampSchema,
    summary: z.object({
        avg_cart_price: z.number(),
        num_products: z.number(),
        categories: z.array(z.string()),
    }),
});

export const GapSchema = z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['open', 'actioned', 'closed']),
    recommended_owner: z.string(),
});

export const EzalMemorySchema = AgentMemorySchema.extend({
    competitor_watchlist: z.array(CompetitorSchema),
    menu_snapshots: z.array(MenuSnapshotSchema),
    open_gaps: z.array(GapSchema),
});

export type EzalMemory = z.infer<typeof EzalMemorySchema>;

// --- Money Mike (Pricing) Schemas ---

export const PricingRuleSchema = z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['active', 'paused']),
    parameters: z.record(z.any()),
});

export const PricingExperimentSchema = z.object({
    id: z.string(),
    sku_ids: z.array(z.string()),
    status: z.enum(['running', 'completed']),
    variants: z.array(z.object({
        name: z.string(),
        price_delta_pct: z.number(),
    })),
    metrics: z.object({
        primary: z.string(),
        secondary: z.string(),
    }),
});

export const MoneyMikeMemorySchema = AgentMemorySchema.extend({
    pricing_rules: z.array(PricingRuleSchema),
    pricing_experiments: z.array(PricingExperimentSchema),
});

export type MoneyMikeMemory = z.infer<typeof MoneyMikeMemorySchema>;

// --- Mrs. Parker (Loyalty) Schemas ---

export const LoyaltySegmentSchema = z.object({
    id: z.string(),
    description: z.string(),
    criteria: z.record(z.any()),
    status: z.enum(['active', 'inactive']),
});

export const JourneyStepSchema = z.object({
    step: z.number(),
    trigger: z.string(),
    action: z.string(),
    template: z.string(),
});

export const JourneySchema = z.object({
    id: z.string(),
    status: z.enum(['running', 'paused']),
    steps: z.array(JourneyStepSchema),
});

export const MrsParkerMemorySchema = AgentMemorySchema.extend({
    loyalty_segments: z.array(LoyaltySegmentSchema),
    journeys: z.array(JourneySchema),
});

export type MrsParkerMemory = z.infer<typeof MrsParkerMemorySchema>;

// --- Executive Suite Schemas ---

export const ExecutiveMemorySchema = AgentMemorySchema.extend({
    objectives: z.array(BrandObjectiveSchema),
    snapshot_history: z.array(z.object({
        timestamp: TimestampSchema,
        content: z.string(),
        metric_values: z.record(z.number()).optional(),
    })),
});

export type ExecutiveMemory = z.infer<typeof ExecutiveMemorySchema>;

// --- Deebo (Compliance) Schemas ---

export const DeeboMemorySchema = AgentMemorySchema.extend({
    pending_reviews: z.array(z.object({
        id: z.string(),
        content: z.string(),
        source: z.string(),
        status: z.enum(['pending', 'approved', 'rejected']),
    })),
    rule_packs: z.array(z.object({
        jurisdiction: z.string(),
        version: z.string(),
        status: z.enum(['active', 'deprecated']),
    })),
});

export type DeeboMemory = z.infer<typeof DeeboMemorySchema>;

// --- Agent Log Schema ---



export const AgentLogEntrySchema = z.object({
    id: z.string(),
    timestamp: TimestampSchema,
    agent_name: z.string(),
    target_id: z.string().optional(),
    stimulus: z.string().optional(),
    action: z.string(),
    result: z.string(),
    next_step: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export type AgentLogEntry = z.infer<typeof AgentLogEntrySchema>;
