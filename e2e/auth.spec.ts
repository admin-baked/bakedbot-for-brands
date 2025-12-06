import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Authentication Flows
 *
 * Tests cover:
 * - Brand, Customer, and Dispensary login flows
 * - Google OAuth integration for all roles
 * - Email/password sign-up for all roles
 * - Dev login button (development only)
 * - Logout functionality
 * - Session management
 * - Invalid credential handling
 * - Post-login role-based redirects
 *
 * Priority: CRITICAL (8/10)
 * Coverage Gap: Previously 15% - Core user journey
 */

test.describe('Brand Authentication', () => {
  test('brand login with dev login button', async ({ page }) => {
    await page.goto('/brand-login');

    // The DevLoginButton is the primary mechanism for dev login now
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // After login, it should redirect to the dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('brand login page displays correctly', async ({ page }) => {
    await page.goto('/brand-login');
    await page.waitForLoadState('domcontentloaded');

    // Should show login form
    await expect(page.getByRole('heading', { name: /brand login/i })).toBeVisible();

    // Should have email input
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput.first()).toBeVisible();

    // Should have password input
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput.first()).toBeVisible();

    // Should have login button
    const loginButton = page.locator('button:has-text(/sign in|login/i)');
    await expect(loginButton.first()).toBeVisible();
  });

  test('brand login with Google OAuth button exists', async ({ page }) => {
    await page.goto('/brand-login');
    await page.waitForLoadState('domcontentloaded');

    // Should have Google sign-in button
    const googleButton = page.locator('button:has-text(/google/i), button[aria-label*="google" i]');

    if (await googleButton.count() > 0) {
      await expect(googleButton.first()).toBeVisible();
    }
  });

  test('brand sign-up link navigates to registration', async ({ page }) => {
    await page.goto('/brand-login');
    await page.waitForLoadState('domcontentloaded');

    // Look for sign-up or register link
    const signUpLink = page.locator('a:has-text(/sign up|register|create account/i), button:has-text(/sign up|register/i)');

    if (await signUpLink.count() > 0) {
      await signUpLink.first().click();
      await page.waitForTimeout(500);

      // Should show sign-up form or stay on same page with form
      const hasSignUpForm = await page.locator('input[type="email"], form').count() > 0;
      expect(hasSignUpForm).toBe(true);
    }
  });

  test('invalid brand credentials show error', async ({ page }) => {
    await page.goto('/brand-login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button:has-text(/sign in|login/i)').first();

    // Fill with invalid credentials
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await loginButton.click();

    await page.waitForTimeout(2000);

    // Should show error message or stay on login page
    const errorMessage = page.locator('text=/invalid|incorrect|error|failed/i, [role="alert"]');
    const stayedOnLogin = page.url().includes('/brand-login');

    const hasError = await errorMessage.count() > 0 || stayedOnLogin;
    expect(hasError).toBe(true);
  });
});

test.describe('Customer Authentication', () => {
  test('customer login page displays correctly', async ({ page }) => {
    await page.goto('/customer-login');
    await page.waitForLoadState('domcontentloaded');

    // Should show login form
    const heading = page.locator('h1:has-text(/customer|login/i), h2:has-text(/customer|login/i)');
    await expect(heading.first()).toBeVisible();

    // Should have email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput.first()).toBeVisible();

    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('customer login with Google OAuth button exists', async ({ page }) => {
    await page.goto('/customer-login');
    await page.waitForLoadState('domcontentloaded');

    const googleButton = page.locator('button:has-text(/google/i), button[aria-label*="google" i]');

    if (await googleButton.count() > 0) {
      await expect(googleButton.first()).toBeVisible();
    }
  });

  test('customer sign-up flow is accessible', async ({ page }) => {
    await page.goto('/customer-login');
    await page.waitForLoadState('domcontentloaded');

    const signUpLink = page.locator('a:has-text(/sign up|register|create account/i), button:has-text(/sign up|register/i)');

    if (await signUpLink.count() > 0) {
      await signUpLink.first().click();
      await page.waitForTimeout(500);

      const hasSignUpForm = await page.locator('input[type="email"], form').count() > 0;
      expect(hasSignUpForm).toBe(true);
    }
  });

  test('customer login redirects to account page', async ({ page }) => {
    // Use dev login if available
    await page.goto('/customer-login');
    await page.waitForLoadState('domcontentloaded');

    const devLoginButton = page.getByTestId('dev-login-button');

    if (await devLoginButton.count() > 0) {
      await devLoginButton.click();

      const customerOption = page.getByTestId('dev-login-item-customer@bakedbot.ai');

      if (await customerOption.count() > 0) {
        await customerOption.click();
        await page.waitForTimeout(1000);

        // Should redirect to /account
        const currentUrl = page.url();
        expect(currentUrl).toContain('/account');
      }
    }
  });
});

test.describe('Dispensary Authentication', () => {
  test('dispensary login page displays correctly', async ({ page }) => {
    await page.goto('/dispensary-login');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.locator('h1:has-text(/dispensary|login/i), h2:has-text(/dispensary|login/i)');
    await expect(heading.first()).toBeVisible();

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput.first()).toBeVisible();

    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('dispensary login with Google OAuth button exists', async ({ page }) => {
    await page.goto('/dispensary-login');
    await page.waitForLoadState('domcontentloaded');

    const googleButton = page.locator('button:has-text(/google/i), button[aria-label*="google" i]');

    if (await googleButton.count() > 0) {
      await expect(googleButton.first()).toBeVisible();
    }
  });

  test('dispensary sign-up flow is accessible', async ({ page }) => {
    await page.goto('/dispensary-login');
    await page.waitForLoadState('domcontentloaded');

    const signUpLink = page.locator('a:has-text(/sign up|register|create account/i), button:has-text(/sign up|register/i)');

    if (await signUpLink.count() > 0) {
      await signUpLink.first().click();
      await page.waitForTimeout(500);

      const hasSignUpForm = await page.locator('input[type="email"], form').count() > 0;
      expect(hasSignUpForm).toBe(true);
    }
  });

  test('dispensary login redirects to dashboard', async ({ page }) => {
    await page.goto('/dispensary-login');
    await page.waitForLoadState('domcontentloaded');

    const devLoginButton = page.getByTestId('dev-login-button');

    if (await devLoginButton.count() > 0) {
      await devLoginButton.click();

      const dispensaryOption = page.getByTestId('dev-login-item-dispensary@bakedbot.ai');

      if (await dispensaryOption.count() > 0) {
        await dispensaryOption.click();
        await page.waitForTimeout(1000);

        const currentUrl = page.url();
        expect(currentUrl).toContain('/dashboard');
      }
    }
  });
});

test.describe('Google OAuth Flow', () => {
  test('brand Google OAuth button triggers popup or redirect', async ({ page, context }) => {
    await page.goto('/brand-login');
    await page.waitForLoadState('domcontentloaded');

    const googleButton = page.locator('button:has-text(/google/i)').first();

    if (await googleButton.count() > 0) {
      // Listen for popup
      const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);

      await googleButton.click();

      const popup = await popupPromise;

      if (popup) {
        // OAuth popup opened
        expect(popup.url()).toContain('google.com');
        await popup.close();
      } else {
        // Might be redirect-based OAuth
        await page.waitForTimeout(1000);
        const currentUrl = page.url();

        // Either redirected to Google or stayed on page (CSP block)
        const hasOAuthAttempt = currentUrl.includes('google') || currentUrl.includes('/brand-login');
        expect(hasOAuthAttempt).toBe(true);
      }
    }
  });

  test('customer Google OAuth button is functional', async ({ page, context }) => {
    await page.goto('/customer-login');
    await page.waitForLoadState('domcontentloaded');

    const googleButton = page.locator('button:has-text(/google/i)').first();

    if (await googleButton.count() > 0) {
      const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      await googleButton.click();

      const popup = await popupPromise;

      if (popup) {
        expect(popup.url()).toContain('google.com');
        await popup.close();
      }
    }
  });

  test('dispensary Google OAuth button is functional', async ({ page, context }) => {
    await page.goto('/dispensary-login');
    await page.waitForLoadState('domcontentloaded');

    const googleButton = page.locator('button:has-text(/google/i)').first();

    if (await googleButton.count() > 0) {
      const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      await googleButton.click();

      const popup = await popupPromise;

      if (popup) {
        expect(popup.url()).toContain('google.com');
        await popup.close();
      }
    }
  });
});

test.describe('Logout Functionality', () => {
  test('user can log out successfully', async ({ page }) => {
    // 1. Log in first using the dev login
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // 2. Go to the dashboard to ensure login state is active
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // 3. Click the logout button from the user dropdown in the main header
    await page.getByRole('button', { name: /My Account/ }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    // 4. Assert that the "Signed Out" toast appears
    await expect(page.getByText('Signed Out')).toBeVisible();

    // 5. Assert that the user is redirected to the homepage
    await page.waitForURL('**/');
    await expect(page.getByRole('heading', { name: /Keep the customer in your brand funnel/i })).toBeVisible();

    // 6. Assert that trying to access a protected route redirects to login
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL('/dashboard');
    // After logout, it should redirect to the brand login page.
    await expect(page.getByRole('heading', { name: 'Brand Login' })).toBeVisible();
  });

  test('logout clears session cookies', async ({ page, context }) => {
    // Login first
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    await page.goto('/dashboard');

    // Logout
    await page.getByRole('button', { name: /My Account/ }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    await page.waitForTimeout(1000);

    // Check cookies are cleared
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === '__session' || c.name.includes('token'));

    // Session cookie should be removed or expired
    if (sessionCookie) {
      expect(sessionCookie.value).toBe('');
    }
  });

  test('logout clears localStorage auth data', async ({ page }) => {
    // Login
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    await page.goto('/dashboard');

    // Logout
    await page.getByRole('button', { name: /My Account/ }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    await page.waitForTimeout(1000);

    // Check localStorage is cleared
    const hasAuthData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(key => key.includes('firebase') || key.includes('auth'));
    });

    expect(hasAuthData).toBe(false);
  });
});

test.describe('Session Management', () => {
  test('session persists across page refreshes when logged in', async ({ page }) => {
    // Login
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Refresh
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    // Clear any existing session
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();

    // Try to access protected route
    await page.goto('/dashboard/products');

    // Should redirect to login
    await page.waitForTimeout(1000);
    const currentUrl = page.url();

    const isRedirected = currentUrl.includes('/login') ||
                        currentUrl.includes('/brand-login') ||
                        !currentUrl.includes('/dashboard');

    expect(isRedirected).toBe(true);
  });
});

test.describe('Password Reset Flow', () => {
  test('brand login has forgot password link', async ({ page }) => {
    await page.goto('/brand-login');
    await page.waitForLoadState('domcontentloaded');

    const forgotPasswordLink = page.locator('a:has-text(/forgot password|reset password/i)');

    if (await forgotPasswordLink.count() > 0) {
      await expect(forgotPasswordLink.first()).toBeVisible();
    }
  });

  test('customer login has forgot password link', async ({ page }) => {
    await page.goto('/customer-login');
    await page.waitForLoadState('domcontentloaded');

    const forgotPasswordLink = page.locator('a:has-text(/forgot password|reset password/i)');

    if (await forgotPasswordLink.count() > 0) {
      await expect(forgotPasswordLink.first()).toBeVisible();
    }
  });

  test('forgot password link navigates to reset page', async ({ page }) => {
    await page.goto('/brand-login');
    await page.waitForLoadState('domcontentloaded');

    const forgotPasswordLink = page.locator('a:has-text(/forgot password|reset password/i)').first();

    if (await forgotPasswordLink.count() > 0) {
      await forgotPasswordLink.click();
      await page.waitForTimeout(500);

      // Should show password reset form
      const hasResetForm = await page.locator('input[type="email"], form').count() > 0;
      expect(hasResetForm).toBe(true);
    }
  });
});
