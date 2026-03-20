describe('AlpineIQ import boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.ALPINE_IQ_API_KEY;
  });

  it('does not warn until mock mode is actually used', async () => {
    const warn = jest.fn();

    jest.doMock('@/lib/logger', () => ({
      logger: {
        info: jest.fn(),
        warn,
        error: jest.fn(),
        debug: jest.fn(),
      },
    }));

    const { AlpineIQClient } = require('../client');

    expect(warn).not.toHaveBeenCalled();

    const client = new AlpineIQClient();
    await client.getLoyaltyProfile('5551234567');

    expect(warn).toHaveBeenCalledWith(
      '[AlpineIQ] No API key found in environment, running in Mock Mode',
      { action: 'getLoyaltyProfile' },
    );
  });
});
