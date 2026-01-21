'use server';

import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DutchieClient } from '@/lib/pos/adapters/dutchie';
import { POSConfig } from '@/lib/pos/types';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

/**
 * Admin action to fix Essex Apothecary organization configuration.
 * SECURITY: Requires Super User privileges.
 */
export async function fixEssexApothecary() {
    // Security gate: Only super users can run this admin action
    await requireSuperUser();

    const logs: string[] = [];
    const log = (msg: string) => {
        logger.info(`[FixEssex] ${msg}`);
        logs.push(`[${new Date().toISOString()}] ${msg}`);
    };
    
    try {
        log('Starting Essex Apothecary Fix (Standalone Mode)...');
        
        // 1. Load Credentials Manually
        let serviceAccount;
        try {
            const saPath = path.resolve(process.cwd(), 'service-account.json');
            if (fs.existsSync(saPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
                log('Loaded service-account.json successfully.');
                
                // Sanitize private_key to prevent "Unparsed DER bytes" errors
                if (serviceAccount && typeof serviceAccount.private_key === 'string') {
                    const rawKey = serviceAccount.private_key;
                    // Pattern to capture Header (group 1), Body (group 2), Footer (group 3)
                    const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
                    const match = rawKey.match(pemPattern);

                    if (match) {
                        const header = "-----BEGIN PRIVATE KEY-----";
                        const footer = "-----END PRIVATE KEY-----";
                        const bodyRaw = match[2];
                        let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');

                        // 4n+1 length invalid. Try 1 byte (xx==).
                        if (bodyClean.length % 4 === 1) {
                            log(`Truncating 4n+1 and forcing double padding: ${bodyClean.length} -> 1628 (xx==)`);
                            bodyClean = bodyClean.slice(0, -1);
                            bodyClean = bodyClean.slice(0, -2) + '==';
                        }

                        // Fix Padding
                        while (bodyClean.length % 4 !== 0) {
                            bodyClean += '=';
                        }

                        const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
                        serviceAccount.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;
                        log(`Key Normalized. BodyLen: ${bodyClean.length}`);
                    } else {
                        serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
                    }
                }
            } else {
                throw new Error('service-account.json not found in CWD: ' + process.cwd());
            }
        } catch (e: any) {
            log(`Credential Load Check: ${e.message}. Trying existing apps...`);
        }

        // 2. Initialize Dedicated App
        let app;
        const appName = 'essex-fixer';
        const existingApps = getApps();
        const existingFixer = existingApps.find(a => a.name === appName);

        if (existingFixer) {
            app = existingFixer;
        } else if (serviceAccount) {
            app = initializeApp({
                credential: cert(serviceAccount)
            }, appName);
            log('Initialized new Firebase app: essex-fixer');
        } else {
             // Fallback to default if no SA found (unlikely to work but worth a try)
             app = getApps().length > 0 ? getApps()[0] : initializeApp();
             log('Warning: Using default firebase app (credentials might be missing)');
        }

        const firestore = getFirestore(app);
        
        // 3. Find Organization
        const orgsSnap = await firestore.collection('organizations')
            .where('name', '==', 'Essex Apothecary')
            .get();

        if (orgsSnap.empty) {
            log('ERROR: Organization "Essex Apothecary" not found.');
            return { success: false, logs };
        }

        const orgDoc = orgsSnap.docs[0];
        const orgId = orgDoc.id;
        log(`Found Organization: ${orgId}`);

        // 4. Update Plan
        log('Updating plan to "empire"...');
        await orgDoc.ref.update({
            planId: 'empire',
            updatedAt: new Date()
        });
        log('Plan updated.');

        // 5. Update Dutchie Credentials (from environment variables)
        log('Updating Dutchie integration credentials...');
        const integrationRef = orgDoc.ref.collection('integrations').doc('dutchie');

        const dutchieStoreId = process.env.ESSEX_DUTCHIE_STORE_ID;
        const dutchieApiKey = process.env.ESSEX_DUTCHIE_API_KEY;

        if (!dutchieStoreId || !dutchieApiKey) {
            log('ERROR: Missing ESSEX_DUTCHIE_STORE_ID or ESSEX_DUTCHIE_API_KEY environment variables.');
            return { success: false, logs };
        }

        const config: POSConfig = {
            storeId: dutchieStoreId,
            apiKey: dutchieApiKey,
            environment: 'production'
        };

        await integrationRef.set({
            config,
            active: true,
            updatedAt: new Date()
        }, { merge: true });
        
        log('Credentials updated in integrations.');

        // 5b. Update Location posConfig (REQUIRED for syncMenu action)
        log('Updating location posConfig...');
        const locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .get();
        
        if (locationsSnap.empty) {
            log('WARNING: No locations found for this organization. Creating one...');
            // Create a location if none exists
            const newLocRef = firestore.collection('locations').doc();
            await newLocRef.set({
                orgId: orgId,
                name: 'Essex Apothecary - Main',
                posConfig: {
                    provider: 'dutchie',
                    storeId: config.storeId,
                    apiKey: config.apiKey,
                    environment: config.environment
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
            log(`Created new location: ${newLocRef.id}`);
        } else {
            // Update existing location(s)
            for (const locDoc of locationsSnap.docs) {
                await locDoc.ref.update({
                    posConfig: {
                        provider: 'dutchie',
                        storeId: config.storeId,
                        apiKey: config.apiKey,
                        environment: config.environment
                    },
                    updatedAt: new Date()
                });
                log(`Updated location posConfig: ${locDoc.id}`);
            }
        }

        log('Location posConfig updated.');

        // 6. Validate Connection
        log('Validating connection...');
        const client = new DutchieClient(config);
        const isValid = await client.validateConnection();

        if (isValid) {
            log('SUCCESS: Connection verified!');
            await integrationRef.update({ status: 'connected', error: null });
        } else {
            log('ERROR: Connection validation failed. Check server logs for details.');
            await integrationRef.update({ status: 'error', error: 'Validation failed' });
        }

        return { success: isValid, logs };

    } catch (error: any) {
        log(`CRITICAL ERROR: ${error.message}`);
        return { success: false, logs };
    }
}
