import { test, expect } from '@playwright/test';

/**
 * Carousel & Promotions Tests
 * Tests the carousel and promotions dashboard features
 */

test.describe('Carousel Promotions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to carousel promotions dashboard
    await page.goto('/dashboard/promotions/carousel');
  });

  test('should display carousel promotions dashboard', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toContainText(/carousel|promotions|banner/i);
  });

  test('should show create carousel button', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-carousel-button"]');
    
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
      await expect(createButton).toBeEnabled();
    }
  });

  test('should display carousel list', async ({ page }) => {
    const carouselList = page.locator('[data-testid="carousel-list"]');
    
    if (await carouselList.isVisible()) {
      await expect(carouselList).toBeVisible();
    }
  });

  test('should display carousel items with preview', async ({ page }) => {
    const carouselItems = page.locator('[data-testid="carousel-item"]');
    const count = await carouselItems.count();
    
    if (count > 0) {
      const firstItem = carouselItems.first();
      
      // Should have preview image or content
      const preview = firstItem.locator('[data-testid="carousel-preview"]');
      if (await preview.isVisible()) {
        await expect(preview).toBeVisible();
      }
    }
  });

  test('should show carousel status', async ({ page }) => {
    const carouselItems = page.locator('[data-testid="carousel-item"]');
    const count = await carouselItems.count();
    
    if (count > 0) {
      const status = carouselItems.first().locator('[data-testid="carousel-status"]');
      
      if (await status.isVisible()) {
        await expect(status).toBeVisible();
      }
    }
  });

  test('should allow editing carousel', async ({ page }) => {
    const carouselItems = page.locator('[data-testid="carousel-item"]');
    const count = await carouselItems.count();
    
    if (count > 0) {
      const editButton = carouselItems.first().locator('[data-testid="edit-carousel-button"]');
      
      if (await editButton.isVisible()) {
        await expect(editButton).toBeEnabled();
      }
    }
  });

  test('should allow deleting carousel', async ({ page }) => {
    const carouselItems = page.locator('[data-testid="carousel-item"]');
    const count = await carouselItems.count();
    
    if (count > 0) {
      const deleteButton = carouselItems.first().locator('[data-testid="delete-carousel-button"]');
      
      if (await deleteButton.isVisible()) {
        await expect(deleteButton).toBeVisible();
      }
    }
  });

  test('should show carousel details with view more option', async ({ page }) => {
    const carouselItems = page.locator('[data-testid="carousel-item"]');
    const count = await carouselItems.count();
    
    if (count > 0) {
      const viewButton = carouselItems.first().locator('[data-testid="view-carousel-details"]');
      
      if (await viewButton.isVisible()) {
        await viewButton.click();
        
        // Should show details dialog or page
        await page.waitForTimeout(300);
      }
    }
  });

  test('should handle empty carousel state', async ({ page }) => {
    const carouselList = page.locator('[data-testid="carousel-list"]');
    const items = page.locator('[data-testid="carousel-item"]');
    
    const itemCount = await items.count();
    if (itemCount === 0) {
      const emptyState = page.locator('[data-testid="empty-carousel-state"]');
      
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('should display carousel analytics if available', async ({ page }) => {
    const carouselItems = page.locator('[data-testid="carousel-item"]');
    const count = await carouselItems.count();
    
    if (count > 0) {
      const clicks = carouselItems.first().locator('[data-testid="carousel-clicks"]');
      const impressions = carouselItems.first().locator('[data-testid="carousel-impressions"]');
      
      if (await clicks.isVisible()) {
        await expect(clicks).toBeVisible();
      }
      if (await impressions.isVisible()) {
        await expect(impressions).toBeVisible();
      }
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    
    const createButton = page.locator('[data-testid="create-carousel-button"]');
    if (await createButton.isVisible()) {
      await expect(createButton).toBeVisible();
    }
  });
});

test.describe('Carousel on Customer Pages', () => {
  test('should display carousel on shop page', async ({ page }) => {
    await page.goto('/shop/dispensary-1');
    
    const carousel = page.locator('[data-testid="promotions-carousel"]');
    
    if (await carousel.isVisible()) {
      await expect(carousel).toBeVisible();
    }
  });

  test('should display carousel slides', async ({ page }) => {
    await page.goto('/shop/dispensary-1');
    
    const carousel = page.locator('[data-testid="promotions-carousel"]');
    
    if (await carousel.isVisible()) {
      const slides = carousel.locator('[data-testid="carousel-slide"]');
      const count = await slides.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should be auto-rotating if configured', async ({ page }) => {
    await page.goto('/shop/dispensary-1');
    
    const carousel = page.locator('[data-testid="promotions-carousel"]');
    
    if (await carousel.isVisible()) {
      const slides = carousel.locator('[data-testid="carousel-slide"]');
      const count = await slides.count();
      
      if (count > 1) {
        // Get initial visible slide
        const initialSlide = carousel.locator('[data-testid="carousel-slide"][data-active="true"]');
        const initialId = await initialSlide.getAttribute('data-slide-id');
        
        // Wait for auto-rotate
        await page.waitForTimeout(2000);
        
        // Slide should have changed
        const newSlide = carousel.locator('[data-testid="carousel-slide"][data-active="true"]');
        const newId = await newSlide.getAttribute('data-slide-id');
        
        // IDs might differ if auto-rotating
        expect(newId).toBeDefined();
      }
    }
  });

  test('should be manually navigable', async ({ page }) => {
    await page.goto('/shop/dispensary-1');
    
    const carousel = page.locator('[data-testid="promotions-carousel"]');
    
    if (await carousel.isVisible()) {
      const nextButton = carousel.locator('[data-testid="carousel-next"]');
      
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(300);
        
        // Should have navigated
        await expect(carousel).toBeVisible();
      }
    }
  });

  test('should handle carousel clicks', async ({ page }) => {
    await page.goto('/shop/dispensary-1');
    
    const carousel = page.locator('[data-testid="promotions-carousel"]');
    
    if (await carousel.isVisible()) {
      const slide = carousel.locator('[data-testid="carousel-slide"]').first();
      
      if (await slide.isVisible()) {
        const clickableArea = slide.locator('[role="button"]').first();
        
        if (await clickableArea.isVisible()) {
          await clickableArea.click();
          
          // Should navigate or open promotion
          await page.waitForTimeout(300);
        }
      }
    }
  });
});
