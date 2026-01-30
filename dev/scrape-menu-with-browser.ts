/**
 * Use browser automation to scrape Thrive Syracuse's rendered menu
 * and extract product images
 */

import { chromium } from 'playwright';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Initialize Firebase Admin
const apps = getApps();
if (apps.length === 0) {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const db = getFirestore();

interface ScrapedProduct {
    name: string;
    imageUrl: string;
    brand?: string;
    category?: string;
    price?: string;
}

async function scrapeMenuWithBrowser() {
    console.log('🌐 Scraping Thrive Syracuse Menu with Browser Automation...\n');
    console.log('═'.repeat(70));

    const menuUrl = 'https://thrivesyracuse.com/menu';
    let browser;

    try {
        // Launch browser
        console.log('\n🚀 Launching browser...');
        browser = await chromium.launch({
            headless: true,
        });

        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        console.log(`📥 Navigating to ${menuUrl}...`);
        await page.goto(menuUrl, { waitUntil: 'networkidle' });

        console.log('⏳ Waiting for products to load...');

        // Wait for products to appear (adjust selector based on actual menu structure)
        // Common selectors for product grids
        const possibleSelectors = [
            '[data-testid*="product"]',
            '.product-card',
            '.product-item',
            '[class*="product"]',
            'article',
            '[role="article"]',
        ];

        let productSelector = '';
        for (const selector of possibleSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 5000 });
                const count = await page.locator(selector).count();
                if (count > 10) { // Likely found the product cards
                    productSelector = selector;
                    console.log(`   ✅ Found ${count} products using selector: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        // Scroll down to load all products (infinite scroll)
        console.log('📜 Scrolling to load all products...');

        let previousCount = 0;
        let currentCount = 0;
        let scrollAttempts = 0;
        const maxScrolls = 20;

        while (scrollAttempts < maxScrolls) {
            // Scroll to bottom
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });

            // Wait for new products to load
            await page.waitForTimeout(2000);

            // Count current products
            if (productSelector) {
                currentCount = await page.locator(productSelector).count();
            } else {
                // Try to find products if we haven't yet
                for (const selector of possibleSelectors) {
                    const count = await page.locator(selector).count();
                    if (count > 0) {
                        productSelector = selector;
                        currentCount = count;
                        break;
                    }
                }
            }

            console.log(`   Scroll ${scrollAttempts + 1}: ${currentCount} products loaded`);

            // If no new products loaded, we've reached the end
            if (currentCount === previousCount) {
                console.log(`   ✅ Loaded all products (${currentCount} total)`);
                break;
            }

            previousCount = currentCount;
            scrollAttempts++;
        }

        if (!productSelector) {
            console.log('   ⚠️  Could not find product cards with known selectors');
            console.log('   💡 Taking screenshot for manual inspection...');
            await page.screenshot({ path: 'dev/menu-screenshot.png', fullPage: true });
            console.log('   📸 Saved screenshot to dev/menu-screenshot.png');

            // Try to extract all images on page
            console.log('\n🖼️  Extracting all images from page...');
            const allImages = await page.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                return imgs.map(img => ({
                    src: img.src,
                    alt: img.alt,
                    width: img.width,
                    height: img.height
                }));
            });

            console.log(`   Found ${allImages.length} total images`);

            // Filter for product-like images (likely imgix URLs)
            const productImages = allImages.filter(img =>
                img.src.includes('imgix') ||
                img.src.includes('dispense')
            );

            console.log(`   Found ${productImages.length} Dispense/imgix images`);

            // Save all images for inspection
            fs.writeFileSync(
                'dev/all-menu-images.json',
                JSON.stringify(productImages, null, 2)
            );
            console.log('   💾 Saved to dev/all-menu-images.json');

            if (productImages.length === 0) {
                throw new Error('No product images found on page');
            }
        }

        // Extract product data
        console.log('\n📦 Extracting product data...');

        const products = await page.evaluate(() => {
            // Try to find product cards
            const cards = document.querySelectorAll('[data-testid*="product"], .product-card, .product-item, article');

            return Array.from(cards).map(card => {
                // Find image
                const img = card.querySelector('img');

                // Find product name (usually in h2, h3, or specific data-testid)
                const nameEl = card.querySelector('h2, h3, [data-testid*="name"], [data-testid*="title"]');

                // Find brand
                const brandEl = card.querySelector('[data-testid*="brand"], .brand, .manufacturer');

                // Find category
                const categoryEl = card.querySelector('[data-testid*="category"], .category, .type');

                // Find price
                const priceEl = card.querySelector('[data-testid*="price"], .price, .cost');

                return {
                    name: nameEl?.textContent?.trim() || '',
                    imageUrl: img?.src || '',
                    brand: brandEl?.textContent?.trim() || '',
                    category: categoryEl?.textContent?.trim() || '',
                    price: priceEl?.textContent?.trim() || '',
                };
            }).filter(p => p.name && p.imageUrl);
        });

        console.log(`   ✅ Extracted ${products.length} products with images\n`);

        if (products.length === 0) {
            throw new Error('No products extracted from page');
        }

        // Save scraped products
        fs.writeFileSync(
            'dev/scraped-products-browser.json',
            JSON.stringify(products, null, 2)
        );
        console.log('   💾 Saved to dev/scraped-products-browser.json');

        // Show samples
        console.log('\n📸 Sample Products:\n');
        products.slice(0, 5).forEach((p, idx) => {
            console.log(`   ${idx + 1}. ${p.name}`);
            console.log(`      Brand: ${p.brand || 'N/A'}`);
            console.log(`      Category: ${p.category || 'N/A'}`);
            console.log(`      Image: ${p.imageUrl.substring(0, 80)}...`);
            console.log('');
        });

        // Match to our products in Firestore
        console.log('\n🔗 Matching to Firestore products...\n');

        const ourProductsSnapshot = await db.collection('tenants')
            .doc('org_thrive_syracuse')
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        let matched = 0;
        let updated = 0;
        const unmatched: string[] = [];

        for (const doc of ourProductsSnapshot.docs) {
            const ourProduct = doc.data();
            const ourName = ourProduct.name.toLowerCase().trim();

            // Try to match by name
            const match = products.find(p => {
                const scrapedName = p.name.toLowerCase().trim();

                // Try exact match first
                if (scrapedName === ourName) return true;

                // Try contains match
                if (scrapedName.includes(ourName) || ourName.includes(scrapedName)) return true;

                // Try fuzzy match (remove common words)
                const cleanScrape = scrapedName.replace(/\s+(pre roll|preroll|cartridge|cart|vape|flower|gummies|edible)/g, '').trim();
                const cleanOur = ourName.replace(/\s+(pre roll|preroll|cartridge|cart|vape|flower|gummies|edible)/g, '').trim();

                return cleanScrape === cleanOur ||
                       cleanScrape.includes(cleanOur) ||
                       cleanOur.includes(cleanScrape);
            });

            if (match && match.imageUrl) {
                matched++;

                // Update with real image from Dispense
                await doc.ref.update({
                    imageUrl: match.imageUrl,
                    imageSource: 'scraped_dispense_menu',
                    updatedAt: new Date().toISOString()
                });

                updated++;

                if (updated % 20 === 0) {
                    console.log(`   Matched and updated ${updated} products...`);
                }
            } else {
                unmatched.push(ourProduct.name);
            }
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`\n✅ Scraping Complete!\n`);
        console.log(`   Products scraped: ${products.length}`);
        console.log(`   Products matched: ${matched}`);
        console.log(`   Products updated: ${updated}`);
        console.log(`   Match rate: ${Math.round((matched / ourProductsSnapshot.size) * 100)}%`);
        console.log(`   Unmatched: ${unmatched.length}`);

        if (unmatched.length > 0) {
            console.log('\n📝 Sample unmatched products:');
            unmatched.slice(0, 10).forEach((name, idx) => {
                console.log(`   ${idx + 1}. ${name}`);
            });

            // Save unmatched for review
            fs.writeFileSync(
                'dev/unmatched-products.json',
                JSON.stringify(unmatched, null, 2)
            );
            console.log(`\n   💾 Full list saved to dev/unmatched-products.json`);
        }

        await browser.close();

    } catch (error) {
        console.error('\n❌ Failed:', error);
        if (browser) await browser.close();
        throw error;
    }
}

scrapeMenuWithBrowser()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
