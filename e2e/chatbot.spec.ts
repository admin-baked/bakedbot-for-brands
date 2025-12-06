import { test, expect } from '@playwright/test';

test('Chatbot loads and displays suggestion input', async ({ page }) => {
  await page.goto('/');
  // Chatbot component should exist and be visible
  const chatbotToggle = page.getByTestId('chatbot-icon').first();
  await expect(chatbotToggle).toBeVisible({ timeout: 10000 });
  await chatbotToggle.click();
  // After opening, expect an input or prompt area
  await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 5000 });
});
