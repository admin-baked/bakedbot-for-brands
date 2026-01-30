/**
 * Fetch all products from Dispense API using discovered endpoint and API key
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { getPlaceholderImageForCategory } from '../src/lib/product-images';

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

const VENUE_ID = '13455748f2d363fd'; // Thrive Syracuse
const API_KEY = '49dac8e0-7743-11e9-8e3f-a5601eb2e936'; // Public API key from browser
const BASE_URL = 'https://api.dispenseapp.com';

interface DispenseProduct {
    id: string;
    name: string;
    brand?: any;
    image?: string;
    images?: string[];
    price?: number;
    category?: any;
    thc?: number;
    cbd?: number;
}

async function fetchDispenseProducts() {
    console.log('🚀 Fetching Products from Dispense API...\n');
    console.log('═'.repeat(70));

    try {
        // First, get all product categories
        console.log('\n📂 Fetching product categories...');

        const categoriesUrl = `${BASE_URL}/v1/venues/${VENUE_ID}/product-filters`;
        const categoriesResponse = await fetch(categoriesUrl, {
            headers: {
                'api-key': API_KEY,
                'Accept': 'application/json',
            }
        });

        if (!categoriesResponse.ok) {
            throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
        }

        const categoriesData = await categoriesResponse.json();
        console.log('   ✅ Got categories data');

        // Save categories for inspection
        fs.writeFileSync(
            'dev/dispense-categories.json',
            JSON.stringify(categoriesData, null, 2)
        );

        // Extract all unique product IDs from categories
        const categories = categoriesData.categories || [];
        console.log(`   Found ${categories.length} categories\n`);

        // Collect all unique product IDs
        const allProductIds = new Set<string>();
        categories.forEach((cat: any) => {
            cat.productIds?.forEach((id: string) => allProductIds.add(id));
        });

        console.log(`📦 Found ${allProductIds.size} unique product IDs across all categories\n`);

        // Fetch products individually (batch of 50 at a time)
        const productIds = Array.from(allProductIds);
        const allProducts: DispenseProduct[] = [];

        console.log('🔄 Fetching product details...\n');

        // Batch fetch using category endpoint (faster than individual fetches)
        for (const category of categories) {
            const categoryId = category.productCategory;
            const categoryName = category.productCategoryName;

            console.log(`📂 Fetching ${categoryName}: ${category.count} products`);

            const productsUrl = `${BASE_URL}/v1/venues/${VENUE_ID}/product-categories/${categoryId}/products?skip=0&limit=100&orderPickUpType=IN_STORE`;

            try {
                const productsResponse = await fetch(productsUrl, {
                    headers: {
                        'api-key': API_KEY,
                        'Accept': 'application/json',
                    }
                });

                if (productsResponse.ok) {
                    const productsData = await productsResponse.json();

                    // API returns data in a 'data' array
                    const products = productsData.data || [];

                    products.forEach((product: any) => {
                        allProducts.push(product);
                    });

                    console.log(`   ✅ Got ${products.length} products`);
                } else {
                    console.log(`   ⚠️  Failed: ${productsResponse.status}`);
                }
            } catch (error) {
                console.log(`   ❌ Error:`, error);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`\n✅ Total Products Fetched: ${allProducts.length}\n`);

        // Save all products
        fs.writeFileSync(
            'dev/dispense-all-products.json',
            JSON.stringify(allProducts, null, 2)
        );
        console.log('💾 Saved to dev/dispense-all-products.json');

        // Analyze image fields
        console.log('\n📸 Analyzing image data...\n');

        const productsWithImages = allProducts.filter(p => p.image || (p.images && p.images.length > 0));
        console.log(`   Products with images: ${productsWithImages.length}/${allProducts.length} (${Math.round((productsWithImages.length / allProducts.length) * 100)}%)`);

        // Show sample
        console.log('\n   Sample products with images:');
        productsWithImages.slice(0, 5).forEach((p, idx) => {
            console.log(`\n   ${idx + 1}. ${p.name}`);
            console.log(`      Brand: ${p.brand?.name || 'N/A'}`);
            console.log(`      Image: ${p.image || p.images?.[0] || 'N/A'}`);
        });

        // Match and update our products
        console.log('\n\n🔗 Matching to Firestore products...\n');

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
            const ourName = ourProduct.name.toLowerCase().trim();

            // Try to match by name
            const match = allProducts.find(p => {
                const dispenseName = p.name.toLowerCase().trim();
                return dispenseName === ourName ||
                       dispenseName.includes(ourName) ||
                       ourName.includes(dispenseName);
            });

            if (match) {
                matched++;

                let imageUrl = match.image || match.images?.[0]?.fileUrl;

                if (imageUrl) {
                    // Check if this is a Dispense default placeholder image
                    const isDispenseDefault = imageUrl.includes('default-') ||
                                            imageUrl.includes('icon-cannabis-');

                    // If it's a Dispense default, use our own category-based placeholder instead
                    if (isDispenseDefault) {
                        const category = ourProduct.category || match.productCategoryName?.toLowerCase() || 'other';
                        imageUrl = getPlaceholderImageForCategory(category);
                    }

                    // Update with real image from Dispense API (or our placeholder for defaults)
                    await doc.ref.update({
                        imageUrl,
                        imageSource: isDispenseDefault ? 'category_placeholder' : 'dispense_api',
                        updatedAt: new Date().toISOString()
                    });

                    updated++;

                    if (updated % 20 === 0) {
                        console.log(`   Matched and updated ${updated} products...`);
                    }
                }
            }
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`\n✅ Complete!\n`);
        console.log(`   Products from API: ${allProducts.length}`);
        console.log(`   Products matched: ${matched}`);
        console.log(`   Products updated with images: ${updated}`);
        console.log(`   Match rate: ${Math.round((matched / ourProductsSnapshot.size) * 100)}%`);

    } catch (error) {
        console.error('\n❌ Failed:', error);
        throw error;
    }
}

fetchDispenseProducts()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
