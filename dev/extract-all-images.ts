/**
 * Extract ALL images from Thrive menu and save them for use as product images
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

async function extractAllImages() {
    console.log('🖼️  Extracting ALL Product Images from Thrive Menu...\n');
    console.log('═'.repeat(70));

    let browser;

    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        console.log('\n📥 Loading menu...');
        await page.goto('https://thrivesyracuse.com/menu', { waitUntil: 'networkidle' });

        // Scroll to load all products
        console.log('📜 Scrolling to load all products...');
        for (let i = 0; i < 15; i++) {
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1500);
        }

        console.log('🖼️  Extracting all images...');

        // Extract ALL images
        const allImages = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs
                .filter(img =>
                    img.src.includes('dispense-images.imgix.net') ||
                    img.src.includes('imgix.dispenseapp.com')
                )
                .map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    // Extract product info from nearby text
                    nearbyText: img.parentElement?.textContent?.trim() || ''
                }));
        });

        console.log(`   ✅ Found ${allImages.length} product images\n`);

        // Save all images
        fs.writeFileSync(
            'dev/all-product-images.json',
            JSON.stringify(allImages, null, 2)
        );

        // Create a simple image pool (just URLs)
        const imagePool = allImages.map(img => img.src);
        console.log('📸 Creating randomized image pool...');

        // Shuffle the image pool for variety
        const shuffledPool = imagePool.sort(() => Math.random() - 0.5);

        // Update all products with images from pool
        console.log('\n🔄 Updating products with scraped images...\n');

        const productsSnapshot = await db.collection('tenants')
            .doc('org_thrive_syracuse')
            .collection('publicViews')
            .doc('products')
            .collection('items')
            .get();

        let updated = 0;

        for (const doc of productsSnapshot.docs) {
            const imageUrl = shuffledPool[updated % shuffledPool.length];

            await doc.ref.update({
                imageUrl,
                imageSource: 'scraped_dispense_menu_pool',
                updatedAt: new Date().toISOString()
            });

            updated++;

            if (updated % 50 === 0) {
                console.log(`   Updated ${updated}/${productsSnapshot.size} products...`);
            }
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`\n✅ Complete!\n`);
        console.log(`   Images extracted: ${allImages.length}`);
        console.log(`   Products updated: ${updated}`);
        console.log(`\n   💡 All products now use real images from Dispense/imgix`);
        console.log(`   📝 Images are rotated from pool for variety`);

        await browser.close();

    } catch (error) {
        console.error('\n❌ Failed:', error);
        if (browser) await browser.close();
        throw error;
    }
}

extractAllImages()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
