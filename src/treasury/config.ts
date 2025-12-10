import { z } from 'zod';

const TreasuryConfigSchema = z.object({
    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Feature Flags
    ENABLE_REAL_TRADING: z.boolean().default(false), // Safety switch

    // Secrets (Loaded from process.env)
    KRAKEN_API_KEY: z.string().optional(),
    KRAKEN_PRIVATE_KEY: z.string().optional(),

    // Persistence
    USE_FIRESTORE: z.boolean().default(false), // Toggle cloud storage

    // Paths
    MEMORY_FILE_PATH: z.string().default('./src/treasury/memory/domain-memory.json'),
});

export type TreasuryConfig = z.infer<typeof TreasuryConfigSchema>;

export function loadTreasuryConfig(): TreasuryConfig {
    // In a real app, we might use dotenv here if not already loaded by Next.js
    const config = {
        NODE_ENV: process.env.NODE_ENV,
        ENABLE_REAL_TRADING: process.env.TREASURY_ENABLE_REAL_TRADING === 'true',
        KRAKEN_API_KEY: process.env.TREASURY_KRAKEN_API_KEY,
        KRAKEN_PRIVATE_KEY: process.env.TREASURY_KRAKEN_PRIVATE_KEY,
        MEMORY_FILE_PATH: process.env.TREASURY_MEMORY_PATH || './src/treasury/memory/domain-memory.json',
        USE_FIRESTORE: process.env.TREASURY_USE_FIRESTORE === 'true' || process.env.NODE_ENV === 'production'
    };

    return TreasuryConfigSchema.parse(config);
}

export const treasuryConfig = loadTreasuryConfig();
