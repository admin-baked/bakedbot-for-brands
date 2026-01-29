/**
 * NotebookLM MCP Client
 *
 * Simple TypeScript wrapper for the NotebookLM MCP integration.
 * Provides a clean API for querying NotebookLM from agents.
 */

import { sidecar } from './python-sidecar';
import { logger } from '@/lib/logger';

export interface NotebookLMResponse {
  response: string;
  authenticated: boolean;
  sources?: string[];
  error?: string;
}

export interface ChatOptions {
  message: string;
  notebookId?: string;
  timeout?: number;
}

export interface SendMessageOptions {
  message: string;
  waitForResponse?: boolean;
}

export class NotebookLMClient {
  private baseUrl: string;
  private retryAttempts: number = 2;
  private retryDelay: number = 1000;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.PYTHON_SIDECAR_URL || 'http://34.121.173.152:8080';
  }

  /**
   * Chat with NotebookLM - complete interaction (send + receive)
   */
  async chat(options: ChatOptions): Promise<NotebookLMResponse> {
    const { message, notebookId } = options;

    logger.info('NotebookLM chat query', { message: message.substring(0, 100) });

    const args: any = { request: { message } };
    if (notebookId) {
      args.request.notebook_id = notebookId;
    }

    return this.callTool('chat_with_notebook', args);
  }

  /**
   * Send a message without waiting for response
   */
  async sendMessage(options: SendMessageOptions): Promise<NotebookLMResponse> {
    const { message, waitForResponse = false } = options;

    logger.info('NotebookLM send message', { waitForResponse });

    return this.callTool('send_chat_message', {
      request: { message, wait_for_response: waitForResponse }
    });
  }

  /**
   * Get the latest response from NotebookLM
   */
  async getResponse(timeout: number = 30): Promise<NotebookLMResponse> {
    logger.info('NotebookLM get response', { timeout });

    return this.callTool('get_chat_response', {
      request: { timeout }
    });
  }

  /**
   * Get quick response without waiting for completion
   */
  async getQuickResponse(): Promise<NotebookLMResponse> {
    logger.info('NotebookLM get quick response');

    return this.callTool('get_quick_response', {});
  }

  /**
   * Navigate to a specific notebook
   */
  async navigateToNotebook(notebookId: string): Promise<boolean> {
    logger.info('NotebookLM navigate', { notebookId });

    const response = await this.callTool('navigate_to_notebook', {
      request: { notebook_id: notebookId }
    });

    return !response.error;
  }

  /**
   * Get the current default notebook ID
   */
  async getDefaultNotebook(): Promise<string | null> {
    logger.info('NotebookLM get default notebook');

    const response = await this.callTool('get_default_notebook', {});

    if (response.error) {
      return null;
    }

    // Response format varies, try to extract notebook_id
    const text = response.response || '';
    const match = text.match(/notebook[_\s]?id[:\s]+([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }

  /**
   * Set the default notebook ID
   */
  async setDefaultNotebook(notebookId: string): Promise<boolean> {
    logger.info('NotebookLM set default notebook', { notebookId });

    const response = await this.callTool('set_default_notebook', {
      request: { notebook_id: notebookId }
    });

    return !response.error;
  }

  /**
   * Check health of NotebookLM service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    authenticated: boolean;
    status: string;
  }> {
    logger.info('NotebookLM health check');

    const response = await this.callTool('healthcheck', {});

    let status = 'unknown';
    let authenticated = false;

    if (response.response) {
      const match = response.response.match(/status['":\s]+(\w+)/i);
      if (match) status = match[1];

      const authMatch = response.response.match(/authenticated['":\s]+(true|false)/i);
      if (authMatch) authenticated = authMatch[1] === 'true';
    }

    return {
      healthy: !response.error,
      authenticated,
      status
    };
  }

  /**
   * Internal method to call MCP tools with retry logic
   */
  private async callTool(
    toolName: string,
    arguments_: any
  ): Promise<NotebookLMResponse> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await sidecar.execute('mcp_call', {
          tool_name: toolName,
          arguments: arguments_
        });

        if (result.status === 'success' && result.result) {
          // Parse the response
          let responseData: any = {};
          const resultData = result.result as any;

          if (typeof resultData === 'string') {
            try {
              responseData = JSON.parse(resultData);
            } catch {
              responseData = { response: resultData };
            }
          } else if (resultData.text) {
            try {
              responseData = JSON.parse(resultData.text);
            } catch {
              // If it's an error message, it won't be JSON
              if (resultData.text.includes('Error calling tool')) {
                responseData = {
                  error: resultData.text,
                  authenticated: false
                };
              } else {
                responseData = { response: resultData.text };
              }
            }
          } else {
            responseData = resultData;
          }

          return {
            response: responseData.response || responseData.message || '',
            authenticated: responseData.authenticated !== false,
            sources: responseData.sources,
            error: responseData.error
          };
        }

        // Request failed
        throw new Error(result.message || 'Tool call failed');

      } catch (error) {
        logger.error('NotebookLM tool call failed', {
          tool: toolName,
          attempt,
          error: error instanceof Error ? error.message : String(error)
        });

        if (attempt === this.retryAttempts) {
          return {
            response: '',
            authenticated: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    return {
      response: '',
      authenticated: false,
      error: 'Max retry attempts exceeded'
    };
  }
}

// Export singleton instance
export const notebookLM = new NotebookLMClient();

// Helper functions for common use cases

/**
 * Quick research query - simple wrapper for most common use case
 */
export async function askNotebookLM(question: string): Promise<string> {
  const response = await notebookLM.chat({ message: question });

  if (response.error) {
    logger.warn('NotebookLM query returned error', { error: response.error });
    throw new Error(response.error);
  }

  return response.response;
}

/**
 * Check if NotebookLM is authenticated and ready
 */
export async function isNotebookLMReady(): Promise<boolean> {
  const health = await notebookLM.healthCheck();
  return health.healthy && health.authenticated;
}

/**
 * Batch multiple queries with rate limiting
 */
export async function batchQuery(
  queries: string[],
  delayMs: number = 2000
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  for (const query of queries) {
    try {
      const response = await notebookLM.chat({ message: query });
      results.set(query, response.response || response.error || 'No response');

      // Rate limiting delay
      if (queries.indexOf(query) < queries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      logger.error('Batch query failed', { query, error });
      results.set(query, `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return results;
}
