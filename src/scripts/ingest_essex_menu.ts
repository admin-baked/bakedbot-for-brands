
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

// --- Firebase Init (Copy-Paste) ---
function getServiceAccount() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) return null;
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        try {
            const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
            serviceAccount = JSON.parse(json);
        } catch (decodeError) {
            console.error("Failed to parse service account key.", decodeError);
            return null;
        }
    }
   if (serviceAccount && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return serviceAccount;
}

function getAdminFirestore() {
    if (getApps().length === 0) {
        const serviceAccount = getServiceAccount();
        if (serviceAccount) {
            initializeApp({ credential: cert(serviceAccount) });
        } else {
            initializeApp({ credential: applicationDefault() });
        }
    }
    return getFirestore();
}

const adminDb = getAdminFirestore();
const DISPENSARY_ID = '8iE1Qfp6fnevCWhXvrrQTLe4wmt2'; 

// --- Parsing Logic ---

interface Product {
    name: string;
    brand: string;
    category: string;
    thc: string;
    cbd: string;
    price: number;
    image: string;
    url: string;
    description: string;
}

function parseMenu(markdown: string): Product[] {
    const products: Product[] = [];
    
    // Split key: [![](https://images.dutchie.com
    // Use regex split to handle potential whitespace variations
    const chunks = markdown.split(/\[!\[\]\(https:\/\/images\.dutchie\.com/);
    
    for (let i = 1; i < chunks.length; i++) {
        let chunk = 'https://images.dutchie.com' + chunks[i]; // Re-add prefix
        
        try {
            // 1. Image
            // Extract from start of chunk: url is until next )
            const imgMatch = chunk.match(/^(https:\/\/images\.dutchie\.com[^)]+)\)/);
            const image = imgMatch ? imgMatch[1] : '';

            // 2. Link
            // Link is at the end of the text block: ](http...)
            const linkMatch = chunk.match(/\]\((https:\/\/dutchie\.com\/embedded-menu\/[^)]+)\)/);
            const url = linkMatch ? linkMatch[1] : '';

            // 3. Text Block
            // Between ")\\\n" (end of image) and "](https" (start of link)
            // Note: firecrawl markdown often puts escaped newlines like \\
            const startIdx = chunk.indexOf(')\\'); 
            const endIdx = chunk.lastIndexOf('](');
            
            if (startIdx === -1 || endIdx === -1) continue;
            
            const textBlock = chunk.substring(startIdx + 2, endIdx);
            // Clean up: remove leading/trailing slashes/newlines
            const lines = textBlock.split(/\\+[\r\n]+/).map(l => l.trim()).filter(l => l && l !== '\\');
            
            if (lines.length === 0) continue;

            let name = lines[0];
            let brand = 'Unknown Brand';
            let category = 'Uncategorized';
            let thcp = '';
            let cbdp = '';
            
            // Heuristic Parsing
            if (lines.length > 1) {
                // Check if line 1 matches category keywords, else it's Brand
                if (/indica|sativa|hybrid/i.test(lines[1])) {
                    category = lines[1];
                } else {
                    brand = lines[1];
                    // If line 2 exists, it might be category
                    if (lines.length > 2 && /indica|sativa|hybrid/i.test(lines[2])) {
                        category = lines[2];
                    }
                }
            }
            
            // Scan for cannabinoids
            lines.forEach(l => {
                const lower = l.toLowerCase();
                if (lower.includes('thc:')) thcp = l.replace(/THC:/i, '').trim();
                if (lower.includes('cbd:')) cbdp = l.replace(/CBD:/i, '').trim();
                if (lower.includes('tac:')) { /* capturing TAC maybe? */ }
                
                // Fallback category detection
                if (!category || category === 'Uncategorized') {
                     if (/flower|edible|vape|concentrate|preroll|pre-roll/i.test(lower)) {
                         category = l; // or map to standard categories
                     }
                }
            });

            // 4. Price
            // Look for **$XX.XX** in the whole chunk (usually at the end)
            const priceMatch = chunk.match(/\*\*(\$[\d,.]+)\*\*/);
            const priceStr = priceMatch ? priceMatch[1].replace('$', '').replace(',', '') : '0';
            const price = parseFloat(priceStr);

            if (name && price > 0) {
                 products.push({
                    name,
                    brand,
                    category,
                    thc: thcp,
                    cbd: cbdp,
                    price,
                    image,
                    url,
                    description: `Brand: ${brand}, Category: ${category}`
                });
            }
            
        } catch (err) {
            console.log('Skipping chunk due to parse error', err);
        }
    }
    
    return products;
}

async function main() {
    console.log(`Ingesting menu for Dispensary: ${DISPENSARY_ID}`);
    const mdPath = path.join(process.cwd(), 'essex_dutchie_menu.md');
    
    if (!fs.existsSync(mdPath)) {
        console.error('Menu file not found!');
        return;
    }
    
    const content = fs.readFileSync(mdPath, 'utf-8');
    const products = parseMenu(content);
    
    console.log(`Parsed ${products.length} products.`);
    
    if (products.length === 0) return;

    // Batch Write
    const batchSize = 400; // Firestore limit 500
    for (let i = 0; i < products.length; i += batchSize) {
        const batch = adminDb.batch();
        const chunk = products.slice(i, i + batchSize);
        
        console.log(`Writing batch ${i / batchSize + 1}...`);
        
        chunk.forEach(p => {
             // Create deterministic ID from name to avoid dupes
             const id = p.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 50);
             const ref = adminDb.collection('dispensaries').doc(DISPENSARY_ID).collection('products').doc(id);
             
             batch.set(ref, {
                 ...p,
                 updatedAt: new Date().toISOString(),
                 source: 'dutchie_scrape'
             }, { merge: true });
        });
        
        await batch.commit();
    }
    
    console.log('Ingestion Complete!');
}

main().catch(console.error);
