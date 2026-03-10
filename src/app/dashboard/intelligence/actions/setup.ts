'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { getDefaultPlaybook } from '@/config/default-playbooks';
import { quickSetupCompetitor } from '@/server/services/ezal/competitor-manager';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

import { searchEntities } from '@/server/actions/discovery-search';
import { getEzalLimits } from '@/lib/plan-limits';

type CompetitorSearchType = 'dispensary' | 'brand';

function mapDiscoveryResult(
    result: { id: string; name: string; url: string; description?: string },
    fallback: { city?: string; state?: string; zip?: string }
) {
    return {
        id: result.id,
        name: result.name,
        address: result.description || '',
        city: fallback.city || '',
        state: fallback.state || '',
        zip: fallback.zip || '',
        menuUrl: result.url,
        logo: ''
    };
}

export async function searchLocalCompetitors(zip: string, type: CompetitorSearchType = 'dispensary') {
    await requireUser();
    
    try {
        const result = await searchEntities(type === 'brand' ? 'brands' : 'dispensaries', type, zip);
        
        if (!result.success || !result.data) {
            console.error("Discovery search failed:", result.error);
            return [];
        }
        
        return result.data.map((r: any) => mapDiscoveryResult(r, { zip }));
    } catch (e) {
        console.error("Discovery search failed", e);
        return [];
    }
}

export async function finalizeCompetitorSetup(competitors: any[]) {
    const user = await requireUser();
    const tenantId = user.uid; // Brand ID
    const planId = (user as any).planId as string || 'scout';
    const ezalLimits = getEzalLimits(planId);

    // 1. Save Competitors with plan-based frequency
    for (const comp of competitors) {
        await quickSetupCompetitor(tenantId, {
            name: comp.name,
            type: 'dispensary',
            state: comp.state || '',
            city: comp.city || '',
            zip: comp.zip || '',
            menuUrl: comp.menuUrl,
            parserProfileId: 'cannmenus-default',
            frequencyMinutes: ezalLimits.frequencyMinutes
        });
    }

    // 2. Setup Playbook
    const { firestore } = await createServerClient();
    const playbookTemplate = getDefaultPlaybook('Daily Competitive Intelligence');
    
    if (playbookTemplate) {
        const playbookData = {
            ...playbookTemplate,
            orgId: tenantId,
            ownerId: user.uid,
            ownerName: user.email || 'Admin',
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'active', // Activate immediately
            isCustom: false,
            // Override triggers to ensure it runs
            triggers: playbookTemplate.triggers?.map(t => ({ ...t, enabled: true })) || []
        };
        
        // Check if already exists
        const existing = await firestore.collection('tenants').doc(tenantId).collection('playbooks')
            .where('name', '==', playbookTemplate.name)
            .get();
            
        let playbookId = '';
        if (existing.empty) {
            const doc = await firestore.collection('tenants').doc(tenantId).collection('playbooks').add(playbookData);
            playbookId = doc.id;
        } else {
            playbookId = existing.docs[0].id;
        }

        // 3. Trigger Logic Immediately (Mock or Queue)
        // In real system, we'd queue job. Here, we just return success and let user "Run Now" or wait.
        // Or we can manually invoke the scan tool here if we wanted, but that might be slow for a server action.
    }

    revalidatePath('/dashboard/intelligence');
    return { success: true };
}

export async function searchLeaflyCompetitors(
    city: string,
    state: string,
    type: CompetitorSearchType = 'dispensary'
) {
    await requireUser();
    try {
        if (type === 'brand') {
            const result = await searchEntities(`${city} ${state}`, 'brand');
            if (!result.success || !result.data) {
                console.error("Discovery brand search failed:", result.error);
                return [];
            }

            return result.data.map((r: any) => mapDiscoveryResult(r, { city, state }));
        }

        const { LeaflyService } = await import('@/server/services/integrations/leafly');
        const service = new LeaflyService();
        const results = await service.searchDispensaries(city, state);
        
        return results.map(r => ({
            name: r.name,
            address: r.address,
            city: r.city,
            state: r.state,
            zip: r.zip,
            menuUrl: r.menuUrl,
            logo: '' // Leafly scraper might return this later
        }));
    } catch (e: any) {
        console.error("Leafly search failed:", e);
        return [];
    }
}
