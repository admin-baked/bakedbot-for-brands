/**
 * Scrape 1937 brand products from Thrive menu
 */

import { chromium } from 'playwright';

async function scrape1937Brand() {
    console.log('🌐 Opening Thrive Syracuse 1937 brand page...\n');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        await page.goto('https://thrivesyracuse.com/menu/brands/1937', {
            waitUntil: 'networkidle',
            timeout: 30000
        });

        console.log('✅ Page loaded\n');

        // Wait for products to load
        await page.waitForTimeout(3000);

        // Extract all product names
        const products = await page.evaluate(() => {
            const productElements = document.querySelectorAll('[class*="product"], [class*="Product"], [data-testid*="product"]');
            const results: any[] = [];

            productElements.forEach((el) => {
                const text = el.textContent || '';

                // Try to find product name
                const nameEl = el.querySelector('h2, h3, h4, [class*="name"], [class*="Name"], [class*="title"]');
                const name = nameEl?.textContent?.trim() || '';

                if (name && name.includes('1937')) {
                    results.push({
                        name,
                        fullText: text.substring(0, 200) // First 200 chars for context
                    });
                }
            });

            return results;
        });

        console.log(`📦 Found ${products.length} 1937 products:\n`);

        products.forEach((p, idx) => {
            console.log(`${idx + 1}. ${p.name}`);
        });

        // Also try a more general approach - get all text that mentions 1937
        const allText = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('*'))
                .map(el => el.textContent)
                .filter(text => text && text.includes('1937'))
                .slice(0, 20); // First 20 matches
        });

        console.log('\n\n📝 All 1937 mentions on page:\n');
        allText.forEach((text, idx) => {
            const cleaned = text?.trim().substring(0, 150);
            if (cleaned) {
                console.log(`${idx + 1}. ${cleaned}...`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

scrape1937Brand()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
