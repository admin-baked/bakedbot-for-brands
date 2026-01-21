'use server';

/**
 * Headless Browser Tool using Puppeteer Core (Serverless Compatible)
 *
 * Allows agents to execute a sequence of browser actions in a single session.
 * Useful for discovery, form submission, and navigating complex flows.
 *
 * Security:
 * - REQUIRES Super User authentication
 * - URL whitelist enforced (no internal/localhost URLs in production)
 * - Evaluate action disabled for security (arbitrary code execution risk)
 *
 * Note: Uses puppeteer-core and @sparticuz/chromium for production (Firebase/Cloud Functions).
 * Locally requires a Chrome installation.
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { logger } from '@/lib/logger';
import { requireSuperUser } from '@/server/auth/auth';

export type BrowserStep =
    | { action: 'goto', url: string }
    | { action: 'type', selector: string, text: string }
    | { action: 'click', selector: string }
    | { action: 'wait', selector: string, timeout?: number }
    | { action: 'discover', selector?: string } // default: body text
    | { action: 'screenshot' }
    | { action: 'evaluate', script: string }; // simple eval

export interface BrowserActionParams {
    steps: BrowserStep[];
    headless?: boolean;
}

export interface BrowserActionResult {
    success: boolean;
    logs: string[];
    data?: any; // Discovered data or generic result
    screenshot?: string; // Base64
    error?: string;
    durationMs: number;
}

// Blocked URL patterns for security (no internal/sensitive URLs)
const BLOCKED_URL_PATTERNS = [
    /^https?:\/\/localhost/i,
    /^https?:\/\/127\./,
    /^https?:\/\/0\./,
    /^https?:\/\/10\./,
    /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^https?:\/\/192\.168\./,
    /^https?:\/\/.*\.internal/i,
    /^https?:\/\/metadata\.google/i,
    /^https?:\/\/169\.254\./,
    /^file:/i,
];

/**
 * Check if a URL is safe to navigate to
 */
function isUrlSafe(url: string): boolean {
    // In development, allow localhost for testing
    if (process.env.NODE_ENV !== 'production') {
        return true;
    }
    return !BLOCKED_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Execute a sequence of browser actions
 * SECURITY: Requires Super User privileges
 */
export async function browserAction(params: BrowserActionParams): Promise<BrowserActionResult> {
    const { steps, headless = true } = params;
    const start = Date.now();
    const logs: string[] = [];
    let browser = null;

    try {
        // Security gate: Only super users can use browser automation
        await requireSuperUser();

        console.log('[browserAction] Launching browser...');
        logs.push('Launching browser...');

        // Determine launch config based on environment
        let launchConfig: any = {
            headless: headless ? (process.env.NODE_ENV === 'production' ? (chromium as any).headless : true) : false,
            args: process.env.NODE_ENV === 'production' ? (chromium as any).args : [],
            defaultViewport: (chromium as any).defaultViewport,
        };

        if (process.env.NODE_ENV === 'production') {
            // Production: Use @sparticuz/chromium
            console.log('[browserAction] Using @sparticuz/chromium');
            launchConfig.executablePath = await chromium.executablePath();
        } else {
            // Development: Use local Chrome
            // Try to find local chrome or use 'chrome' channel
            console.log('[browserAction] Using local configuration');
            launchConfig.channel = 'chrome';
            // If chrome is not installed, this might fail. Fallback to standard paths could be added here.
        }

        browser = await puppeteer.launch(launchConfig);
        const page = await browser.newPage();

        let lastResult: any = null;
        let substringScreenshot: string | undefined;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            console.log(`[browserAction] Step ${i + 1}: ${step.action}`);
            logs.push(`Step ${i + 1}: ${step.action}`);

            try {
                switch (step.action) {
                    case 'goto':
                        // Security: Validate URL before navigation
                        if (!isUrlSafe(step.url)) {
                            throw new Error(`Security: URL "${step.url}" is blocked (internal/private network)`);
                        }
                        await page.goto(step.url, { timeout: 30000, waitUntil: 'domcontentloaded' });
                        logs.push(`Navigate to ${step.url}`);
                        break;

                    case 'type':
                        await page.type(step.selector, step.text);
                        logs.push(`Typed into ${step.selector}`);
                        break;

                    case 'click':
                        await page.click(step.selector);
                        logs.push(`Clicked ${step.selector}`);
                        break;

                    case 'wait':
                        await page.waitForSelector(step.selector, { timeout: step.timeout || 10000 });
                        logs.push(`Waited for ${step.selector}`);
                        break;

                    case 'discover':
                        const selector = step.selector || 'body';
                        // Puppeteer specific: use $eval to get text content
                        const text = await page.$eval(selector, (el) => el.textContent);
                        lastResult = text?.trim() || '';
                        logs.push(`Discovered content from ${selector}`);
                        break;

                    case 'evaluate':
                        // SECURITY: Arbitrary script execution is disabled
                        // This action previously used eval() which poses a severe security risk
                        // If you need custom page interactions, use the built-in actions (click, type, discover)
                        throw new Error('Security: The "evaluate" action is disabled. Use built-in actions instead.');
                        break;

                    case 'screenshot':
                        const buffer = await page.screenshot({ fullPage: false, encoding: 'base64' });
                        substringScreenshot = buffer; // already base64 string due to encoding option
                        logs.push('Captured screenshot');
                        break;
                }
            } catch (stepError: any) {
                console.error(`[browserAction] Step ${i + 1} failed:`, stepError);
                throw new Error(`Step ${i + 1} (${step.action}) failed: ${stepError.message}`);
            }
        }

        await browser.close();
        const durationMs = Date.now() - start;

        return {
            success: true,
            logs,
            data: lastResult,
            screenshot: substringScreenshot,
            durationMs
        };

    } catch (error: any) {
        console.error('[browserAction] Failed:', error);
        if (browser) {
             try { await browser.close(); } catch (e) { /* ignore */ }
        }

        return {
            success: false,
            logs,
            error: error.message,
            durationMs: Date.now() - start
        };
    }
}
