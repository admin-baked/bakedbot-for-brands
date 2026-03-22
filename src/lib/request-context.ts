/**
 * Request-scoped context using AsyncLocalStorage.
 * Safe for concurrent requests — each request gets its own isolated store.
 *
 * Usage (caller):
 *   import { requestContext } from '@/lib/request-context';
 *   requestContext.run({ useGLMSynthesis: true }, () => runAgentCore(...));
 *
 * Usage (consumer):
 *   import { getRequestContext } from '@/lib/request-context';
 *   const { useGLMSynthesis } = getRequestContext();
 */
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
    /** Route synthesis step to GLM instead of Claude (non-PII, cost savings). */
    useGLMSynthesis?: boolean;
    /**
     * Model level hint for sub-agent runs spawned via triggerAgentRun.
     * Prevents sub-agents from inheriting a heavy caller model (e.g., advanced/expert).
     * Agents that read this should cap their model tier accordingly.
     * Default per-agent: mrs_parker → 'lite', craig → 'lite', others → 'standard'.
     */
    subAgentModelLevel?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
    return requestContext.getStore() ?? {};
}
