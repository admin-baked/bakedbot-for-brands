jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn(),
}));

describe('slack import boundary', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, SLACK_BOT_TOKEN: '' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not warn until Slack is actually used without a token', async () => {
    const warn = jest.fn();

    jest.doMock('@/lib/logger', () => ({
      logger: {
        info: jest.fn(),
        warn,
        error: jest.fn(),
        debug: jest.fn(),
      },
    }));

    const { slackService } = require('@/server/services/communications/slack');

    expect(warn).not.toHaveBeenCalled();

    await slackService.postMessage('#alerts', 'hello');

    expect(warn).toHaveBeenCalledWith(
      '[Slack] Missing SLACK_BOT_TOKEN; Slack operations will be skipped',
      { action: 'postMessage' },
    );
  });
});
