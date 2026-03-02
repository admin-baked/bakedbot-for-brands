/**
 * Workflow Definitions Registry Bootstrap
 *
 * Auto-registers all workflow definitions on import.
 * Import this module to populate the workflow registry.
 */

import { registerWorkflow } from '../workflow-registry';
import { morningBriefingWorkflow } from './morning-briefing.workflow';
import { contentEngineWorkflow } from './content-engine.workflow';
import { campaignSenderWorkflow } from './campaign-sender.workflow';

// Register all built-in workflows
registerWorkflow(morningBriefingWorkflow);
registerWorkflow(contentEngineWorkflow);
registerWorkflow(campaignSenderWorkflow);

// Re-export for direct access
export { morningBriefingWorkflow, contentEngineWorkflow, campaignSenderWorkflow };
