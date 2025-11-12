
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title to contain a substring.
  await expect(page).toHaveTitle(/BakedBot - Headless Cannabis Commerce AI Agent/);
});

test('get started link', async ({ page }) => {
  await page.goto('/');

  // Find the h1 element with the text "Find Your Bliss"
  const heading = page.locator('h1', { hasText: 'Find Your Bliss' });

  // Expect the h1 element to be visible.
  await expect(heading).toBeVisible();
});

test('martez login flow', async ({ page }) => {
  await page.goto('/brand-login');

  // Click the "Dev Magic Login" dropdown trigger
  await page.locator('button', { hasText: 'Dev Magic Login' }).click();

  // Click the menu item for martez@bakedbot.ai
  await page.locator('div[role="menuitem"]', { hasText: 'Login as martez@bakedbot.ai' }).click();

  // Expect the "Check Your Inbox!" card to be visible
  await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

  // Expect the email address to be displayed
  await expect(page.locator('strong', { hasText: 'martez@bakedbot.ai' })).toBeVisible();
});

test('rishabh login flow', async ({ page }) => {
  await page.goto('/brand-login');

  // Click the "Dev Magic Login" dropdown trigger
  await page.locator('button', { hasText: 'Dev Magic Login' }).click();

  // Click the menu item for rishabh@bakedbot.ai
  await page.locator('div[role="menuitem"]', { hasText: 'Login as rishabh@bakedbot.ai' }).click();

  // Expect the "Check Your Inbox!" card to be visible
  await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

  // Expect the email address to be displayed
  await expect(page.locator('strong', { hasText: 'rishabh@bakedbot.ai' })).toBeVisible();
});

test('dispensary login flow', async ({ page }) => {
    await page.goto('/dispensary-login');

    // Click the "Dev Magic Login" button
    await page.locator('button', { hasText: 'Dev Magic Button (dispensary@bakedbot.ai)' }).click();

    // Expect the "Check Your Inbox!" card to be visible
    await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

    // Expect the email address to be displayed
    await expect(page.locator('strong', { hasText: 'dispensary@bakedbot.ai' })).toBeVisible();
});


test('demo mode toggle', async ({ page }) => {
  await page.goto('/');

  // 1. Initial state check (Live data: Cosmic Caramels)
  await expect(page.locator('h3', { hasText: 'Cosmic Caramels' })).toBeVisible();
  await expect(page.locator('h3', { hasText: 'OG Galaxy' })).not.toBeVisible();

  // 2. Find and click the demo mode switch
  const demoModeSwitch = page.locator('#demo-mode-switch');
  await demoModeSwitch.click();

  // 3. Verify demo product is now visible
  await expect(page.locator('h3', { hasText: 'OG Galaxy' })).toBeVisible();

  // 4. Verify live product is now hidden
  await expect(page.locator('h3', { hasText: 'Cosmic Caramels' })).not.toBeVisible();

  // 5. Toggle back to live mode
  await demoModeSwitch.click();

  // 6. Verify live data is back
  await expect(page.locator('h3', { hasText: 'Cosmic Caramels' })).toBeVisible();
  await expect(page.locator('h3', { hasText: 'OG Galaxy' })).not.toBeVisible();
});


test('favorite location flow', async ({ page }) => {
  // Use demo mode for predictable data
  await page.goto('/?demo=true');
  
  // Login first
  await page.goto('/brand-login');
  await page.locator('button', { hasText: 'Dev Magic Login' }).click();
  await page.locator('div[role="menuitem"]', { hasText: 'Login as martez@bakedbot.ai' }).click();

  // Navigate to the dashboard
  await page.goto('/account/dashboard');

  // Ensure we start in the "Set Favorite" state
  await expect(page.getByText('Set Your Favorite Location')).toBeVisible();

  // Select a location from the dropdown
  await page.getByRole('button', { name: 'Choose a location...' }).click();
  await page.getByLabel('The Green Spot').click();

  // Verify the new favorite is displayed
  await expect(page.getByText('Your Favorite')).toBeVisible();
  await expect(page.getByText('The Green Spot')).toBeVisible();

  // Click the 'Change' button
  await page.getByRole('button', { name: 'Change' }).click();

  // Verify it goes back to the initial selection state
  await expect(page.getByText('Set Your Favorite Location')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose a location...' })).toBeVisible();
});


test('full checkout flow', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');

    // 2. Select a location
    await page.getByText('The Green Spot').click();
    await expect(page.locator('.ring-primary')).toContainText('The Green Spot');

    // 3. Find the "Cosmic Caramels" product card and add it to cart
    const productCard = page.locator('.flex.flex-col.group.border', { has: page.locator('h3:has-text("Cosmic Caramels")') });
    await productCard.locator('button:has-text("Add")').click();

    // 4. Verify item is in cart by checking the pill
    await expect(page.locator('.fixed.bottom-6')).toContainText('View Cart');
    await expect(page.locator('.fixed.bottom-6 .inline-flex.items-center')).toContainText('1');

    // 5. Go to checkout
    await page.goto('/checkout');
    
    // 6. Fill out the form
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.fill('input[name="customerEmail"]', 'test@example.com');
    await page.fill('input[name="customerPhone"]', '555-555-5555');
    await page.fill('input[name="customerBirthDate"]', '1990-01-01');

    // 7. Submit the order
    await page.getByRole('button', { name: 'Place Order' }).click();

    // 8. Verify confirmation page
    await expect(page).toHaveURL(/\/order-confirmation\/.+/);
    await expect(page.locator('h1', { hasText: 'Order Confirmed' })).toBeVisible();
    await expect(page.getByText('Thank you, Test Customer!')).toBeVisible();
});


test('account page renders', async ({ page }) => {
  // Login first
  await page.goto('/brand-login');
  await page.locator('button', { hasText: 'Dev Magic Login' }).click();
  await page.locator('div[role="menuitem"]', { hasText: 'Login as martez@bakedbot.ai' }).click();

  // Navigate to the account page
  await page.goto('/account');

  // Verify the main account card is visible
  await expect(page.locator('h2', { hasText: 'My Account' })).toBeVisible();
  
  // Verify the dashboard button is present
  await expect(page.getByRole('link', { name: 'Go to My Dashboard' })).toBeVisible();
});
