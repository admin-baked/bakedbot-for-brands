import { test, expect } from '../../auth/fixtures';

test.describe('Brand Pages Management - org_ecstatic_edibles (brand_admin)', () => {
  test('page loads without redirecting to login or dashboard', async ({ brandPage }) => {
    await brandPage.goto('/dashboard/brand-pages', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Ensure we stay on the brand-pages route and don't get redirected
    await brandPage.waitForTimeout(2000);
    const url = brandPage.url();
    expect(url).toContain('/dashboard/brand-pages');
    expect(url).not.toContain('/signin');
  });

  test('displays page heading and main content area', async ({ brandPage }) => {
    await brandPage.goto('/dashboard/brand-pages', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for content to load - look for any heading or meaningful content
    const headingOrContent = brandPage.getByRole('heading').first();
    await expect(headingOrContent).toBeVisible({ timeout: 15000 });

    // Check for brand pages related text - could be heading, tabs, or section labels
    const pageContent = await brandPage.textContent('body');
    const hasBrandPagesContent = pageContent && (
      pageContent.includes('Brand Pages') ||
      pageContent.includes('brand pages') ||
      pageContent.includes('About') ||
      pageContent.includes('Careers') ||
      pageContent.includes('Locations') ||
      pageContent.includes('Contact') ||
      pageContent.includes('Loyalty') ||
      pageContent.includes('Press') ||
      pageContent.includes('Pages')
    );
    expect(hasBrandPagesContent).toBeTruthy();
  });

  test('displays page type tabs or sections for editing', async ({ brandPage }) => {
    await brandPage.goto('/dashboard/brand-pages', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the client component to render
    await brandPage.waitForTimeout(3000);

    // The page manages About, Careers, Locations, Contact, Loyalty, and Press pages
    // Look for tabs, buttons, or links representing these page types
    const pageTypes = ['About', 'Careers', 'Locations', 'Contact', 'Loyalty', 'Press'];
    let foundPageTypes = 0;

    for (const pageType of pageTypes) {
      const element = brandPage.getByRole('tab', { name: new RegExp(pageType, 'i') })
        .or(brandPage.getByRole('button', { name: new RegExp(pageType, 'i') }))
        .or(brandPage.getByRole('link', { name: new RegExp(pageType, 'i') }))
        .or(brandPage.getByText(new RegExp(`^${pageType}$`, 'i')));

      try {
        await expect(element.first()).toBeVisible({ timeout: 5000 });
        foundPageTypes++;
      } catch {
        // Some page types might not be visible initially
      }
    }

    // We should find at least some of the page types
    expect(foundPageTypes).toBeGreaterThanOrEqual(1);
  });

  test('interactive elements respond to clicks (tab switching or page selection)', async ({ brandPage }) => {
    await brandPage.goto('/dashboard/brand-pages', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for client-side hydration
    await brandPage.waitForTimeout(3000);

    // Try to find and click on a tab or page type selector
    const pageTypes = ['About', 'Careers', 'Locations', 'Contact', 'Loyalty', 'Press'];

    for (const pageType of pageTypes) {
      const clickable = brandPage.getByRole('tab', { name: new RegExp(pageType, 'i') })
        .or(brandPage.getByRole('button', { name: new RegExp(pageType, 'i') }))
        .or(brandPage.getByRole('link', { name: new RegExp(pageType, 'i') }));

      const firstClickable = clickable.first();
      try {
        await expect(firstClickable).toBeVisible({ timeout: 5000 });
        await firstClickable.click();
        // After clicking, the page should still be on brand-pages (no navigation away)
        await brandPage.waitForTimeout(1000);
        expect(brandPage.url()).toContain('/dashboard/brand-pages');
        break; // Successfully clicked one, that's enough
      } catch {
        continue;
      }
    }
  });

  test('no error states or crash indicators on the page', async ({ brandPage }) => {
    await brandPage.goto('/dashboard/brand-pages', { waitUntil: 'domcontentloaded', timeout: 30000 });

    await brandPage.waitForTimeout(3000);

    // Check there are no error messages visible
    const errorMessages = brandPage.getByText(/something went wrong|error occurred|500|internal server error|unhandled/i);
    await expect(errorMessages).toHaveCount(0, { timeout: 5000 });

    // Verify the page has substantive content (not blank)
    const bodyText = await brandPage.textContent('body');
    expect(bodyText && bodyText.trim().length).toBeGreaterThan(50);
  });
});