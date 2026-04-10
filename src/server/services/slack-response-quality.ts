import type { SlackResponseRecord } from './slack-response-archive';
import { isGreeting, isMartyShortAcknowledgment } from './slack-agent-routing';

export type MartySlackQualityIssueKey =
  | 'greeting_metric_dump'
  | 'short_ack_blocked_escalation';

export interface MartySlackQualityIssue {
  key: MartySlackQualityIssueKey;
  summary: string;
  proposedFix: string;
}

const MARTY_STATUS_METRIC_RE = /\b(pipeline|crm|prospects?|mrr|arr|revenue|customers?)\b/i;
const MARTY_BLOCKED_LANGUAGE_RE = /\b(blocked|authorization error|authentication problem|auth problem|session error|unable to delegate|wait for further instructions|notified the ceo|ask linus for help)\b/i;

export function detectMartySlackResponseIssues(
  record: Pick<SlackResponseRecord, 'userMessage' | 'agentResponse'>
): MartySlackQualityIssue[] {
  const userMessage = String(record.userMessage || '').trim();
  const agentResponse = String(record.agentResponse || '').trim();
  const issues: MartySlackQualityIssue[] = [];

  if (isGreeting(userMessage) && /\d/.test(agentResponse) && MARTY_STATUS_METRIC_RE.test(agentResponse)) {
    issues.push({
      key: 'greeting_metric_dump',
      summary: 'Marty volunteered pipeline or revenue-style metrics in response to a bare greeting.',
      proposedFix: 'Keep bare greetings warm and forward-moving. Only share metrics when the user explicitly asks for status.',
    });
  }

  if (isMartyShortAcknowledgment(userMessage) && MARTY_BLOCKED_LANGUAGE_RE.test(agentResponse)) {
    issues.push({
      key: 'short_ack_blocked_escalation',
      summary: 'Marty answered a short acknowledgment with blocked, auth, or escalation language instead of keeping momentum.',
      proposedFix: 'Treat short acknowledgments as conversational follow-through. Suggest the next growth move before escalating technical blockers.',
    });
  }

  return issues;
}
