/**
 * AgentOwnerBadge
 *
 * Small attribution pill showing which agent owns a given surface.
 * Pure presentational — no hooks, works in server and client components.
 *
 * Usage:
 *   <AgentOwnerBadge agentId="ezal" />              → "Ezal"
 *   <AgentOwnerBadge agentId="pops" label="Insights by Pops" />
 */

import Image from 'next/image';
import { getAgentById, type AgentId } from '@/lib/agents/registry';

interface AgentOwnerBadgeProps {
    agentId: AgentId;
    /** Override the default display text. Defaults to agent name. */
    label?: string;
    className?: string;
}

export function AgentOwnerBadge({ agentId, label, className = '' }: AgentOwnerBadgeProps) {
    const agent = getAgentById(agentId);

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border/50 ${className}`}
            title={`${agent.title} — ${agent.description}`}
        >
            <Image
                src={agent.image}
                alt={agent.name}
                width={14}
                height={14}
                className="rounded-full"
                unoptimized
            />
            {label ?? agent.name}
        </span>
    );
}
