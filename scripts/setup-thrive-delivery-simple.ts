/**
 * Thrive Syracuse Delivery Setup - Simple Version
 * Uses Firebase Admin SDK (no gcloud auth needed)
 *
 * This script creates delivery zones directly in Firestore
 * by leveraging the existing Firebase app initialization
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
    // Use Application Default Credentials (from gcloud)
    initializeApp();
}

const db = getFirestore();

const THRIVE_LOCATION_ID = 'loc_thrive_syracuse';

async function setupDelivery() {
    console.log('🚀 Starting Thrive Syracuse delivery setup...\n');

    try {
        // 1. Update location with delivery config
        console.log('📍 Updating location document...');
        await db.doc(`locations/${THRIVE_LOCATION_ID}`).update({
            deliveryConfig: {
                enabled: true,
                maxDeliveriesPerRoute: 5,
                estimatedPrepTime: 30,
                operatingHours: {
                    monday: { start: '10:00', end: '20:00' },
                    tuesday: { start: '10:00', end: '20:00' },
                    wednesday: { start: '10:00', end: '20:00' },
                    thursday: { start: '10:00', end: '20:00' },
                    friday: { start: '10:00', end: '20:00' },
                    saturday: { start: '10:00', end: '20:00' },
                    sunday: { start: '11:00', end: '18:00' },
                },
            },
            updatedAt: FieldValue.serverTimestamp(),
        });
        console.log('✅ Location updated\n');

        // 2. Create delivery zones
        console.log('📦 Creating delivery zones...');

        const zones = [
            {
                id: 'zone_downtown',
                name: 'Downtown Syracuse',
                radiusMiles: 5,
                baseFee: 5.0,
                minimumOrder: 30.0,
                description: 'Downtown Syracuse and immediate surrounding areas',
            },
            {
                id: 'zone_suburbs',
                name: 'Syracuse Suburbs',
                radiusMiles: 10,
                baseFee: 8.0,
                minimumOrder: 50.0,
                description: 'Greater Syracuse metropolitan area including suburbs',
            },
            {
                id: 'zone_extended',
                name: 'Extended Area',
                radiusMiles: 15,
                baseFee: 12.0,
                minimumOrder: 75.0,
                description: 'Extended delivery area beyond suburbs',
            },
        ];

        for (const zone of zones) {
            await db.doc(`locations/${THRIVE_LOCATION_ID}/delivery_zones/${zone.id}`).set({
                ...zone,
                locationId: THRIVE_LOCATION_ID,
                isActive: true,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
            console.log(`  ✅ ${zone.name} (${zone.radiusMiles}mi, $${zone.baseFee}, min: $${zone.minimumOrder})`);
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Thrive Syracuse Delivery System - READY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ Delivery enabled for Thrive Syracuse');
        console.log('📦 3 delivery zones created');
        console.log('\n📋 Next Steps:');
        console.log('  1. Test checkout: Select "Delivery" → Enter Syracuse address');
        console.log('  2. Verify $5.00 fee for Downtown zone (e.g., 100 S Clinton St, Syracuse, NY 13202)');
        console.log('  3. Add drivers via /dashboard/delivery (Phase 2)\n');

    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setupDelivery()
    .then(() => {
        console.log('✨ Setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
