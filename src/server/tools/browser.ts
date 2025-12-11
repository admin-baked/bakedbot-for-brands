'use server';

/**
 * Headless Browser Tool using Playwright
 * 
 * Allows agents to execute a sequence of browser actions in a single session.
 * Useful for scraping, form submission, and navigating complex flows.
 * 
 * Note: Requires @playwright/test or playwright-core to be installed.
 */

import { chromium } from '@playwright/test';

export type BrowserStep =
    | { action: 'goto', url: string }
    | { action: 'type', selector: string, text: string }
    | { action: 'click', selector: string }
    | { action: 'wait', selector: string, timeout?: number }
    | { action: 'scrape', selector?: string } // default: body text
    | { action: 'screenshot' }
    | { action: 'evaluate', script: string }; // simple eval

export interface BrowserActionParams {
    steps: BrowserStep[];
    headless?: boolean;
}

export interface BrowserActionResult {
    success: boolean;
    logs: string[];
    data?: any; // Scraped data or generic result
    screenshot?: string; // Base64
    error?: string;
    durationMs: number;
}

/**
 * Execute a sequence of browser actions
 */
export async function browserAction(params: BrowserActionParams): Promise<BrowserActionResult> {
    const { steps, headless = true } = params;
    const start = Date.now();
    const logs: string[] = [];
    let browser = null;

    try {
        console.log('[browserAction] Launching browser...');
        browser = await chromium.launch({ headless });
        const context = await browser.newContext();
        const page = await context.newPage();

        let lastResult: any = null;
        let substringScreenshot: string | undefined;

        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            console.log(`[browserAction] Step ${i + 1}: ${step.action}`);
            logs.push(`Step ${i + 1}: ${step.action}`);

            try {
                switch (step.action) {
                    case 'goto':
                        await page.goto(step.url, { timeout: 30000, waitUntil: 'domcontentloaded' });
                        logs.push(`Navigate to ${step.url}`);
                        break;

                    case 'type':
                        await page.fill(step.selector, step.text);
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

                    case 'scrape':
                        const selector = step.selector || 'body';
                        const text = await page.textContent(selector);
                        lastResult = text?.trim() || '';
                        logs.push(`Scraped content from ${selector}`);
                        break;

                    case 'evaluate':
                        // Be careful with eval
                        const result = await page.evaluate((s) => {
                            // eslint-disable-next-line no-eval
                            return eval(s);
                        }, step.script);
                        lastResult = result;
                        logs.push('Evaluated script');
                        break;

                    case 'screenshot':
                        const buffer = await page.screenshot({ fullPage: false });
                        substringScreenshot = buffer.toString('base64');
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
        if (browser) await browser.close();

        return {
            success: false,
            logs,
            error: error.message,
            durationMs: Date.now() - start
        };
    }
}
