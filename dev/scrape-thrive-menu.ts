/**
 * Scrape Thrive Syracuse's current menu to extract product images
 * and match them to our products in Firestore
 */

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
    price?: number;
    category?: string;
    brand?: string;
}

async function scrapeMenu() {
    console.log('🌐 Scraping Thrive Syracuse Menu...\n');
    console.log('═'.repeat(70));

    const menuUrl = 'https://thrivesyracuse.com/menu';

    try {
        // Fetch the menu page
        console.log(`\n📥 Fetching ${menuUrl}...\n`);
        const response = await fetch(menuUrl);
        const html = await response.text();

        // Save HTML for debugging
        const htmlPath = path.join(process.cwd(), 'dev', 'thrive-menu.html');
        fs.writeFileSync(htmlPath, html);
        console.log(`   ✅ Saved HTML to ${htmlPath}`);

        // Parse for product data
        // Dispense menu likely uses JSON embedded in the page or loads via API
        // Look for Next.js __NEXT_DATA__ script
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);

        if (nextDataMatch) {
            console.log('\n   ✅ Found Next.js data!\n');

            const nextData = JSON.parse(nextDataMatch[1]);
            const dataPath = path.join(process.cwd(), 'dev', 'thrive-menu-data.json');
            fs.writeFileSync(dataPath, JSON.stringify(nextData, null, 2));
            console.log(`   ✅ Saved Next.js data to ${dataPath}`);

            // Explore the data structure
            console.log('\n📊 Data Structure:');
            console.log(`   Keys: ${Object.keys(nextData).join(', ')}`);

            if (nextData.props) {
                console.log(`   Props keys: ${Object.keys(nextData.props).join(', ')}`);
            }

            // Look for products in the data
            const dataStr = JSON.stringify(nextData);

            // Check for common product fields
            const hasProducts = dataStr.includes('"products"') || dataStr.includes('"items"');
            const hasImages = dataStr.includes('imgix') || dataStr.includes('image');

            console.log(`   Contains products: ${hasProducts}`);
            console.log(`   Contains images: ${hasImages}`);

            // Try to extract products
            let products: ScrapedProduct[] = [];

            // Navigate through the data structure
            if (nextData.props?.pageProps) {
                const pageProps = nextData.props.pageProps;
                console.log(`\n   PageProps keys: ${Object.keys(pageProps).join(', ')}`);

                // Common locations for product data
                const productData = pageProps.products ||
                                  pageProps.items ||
                                  pageProps.inventory ||
                                  pageProps.menuData?.products ||
                                  pageProps.initialData?.products;

                if (productData && Array.isArray(productData)) {
                    console.log(`\n   ✅ Found ${productData.length} products in pageProps!`);

                    // Sample first product to see structure
                    if (productData.length > 0) {
                        console.log('\n   Sample product structure:');
                        console.log('   ' + Object.keys(productData[0]).join(', '));

                        // Extract products with images
                        products = productData
                            .filter((p: any) => p.image || p.imageUrl || p.photo)
                            .map((p: any) => ({
                                name: p.name || p.productName || p.title,
                                imageUrl: p.image || p.imageUrl || p.photo,
                                price: p.price || p.retailPrice,
                                category: p.category || p.type,
                                brand: p.brand || p.brandName
                            }));
                    }
                } else {
                    // Search recursively for product arrays
                    console.log('\n   🔍 Searching for products in nested data...');

                    const findProducts = (obj: any, depth = 0): any[] => {
                        if (depth > 5) return [];

                        if (Array.isArray(obj) && obj.length > 0 && obj[0].name) {
                            return obj;
                        }

                        if (typeof obj === 'object' && obj !== null) {
                            for (const key of Object.keys(obj)) {
                                const result = findProducts(obj[key], depth + 1);
                                if (result.length > 0) {
                                    console.log(`   Found products at: ${key}`);
                                    return result;
                                }
                            }
                        }

                        return [];
                    };

                    const foundProducts = findProducts(pageProps);
                    if (foundProducts.length > 0) {
                        console.log(`\n   ✅ Found ${foundProducts.length} products via search!`);
                        products = foundProducts
                            .filter((p: any) => p.image || p.imageUrl || p.photo)
                            .map((p: any) => ({
                                name: p.name || p.productName || p.title,
                                imageUrl: p.image || p.imageUrl || p.photo,
                                price: p.price || p.retailPrice,
                                category: p.category || p.type,
                                brand: p.brand || p.brandName
                            }));
                    }
                }
            }

            if (products.length === 0) {
                console.log('\n   ⚠️  Could not find product data in expected locations');
                console.log('   💡 The menu might load products via API after page load');
                return;
            }

            console.log(`\n📸 Extracted ${products.length} products with images`);

            // Save scraped products
            const scrapedPath = path.join(process.cwd(), 'dev', 'scraped-products.json');
            fs.writeFileSync(scrapedPath, JSON.stringify(products, null, 2));
            console.log(`   ✅ Saved to ${scrapedPath}`);

            // Show samples
            console.log('\n📦 Sample Products:\n');
            products.slice(0, 5).forEach((p, idx) => {
                console.log(`   ${idx + 1}. ${p.name}`);
                console.log(`      Brand: ${p.brand || 'N/A'}`);
                console.log(`      Category: ${p.category || 'N/A'}`);
                console.log(`      Image: ${p.imageUrl?.substring(0, 80)}...`);
                console.log('');
            });

            // Match to our products
            console.log('\n🔗 Matching to Firestore products...\n');

            const ourProductsSnapshot = await db.collection('tenants')
                .doc('org_thrive_syracuse')
                .collection('publicViews')
                .doc('products')
                .collection('items')
                .get();

            let matched = 0;
            let updated = 0;

            for (const doc of ourProductsSnapshot.docs) {
                const ourProduct = doc.data();

                // Try to match by name (normalize for comparison)
                const ourName = ourProduct.name.toLowerCase().trim();

                const match = products.find(p => {
                    const scrapedName = p.name.toLowerCase().trim();
                    // Exact match or contains match
                    return scrapedName === ourName ||
                           scrapedName.includes(ourName) ||
                           ourName.includes(scrapedName);
                });

                if (match && match.imageUrl) {
                    matched++;

                    // Update with real image
                    await doc.ref.update({
                        imageUrl: match.imageUrl,
                        imageSource: 'scraped_thrive_menu',
                        updatedAt: new Date().toISOString()
                    });

                    updated++;

                    if (updated % 20 === 0) {
                        console.log(`   Matched ${updated} products...`);
                    }
                }
            }

            console.log('\n' + '═'.repeat(70));
            console.log(`\n✅ Scraping Complete!\n`);
            console.log(`   Products scraped: ${products.length}`);
            console.log(`   Products matched: ${matched}`);
            console.log(`   Products updated: ${updated}`);
            console.log(`   Match rate: ${Math.round((matched / ourProductsSnapshot.size) * 100)}%`);

        } else {
            console.log('\n   ⚠️  No Next.js data found - menu might be client-side rendered');
            console.log('   💡 Try inspecting network requests for API endpoints');
        }

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

scrapeMenu()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
