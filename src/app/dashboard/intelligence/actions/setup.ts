'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { getDefaultPlaybook } from '@/config/default-playbooks';
import { quickSetupCompetitor } from '@/server/services/ezal/competitor-manager';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

import { searchEntities } from '@/server/actions/discovery-search';

export async function searchLocalCompetitors(zip: string) {
    await requireUser();
    
    try {
        // Use BakedBot Discovery (FireCrawl) instead of CannMenus
        // We search for "dispensaries" in the given ZIP
        const result = await searchEntities('dispensaries', 'dispensary', zip);
        
        if (!result.success || !result.data) {
            console.error("Discovery search failed:", result.error);
            return [];
        }
        
        return result.data.map((r: any) => ({
            name: r.name,
            address: r.description || '', // FireCrawl might not parse address perfectly in search mode, use desc as fallback
            city: '', // Discovery search result might not have structured city
            state: '', 
            zip: zip,
            menuUrl: r.url,
            logo: ''
        }));
    } catch (e) {
        console.error("Discovery search failed", e);
        return [];
    }
}

export async function finalizeCompetitorSetup(competitors: any[]) {
    const user = await requireUser();
    const tenantId = user.uid; // Brand ID
    
    // 1. Save Competitors
    for (const comp of competitors) {
        await quickSetupCompetitor(tenantId, {
            name: comp.name,
            type: 'dispensary',
            state: comp.state || '',
            city: comp.city || '',
            zip: comp.zip || '',
            menuUrl: comp.menuUrl,
            parserProfileId: 'cannmenus-default', // Default parser
            frequencyMinutes: 1440 // Daily
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

export async function searchLeaflyCompetitors(city: string, state: string) {
    await requireUser();
    try {
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
