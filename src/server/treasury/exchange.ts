import ccxt, { Exchange } from 'ccxt';
import { MarketContext } from './harness';
import { logger } from '@/lib/logger';

export class ExchangeAdapter {
    private exchange: Exchange;

    constructor() {
        // Initialize Kraken
        // We look for secrets in env, but fallback to public-only
        this.exchange = new ccxt.kraken({
            apiKey: process.env.KRAKEN_API_KEY,
            secret: process.env.KRAKEN_API_SECRET,
            timeout: 30000,
        });
    }

    /**
     * Fetches real market context for the strategy symbols
     */
    async fetchMarketContext(symbols: string[]): Promise<MarketContext> {
        const ticks: Record<string, number> = {};
        const fundingRates: Record<string, number> = {};

        try {
            // 1. Fetch Tickers
            const tickers = await this.exchange.fetchTickers(symbols);
            for (const symbol of symbols) {
                if (tickers[symbol]) {
                    ticks[symbol] = tickers[symbol].last || 0;
                }
            }

            // 2. Fetch Funding Rates (for Perps)
            // Note: CCXT support varies by exchange. Kraken Futures is separate in CCXT ('krakenfutures').
            // For standard Kraken, we might need to query specific endpoints or assume Spot only for now.
            // If symbols include PERP/USD, we'd need the futures client.
            // For V1 Basis Bot, let's assume we are looking at Spot vs Perp spread manually or mocking funding
            // given complexity of Kraken Futures auth in standard CCXT.

            // MOCKING Funding rate for safety/simplicity in V1 standard API
            // In production, we'd instantiate ccxt.krakenfutures
            // Random fluctuating rate between 5% and 15% APR
            if (symbols.includes('BTC/USD')) {
                // 8h rate = APR / 3 / 365
                const mockApr = 0.05 + (Math.random() * 0.10);
                fundingRates['BTC/USD'] = mockApr / 3 / 365;
            }

        } catch (error) {
            logger.error('[Treasury] Failed to fetch market data', error instanceof Error ? error : new Error(String(error)));
        }

        return { ticks, fundingRates };
    }

    /**
     * Execute Order (Stub for now - enforces Paper Mode if no keys)
     */
    async executeOrder(symbol: string, type: 'market' | 'limit', side: 'buy' | 'sell', amount: number) {
        if (!this.exchange.apiKey) {
            logger.info(`[Treasury] PAPER EXECUTION: ${side} ${amount} ${symbol} @ MARKET`);
            return { id: `paper_${Date.now()}`, filled: amount, status: 'closed' };
        }

        // Real execution would go here
        // return await this.exchange.createOrder(symbol, type, side, amount);
        throw new Error("Real execution blocked in V1");
    }
}

export const krakenAdapter = new ExchangeAdapter();
