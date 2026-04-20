// Mock for @upstash/ratelimit
class Ratelimit {
  constructor(_config = {}) {}

  static slidingWindow(requests, window) {
    return { requests, window };
  }

  static fixedWindow(requests, window) {
    return { requests, window };
  }

  static tokenBucket(refillRate, interval, maxTokens) {
    return { refillRate, interval, maxTokens };
  }

  async limit(_identifier) {
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    };
  }

  async blockUntilReady(_identifier, _timeout) {
    return {
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
      pending: Promise.resolve(),
    };
  }
}

module.exports = { Ratelimit };
