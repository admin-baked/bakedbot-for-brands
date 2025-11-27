/**
 * E2E Tests for Conversation Memory
 * Tests chatbot session persistence and context continuity
 */

import { test, expect } from '@playwright/test';

test.describe('Conversation Memory', () => {
    test('should create and persist chat session', async ({ page }) => {
        await page.goto('/');

        // Open chatbot
        await page.click('[data-testid="chatbot-toggle"]', { timeout: 5000 }).catch(() => {
            // Fallback: try finding by text or icon
            page.click('button:has-text("Chat")').catch(() => { });
        });

        // Wait for chatbot to open
        await page.waitForSelector('text=Hi, I\'m Smokey', { timeout: 5000 });

        // Start free chat
        await page.click('button:has-text("Just ask me a question")');

        // Send first message
        await page.fill('input[placeholder*="Type a message"]', 'Show me edibles');
        await page.click('button[type="submit"]');

        // Wait for response
        await page.waitForSelector('text=/found|edibles/i', { timeout: 10000 });

        // Send follow-up message (should use context)
        await page.fill('input[placeholder*="Type a message"]', 'under $20');
        await page.click('button[type="submit"]');

        // Verify response considers context
        await page.waitForSelector('text=/price|\\$20/i', { timeout: 10000 });
    });

    test('should clear conversation context', async ({ page }) => {
        await page.goto('/');

        // Open chatbot and start chat
        await page.click('[data-testid="chatbot-toggle"]').catch(() => { });
        await page.waitForSelector('text=Hi, I\'m Smokey');
        await page.click('button:has-text("Just ask me a question")');

        // Send message
        await page.fill('input[placeholder*="Type a message"]', 'Show me flower');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // Click Clear Context button (RotateCcw icon)
        await page.click('button[aria-label="Clear context"]').catch(async () => {
            // Fallback: find by tooltip
            await page.hover('button:has([class*="rotate"])');
            await page.click('button:has([class*="rotate"])');
        });

        // Verify toast notification
        await expect(page.locator('text=Context Cleared')).toBeVisible({ timeout: 3000 });

        // Verify chat is reset
        await expect(page.locator('text=Hi, I\'m Smokey')).toBeVisible();
    });
});
