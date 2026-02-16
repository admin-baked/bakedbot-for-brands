'use server';

import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';
import { logger } from '@/lib/monitoring';
import { FieldValue } from 'firebase-admin/firestore';

export type CompetitorEntry = {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    distance?: number;
    source: 'auto' | 'manual';
    lastUpdated?: Date;
    menuUrl?: string;
};

export type CompetitorSnapshot = {
    competitors: CompetitorEntry[];
    lastUpdated: Date;
    nextUpdate: Date;
    updateFrequency: 'weekly' | 'daily' | 'live';
    canRefresh: boolean;
};

/**
 * Get competitors for an organization (auto-discovered + manual)
 */
export async function getCompetitors(orgId: string): Promise<CompetitorSnapshot> {
    const user = await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    // Get org settings to check plan
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    const orgData = orgDoc.data() || {};
    const plan = orgData.plan || 'free';
    const marketState = orgData.marketState;

    // Import plan limits for proper frequency calculation
    const { getEzalLimits } = await import('@/lib/plan-limits');
    const limits = getEzalLimits(plan as any);

    // Determine update frequency based on plan
    const updateFrequency =
        limits.frequencyMinutes <= 15 ? 'real-time' :
        limits.frequencyMinutes <= 60 ? 'hourly' :
        limits.frequencyMinutes <= 1440 ? 'daily' : 'weekly';

    // Get stored competitors from BOTH old and new systems
    const [oldCompetitorsSnap, newCompetitorsSnap] = await Promise.all([
        firestore
            .collection('organizations')
            .doc(orgId)
            .collection('competitors')
            .orderBy('lastUpdated', 'desc')
            .limit(20)
            .get(),
        firestore
            .collection('tenants')
            .doc(orgId)
            .collection('competitors')
            .where('active', '==', true)
            .limit(20)
            .get()
    ]);

    const competitors: CompetitorEntry[] = [];
    let lastUpdated = new Date(0);

    // Process OLD system competitors
    oldCompetitorsSnap.forEach(doc => {
        const data = doc.data();
        competitors.push({
            id: doc.id,
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            distance: data.distance,
            source: data.source || 'auto',
            lastUpdated: data.lastUpdated?.toDate?.() || new Date(),
            menuUrl: data.menuUrl,
        });
        if (data.lastUpdated?.toDate?.() > lastUpdated) {
            lastUpdated = data.lastUpdated.toDate();
        }
    });

    // Process NEW system competitors (Ezal-based)
    newCompetitorsSnap.forEach(doc => {
        const data = doc.data();
        const updatedAt = data.updatedAt?.toDate?.() || new Date();
        competitors.push({
            id: doc.id,
            name: data.name,
            address: data.location || data.address,
            city: data.city,
            state: data.state,
            distance: data.distance,
            source: 'ezal',
            lastUpdated: updatedAt,
            menuUrl: data.website,
        });
        if (updatedAt > lastUpdated) {
            lastUpdated = updatedAt;
        }
    });

    // Calculate next update based on plan frequency
    const updateIntervalMs = limits.frequencyMinutes * 60 * 1000;
    const nextUpdate = new Date(lastUpdated.getTime() + updateIntervalMs);

    // Can refresh if next update is in the past
    const canRefresh = new Date() > nextUpdate;

    return {
        competitors,
        lastUpdated,
        nextUpdate,
        updateFrequency,
        canRefresh,
    };
}

/**
 * Auto-discover competitors based on location (called during onboarding or refresh)
 */
export async function autoDiscoverCompetitors(orgId: string, forceRefresh = false): Promise<{ discovered: number }> {
    const user = await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    // Check if refresh is allowed
    const orgDoc = await firestore.collection('organizations').doc(orgId).get();
    const orgData = orgDoc.data() || {};
    const plan = orgData.plan || 'free';
    const marketState = orgData.marketState;

    if (!forceRefresh && plan === 'free') {
        // Check last update time
        const lastMeta = await firestore
            .collection('organizations')
            .doc(orgId)
            .collection('_meta')
            .doc('competitors')
            .get();

        if (lastMeta.exists) {
            const lastUpdated = lastMeta.data()?.lastAutoDiscovery?.toDate?.();
            if (lastUpdated) {
                const daysSince = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
                if (daysSince < 7) {
                    return { discovered: 0 }; // Too soon for free plan
                }
            }
        }
    }

    try {
        const cms = new CannMenusService();

        // Get based on state/city from org or brand data
        let state = marketState;
        let city = orgData.city;

        if (!state) {
            // Try to get from brand doc
            const brandDoc = await firestore.collection('brands').doc(orgId).get();
            if (brandDoc.exists) {
                const brandData = brandDoc.data();
                state = brandData?.marketState || brandData?.state;
                city = brandData?.city;
            }
        }

        // Fallback: check locations collection for dispensary users
        if (!state) {
            const locationsSnap = await firestore.collection('locations')
                .where('orgId', '==', orgId)
                .limit(1)
                .get();
            if (!locationsSnap.empty) {
                const locationData = locationsSnap.docs[0].data();
                state = locationData?.state;
                city = locationData?.city;
            }
        }

        // Fallback: check tenants collection
        if (!state) {
            const tenantDoc = await firestore.collection('tenants').doc(orgId).get();
            if (tenantDoc.exists) {
                const tenantData = tenantDoc.data();
                state = tenantData?.state;
                city = tenantData?.city;
            }
        }

        if (!state) {
            logger.warn('No market state set for competitor discovery', { orgId });
            return { discovered: 0 };
        }

        // Search for nearby competitors (dispensaries for brands, other dispensaries for dispensaries)
        const role = user.role;
        let competitors: any[] = [];

        // Use state capital/center coordinates for state-based search
        const stateCenters: Record<string, { lat: number; lng: number }> = {
            'IL': { lat: 39.7817, lng: -89.6501 },
            'MI': { lat: 42.7325, lng: -84.5555 },
            'CA': { lat: 38.5816, lng: -121.4944 },
            'CO': { lat: 39.7392, lng: -104.9903 },
            'MA': { lat: 42.3601, lng: -71.0589 },
            'AZ': { lat: 33.4484, lng: -112.0740 },
            'NV': { lat: 36.1699, lng: -115.1398 },
            'NY': { lat: 42.6526, lng: -73.7562 },
            'NJ': { lat: 40.0583, lng: -74.4057 },
            'FL': { lat: 30.4383, lng: -84.2807 },
        };

        const coords = stateCenters[state.toUpperCase()] || { lat: 41.8781, lng: -87.6298 }; // Default to Chicago

        try {
            competitors = await cms.findRetailers({
                lat: coords.lat,
                lng: coords.lng,
                limit: role === 'brand' ? 10 : 15
            });
        } catch (err) {
            logger.warn('findRetailers failed, returning empty', { state, error: err });
            competitors = [];
        }

        // Store discovered competitors
        const batch = firestore.batch();
        let discovered = 0;

        for (const comp of competitors) {
            const compRef = firestore
                .collection('organizations')
                .doc(orgId)
                .collection('competitors')
                .doc(comp.id);

            batch.set(compRef, {
                name: comp.name,
                address: comp.street_address,
                city: comp.city,
                state: comp.state,
                distance: comp.distance,
                source: 'auto',
                lastUpdated: FieldValue.serverTimestamp(),
                menuUrl: comp.menu_url || null,
            }, { merge: true });
            discovered++;
        }

        // Update meta
        const metaRef = firestore
            .collection('organizations')
            .doc(orgId)
            .collection('_meta')
            .doc('competitors');
        batch.set(metaRef, {
            lastAutoDiscovery: FieldValue.serverTimestamp(),
            discoveredCount: discovered,
        }, { merge: true });

        await batch.commit();

        logger.info(`Auto-discovered ${discovered} competitors for ${orgId}`);
        return { discovered };
    } catch (error) {
        logger.error('Failed to auto-discover competitors', { orgId, error });
        return { discovered: 0 };
    }
}

/**
 * Manually add a competitor
 */
export async function addManualCompetitor(
    orgId: string,
    competitor: { name: string; address?: string; city?: string; state?: string; menuUrl?: string }
): Promise<CompetitorEntry> {
    await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    const compRef = firestore
        .collection('organizations')
        .doc(orgId)
        .collection('competitors')
        .doc();

    const entry: any = {
        name: competitor.name,
        address: competitor.address || null,
        city: competitor.city || null,
        state: competitor.state || null,
        menuUrl: competitor.menuUrl || null,
        source: 'manual',
        lastUpdated: FieldValue.serverTimestamp(),
    };

    await compRef.set(entry);

    return {
        id: compRef.id,
        name: competitor.name,
        address: competitor.address,
        city: competitor.city,
        state: competitor.state,
        source: 'manual',
        lastUpdated: new Date(),
        menuUrl: competitor.menuUrl,
    };
}

/**
 * Remove a competitor
 */
export async function removeCompetitor(orgId: string, competitorId: string): Promise<void> {
    await requireUser(['dispensary', 'super_user', 'brand']);
    const { firestore } = await createServerClient();

    await firestore
        .collection('organizations')
        .doc(orgId)
        .collection('competitors')
        .doc(competitorId)
        .delete();
}

/**
 * Legacy function for backward compatibility
 */
export async function getNearbyCompetitors(lat: number, lng: number, limit: number = 20) {
    await requireUser(['dispensary', 'super_user']);

    try {
        const cms = new CannMenusService();
        const results = await cms.findRetailers({ lat, lng, limit });
        return results;
    } catch (error) {
        logger.error('Failed to fetch nearby competitors', { lat, lng, error });
        return [];
    }
}

export async function fetchCompetitiveReport(orgId: string): Promise<string | null> {
    await requireUser();
    const { generateCompetitorReport } = await import('@/server/services/ezal/report-generator');
    try {
        return await generateCompetitorReport(orgId);
    } catch (error) {
        console.error("Failed to generate report", error);
        return null;
    }
}
