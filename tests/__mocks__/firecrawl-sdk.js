// Mock for @mendable/firecrawl-js and @firecrawl/firecrawl-js
class FirecrawlApp {
  constructor(_config = {}) {}
  async scrapeUrl() { return { success: true, data: { markdown: '', html: '' } }; }
  async crawlUrl() { return { success: true, data: [] }; }
  async search() { return { success: true, data: [] }; }
}

// Export as both default and named — supports both import styles
// Tests can override with jest.spyOn or jest.mock per-test
module.exports = { default: FirecrawlApp, FirecrawlApp, __esModule: true };
