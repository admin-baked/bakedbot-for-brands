/**
 * Treasury Domain Schemas
 * Defines the shape of the internal treasury memory, policy rules, and strategy state.
 */

export type RiskBucket = 'green' | 'yellow' | 'red';
export type StrategyStatus = 'planned' | 'running' | 'paused' | 'deprecated';
export type Venue = 'kraken' | 'coinbase' | 'defi' | 'multi';

// --- Global Treasury Memory ---

export interface TreasuryDomainMemory {
    treasury_profile: {
        entity_name: string;
        base_currency: string;
        reporting_interval_days: number;
    };
    runway_model: {
        monthly_burn_usd: number;
        min_runway_months: number;
        warning_runway_months: number;
    };
    allocation_policy: {
        max_total_crypto_pct: number;
        risk_buckets: Record<RiskBucket, number>;
        max_per_asset_pct: Record<string, number>; // e.g., 'BTC': 20
    };
    venue_limits: {
        centralized: Record<string, { status: 'approved' | 'restricted'; max_exposure_pct: number }>;
        defi: Record<string, { status: 'approved' | 'restricted'; max_exposure_pct: number; chains: string[] }>;
    };
    strategy_registry: StrategyRegistryItem[];
}

export interface StrategyRegistryItem {
    id: string;
    name: string;
    risk_bucket: RiskBucket;
    venue: Venue;
    status: StrategyStatus;
    target_allocation_pct: number;
    hard_loss_limit_pct?: number;
}

// --- Per-Strategy Memory ---

export interface StrategyMemory<TConfig = any, TState = any> {
    strategy_meta: {
        id: string;
        pair?: string; // e.g., "BTC/USD"
        venue: Venue;
        risk_bucket: RiskBucket;
        status: StrategyStatus;
    };
    config: TConfig;
    performance: {
        lifetime_pnl_usd: number;
        last_30d_pnl_usd: number;
        max_drawdown_pct: number;
        num_trades: number;
        win_rate: number;
    };
    // Strategy-specific state (positions, last tick, etc.)
    state: TState;
    logs: StrategyLogEntry[];
}

export interface StrategyLogEntry {
    timestamp: string;
    action: string;
    details: any;
    pnl_impact_usd?: number;
}

// --- Policy Engine Types ---

export interface PortfolioSnapshot {
    totalPortfolioUsd: number;
    assetAllocationsPct: Record<string, number>; // "BTC": 15.5
    venueAllocationsPct: Record<string, number>; // "kraken": 20.0
    riskBucketUsagePct: Record<RiskBucket, number>;
    stablePct: number;
    runwayMonths: number;
}

export interface PolicyCheckRequest {
    strategyId: string;
    actionType: 'OPEN_POSITION' | 'ADJUST_POSITION' | 'CLOSE_POSITION' | 'MOVE_LIQUIDITY';
    deltaExposureUsd: number;
    assetSymbols: string[];
    venue: Venue;
    currentPortfolioSnapshot: PortfolioSnapshot;
}

export interface PolicyCheckResult {
    decision: 'allow' | 'deny' | 'warn';
    reasons: string[];
}
