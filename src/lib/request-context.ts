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
 *   const { useGLMSynthesis, glmTask } = getRequestContext();
 */
import { AsyncLocalStorage } from 'async_hooks';
import type { AITextTaskClass } from '@/types/ai-routing';

export interface RequestContext {
    /** Route synthesis step to GLM instead of Claude (non-PII, cost savings). */
    useGLMSynthesis?: boolean;
    /** Preferred GLM task class when GLM synthesis is enabled. */
    glmTask?: AITextTaskClass;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
    return requestContext.getStore() ?? {};
}
