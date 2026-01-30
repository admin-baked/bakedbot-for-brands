import * as admin from 'firebase-admin';
import { ALLeavesClient } from '../src/lib/pos/adapters/alleaves';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const LOG_FILE = path.join(process.cwd(), 'debug_output.txt');

function log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logMsg = data
        ? `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n`
        : `[${timestamp}] ${message}\n`;

    fs.appendFileSync(LOG_FILE, logMsg);
    console.log(message); // Still log to console just in case
}

async function main() {
    fs.writeFileSync(LOG_FILE, ''); // Clear log file
    log('Starting Alleaves pricing debug...');

    // 1. Initialize Firebase Admin (Simple method)
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
        log('Error: service-account.json not found at ' + serviceAccountPath);
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const firestore = admin.firestore();


    // 2. Fetch Thrive Syracuse location config
    log('Fetching Thrive Syracuse location config...');
    const locationsSnapshot = await firestore
        .collection('locations')
        .where('brandId', '==', 'thrivesyracuse')
        .limit(1)
        .get();

    if (locationsSnapshot.empty) {
        log('Error: Thrive Syracuse location not found in Firestore.');
        process.exit(1);
    }

    const locationDoc = locationsSnapshot.docs[0];
    const data = locationDoc.data();
    const posConfig = data.posConfig;

    if (!posConfig || posConfig.provider !== 'alleaves') {
        log('Error: Invalid POS config or provider is not Alleaves.', posConfig);
        process.exit(1);
    }

    log('Found POS Config:', {
        provider: posConfig.provider,
        storeId: posConfig.storeId,
        username: posConfig.username ? '(present)' : '(missing)',
        apiKey: posConfig.apiKey ? '(present)' : '(missing)',
    });

    // 3. Initialize Alleaves Client
    const client = new ALLeavesClient({
        apiKey: posConfig.apiKey,
        username: posConfig.username,
        password: posConfig.password,
        pin: posConfig.pin,
        storeId: posConfig.storeId,
        locationId: posConfig.locationId || posConfig.storeId,
        partnerId: posConfig.partnerId,
        environment: posConfig.environment || 'production',
    });

    try {
        // 4. Manual Authentication Check
        log('Attempting manual authentication check...');

        // Hack to access private method or just reproduce it
        const authUrl = 'https://app.alleaves.com/api/auth';
        log('Auth URL:', authUrl);
        log('Auth Payload (masked):', {
            username: posConfig.username,
            password: posConfig.password ? '***' : undefined,
            pin: posConfig.pin ? '***' : undefined,
        });

        if (posConfig.apiKey) {
            log('Using API Key auth path...');
            // If API key is present, we might just try a request
        } else {
            log('Using Username/Password auth path...');
            const authRes = await fetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: posConfig.username,
                    password: posConfig.password,
                    pin: posConfig.pin
                })
            });

            if (!authRes.ok) {
                const text = await authRes.text();
                log('AUTH FAILED: ' + authRes.status + ' ' + text);
                process.exit(1);
            }

            const authData = await authRes.json();
            log('Auth SUCCESS. Token received.');
            log('User ID: ' + authData.id_user);
            log('Company: ' + authData.company);
        }

        // 5. Fetch Menu
        log('Fetching menu...');
        const products = await client.fetchMenu();
        log(`Fetched ${products.length} products.`);

        // 6. Analyze Pricing
        const pricedProducts = products.filter(p => p.price > 0);
        const zeroPriceProducts = products.filter(p => p.price === 0);

        log(`Priced products: ${pricedProducts.length}`);
        log(`Zero price products: ${zeroPriceProducts.length}`);

        // 7. Log Raw Data Samples
        log('\n--- SAMPLE: PRICED PRODUCTS (Raw Data) ---');
        pricedProducts.slice(0, 3).forEach(p => {
            log(`\nName: ${p.name}`);
            log(`Calculated Price: ${p.price}`);
            log('Raw Data:', p.rawData);
        });

        log('\n--- SAMPLE: ZERO PRICE PRODUCTS (Raw Data) ---');
        zeroPriceProducts.slice(0, 3).forEach(p => {
            log(`\nName: ${p.name}`);
            log(`Calculated Price: ${p.price}`);
            log('Raw Data:', p.rawData);
        });

    } catch (error) {
        log('An error occurred during debugging:', error);
        if (error instanceof Error) {
            log(error.stack || 'No stack trace');
        }
    }
}

main();
