/**
 * Playbook Step Classifier
 *
 * Classifies playbook step types into billing categories:
 *   deterministic  → 0 AI credits (triggers, routing, conditions, CRUD, sends)
 *   ai_powered     → burns AI Studio credits per action-costs table
 *   channel_send   → billed via channel allowances (SMS/email/push), not AI credits
 *
 * These classifications drive the metering gate in the playbook runner.
 * Do not add AI credits to channel_send steps.
 */

export type PlaybookStepCategory = 'deterministic' | 'ai_powered' | 'channel_send';

/**
 * Maps the existing PlaybookStep.type field to a billing category.
 *
 * Current step types in playbook-runner:
 *   tool_call   - may be deterministic or ai_powered depending on tool
 *   delegate    - ai_powered (dispatches to an LLM agent)
 *   synthesize  - ai_powered (LLM content generation)
 *   notify      - channel_send (Slack / email / push notification)
 *   create_thread - deterministic (inbox record creation)
 *   condition   - deterministic (if/then logic)
 */
export function classifyPlaybookStepType(
  stepType: string,
  toolName?: string
): PlaybookStepCategory {
  switch (stepType) {
    case 'condition':
    case 'create_thread':
      return 'deterministic';

    case 'notify':
      return 'channel_send';

    case 'synthesize':
    case 'delegate':
      return 'ai_powered';

    case 'tool_call':
      // Tool calls are ai_powered only if the tool is an LLM-backed tool.
      // Deterministic tools (CRM lookups, inventory checks, webhook dispatch) are free.
      return classifyToolCall(toolName);

    default:
      // Unknown step types default to deterministic (fail safe — don't charge unexpected steps)
      return 'deterministic';
  }
}

/**
 * Known LLM-backed tools that consume AI Studio credits.
 * All other tool_call types are treated as deterministic.
 */
const AI_POWERED_TOOLS = new Set([
  'generate_copy',
  'generate_text',
  'generate_email_draft',
  'generate_sms_draft',
  'generate_push_copy',
  'generate_offer_copy',
  'generate_menu_description',
  'generate_social_caption',
  'generate_product_description',
  'generate_seo_metadata',
  'summarize',
  'rewrite',
  'analyze',
  'research',
  'competitive_summary',
  'executive_digest',
  'image_generate',
  'image_edit',
  'creative_batch',
  'video_generate',
  'video_short',
  'video_full',
]);

function classifyToolCall(toolName?: string): PlaybookStepCategory {
  if (!toolName) return 'deterministic';
  return AI_POWERED_TOOLS.has(toolName) ? 'ai_powered' : 'deterministic';
}

/**
 * Maps an AI-powered playbook tool name to an AIStudioActionType for billing.
 * Falls back to 'chat' for unknown AI tools.
 */
export function resolvePlaybookToolActionType(toolName: string): string {
  const toolToActionType: Record<string, string> = {
    generate_copy: 'chat',
    generate_text: 'chat',
    generate_email_draft: 'chat',
    generate_sms_draft: 'chat',
    generate_push_copy: 'chat',
    generate_offer_copy: 'chat',
    generate_menu_description: 'chat',
    generate_social_caption: 'chat',
    generate_product_description: 'chat',
    generate_seo_metadata: 'chat',
    rewrite: 'chat',
    summarize: 'research',
    analyze: 'research',
    research: 'research',
    competitive_summary: 'research',
    executive_digest: 'research',
    image_generate: 'image_generate',
    image_edit: 'image_edit',
    creative_batch: 'creative_batch',
    video_generate: 'video_short',
    video_short: 'video_short',
    video_full: 'video_full',
  };

  return toolToActionType[toolName] ?? 'chat';
}
