import fs from 'fs/promises';
import { treasuryConfig } from '../config';
import { FirestoreMemoryAdapter } from './firestore-adapter';

// Define Interface types covering the JSON structure
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
        risk_buckets: {
            green: number;
            yellow: number;
            red: number;
        };
        max_per_asset_pct: Record<string, number>;
    };
    venue_limits: {
        centralized: Record<string, { status: string; max_exposure_pct: number }>;
        defi: Record<string, { status: string; max_exposure_pct: number; chains: string[] }>;
        virtual?: Record<string, { status: string; max_exposure_pct: number }>;
    };
    strategy_registry: Array<{
        id: string;
        name: string;
        risk_bucket: 'green' | 'yellow' | 'red';
        venue: string;
        status: 'planned' | 'running' | 'paused' | 'deprecated';
        target_allocation_pct: number;
        hard_loss_limit_pct?: number;
    }>;
}

export interface ITreasuryMemoryAdapter {
    read(): Promise<TreasuryDomainMemory>;
    write(memory: TreasuryDomainMemory): Promise<void>;
}

export class FileMemoryAdapter implements ITreasuryMemoryAdapter {
    private filePath: string;

    constructor(filePath: string = treasuryConfig.MEMORY_FILE_PATH) {
        this.filePath = filePath;
    }

    async read(): Promise<TreasuryDomainMemory> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            return JSON.parse(data) as TreasuryDomainMemory;
        } catch (error) {
            console.error('Failed to read treasury memory:', error);
            throw new Error(`Could not read treasury memory from ${this.filePath}`);
        }
    }

    async write(memory: TreasuryDomainMemory): Promise<void> {
        try {
            await fs.writeFile(this.filePath, JSON.stringify(memory, null, 2), 'utf-8');
        } catch (error) {
            console.error('Failed to write treasury memory:', error);
            throw new Error(`Could not write treasury memory to ${this.filePath}`);
        }
    }
}

// Factory / Singleton Export
export const treasuryMemory: ITreasuryMemoryAdapter = treasuryConfig.USE_FIRESTORE
    ? new FirestoreMemoryAdapter()
    : new FileMemoryAdapter();
