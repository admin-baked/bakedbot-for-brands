import { test, expect } from '@playwright/test';

test('Chatbot conversation basic flow', async ({ page }) => {
  await page.goto('/');
  const icon = page.getByTestId('chatbot-icon').first();
  await expect(icon).toBeVisible({ timeout: 10000 });
  await icon.click();

  const input = page.getByRole('textbox').first();
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill('Show me your top product');
  await input.press('Enter');

  // Expect some reply or message bubble to appear
  const reply = page.locator('.chatbot-message').first();
  await expect(reply).toBeVisible({ timeout: 15000 });
});
