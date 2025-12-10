
import { treasuryMemory } from '../memory/adapter';

export type ActionType = "OPEN_POSITION" | "ADJUST_POSITION" | "CLOSE_POSITION" | "MOVE_LIQUIDITY";

export interface PortfolioSnapshot {
    totalPortfolioUsd: number;
    assetAllocationsPct: Record<string, number>;
    venueAllocationsPct: Record<string, number>;
    riskBucketUsagePct: Record<"green" | "yellow" | "red", number>;
    stablePct: number;
    runwayMonths: number;
}

export interface PolicyCheckRequest {
    strategyId: string;
    actionType: ActionType;
    deltaExposureUsd: number; // positive for more risk, negative for less
    assetSymbols: string[]; // e.g. ["BTC"]
    venue: string; // "kraken" | "aave_v3"
    currentPortfolioSnapshot: PortfolioSnapshot;
    riskBucket: "green" | "yellow" | "red"; // Added to request for easier checking
}

export interface PolicyCheckResult {
    decision: "allow" | "deny" | "warn";
    reasons: string[];
}

export class TreasuryPolicyEngine {

    async checkTreasuryPolicy(request: PolicyCheckRequest, memoryOverride?: TreasuryDomainMemory): Promise<PolicyCheckResult> {
        const memory = memoryOverride || await treasuryMemory.read();
        const policy = memory.allocation_policy;
        const reasons: string[] = [];
        let decision: "allow" | "deny" | "warn" = "allow";

        const { totalPortfolioUsd, riskBucketUsagePct, assetAllocationsPct } = request.currentPortfolioSnapshot;

        // 1. Check Global Crypto Cap
        // Simplified check: assuming delta is added to existing crypto exposure
        // In reality, we'd need current crypto totals. Assuming snapshot has it or we infer from buckets.
        // For v1, let's focus on Risk Buckets and Asset Caps.

        // 2. Check Risk Bucket Limits
        const currentBucketUsage = riskBucketUsagePct[request.riskBucket] || 0;
        const bucketLimit = policy.risk_buckets[request.riskBucket];
        const deltaPct = (request.deltaExposureUsd / totalPortfolioUsd) * 100;
        const projectedBucketUsage = currentBucketUsage + deltaPct;

        if (projectedBucketUsage > bucketLimit) {
            decision = "deny";
            reasons.push(`Risk Bucket '${request.riskBucket}' limit exceeded. Limit: ${bucketLimit}%, Projected: ${projectedBucketUsage.toFixed(2)}%`);
        }

        // 3. Check Per-Asset Caps
        for (const asset of request.assetSymbols) {
            // Check specific asset cap or default to LONG_TAIL if not found (and not stable/USD)
            // Simplified logic: strict check against defined caps
            const assetCap = policy.max_per_asset_pct[asset] || policy.max_per_asset_pct['LONG_TAIL']; // Fallback

            // Skip check for base currency if needed, but usually we cap exposure assets
            if (assetCap) {
                const currentAssetPct = assetAllocationsPct[asset] || 0;
                const projectedAssetPct = currentAssetPct + deltaPct; // Conservatively assume all delta goes to this asset

                if (projectedAssetPct > assetCap) {
                    decision = "deny";
                    reasons.push(`Asset '${asset}' cap exceeded. Limit: ${assetCap}%, Projected: ${projectedAssetPct.toFixed(2)}%`);
                }
            }
        }

        // 4. Check Venue Limits
        const venueLimits = memory.venue_limits;
        // Flatten checks for centralized/defi
        let venueRule = venueLimits.centralized[request.venue];
        if (!venueRule) {
            // check defi
            // @ts-ignore - simple dynamic check
            venueRule = venueLimits.defi[request.venue];
        }
        if (!venueRule) {
            // check virtual
            // @ts-ignore
            venueRule = venueLimits.virtual ? venueLimits.virtual[request.venue] : undefined;
        }

        if (venueRule) {
            if (venueRule.status !== 'approved') {
                decision = "deny";
                reasons.push(`Venue '${request.venue}' is not approved (status: ${venueRule.status})`);
            }
            // Max exposure check logic would go here similar to assets
        } else {
            decision = "deny";
            reasons.push(`Venue '${request.venue}' is unknown/unregistered.`);
        }


        // 5. Runway Protection (Basic)
        if (request.currentPortfolioSnapshot.runwayMonths < memory.runway_model.min_runway_months) {
            if (request.deltaExposureUsd > 0) {
                decision = "deny";
                reasons.push(`Runway critical (< ${memory.runway_model.min_runway_months} months). Increasing risk is prohibited.`);
            }
        }

        return { decision, reasons };
    }
}

export const policyEngine = new TreasuryPolicyEngine();
