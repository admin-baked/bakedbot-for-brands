/**
 * Typed Handoff Helper
 *
 * Sends inter-agent handoff artifacts through the agent bus with typed payloads.
 * Preferred over raw `sendAgentMessage()` for cross-agent contracts.
 *
 * Usage:
 *   import { sendHandoff } from '@/server/intuition/handoff';
 *   import { createHandoff } from '@/types/handoff-artifacts';
 *
 *   const artifact = createHandoff<ComplianceDecisionArtifact>({
 *     kind: 'compliance_decision',
 *     fromAgent: 'deebo',
 *     toAgent: 'craig',
 *     orgId: tenantId,
 *     confidence: 0.95,
 *     payload: { ... },
 *   });
 *   await sendHandoff(tenantId, artifact);
 */

import { sendAgentMessage } from './agent-bus';
import type { AgentName, AgentMessage, MessageTopic } from './schema';
import type { HandoffArtifact, HandoffArtifactKind } from '@/types/handoff-artifacts';
import { logger } from '@/lib/logger';

/**
 * Map handoff artifact kind to the closest existing MessageTopic.
 * This lets existing bus consumers process handoffs through standard topic filtering.
 */
function mapKindToTopic(kind: HandoffArtifactKind): MessageTopic {
  const map: Record<HandoffArtifactKind, MessageTopic> = {
    audience_insight: 'customer_trend',
    campaign_brief: 'demand_spike',
    compliance_decision: 'compliance_risk',
    competitive_intel: 'price_change',
    recommendation_set: 'customer_trend',
    landing_page_brief: 'demand_spike',
    retail_routing_decision: 'inventory_alert',
  };
  return map[kind];
}

/**
 * Send a typed handoff artifact through the agent bus.
 *
 * The artifact is attached to the message's `handoff` field. The `payload`
 * field is left empty — consumers should read from `handoff` when present.
 */
export async function sendHandoff(
  tenantId: string,
  artifact: HandoffArtifact,
  requiredReactions?: AgentName[],
): Promise<AgentMessage> {
  logger.info(
    `[Handoff] ${artifact.fromAgent} → ${artifact.toAgent}: ${artifact.kind} (confidence=${artifact.confidence})`,
  );

  return sendAgentMessage(tenantId, {
    fromAgent: artifact.fromAgent as AgentName,
    toAgent: artifact.toAgent as AgentName | 'broadcast',
    topic: mapKindToTopic(artifact.kind),
    payload: {},
    handoff: artifact,
    requiredReactions: requiredReactions,
    expiresInHours: 24,
  });
}
