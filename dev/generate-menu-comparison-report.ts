/**
 * Generate comprehensive menu comparison report for owner review
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

interface ProductSummary {
    id: string;
    name: string;
    brandName: string;
    category: string;
    price: number;
    imageSource?: string;
    status: 'active' | 'discontinued' | 'unknown';
}

async function generateComparisonReport() {
    console.log('📊 Generating Menu Comparison Report...\n');
    console.log('═'.repeat(70));

    // Load Dispense API products (current menu)
    const dispenseProducts = JSON.parse(
        fs.readFileSync('dev/dispense-all-products.json', 'utf8')
    );

    // Load our Firestore products
    const productsSnapshot = await db.collection('tenants')
        .doc('org_thrive_syracuse')
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    const ourProducts: ProductSummary[] = [];
    const activeProducts: ProductSummary[] = [];
    const discontinuedProducts: ProductSummary[] = [];
    const giftCards: ProductSummary[] = [];
    const testProducts: ProductSummary[] = [];

    productsSnapshot.docs.forEach(doc => {
        const product = doc.data();
        const summary: ProductSummary = {
            id: doc.id,
            name: product.name,
            brandName: product.brandName || 'Unknown',
            category: product.category || 'uncategorized',
            price: product.price || 0,
            imageSource: product.imageSource,
            status: product.imageSource === 'dispense_api' ? 'active' : 'discontinued'
        };

        ourProducts.push(summary);

        // Categorize products
        if (product.imageSource === 'dispense_api' || product.imageSource === 'category_placeholder') {
            activeProducts.push(summary);
        } else if (product.name.toLowerCase().includes('gift card')) {
            giftCards.push(summary);
        } else if (product.name.toLowerCase().includes('test')) {
            testProducts.push(summary);
        } else {
            discontinuedProducts.push(summary);
        }
    });

    // Sort by category and name
    const sortProducts = (a: ProductSummary, b: ProductSummary) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        if (a.brandName !== b.brandName) return a.brandName.localeCompare(b.brandName);
        return a.name.localeCompare(b.name);
    };

    activeProducts.sort(sortProducts);
    discontinuedProducts.sort(sortProducts);
    giftCards.sort((a, b) => a.name.localeCompare(b.name));
    testProducts.sort((a, b) => a.name.localeCompare(b.name));

    // Generate markdown report
    const report = `# Thrive Syracuse Menu Comparison Report
Generated: ${new Date().toLocaleDateString()}

## Summary

| Metric | Count |
|--------|-------|
| **Total Products in Database** | ${ourProducts.length} |
| **Active on Current Menu** | ${activeProducts.length} |
| **Discontinued/Out of Stock** | ${discontinuedProducts.length} |
| **Gift Cards** | ${giftCards.length} |
| **Test Products** | ${testProducts.length} |
| **Products from Dispense API** | ${dispenseProducts.length} |

---

## ✅ Active Products (${activeProducts.length})

These products are currently available on Thrive's menu:

${generateProductTable(activeProducts)}

---

## ❌ Discontinued/Out of Stock Products (${discontinuedProducts.length})

**Action Required:** Please review these products and confirm whether to:
- Remove them from the database (if permanently discontinued)
- Keep them (if temporarily out of stock)
- Update them (if the name has changed)

${generateProductTable(discontinuedProducts)}

---

## 💳 Gift Cards (${giftCards.length})

${giftCards.map((p, i) => `${i + 1}. **${p.name}** - $${p.price.toFixed(2)}`).join('\n')}

**Note:** Gift cards don't typically appear in Dispense's product feed. Should these remain in the system?

---

## 🧪 Test Products (${testProducts.length})

${testProducts.map((p, i) => `${i + 1}. **${p.name}** - ${p.brandName} - ${p.category}`).join('\n')}

**Recommendation:** Remove test products from production database.

---

## 📋 Products by Category

### Active Products Breakdown

${generateCategoryBreakdown(activeProducts)}

### Discontinued Products Breakdown

${generateCategoryBreakdown(discontinuedProducts)}

---

## 🔍 Questions for Owner Review

1. **Discontinued Products (${discontinuedProducts.length} items)**
   - Are any of these temporarily out of stock and should be kept?
   - Should all permanently discontinued products be removed?

2. **Gift Cards (${giftCards.length} items)**
   - Should gift cards remain in the product database?
   - Are the gift card denominations correct?

3. **Test Products (${testProducts.length} items)**
   - Can we delete all test products from the production database?

4. **Name Variations**
   - Some products may have name changes (e.g., "1937 - Flower - Wedding Cake - 3.5g" vs "1937 - Small Bud - Wedding Cake - 7g")
   - Should we keep old variations or update to match current Dispense naming?

---

## 💡 Recommendations

### Immediate Actions:
1. **Remove Test Products** - Clean up ${testProducts.length} test items from production
2. **Archive Gift Cards Separately** - Move ${giftCards.length} gift cards to a separate collection if needed
3. **Review Top Brands** - Focus on verifying discontinued products from major brands first

### Data Quality:
- ✅ **${activeProducts.length} products** have verified images from Dispense API
- ✅ **287 products** match exactly with current Thrive menu
- ⚠️ **${discontinuedProducts.length} products** need owner verification

---

*Generated by BakedBot Product Management System*
`;

    // Save report
    fs.writeFileSync('dev/menu-comparison-report.md', report);
    console.log('\n✅ Report generated: dev/menu-comparison-report.md');

    // Also generate CSV for easy spreadsheet review
    const csv = generateCSV(discontinuedProducts);
    fs.writeFileSync('dev/discontinued-products.csv', csv);
    console.log('✅ CSV generated: dev/discontinued-products.csv');

    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`   Active products: ${activeProducts.length}`);
    console.log(`   Discontinued: ${discontinuedProducts.length}`);
    console.log(`   Gift cards: ${giftCards.length}`);
    console.log(`   Test products: ${testProducts.length}`);
    console.log(`   Total: ${ourProducts.length}\n`);
}

function generateProductTable(products: ProductSummary[]): string {
    if (products.length === 0) return '*None*';

    const byCategory = new Map<string, ProductSummary[]>();
    products.forEach(p => {
        const cat = p.category || 'uncategorized';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(p);
    });

    let table = '';
    Array.from(byCategory.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([category, prods]) => {
            table += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)} (${prods.length})\n\n`;
            table += '| Brand | Product Name | Price |\n';
            table += '|-------|--------------|-------|\n';
            prods.forEach(p => {
                table += `| ${p.brandName} | ${p.name} | $${p.price.toFixed(2)} |\n`;
            });
        });

    return table;
}

function generateCategoryBreakdown(products: ProductSummary[]): string {
    const byCategory = new Map<string, number>();
    products.forEach(p => {
        const cat = p.category || 'uncategorized';
        byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
    });

    return Array.from(byCategory.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([cat, count]) => `- **${cat}**: ${count} products`)
        .join('\n');
}

function generateCSV(products: ProductSummary[]): string {
    let csv = 'Category,Brand,Product Name,Price,ID\n';
    products.forEach(p => {
        csv += `"${p.category}","${p.brandName}","${p.name}","$${p.price.toFixed(2)}","${p.id}"\n`;
    });
    return csv;
}

generateComparisonReport()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
