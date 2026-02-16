/**
 * Add BakedBot's Competitors to Super User Tenant
 * Tracks competing cannabis tech platforms for strategic intelligence
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const db = getFirestore();

// BakedBot's direct competitors in cannabis tech
const BAKEDBOT_COMPETITORS = [
    {
        id: 'dutchie',
        name: 'Dutchie',
        website: 'https://www.dutchie.com',
        category: 'E-commerce & POS',
        description: 'Leading cannabis e-commerce and POS platform',
        trackingFocus: ['product catalog', 'checkout flow', 'marketing features', 'pricing'],
        active: true,
    },
    {
        id: 'jane',
        name: 'Jane Technologies',
        website: 'https://www.iheartjane.com',
        category: 'E-commerce Platform',
        description: 'Cannabis e-commerce marketplace and ordering platform',
        trackingFocus: ['marketplace features', 'user experience', 'brand discovery', 'promotions'],
        active: true,
    },
    {
        id: 'leafly',
        name: 'Leafly',
        website: 'https://www.leafly.com',
        category: 'Discovery & Reviews',
        description: 'Cannabis strain database and dispensary finder',
        trackingFocus: ['content strategy', 'SEO', 'user reviews', 'advertising'],
        active: true,
    },
    {
        id: 'weedmaps',
        name: 'WeedMaps',
        website: 'https://weedmaps.com',
        category: 'Discovery & Advertising',
        description: 'Cannabis discovery platform and advertising network',
        trackingFocus: ['advertising products', 'dispensary listings', 'pricing', 'market data'],
        active: true,
    },
    {
        id: 'springbig',
        name: 'SpringBig',
        website: 'https://www.springbig.com',
        category: 'Marketing Automation',
        description: 'Cannabis loyalty and marketing automation platform',
        trackingFocus: ['loyalty features', 'SMS marketing', 'email campaigns', 'customer retention'],
        active: true,
    },
    {
        id: 'alpine-iq',
        name: 'Alpine IQ',
        website: 'https://www.alpineiq.com',
        category: 'Customer Data Platform',
        description: 'Cannabis CDP and marketing platform',
        trackingFocus: ['data analytics', 'customer segmentation', 'personalization', 'integrations'],
        active: true,
    },
    {
        id: 'fyllo',
        name: 'Fyllo',
        website: 'https://www.fyllo.com',
        category: 'Compliance & Marketing',
        description: 'Cannabis compliance and marketing intelligence',
        trackingFocus: ['compliance tools', 'advertising', 'data solutions', 'regulatory updates'],
        active: true,
    },
    {
        id: 'blaze',
        name: 'Blaze',
        website: 'https://www.blaze.me',
        category: 'POS & Retail Software',
        description: 'Cannabis retail management and POS system',
        trackingFocus: ['POS features', 'inventory management', 'reporting', 'integrations'],
        active: true,
    },
    {
        id: 'flowhub',
        name: 'Flowhub',
        website: 'https://www.flowhub.com',
        category: 'POS & Compliance',
        description: 'Cannabis POS and compliance platform',
        trackingFocus: ['compliance features', 'government reporting', 'inventory tracking', 'analytics'],
        active: true,
    },
    {
        id: 'cova',
        name: 'Cova',
        website: 'https://www.covasoftware.com',
        category: 'POS Software',
        description: 'Cannabis retail POS and business management',
        trackingFocus: ['retail features', 'e-commerce integration', 'customer management', 'reporting'],
        active: true,
    },
];

async function addCompetitors() {
    console.log('=== Adding BakedBot Competitors ===\n');
    
    const tenantId = 'bakedbot_super_admin';
    
    console.log(`✓ Adding ${BAKEDBOT_COMPETITORS.length} competitors to ${tenantId}...\n`);
    
    let added = 0;
    let updated = 0;
    
    for (const competitor of BAKEDBOT_COMPETITORS) {
        const competitorRef = db
            .collection('tenants')
            .doc(tenantId)
            .collection('competitors')
            .doc(competitor.id);
        
        const existingSnap = await competitorRef.get();
        const isNew = !existingSnap.exists;
        
        await competitorRef.set({
            ...competitor,
            addedAt: isNew ? FieldValue.serverTimestamp() : existingSnap.data()?.addedAt,
            updatedAt: FieldValue.serverTimestamp(),
            source: 'manual',
            lastScraped: null,
            scrapingEnabled: true,
        }, { merge: true });
        
        if (isNew) {
            added++;
            console.log(`  ✅ Added: ${competitor.name} (${competitor.category})`);
        } else {
            updated++;
            console.log(`  🔄 Updated: ${competitor.name} (${competitor.category})`);
        }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total competitors: ${BAKEDBOT_COMPETITORS.length}`);
    console.log(`Added: ${added}`);
    console.log(`Updated: ${updated}`);
    
    console.log(`\n✅ BakedBot competitor tracking configured!`);
    console.log(`\nCompetitors by category:`);
    
    const byCategory = BAKEDBOT_COMPETITORS.reduce((acc, comp) => {
        const cat = comp.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(comp.name);
        return acc;
    }, {} as Record<string, string[]>);
    
    for (const [category, names] of Object.entries(byCategory)) {
        console.log(`  ${category}: ${names.join(', ')}`);
    }
    
    console.log(`\nNext steps:`);
    console.log(`1. Scraping will run automatically (if enabled)`);
    console.log(`2. Weekly reports will include BakedBot's competitive landscape`);
    console.log(`3. View competitors: /dashboard/intelligence`);
    console.log(`4. View reports: /dashboard/ceo?tab=analytics&sub=intelligence&intel=ezal`);
}

addCompetitors()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
