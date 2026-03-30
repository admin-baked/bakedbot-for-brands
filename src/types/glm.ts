export interface GLMUsageStatus {
    used: number;              // Total GLM calls/tokens this cycle
    limit: number;             // Monthly limit from z.ai (e.g., 1,000,000 tokens)
    remaining: number;         // Calculated (limit - used)
    cycleStart: number;        // Timestamp when current cycle started
    cycleEnd: number;          // Timestamp when cycle resets
    lastUpdated: number;       // Timestamp of last update
    percentUsed: number;       // (used / limit) * 100
    provider: 'glm' | 'anthropic';  // Currently active provider
}
