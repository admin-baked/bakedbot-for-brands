
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

test('dispensary login flow', async ({ page }) => {
    await page.goto('/dispensary-login');

    // Fill in the email and click the magic link button
    await page.fill('input[name="email"]', 'dispensary@bakedbot.ai');
    await page.locator('button', { hasText: 'Send Magic Link' }).click();

    // Expect the "Check Your Inbox!" card to be visible
    await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

    // Expect the email address to be displayed
    await expect(page.locator('strong', { hasText: 'dispensary@bakedbot.ai' })).toBeVisible();
    
    // Now, verify we can get to the dispensary order dashboard (simulating successful login)
    await page.goto('/dashboard/orders');
    
    // Verify dashboard loads
    await expect(page.locator('h1', { hasText: 'Customer Orders' })).toBeVisible();
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
  await page.locator('div[role="menuitem"]', { hasText: 'Login as brand@bakedbot.ai' }).click();

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
  await page.locator('div[role="menuitem"]', { hasText: 'Login as brand@bakedbot.ai' }).click();

  // Navigate to the account page
  await page.goto('/account');

  // Verify the main account card is visible
  await expect(page.locator('h2', { hasText: 'My Account' })).toBeVisible();
  
  // Verify the dashboard button is present
  await expect(page.getByRole('link', { name: 'Go to My Dashboard' })).toBeVisible();
});

test('review submission flow', async ({ page }) => {
  // 1. Log in as a user
  await page.goto('/customer-login');
  await page.locator('button:has-text("Dev Magic Login")').click();
  await page.locator('div[role="menuitem"]:has-text("Login as customer@bakedbot.ai")').click();

  // 2. Go to the review page
  await page.goto('/leave-a-review');
  await expect(page.locator('h1:has-text("Leave a Review")')).toBeVisible();

  // 3. Select a product
  await page.locator('button[role="combobox"]').click();
  await page.locator('div[role="option"]:has-text("Cosmic Caramels")').click();

  // 4. Set a rating (click the 4th star)
  await page.locator('.flex.items-center.gap-1 > svg').nth(3).click();

  // 5. Fill in the review text
  await page.locator('textarea[name="text"]').fill('This is a test review from an automated test. It was great!');

  // 6. Submit the form
  await page.locator('button:has-text("Submit Review")').click();

  // 7. Verify the success message
  await expect(page.locator('h1:has-text("Thank You!")')).toBeVisible();
});
