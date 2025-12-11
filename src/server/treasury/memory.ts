import { TreasuryDomainMemory, StrategyMemory } from './schema';
import fs from 'fs/promises';
import path from 'path';

// Base storage path for Treasury Memory
// In production, this would likely be Firestore, but for V1/Paper Mode we use local JSON files.
const DATA_DIR = path.join(process.cwd(), 'src', 'server', 'treasury', 'data');

// --- Initial Memory Components (Defaults) ---
const INITIAL_TREASURY_MEMORY: TreasuryDomainMemory = {
    treasury_profile: {
        entity_name: "BakedBot Treasury",
        base_currency: "USD",
        reporting_interval_days: 7
    },
    runway_model: {
        monthly_burn_usd: 25000,
        min_runway_months: 12,
        warning_runway_months: 9
    },
    allocation_policy: {
        max_total_crypto_pct: 40,
        risk_buckets: {
            green: 20,
            yellow: 15,
            red: 5
        },
        max_per_asset_pct: {
            "BTC": 20,
            "ETH": 15,
            "SOL": 5,
            "USDC": 100 // Stables can be 100%
        }
    },
    venue_limits: {
        centralized: {
            kraken: { status: 'approved', max_exposure_pct: 30 }
        },
        defi: {
            aave_v3: { status: 'approved', max_exposure_pct: 10, chains: ['mainnet'] }
        }
    },
    strategy_registry: [] // To be populated
};

/**
 * Loads the global Treasury Domain Memory.
 * Initializes from defaults if file doesn't exist.
 */
export async function loadTreasuryMemory(): Promise<TreasuryDomainMemory> {
    const filePath = path.join(DATA_DIR, 'domain_memory.json');
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content) as TreasuryDomainMemory;
    } catch (error) {
        // If not found, create default
        await saveTreasuryMemory(INITIAL_TREASURY_MEMORY);
        return INITIAL_TREASURY_MEMORY;
    }
}

/**
 * Saves the global Treasury Domain Memory.
 */
export async function saveTreasuryMemory(memory: TreasuryDomainMemory): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, 'domain_memory.json');
    await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
}

/**
 * Loads memory for a specific strategy.
 */
export async function loadStrategyMemory<TConfig, TState>(strategyId: string): Promise<StrategyMemory<TConfig, TState> | null> {
    const filePath = path.join(DATA_DIR, 'strategies', `${strategyId}.json`);
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

/**
 * Saves memory for a specific strategy.
 */
export async function saveStrategyMemory(strategyId: string, memory: StrategyMemory): Promise<void> {
    const dirPath = path.join(DATA_DIR, 'strategies');
    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, `${strategyId}.json`);
    await fs.writeFile(filePath, JSON.stringify(memory, null, 2));
}
