/**
 * Ezal 3-Agent Team
 *
 * A competitive intelligence pipeline with specialized agents:
 * - Finder: Discovers competitor URLs
 * - Scraper: Extracts product data (Firecrawl + RTRVR)
 * - Analyzer: Generates strategic insights
 */

// Types
export * from './types';

// Individual agents
export { runFinderAgent, createDefaultUrlValidator } from './finder-agent';
export {
  runScraperAgent,
  createDefaultProductExtractor,
  createRTRVRScraper,
} from './scraper-agent';
export {
  runAnalyzerAgent,
  createDefaultPriceComparator,
} from './analyzer-agent';

// Orchestrator (main entry point)
export {
  runEzalPipeline,
  quickScan,
  getPipelineProgress,
} from './orchestrator';
