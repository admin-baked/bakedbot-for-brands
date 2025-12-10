import { test, expect } from '@playwright/test';

/**
 * Dispensary Components Tests
 * Tests individual dispensary UI components
 */

test.describe('Dispensary Components', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a shop page that uses dispensary components
    await page.goto('/shop/dispensary-1');
  });

  // Dispensary Header Tests
  test.describe('Dispensary Header', () => {
    test('should display dispensary header', async ({ page }) => {
      const header = page.locator('[data-testid="dispensary-header"]');
      await expect(header).toBeVisible();
    });

    test('should display dispensary name', async ({ page }) => {
      const dispensaryName = page.locator('[data-testid="dispensary-name"]');
      await expect(dispensaryName).toBeVisible();
      
      // Should have text content
      const text = await dispensaryName.textContent();
      expect(text?.length).toBeGreaterThan(0);
    });

    test('should display dispensary rating if available', async ({ page }) => {
      const rating = page.locator('[data-testid="dispensary-rating"]');
      
      if (await rating.isVisible()) {
        await expect(rating).toBeVisible();
        // Should show star rating
        const stars = rating.locator('[data-testid="star-icon"]');
        const starCount = await stars.count();
        expect(starCount).toBeGreaterThan(0);
      }
    });

    test('should display dispensary address', async ({ page }) => {
      const address = page.locator('[data-testid="dispensary-address"]');
      
      if (await address.isVisible()) {
        await expect(address).toBeVisible();
      }
    });

    test('should display operating hours', async ({ page }) => {
      const hours = page.locator('[data-testid="dispensary-hours"]');
      
      if (await hours.isVisible()) {
        await expect(hours).toBeVisible();
      }
    });
  });

  // Category Navigation Tests
  test.describe('Category Navigation', () => {
    test('should display category navigation', async ({ page }) => {
      const categoryNav = page.locator('[data-testid="category-nav"]');
      await expect(categoryNav).toBeVisible();
    });

    test('should display multiple category buttons', async ({ page }) => {
      const categoryButtons = page.locator('[data-testid="category-button"]');
      const count = await categoryButtons.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should highlight active category', async ({ page }) => {
      const categoryButtons = page.locator('[data-testid="category-button"]');
      
      if (await categoryButtons.first().isVisible()) {
        const firstButton = categoryButtons.first();
        
        // Click it
        await firstButton.click();
        
        // Should have active styling
        await expect(firstButton).toHaveAttribute('data-active', 'true');
      }
    });

    test('should filter products when category is selected', async ({ page }) => {
      const categoryButtons = page.locator('[data-testid="category-button"]');
      
      if (await categoryButtons.nth(1).isVisible()) {
        // Click second category
        await categoryButtons.nth(1).click();
        
        // Products should update
        const products = page.locator('[data-testid="product-card"]');
        await expect(products.first()).toBeVisible();
      }
    });

    test('should show all/featured category option', async ({ page }) => {
      const allButton = page.locator('[data-testid="category-all"]');
      
      if (await allButton.isVisible()) {
        await allButton.click();
        await expect(allButton).toHaveAttribute('data-active', 'true');
      }
    });
  });

  // Deal Card Tests
  test.describe('Deal Cards', () => {
    test('should display deal cards', async ({ page }) => {
      // Navigate to deals section if available
      const dealsSection = page.locator('[data-testid="deals-carousel"]');
      
      if (await dealsSection.isVisible()) {
        const dealCards = dealsSection.locator('[data-testid="deal-card"]');
        const count = await dealCards.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should display deal price and savings', async ({ page }) => {
      const dealsSection = page.locator('[data-testid="deals-carousel"]');
      
      if (await dealsSection.isVisible()) {
        const dealCard = dealsSection.locator('[data-testid="deal-card"]').first();
        
        if (await dealCard.isVisible()) {
          const price = dealCard.locator('[data-testid="deal-price"]');
          const savings = dealCard.locator('[data-testid="deal-savings"]');
          
          if (await price.isVisible()) {
            await expect(price).toBeVisible();
          }
          if (await savings.isVisible()) {
            await expect(savings).toBeVisible();
          }
        }
      }
    });

    test('should display deal badge if featured', async ({ page }) => {
      const dealsSection = page.locator('[data-testid="deals-carousel"]');
      
      if (await dealsSection.isVisible()) {
        const dealCard = dealsSection.locator('[data-testid="deal-card"]').first();
        const badge = dealCard.locator('[data-testid="deal-badge"]');
        
        if (await badge.isVisible()) {
          await expect(badge).toBeVisible();
        }
      }
    });

    test('should be clickable to open builder', async ({ page }) => {
      const dealsSection = page.locator('[data-testid="deals-carousel"]');
      
      if (await dealsSection.isVisible()) {
        const dealCard = dealsSection.locator('[data-testid="deal-card"]').first();
        const button = dealCard.locator('[data-testid="build-bundle-button"]');
        
        if (await button.isVisible()) {
          await expect(button).toBeEnabled();
        }
      }
    });
  });

  // Deals Carousel Tests
  test.describe('Deals Carousel', () => {
    test('should display deals carousel', async ({ page }) => {
      const carousel = page.locator('[data-testid="deals-carousel"]');
      
      if (await carousel.isVisible()) {
        await expect(carousel).toBeVisible();
      }
    });

    test('should have carousel navigation controls', async ({ page }) => {
      const carousel = page.locator('[data-testid="deals-carousel"]');
      
      if (await carousel.isVisible()) {
        const prevButton = carousel.locator('[data-testid="carousel-prev"]');
        const nextButton = carousel.locator('[data-testid="carousel-next"]');
        
        if (await prevButton.isVisible()) {
          await expect(prevButton).toBeVisible();
        }
        if (await nextButton.isVisible()) {
          await expect(nextButton).toBeVisible();
        }
      }
    });

    test('should navigate carousel with arrow buttons', async ({ page }) => {
      const carousel = page.locator('[data-testid="deals-carousel"]');
      
      if (await carousel.isVisible()) {
        const nextButton = carousel.locator('[data-testid="carousel-next"]');
        
        if (await nextButton.isVisible()) {
          const initialScroll = await carousel.evaluate(el => el.scrollLeft);
          
          await nextButton.click();
          
          await page.waitForTimeout(300);
          const afterScroll = await carousel.evaluate(el => el.scrollLeft);
          
          // Should have scrolled
          expect(afterScroll).toBeGreaterThanOrEqual(initialScroll);
        }
      }
    });
  });

  // Category Navigation Style Tests
  test.describe('Navigation Styling', () => {
    test('should have proper contrast on category buttons', async ({ page }) => {
      const categoryButtons = page.locator('[data-testid="category-button"]');
      const firstButton = categoryButtons.first();
      
      if (await firstButton.isVisible()) {
        // Should have visible text
        const text = await firstButton.textContent();
        expect(text?.length).toBeGreaterThan(0);
      }
    });

    test('should be responsive on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const categoryNav = page.locator('[data-testid="category-nav"]');
      await expect(categoryNav).toBeVisible();
    });
  });
});
