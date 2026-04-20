// Mock for ccxt (cryptocurrency exchange trading library)
// ccxt's static dependencies (noble-hashes, scure-starknet) do crypto ops at module load time
// which fails in jsdom environment due to Uint8Array type mismatches.
const mockExchange = {
  loadMarkets: jest.fn().mockResolvedValue({}),
  fetchTicker: jest.fn().mockResolvedValue({ last: 50000, bid: 49900, ask: 50100 }),
  fetchOrderBook: jest.fn().mockResolvedValue({ bids: [], asks: [] }),
  fetchBalance: jest.fn().mockResolvedValue({ total: {}, free: {}, used: {} }),
  createOrder: jest.fn().mockResolvedValue({ id: 'mock-order-id', status: 'open' }),
  cancelOrder: jest.fn().mockResolvedValue({ id: 'mock-order-id', status: 'canceled' }),
  fetchOrder: jest.fn().mockResolvedValue({ id: 'mock-order-id', status: 'closed' }),
  fetchOpenOrders: jest.fn().mockResolvedValue([]),
  fetchClosedOrders: jest.fn().mockResolvedValue([]),
  fetchFundingRate: jest.fn().mockResolvedValue({ fundingRate: 0.001 }),
  fetchFundingRates: jest.fn().mockResolvedValue({}),
  fetchPositions: jest.fn().mockResolvedValue([]),
  id: 'mock',
  markets: {},
};

class MockKraken extends (class {}) {}
Object.assign(MockKraken.prototype, mockExchange);

module.exports = {
  kraken: MockKraken,
  binance: class extends (class {}) {},
  coinbasepro: class extends (class {}) {},
  __esModule: true,
};
