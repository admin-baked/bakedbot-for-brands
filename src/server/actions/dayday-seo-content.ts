// src/server/actions/dayday-seo-content.ts
/**
 * Day Day SEO Content Generation
 * Generates unique, market-specific SEO content for each page type
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { ai } from '@/ai/genkit';
import { gemini25Flash } from '@genkit-ai/vertexai';
import { z } from 'zod';

// Content templates by page type
const CONTENT_TEMPLATES = {
    zip: {
        titleTemplate: 'Dispensaries Near {zipCode} | {city}, {state} Cannabis Stores',
        h1Template: 'Cannabis Dispensaries Near {zipCode}',
        introPrompt: `Write a compelling 3-4 sentence intro paragraph for a local cannabis discovery page targeting customers searching for dispensaries near ZIP code {zipCode} in {city}, {state}. 
        Include:
        - Number of dispensaries: {count}
        - Mention deals, hours, and menu browsing
        - Local context (neighborhood if known)
        - Call to action to explore
        
        Keep it natural, helpful, and avoid cannabis slang. Focus on convenience and local discovery.`,
        faqPrompt: `Generate 3 unique FAQs for someone searching "dispensaries near {zipCode}" in {city}, {state}. Each FAQ should:
        - Be a real question someone would ask
        - Have a brief, helpful answer (2-3 sentences)
        - Include local context when possible
        
        Format as JSON array: [{"q": "question", "a": "answer"}]`
    },
    dispensary: {
        titleTemplate: '{dispensaryName} | {city}, {state} Cannabis Dispensary',
        h1Template: '{dispensaryName} - Your Local Cannabis Destination',
        introPrompt: `Write a compelling 3-4 sentence intro for {dispensaryName} dispensary page in {city}, {state}.
        Include:
        - Welcome message
        - What makes this location unique (if known: {about})
        - Mention browsing menu and checking deals
        - Address or location hint: {address}
        
        Keep it professional, welcoming, and informative.`,
        faqPrompt: `Generate 3 FAQs specifically for {dispensaryName} in {city}, {state}. Include questions about:
        - Store hours and location
        - Product selection or menu
        - Deals or loyalty programs
        
        Format as JSON array: [{"q": "question", "a": "answer"}]`
    },
    brand: {
        titleTemplate: '{brandName} Products Near {city} | Where to Buy {brandName}',
        h1Template: 'Find {brandName} Near {city}, {state}',
        introPrompt: `Write a 3-4 sentence intro for a brand discovery page for {brandName} in {city}, {state}.
        Include:
        - Help customers find {brandName} products locally
        - Mention {count} retailers carrying this brand
        - Note product categories if known
        - Encourage checking availability and prices
        
        Keep it helpful and discovery-focused.`,
        faqPrompt: `Generate 3 FAQs for someone searching for {brandName} near {city}, {state}. Include questions about:
        - Where to buy
        - Product types/availability
        - Delivery options
        
        Format as JSON array: [{"q": "question", "a": "answer"}]`
    }
};

interface OptimizeResult {
    success: boolean;
    pageId: string;
    title: string;
    h1: string;
    intro: string;
    faqs: { q: string; a: string }[];
    metaDescription: string;
}

/**
 * Generate unique SEO content for a single page
 */
export async function optimizePageContent(
    pageId: string,
    pageType: 'zip' | 'dispensary' | 'brand'
): Promise<OptimizeResult> {
    const { firestore } = await createServerClient();
    
    // 1. Fetch page data
    let collection: string;
    if (pageType === 'zip') collection = 'foot_traffic/config/zip_pages';
    else if (pageType === 'dispensary') collection = 'seo_pages_dispensary';
    else collection = 'seo_pages_brand';
    
    const docRef = firestore.collection(collection.split('/')[0]);
    let pageDoc;
    
    if (pageType === 'zip') {
        pageDoc = await firestore.doc(`foot_traffic/config/zip_pages/${pageId}`).get();
    } else {
        pageDoc = await firestore.collection(collection).doc(pageId).get();
    }
    
    if (!pageDoc.exists) {
        return { success: false, pageId, title: '', h1: '', intro: '', faqs: [], metaDescription: '' };
    }
    
    const data = pageDoc.data() as any;
    const template = CONTENT_TEMPLATES[pageType];
    
    // 2. Build context variables
    const vars: Record<string, string> = {
        zipCode: data.zipCode || pageId.replace('zip_', ''),
        city: data.city || 'Unknown',
        state: data.state || 'Unknown',
        count: String(data.dispensaryCount || data.retailerCount || 0),
        dispensaryName: data.dispensaryName || data.name || '',
        brandName: data.brandName || data.name || '',
        address: data.address || '',
        about: data.about || ''
    };
    
    // 3. Generate title and H1 from templates
    let title = template.titleTemplate;
    let h1 = template.h1Template;
    for (const [key, val] of Object.entries(vars)) {
        title = title.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
        h1 = h1.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }
    
    // 4. Generate intro via AI
    let introPrompt = template.introPrompt;
    for (const [key, val] of Object.entries(vars)) {
        introPrompt = introPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }
    
    const introResult = await ai.generate({
        model: gemini25Flash,
        prompt: introPrompt,
        config: { temperature: 0.7, maxOutputTokens: 300 }
    });
    const intro = introResult.text.trim();
    
    // 5. Generate FAQs via AI
    let faqPrompt = template.faqPrompt;
    for (const [key, val] of Object.entries(vars)) {
        faqPrompt = faqPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    }
    
    const faqResult = await ai.generate({
        model: gemini25Flash,
        prompt: faqPrompt,
        config: { temperature: 0.7, maxOutputTokens: 500 }
    });
    
    let faqs: { q: string; a: string }[] = [];
    try {
        const faqText = faqResult.text.trim();
        const jsonMatch = faqText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            faqs = JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('Failed to parse FAQs:', e);
    }
    
    // 6. Generate meta description
    const metaDescription = `${intro.split('.')[0]}. Find cannabis products, deals, and dispensary info for ${vars.city}, ${vars.state}.`;
    
    // 7. Save optimized content back to Firestore
    const updateData = {
        seoOptimized: true,
        seoOptimizedAt: new Date(),
        seoContent: {
            title,
            h1,
            intro,
            faqs,
            metaDescription
        }
    };
    
    if (pageType === 'zip') {
        await firestore.doc(`foot_traffic/config/zip_pages/${pageId}`).update(updateData);
    } else {
        await firestore.collection(collection).doc(pageId).update(updateData);
    }
    
    return { success: true, pageId, title, h1, intro, faqs, metaDescription };
}

/**
 * Batch optimize multiple pages (called after seeding)
 */
export async function batchOptimizePages(
    pageType: 'zip' | 'dispensary' | 'brand',
    limit: number = 20
): Promise<{ optimized: number; errors: number }> {
    const { firestore } = await createServerClient();
    
    let collection: string;
    let query;
    
    if (pageType === 'zip') {
        query = firestore.collection('foot_traffic').doc('config').collection('zip_pages')
            .where('seoOptimized', '!=', true)
            .limit(limit);
    } else if (pageType === 'dispensary') {
        query = firestore.collection('seo_pages_dispensary')
            .where('seoOptimized', '!=', true)
            .limit(limit);
    } else {
        query = firestore.collection('seo_pages_brand')
            .where('seoOptimized', '!=', true)
            .limit(limit);
    }
    
    const snapshot = await query.get();
    
    let optimized = 0;
    let errors = 0;
    
    for (const doc of snapshot.docs) {
        try {
            console.log(`[DayDay] Optimizing ${pageType} page: ${doc.id}`);
            await optimizePageContent(doc.id, pageType);
            optimized++;
            
            // Rate limit to avoid overloading AI
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {
            console.error(`[DayDay] Failed to optimize ${doc.id}:`, e);
            errors++;
        }
    }
    
    return { optimized, errors };
}

/**
 * Run Day Day SEO optimization on all unoptimized pages
 */
export async function runDayDayOptimization(): Promise<{
    zip: { optimized: number; errors: number };
    dispensary: { optimized: number; errors: number };
    brand: { optimized: number; errors: number };
}> {
    console.log('[DayDay] Starting SEO content optimization...');
    
    const zipResult = await batchOptimizePages('zip', 20);
    const dispResult = await batchOptimizePages('dispensary', 20);
    const brandResult = await batchOptimizePages('brand', 20);
    
    console.log('[DayDay] Optimization complete:', { zip: zipResult, dispensary: dispResult, brand: brandResult });
    
    return {
        zip: zipResult,
        dispensary: dispResult,
        brand: brandResult
    };
}
