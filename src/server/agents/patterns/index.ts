/**
 * Agent Patterns
 *
 * Reusable patterns for multi-phase agent workflows.
 * Inspired by awesome-llm-apps patterns.
 */

// Types
export {
  type ResearchElaborationConfig,
  type ResearchElaborationResult,
  type ResearchOutput,
  type ResearchStep,
  type ResearchToolDef,
  type ElaborationConfig,
  DEFAULT_ELABORATION_INSTRUCTIONS,
} from './types';

// Core pattern
export { runResearchElaboration } from './research-elaboration';

// Convenience wrappers
export {
  marketResearchWithElaboration,
  productResearchWithElaboration,
} from './research-elaboration';
