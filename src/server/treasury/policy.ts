import { loadTreasuryMemory } from './memory';
import { TreasuryDomainMemory, PolicyCheckRequest, PolicyCheckResult } from './schema';

/**
 * Deebo for Money: The Treasury Policy Engine
 * Evaluates every proposed action against global risk limits.
 */
export async function checkTreasuryPolicy(request: PolicyCheckRequest): Promise<PolicyCheckResult> {
    const memory = await loadTreasuryMemory();
    const { allocation_policy, venue_limits } = memory;
    const {
        actionType,
        deltaExposureUsd,
        assetSymbols,
        venue,
        currentPortfolioSnapshot
    } = request;

    const reasons: string[] = [];

    // 1. Basic Validation
    if (actionType === 'OPEN_POSITION' || actionType === 'ADJUST_POSITION') {
        if (deltaExposureUsd > 0) {

            // Calculate new total portfolio value (approximate)
            const projectedTotal = currentPortfolioSnapshot.totalPortfolioUsd + deltaExposureUsd;

            // 2. Check Global Crypto Cap
            // Assuming assets in request are crypto unless specified
            const currentCryptoUsd = currentPortfolioSnapshot.totalPortfolioUsd * (1 - (currentPortfolioSnapshot.stablePct / 100)); // Rough est
            const projectedCryptoPct = ((currentCryptoUsd + deltaExposureUsd) / projectedTotal) * 100;

            if (projectedCryptoPct > allocation_policy.max_total_crypto_pct) {
                reasons.push(`Global crypto cap exceeded: Projected ${projectedCryptoPct.toFixed(1)}% > Max ${allocation_policy.max_total_crypto_pct}%`);
            }

            // 3. Check Per-Asset Caps
            for (const asset of assetSymbols) {
                const currentAssetPct = currentPortfolioSnapshot.assetAllocationsPct[asset] || 0;
                const maxAssetPct = allocation_policy.max_per_asset_pct[asset] || allocation_policy.max_per_asset_pct['LONG_TAIL'] || 5;

                // Very rough projection: adding entire delta to this asset
                const projectedAssetUsd = (currentAssetPct / 100 * currentPortfolioSnapshot.totalPortfolioUsd) + deltaExposureUsd;
                const projectedAssetPct = (projectedAssetUsd / projectedTotal) * 100;

                if (projectedAssetPct > maxAssetPct) {
                    reasons.push(`Asset cap exceeded for ${asset}: Projected ${projectedAssetPct.toFixed(1)}% > Max ${maxAssetPct}%`);
                }
            }

            // 4. Check Venue Caps
            // (Simplified logic for V1)
            const venueLimit = venue_limits.centralized[venue] || venue_limits.defi[venue];
            if (!venueLimit) {
                // If venue not explicitly allowed, assume restricted unless we define a default
                reasons.push(`Venue ${venue} is not explicitly approved in policy.`);
            } else if (venueLimit.status !== 'approved') {
                reasons.push(`Venue ${venue} is status: ${venueLimit.status}`);
            }
        }
    }

    if (reasons.length > 0) {
        return { decision: 'deny', reasons };
    }

    return { decision: 'allow', reasons: [] };
}
