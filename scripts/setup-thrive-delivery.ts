/**
 * Thrive Syracuse Delivery Setup Script
 *
 * Configures delivery zones and settings for Thrive Syracuse (pilot customer)
 * Creates 3 default zones: Downtown, Suburbs, Extended
 * Enables delivery in location config
 *
 * Usage:
 *   npx tsx scripts/setup-thrive-delivery.ts
 *
 * Requirements:
 *   - Google Application Default Credentials (gcloud auth login)
 *   - Access to bakedbot-prod Firestore
 */

import { Firestore } from '@google-cloud/firestore';
import { logger } from '../src/lib/logger';
import type { DeliveryZone, DeliveryConfig } from '../src/types/delivery';

const db = new Firestore({
    projectId: 'bakedbot-prod',
});

const THRIVE_LOCATION_ID = 'loc_thrive_syracuse';
const THRIVE_ORG_ID = 'org_thrive_syracuse';

// Default delivery zones for Syracuse, NY
const DEFAULT_ZONES: Omit<DeliveryZone, 'createdAt' | 'updatedAt'>[] = [
    {
        id: 'zone_downtown',
        locationId: THRIVE_LOCATION_ID,
        name: 'Downtown Syracuse',
        radiusMiles: 5,
        baseFee: 5.0,
        minimumOrder: 30.0,
        isActive: true,
        description: 'Downtown Syracuse and immediate surrounding areas',
    },
    {
        id: 'zone_suburbs',
        locationId: THRIVE_LOCATION_ID,
        name: 'Syracuse Suburbs',
        radiusMiles: 10,
        baseFee: 8.0,
        minimumOrder: 50.0,
        isActive: true,
        description: 'Greater Syracuse metropolitan area including suburbs',
    },
    {
        id: 'zone_extended',
        locationId: THRIVE_LOCATION_ID,
        name: 'Extended Area',
        radiusMiles: 15,
        baseFee: 12.0,
        minimumOrder: 75.0,
        isActive: true,
        description: 'Extended delivery area beyond suburbs',
    },
];

// Delivery configuration for Thrive Syracuse
const DELIVERY_CONFIG: DeliveryConfig = {
    enabled: true,
    maxDeliveriesPerRoute: 5,
    estimatedPrepTime: 30, // 30 minutes
    operatingHours: {
        monday: { start: '10:00', end: '20:00' },
        tuesday: { start: '10:00', end: '20:00' },
        wednesday: { start: '10:00', end: '20:00' },
        thursday: { start: '10:00', end: '20:00' },
        friday: { start: '10:00', end: '20:00' },
        saturday: { start: '10:00', end: '20:00' },
        sunday: { start: '11:00', end: '18:00' },
    },
};

async function setupThriveDelivery() {
    try {
        logger.info('Starting Thrive Syracuse delivery setup...');

        // 1. Update location document with delivery config
        logger.info(`Updating location ${THRIVE_LOCATION_ID} with delivery config...`);
        const locationRef = db.doc(`locations/${THRIVE_LOCATION_ID}`);

        await locationRef.update({
            deliveryConfig: DELIVERY_CONFIG,
            updatedAt: new Date(),
        });

        logger.info('✅ Location updated with delivery config');

        // 2. Create delivery zones as subcollection
        logger.info('Creating delivery zones...');
        let zonesCreated = 0;

        for (const zone of DEFAULT_ZONES) {
            const zoneRef = db.doc(
                `locations/${THRIVE_LOCATION_ID}/delivery_zones/${zone.id}`
            );

            const zoneData: DeliveryZone = {
                ...zone,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await zoneRef.set(zoneData);
            zonesCreated++;

            logger.info(
                `  ✅ Created zone: ${zone.name} (${zone.radiusMiles}mi, $${zone.baseFee}, min: $${zone.minimumOrder})`
            );
        }

        logger.info(`\n✨ Setup complete! Created ${zonesCreated} delivery zones.\n`);

        // 3. Display summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Thrive Syracuse Delivery System - READY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📍 Location ID:', THRIVE_LOCATION_ID);
        console.log('🏢 Organization ID:', THRIVE_ORG_ID);
        console.log('✅ Delivery Enabled:', DELIVERY_CONFIG.enabled);
        console.log('⏱️  Estimated Prep Time:', DELIVERY_CONFIG.estimatedPrepTime, 'minutes');
        console.log('🚗 Max Deliveries Per Route:', DELIVERY_CONFIG.maxDeliveriesPerRoute);
        console.log('\n📦 Delivery Zones:\n');

        DEFAULT_ZONES.forEach((zone, index) => {
            console.log(`  ${index + 1}. ${zone.name}`);
            console.log(`     Radius: ${zone.radiusMiles} miles`);
            console.log(`     Delivery Fee: $${zone.baseFee.toFixed(2)}`);
            console.log(`     Minimum Order: $${zone.minimumOrder.toFixed(2)}`);
            console.log(`     Status: ${zone.isActive ? '✅ Active' : '❌ Inactive'}`);
            console.log('');
        });

        console.log('🕐 Operating Hours:\n');
        Object.entries(DELIVERY_CONFIG.operatingHours).forEach(([day, hours]) => {
            const dayName = day.charAt(0).toUpperCase() + day.slice(1);
            console.log(`  ${dayName.padEnd(10)} ${hours.start} - ${hours.end}`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📋 Next Steps:\n');
        console.log('  1. Deploy Firestore indexes:');
        console.log('     firebase deploy --only firestore:indexes\n');
        console.log('  2. Test delivery checkout:');
        console.log('     - Visit checkout page');
        console.log('     - Select "Delivery" fulfillment option');
        console.log('     - Enter Syracuse address (e.g., 100 S Clinton St, Syracuse, NY 13202)');
        console.log('     - Verify $5.00 delivery fee for Downtown zone\n');
        console.log('  3. Add drivers via admin dashboard:');
        console.log('     /dashboard/delivery → Drivers tab → Add Driver\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
        logger.error('Setup failed:', error);
        console.error('\n❌ Setup failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

// Run setup
setupThriveDelivery()
    .then(() => {
        logger.info('Setup script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        logger.error('Setup script error:', error);
        process.exit(1);
    });
