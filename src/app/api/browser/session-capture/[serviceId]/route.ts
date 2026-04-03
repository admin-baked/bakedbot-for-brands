/**
 * Live Browser Session Capture — SSE Endpoint
 *
 * POST /api/browser/session-capture/[serviceId]
 *
 * Launches a local Puppeteer browser, drives the login flow for the given service,
 * and streams screenshots + step events via Server-Sent Events. On success, emits
 * the captured cookies so the client can save them.
 *
 * Events emitted:
 *   { type: 'step',       step: string, image?: string }  — after each browser action
 *   { type: 'complete',   cookies: Record<string, string> }
 *   { type: '2fa',        message: string }
 *   { type: 'error',      message: string }
 */

import { NextRequest } from 'next/server';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { requireSuperUser } from '@/server/auth/auth';
import { SERVICE_REGISTRY, ServiceId } from '@/server/services/rtrvr/service-registry';
import { logger } from '@/lib/logger';

const encoder = new TextEncoder();

function sseEvent(data: Record<string, unknown>): string {
    return `data: ${JSON.stringify(data)}\n\n`;
}

async function screenshot(page: Page): Promise<string> {
    return page.screenshot({ fullPage: false, encoding: 'base64' }) as Promise<string>;
}

/** Returns the first matching selector found on the page, racing all candidates. */
async function findSelector(page: Page, selectors: string[], timeout = 5000): Promise<string | null> {
    return Promise.any(
        selectors.map(sel =>
            page.waitForSelector(sel, { timeout }).then(() => sel)
        )
    ).catch(() => null);
}

async function launchBrowser(): Promise<Browser> {
    if (process.env.NODE_ENV === 'production') {
        return puppeteer.launch({
            headless: (chromium as any).headless,
            args: (chromium as any).args,
            defaultViewport: (chromium as any).defaultViewport,
            executablePath: await chromium.executablePath(),
        });
    }
    return puppeteer.launch({
        headless: true,
        channel: 'chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: { width: 1280, height: 800 },
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: { serviceId: string } }
) {
    let uid: string;
    try {
        const session = await requireSuperUser();
        uid = session.uid;
    } catch {
        return new Response('Unauthorized', { status: 401 });
    }

    const serviceId = params.serviceId as ServiceId;
    const service = SERVICE_REGISTRY[serviceId];
    if (!service) {
        return new Response('Unknown service', { status: 400 });
    }

    let body: { email?: string; password?: string };
    try {
        body = await request.json();
    } catch {
        return new Response('Invalid JSON', { status: 400 });
    }
    const { email, password } = body;
    if (!email || !password) {
        return new Response('email and password required', { status: 400 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            const emit = (data: Record<string, unknown>) => {
                try {
                    controller.enqueue(encoder.encode(sseEvent(data)));
                } catch {
                    // client disconnected
                }
            };

            let browser: Browser | null = null;
            try {
                emit({ type: 'step', step: 'Launching browser...' });
                browser = await launchBrowser();
                const page = await browser.newPage();
                await page.setViewport({ width: 1280, height: 800 });

                emit({ type: 'step', step: `Opening ${service.displayName} login...` });
                await page.goto(service.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                emit({ type: 'step', step: 'Page loaded — entering credentials...', image: await screenshot(page) });

                const emailSel = await findSelector(page, ['input[type="email"]', 'input[name="email"]', 'input[name="username"]', '#username', '#email']);
                if (!emailSel) {
                    emit({ type: 'error', message: 'Could not find email/username field on login page' });
                    await browser.close();
                    controller.close();
                    return;
                }
                await page.type(emailSel, email, { delay: 40 });

                const passwordSel = await findSelector(page, ['input[type="password"]', 'input[name="password"]', '#password']);
                if (!passwordSel) {
                    emit({ type: 'error', message: 'Could not find password field on login page' });
                    await browser.close();
                    controller.close();
                    return;
                }
                await page.type(passwordSel, password, { delay: 40 });

                emit({ type: 'step', step: 'Credentials entered — submitting...', image: await screenshot(page) });

                const submitSel = await findSelector(page, [
                    'button[type="submit"]',
                    'button[data-litms-control-urn*="login"]',
                    'input[type="submit"]',
                ]);
                if (submitSel) {
                    await page.click(submitSel);
                } else {
                    await page.keyboard.press('Enter');
                }

                emit({ type: 'step', step: 'Waiting for login to complete...' });
                try {
                    await page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' });
                } catch {
                    // Navigation may not fire for SPA — continue anyway
                }

                const postUrl = page.url();
                emit({ type: 'step', step: 'Login submitted — checking result...', image: await screenshot(page) });

                // Detect 2FA / challenge pages
                const pageText = await page.$eval('body', el => el.textContent ?? '').catch(() => '');
                const is2FA = /verification|two.?factor|2fa|otp|checkpoint|challenge|captcha/i.test(pageText);
                if (is2FA && postUrl === service.loginUrl) {
                    emit({ type: '2fa', message: 'Two-factor authentication or CAPTCHA detected. Use the manual cookie method instead.' });
                    await browser.close();
                    controller.close();
                    return;
                }

                // Extract session cookies
                const allCookies = await page.cookies();
                const captured: Record<string, string> = {};
                for (const cookieName of service.sessionCookies) {
                    const found = allCookies.find(c => c.name === cookieName);
                    if (found) captured[cookieName] = found.value;
                }

                await browser.close();
                browser = null;

                if (Object.keys(captured).length === 0) {
                    emit({
                        type: 'error',
                        message: `Logged in but session cookies not found (${service.sessionCookies.join(', ')}). Try the manual cookie method.`,
                    });
                    controller.close();
                    return;
                }

                logger.info('[SessionCaptureSSE] Cookies captured', {
                    uid,
                    service: serviceId,
                    cookieCount: Object.keys(captured).length,
                });

                emit({ type: 'complete', cookies: captured });

            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                logger.warn('[SessionCaptureSSE] Error', { uid, service: serviceId, error: msg });
                emit({ type: 'error', message: msg });
                if (browser) {
                    try { await browser.close(); } catch { /* ignore */ }
                }
            }

            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
