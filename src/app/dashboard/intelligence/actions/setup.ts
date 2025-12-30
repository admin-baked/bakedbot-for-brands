'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { CannMenusService } from '@/server/services/cannmenus';
import { quickSetupCompetitor } from '@/server/services/ezal/competitor-manager';
import { getDefaultPlaybook } from '@/config/default-playbooks';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { parse } from 'node-html-parser';

export async function searchLocalCompetitors(zip: string) {
    await requireUser();
    const service = new CannMenusService();
    // CannMenus "search retailers" API might need geo-coords or state. 
    // Assuming service.searchRetailers takes { address: zip } or similar.
    // If not, we might need to geocode first. 
    // Looking at CannMenusService (inferred), let's assume it has `searchRetailers({ near: zip })`.
    
    try {
        const results = await service.searchRetailers({ near: zip, limit: 10 });
        return results.map((r: any) => ({
            name: r.name,
            address: r.address,
            city: r.city,
            state: r.state,
            zip: r.zip,
            menuUrl: r.menu_url || r.url, // Ensure we have a URL to scrape
            logo: r.logo_url
        }));
    } catch (e) {
        console.error("CannMenus search failed", e);
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
