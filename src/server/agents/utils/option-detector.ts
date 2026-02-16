/**
 * Option Detector
 *
 * Detects when users select options from a menu presented by an agent
 * and expands the selection into the full task description.
 *
 * Patterns detected:
 * - "Option A" / "option a" / "A"
 * - "1" / "Option 1" / "Choice 1"
 * - Numbered lists: "1. Route to Linus"
 */

import { logger } from '@/lib/logger';

export interface OptionContext {
  label: string; // "Option A", "1", etc.
  action: string; // "Route to Technical Lead (Linus)"
  task?: string; // Expanded task description
  toolName?: string; // Tool to call (e.g., "delegateTask")
  toolArgs?: Record<string, any>; // Arguments for the tool
}

export interface OptionDetectionResult {
  detected: boolean;
  selectedOption?: OptionContext;
  expandedQuery?: string; // The user query expanded with full task context
}

/**
 * Patterns that indicate option selection
 */
const OPTION_PATTERNS = [
  // "Option A", "option a", "OPTION A"
  /^option\s+([a-z])/i,
  // "A", "B", "C" (single letter, must be start of message to avoid false positives)
  /^([a-z])$/i,
  // "1", "2", "3" (single digit)
  /^(\d)$/,
  // "Option 1", "Choice 1"
  /^(?:option|choice)\s+(\d)/i,
  // "1. " or "1)" at start of message
  /^(\d)[.)]\s*/,
];

/**
 * Extract option context from the last agent message
 * Looks for patterns like:
 * "Option A: Route to Technical Lead"
 * "1. Configure API Keys"
 */
export function extractOptionsFromMessage(message: string): OptionContext[] {
  const options: OptionContext[] = [];

  // Split into lines
  const lines = message.split('\n');

  for (const line of lines) {
    // Pattern: "Option A: Description"
    const optionMatch = line.match(/^(?:\*\*)?Option\s+([A-Z])(?:\*\*)?:\s*(.+?)(?:\s*-\s*(.+))?$/i);
    if (optionMatch) {
      const [, letter, action, task] = optionMatch;
      options.push({
        label: `Option ${letter.toUpperCase()}`,
        action: action.trim(),
        task: task?.trim(),
      });
      continue;
    }

    // Pattern: "1. Description" or "1) Description"
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.+?)(?:\s*-\s*(.+))?$/);
    if (numberedMatch) {
      const [, num, action, task] = numberedMatch;
      options.push({
        label: num,
        action: action.trim(),
        task: task?.trim(),
      });
      continue;
    }

    // Pattern: "**Option A**" (bold option headers followed by description on next line)
    const boldOptionMatch = line.match(/^\*\*Option\s+([A-Z])\*\*$/i);
    if (boldOptionMatch) {
      const [, letter] = boldOptionMatch;
      // Look for the next non-empty line as the description
      const nextLineIndex = lines.indexOf(line) + 1;
      if (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex].trim();
        if (nextLine && !nextLine.startsWith('*') && !nextLine.startsWith('-')) {
          options.push({
            label: `Option ${letter.toUpperCase()}`,
            action: nextLine,
          });
        }
      }
    }
  }

  return options;
}

/**
 * Detect if user message is selecting an option
 */
export function detectOptionSelection(
  userMessage: string,
  lastAgentMessage?: string
): OptionDetectionResult {
  const trimmed = userMessage.trim();

  // Check if message matches any option pattern
  let selectedLabel: string | null = null;

  for (const pattern of OPTION_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      selectedLabel = match[1].toUpperCase();
      break;
    }
  }

  if (!selectedLabel) {
    return { detected: false };
  }

  // Extract options from last agent message
  if (!lastAgentMessage) {
    logger.warn('[OptionDetector] Option selected but no previous agent message available');
    return { detected: false };
  }

  const availableOptions = extractOptionsFromMessage(lastAgentMessage);

  if (availableOptions.length === 0) {
    logger.warn('[OptionDetector] Option selected but no options found in last message');
    return { detected: false };
  }

  // Find matching option
  const selectedOption = availableOptions.find(opt => {
    // Match "Option A" with "A" or "option a"
    if (opt.label.includes(selectedLabel)) return true;
    // Match "1" with "Option 1"
    if (opt.label === selectedLabel) return true;
    return false;
  });

  if (!selectedOption) {
    logger.warn('[OptionDetector] Option selected but not found in available options', {
      selected: selectedLabel,
      available: availableOptions.map(o => o.label),
    });
    return { detected: false };
  }

  // Parse action to detect tool calls
  const toolInfo = parseActionForTool(selectedOption.action);
  if (toolInfo) {
    selectedOption.toolName = toolInfo.toolName;
    selectedOption.toolArgs = toolInfo.args;
  }

  // Expand the query with full context
  const expandedQuery = `${selectedOption.action}${selectedOption.task ? `: ${selectedOption.task}` : ''}`;

  logger.info('[OptionDetector] Option selection detected', {
    userInput: trimmed,
    selectedLabel,
    selectedOption: selectedOption.label,
    expandedQuery,
  });

  return {
    detected: true,
    selectedOption,
    expandedQuery,
  };
}

/**
 * Parse an action string to detect tool calls
 * Examples:
 * - "Route to Technical Lead" -> delegateTask(linus, ...)
 * - "Connect to Gmail" -> (inline card trigger)
 */
function parseActionForTool(action: string): { toolName: string; args: Record<string, any> } | null {
  const lower = action.toLowerCase();

  // Delegation patterns
  if (lower.includes('route to') || lower.includes('delegate to')) {
    // Extract agent name
    const agentPatterns = [
      { pattern: /linus|technical lead|cto/i, agent: 'linus' },
      { pattern: /jack|cro|revenue/i, agent: 'jack' },
      { pattern: /glenda|cmo|marketing/i, agent: 'glenda' },
      { pattern: /mike|cfo|financial/i, agent: 'mike' },
      { pattern: /leo|coo|operations/i, agent: 'leo' },
      { pattern: /craig|marketer|campaigns/i, agent: 'craig' },
      { pattern: /smokey|budtender|products/i, agent: 'smokey' },
      { pattern: /ezal|intelligence|research/i, agent: 'ezal' },
      { pattern: /deebo|compliance/i, agent: 'deebo' },
      { pattern: /pops|analytics/i, agent: 'pops' },
      { pattern: /mrs\.?\s*parker|customer/i, agent: 'mrs_parker' },
      { pattern: /money\s*mike|pricing/i, agent: 'money_mike' },
    ];

    for (const { pattern, agent } of agentPatterns) {
      if (pattern.test(action)) {
        return {
          toolName: 'delegateTask',
          args: {
            personaId: agent,
            task: action.replace(/^(route|delegate)\s+to\s+/i, '').trim(),
          },
        };
      }
    }
  }

  // Setup/Configuration patterns
  if (lower.includes('setup') || lower.includes('configure') || lower.includes('create')) {
    // These typically don't map directly to a tool - let the agent decide
    return null;
  }

  return null;
}

/**
 * Helper to format options for agent responses
 * Ensures consistent formatting
 */
export function formatOptions(options: { label: string; description: string; details?: string }[]): string {
  return options.map(opt => {
    const header = `**${opt.label}**: ${opt.description}`;
    return opt.details ? `${header}\n${opt.details}` : header;
  }).join('\n\n');
}
