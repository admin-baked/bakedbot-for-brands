/**
 * AgentOwnerBadge / RouteAgentBadge
 *
 * AgentOwnerBadge — static pill, pass an explicit agentId.
 *   Works in server and client components.
 *
 * RouteAgentBadge — auto-detects owner from current pathname (client only).
 *   Drop into DashboardHeader or any page header; renders nothing on unowned routes.
 *
 * Usage:
 *   <AgentOwnerBadge agentId="ezal" />
 *   <AgentOwnerBadge agentId="pops" label="Insights by Pops" />
 *   <RouteAgentBadge />
 */

'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getAgentById, type AgentId } from '@/lib/agents/registry';
import { getOwnerForRoute } from '@/lib/agents/route-ownership';

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

/**
 * Route-aware variant — reads current pathname, resolves owner automatically.
 * Renders nothing on routes without a canonical owner.
 */
export function RouteAgentBadge({ className }: { className?: string }) {
    const pathname = usePathname();
    const ownerId = getOwnerForRoute(pathname);
    if (!ownerId) return null;
    return <AgentOwnerBadge agentId={ownerId} className={className} />;
}
