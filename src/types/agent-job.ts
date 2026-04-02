export type AgentJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentJobDraftState = 'idle' | 'streaming' | 'ready';

export const AGENT_JOB_TEXT_MAX_CHARS = 50_000;

export function truncateAgentJobText(content: string): string {
    if (content.length <= AGENT_JOB_TEXT_MAX_CHARS) {
        return content;
    }

    return `${content.slice(0, AGENT_JOB_TEXT_MAX_CHARS)}... [truncated]`;
}
