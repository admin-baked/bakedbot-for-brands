'use server';

/**
 * Headless Browser Tool using Puppeteer Core (Serverless Compatible)
 * 
 * Allows agents to execute a sequence of browser actions in a single session.
 * Useful for scraping, form submission, and navigating complex flows.
 * 
 * Note: Uses puppeteer-core and @sparticuz/chromium for production (Firebase/Cloud Functions).
 * Locally requires a Chrome installation.
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { logger } from '@/lib/logger';

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
        logs.push('Launching browser...');

        // Determine launch config based on environment
        let launchConfig: any = {
            headless: headless ? (process.env.NODE_ENV === 'production' ? chromium.headless : true) : false,
            args: process.env.NODE_ENV === 'production' ? chromium.args : [],
            defaultViewport: chromium.defaultViewport,
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

                    case 'scrape':
                        const selector = step.selector || 'body';
                        // Puppeteer specific: use $eval to get text content
                        const text = await page.$eval(selector, (el) => el.textContent);
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
