/**
 * Test Thrive Syracuse menu and chatbot integration
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import { makeProductRepo } from '../src/server/repos/productRepo';
import { fetchBrandPageData } from '../src/lib/brand-data';

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

async function testMenuAndChatbot() {
    console.log('🧪 Testing Thrive Syracuse Menu & Chatbot Integration\n');
    console.log('═'.repeat(60));

    try {
        // 1. Test Brand Page Data Fetch (what the menu uses)
        console.log('\n1️⃣  TESTING BRAND PAGE DATA FETCH (Menu)\n');
        const { brand, products: menuProducts, retailers } = await fetchBrandPageData('thrivesyracuse');

        if (!brand) {
            console.log('   ❌ Brand not found');
            return;
        }

        console.log(`   ✅ Brand: ${brand.name}`);
        console.log(`   📦 Products fetched: ${menuProducts.length}`);
        console.log(`   🏪 Retailers: ${retailers.length}`);

        if (menuProducts.length > 0) {
            console.log(`\n   Sample products for menu:`);
            menuProducts.slice(0, 5).forEach((product, idx) => {
                console.log(`   ${idx + 1}. ${product.name}`);
                console.log(`      Category: ${product.category}`);
                console.log(`      Price: $${product.price || 0}`);
            });
        }

        // 2. Test ProductRepo (what the chatbot uses)
        console.log('\n\n2️⃣  TESTING PRODUCT REPO (Chatbot)\n');
        const productRepo = makeProductRepo(db);
        const chatbotProducts = await productRepo.getAllByBrand('thrivesyracuse');

        console.log(`   📦 Products fetched: ${chatbotProducts.length}`);

        if (chatbotProducts.length > 0) {
            console.log(`\n   Sample products for chatbot:`);
            chatbotProducts.slice(0, 5).forEach((product, idx) => {
                console.log(`   ${idx + 1}. ${product.name}`);
                console.log(`      Category: ${product.category}`);
                console.log(`      Price: $${product.price || 0}`);
            });
        }

        // 3. Verify consistency
        console.log('\n\n3️⃣  CONSISTENCY CHECK\n');
        const menuProductIds = new Set(menuProducts.map(p => p.id));
        const chatbotProductIds = new Set(chatbotProducts.map(p => p.id));

        const inMenuNotChatbot = Array.from(menuProductIds).filter(id => !chatbotProductIds.has(id));
        const inChatbotNotMenu = Array.from(chatbotProductIds).filter(id => !menuProductIds.has(id));

        console.log(`   Menu products: ${menuProducts.length}`);
        console.log(`   Chatbot products: ${chatbotProducts.length}`);
        console.log(`   Match: ${menuProducts.length === chatbotProducts.length ? '✅' : '⚠️'}`);

        if (inMenuNotChatbot.length > 0) {
            console.log(`\n   ⚠️  ${inMenuNotChatbot.length} products in menu but not chatbot`);
        }
        if (inChatbotNotMenu.length > 0) {
            console.log(`   ⚠️  ${inChatbotNotMenu.length} products in chatbot but not menu`);
        }

        if (menuProducts.length === chatbotProducts.length &&
            inMenuNotChatbot.length === 0 &&
            inChatbotNotMenu.length === 0) {
            console.log(`\n   ✅ PERFECT SYNC - Menu and Chatbot have identical product sets`);
        }

        // 4. Data Quality for Chatbot
        console.log('\n\n4️⃣  CHATBOT DATA QUALITY\n');
        const productsWithPrices = chatbotProducts.filter(p => p.price && p.price > 0);
        const productsWithImages = chatbotProducts.filter(p => p.imageUrl);
        const productsWithDescriptions = chatbotProducts.filter(p => p.description);

        console.log(`   Products with prices: ${productsWithPrices.length}/${chatbotProducts.length} (${((productsWithPrices.length / chatbotProducts.length) * 100).toFixed(1)}%)`);
        console.log(`   Products with images: ${productsWithImages.length}/${chatbotProducts.length} (${((productsWithImages.length / chatbotProducts.length) * 100).toFixed(1)}%)`);
        console.log(`   Products with descriptions: ${productsWithDescriptions.length}/${chatbotProducts.length} (${((productsWithDescriptions.length / chatbotProducts.length) * 100).toFixed(1)}%)`);

        // 5. Production Readiness
        console.log('\n\n5️⃣  PRODUCTION READINESS\n');
        const readinessChecks = {
            'Menu loads products': menuProducts.length > 0,
            'Chatbot loads products': chatbotProducts.length > 0,
            'Products synced': menuProducts.length === chatbotProducts.length,
            'Majority have prices': productsWithPrices.length / chatbotProducts.length > 0.4,
            'Data quality good': chatbotProducts.length > 300
        };

        Object.entries(readinessChecks).forEach(([check, passed]) => {
            console.log(`   ${passed ? '✅' : '❌'} ${check}`);
        });

        const allPassed = Object.values(readinessChecks).every(v => v);
        console.log(`\n   ${allPassed ? '🎉 READY FOR PRODUCTION' : '⚠️  NEEDS ATTENTION'}`);

        console.log('\n' + '═'.repeat(60));
        console.log('\n📝 SUMMARY\n');
        console.log(`Menu at bakedbot.ai/thrivesyracuse will show: ${menuProducts.length} products`);
        console.log(`Smokey chatbot will have access to: ${chatbotProducts.length} products`);
        console.log(`${productsWithPrices.length} products have prices for display`);

        if (allPassed) {
            console.log('\n✅ Both menu and chatbot are production-ready!');
        } else {
            console.log('\n⚠️  Review the checklist above for issues');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error);
        throw error;
    }
}

testMenuAndChatbot()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
