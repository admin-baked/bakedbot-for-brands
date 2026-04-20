// Mock for @coinbase/coinbase-sdk
module.exports = {
  Coinbase: {
    networks: {
      BaseMainnet: 'base-mainnet',
      BaseSepolia: 'base-sepolia',
      EthereumMainnet: 'ethereum-mainnet',
    },
    assets: {
      Usdc: 'usdc',
      Eth: 'eth',
    },
    configure: jest.fn(),
    configureFromJson: jest.fn(),
  },
  Wallet: {
    create: jest.fn().mockResolvedValue({
      getDefaultAddress: jest.fn().mockResolvedValue({ getId: () => '0xmock' }),
      export: jest.fn().mockResolvedValue({ walletId: 'mock-wallet', seed: 'mock-seed' }),
    }),
    import: jest.fn().mockResolvedValue({
      getDefaultAddress: jest.fn().mockResolvedValue({ getId: () => '0xmock' }),
    }),
  },
};
