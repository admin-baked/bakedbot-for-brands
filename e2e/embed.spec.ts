import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Standalone Embed', () => {
    // We need to serve the static files. Playwright's webServer is running next.js, which serves public/ under /
    // So /embed/chatbot.js should be available.

    test('should load chatbot script and render widget', async ({ page }) => {
        // Create a test page that includes the embed code
        // We'll simulate this by navigating to an empty page and injecting the script
        // Or we can use a "demo" page if one exists.
        // Let's use a data URI or direct manipulation.

        await page.goto('/404'); // Go to any page to have a context, using 404 to avoid app logic

        // Inject the config and script
        await page.evaluate(() => {
            window.BakedBotConfig = {
                brandId: 'demo-brand',
                greeting: 'Hello from E2E',
            };

            // Add CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/embed/chatbot.css';
            document.head.appendChild(link);

            // Add JS
            const script = document.createElement('script');
            script.src = '/embed/chatbot.js';
            script.async = true;
            document.body.appendChild(script);
        });

        // Check if the host container is created
        await expect(page.locator('#bakedbot-root')).toBeAttached({ timeout: 10000 });

        // Check if the button appears (it's inside the root)
        // Since we are not using Shadow DOM in the current implementation (just providers wrapped in div),
        // we can query normally.
        await expect(page.locator('button[aria-label="Toggle Chatbot"]')).toBeVisible();
    });
});
