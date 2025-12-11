'use server';

/**
 * Universal HTTP Client Tool
 * 
 * Allows agents to perform any HTTP request (GET, POST, PUT, DELETE)
 * to interact with external APIs.
 */

export interface HttpRequestOptions {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    headers?: Record<string, string>;
    body?: any;
    timeoutMs?: number;
}

export interface HttpResponse {
    success: boolean;
    status: number;
    statusText: string;
    data?: any;
    headers?: Record<string, string>;
    error?: string;
    durationMs: number;
}

/**
 * Execute an HTTP request
 */
export async function httpRequest(options: HttpRequestOptions): Promise<HttpResponse> {
    const { method, url, headers = {}, body, timeoutMs = 10000 } = options;
    const start = Date.now();

    console.log(`[httpRequest] ${method} ${url}`);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const fetchOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'BakedBot-Agent/1.0',
                ...headers,
            },
            signal: controller.signal,
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const durationMs = Date.now() - start;

        // Try to parse JSON, fallback to text
        let responseData: any;
        const contentType = response.headers.get('content-type');
        const responseText = await response.text();

        try {
            if (contentType && contentType.includes('application/json')) {
                responseData = JSON.parse(responseText);
            } else {
                responseData = responseText;
            }
        } catch (e) {
            responseData = responseText;
        }

        // Convert headers to simple object
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        return {
            success: response.ok,
            status: response.status,
            statusText: response.statusText,
            data: responseData,
            headers: responseHeaders,
            durationMs,
        };

    } catch (error: any) {
        const durationMs = Date.now() - start;
        console.error(`[httpRequest] Failed: ${error.message}`);

        return {
            success: false,
            status: 0,
            statusText: 'Network Error',
            error: error.name === 'AbortError' ? `Request timed out after ${timeoutMs}ms` : error.message,
            durationMs,
        };
    }
}
