/**
 * Page Deletion Script
 * 
 * Deletes all documents from:
 * - seo_pages
 * - generated_pages_metadata
 * 
 * Usage:
 *   npx ts-node dev/delete-pages.ts
 */

import fs from 'fs';
import path from 'path';

console.log('--- PAGE DELETION TOOL ---');

// --- CONFIG ---
const loadEnv = () => {
    try {
        const pathsToCheck = ['.env.local', '.env'];
        for (const file of pathsToCheck) {
            const envPath = path.resolve(process.cwd(), file);
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                envContent.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
                        if (key && val && !process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error loading .env:', e);
    }
};
loadEnv();

// --- FIREBASE INIT ---
async function getFirestore() {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore: getFs } = await import('firebase-admin/firestore');

    if (getApps().length === 0) {
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
            path.resolve(process.cwd(), 'service-account.json');

        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
            initializeApp({ credential: cert(serviceAccount) });
            console.log('Initialized with service account');
        } else {
            initializeApp();
            console.log('Initialized with default credentials');
        }
    }
    return getFs();
}

// --- MAIN ---
async function main() {
    const db = await getFirestore();

    const deleteCollection = async (collectionPath: string) => {
        const collectionRef = db.collection(collectionPath);
        const query = collectionRef.orderBy('__name__').limit(500);

        return new Promise((resolve, reject) => {
            deleteQueryBatch(db, query, resolve).catch(reject);
        });
    };

    async function deleteQueryBatch(db: any, query: any, resolve: any) {
        const snapshot = await query.get();

        const batchSize = snapshot.size;
        if (batchSize === 0) {
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        console.log(`Deleted ${batchSize} docs...`);
        process.nextTick(() => {
            deleteQueryBatch(db, query, resolve);
        });
    }

    console.log('Deleting seo_pages...');
    await deleteCollection('seo_pages');
    console.log('Deleting generated_pages_metadata...');
    await deleteCollection('generated_pages_metadata');

    // Also delete brands if needed? 
    // User said "published pages and drafts". 
    // I'll stick to pages collections to be safe, unless Brand objects were considered "pages".
    // Usually "Brands" are source data, "seo_pages" are generated pages.
    // I will NOT delete 'brands' collection unless explicit.

    console.log('--- DONE ---');
}

main().catch(console.error);
