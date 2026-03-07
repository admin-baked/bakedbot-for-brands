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
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext {
    return requestContext.getStore() ?? {};
}
