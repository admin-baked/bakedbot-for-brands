'use server';

/**
 * AI Signal Scanner Tool
 * 
 * Scans a given website URL for signals of AI adoption in the cannabis industry.
 * Detects:
 * - Chatbots (BakedBot, Intercom, Drift)
 * - Headless implementations (Next.js, Gatsby)
 * - Meta tags indicating platform
 * - Keywords associated with AI usage
 */

import * as cheerio from 'cheerio';

export interface ScanResult {
    url: string;
    ai_tools: string[];
    use_case: string[];
    headless_detected: boolean;
    signals: string[];
    tech_stack: string[];
    discovered_at: string;
}

/**
 * Scan a website for AI adoption signals
 */
export async function scanForAiSignals(url: string): Promise<ScanResult> {
    try {
        console.log(`[Discovery] Scanning ${url} for AI signals...`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        
        const signals: string[] = [];
        const ai_tools: Set<string> = new Set();
        const use_case: Set<string> = new Set();
        const tech_stack: Set<string> = new Set();

        // 1. Script Analysis
        const scripts = $('script').map((i, el) => $(el).attr('src') || $(el).html() || '').get();
        const scriptText = scripts.join(' ');

        // Chatbots & Agents
        if (scriptText.includes('bakedbot-ai.js') || scriptText.includes('bakedbot.ai')) {
            ai_tools.add('BakedBot AI');
            use_case.add('AI Budtender');
            signals.push('script:bakedbot');
        }
        if (scriptText.includes('intercom') || scriptText.includes('intercomSettings')) {
            ai_tools.add('Intercom');
            use_case.add('Customer Chat');
        }
        if (scriptText.includes('drift.com')) {
            ai_tools.add('Drift');
            use_case.add('Customer Chat');
        }
        if (scriptText.includes('alpineiq')) {
            ai_tools.add('Alpine IQ');
            use_case.add('Loyalty');
        }
        if (scriptText.includes('springbig')) {
            ai_tools.add('Springbig');
            use_case.add('Loyalty');
        }
        if (scriptText.includes('dutchie') || scriptText.includes('dutchieplus')) {
            ai_tools.add('Dutchie');
            tech_stack.add('Dutchie Ecommerce');
        }
        if (scriptText.includes('jane') && scriptText.includes('iheartjane')) {
            ai_tools.add('Jane');
            tech_stack.add('Jane Ecommerce');
        }

        // 2. Meta Tag Analysis
        const metaTags = $('meta').map((i, el) => {
            return {
                name: $(el).attr('name'),
                content: $(el).attr('content')
            };
        }).get();

        metaTags.forEach(meta => {
            if (meta.name === 'generator') {
                if (meta.content?.includes('WordPress')) tech_stack.add('WordPress');
                if (meta.content?.includes('Wix')) tech_stack.add('Wix');
                if (meta.content?.includes('Squarespace')) tech_stack.add('Squarespace');
            }
            if (meta.name === 'next-head-count') {
                tech_stack.add('Next.js');
                signals.push('meta:nextjs');
            }
        });

        // 3. Headless Detection
        const isNextJs = scriptText.includes('_next/static') || tech_stack.has('Next.js');
        const isGatsby = scriptText.includes('gatsby') || $('#___gatsby').length > 0;
        const isNuxt = scriptText.includes('_nuxt');
        
        let headless_detected = false;
        if (isNextJs || isGatsby || isNuxt) {
            headless_detected = true;
            use_case.add('Headless Menu');
            signals.push('headless:detected');
        }

        // 4. Content Keyword Analysis
        const bodyText = $('body').text().toLowerCase();
        
        if (bodyText.includes('ai budtender') || bodyText.includes('virtual assistant')) {
             use_case.add('AI Budtender');
             signals.push('keyword:ai_budtender');
        }
        if (bodyText.includes('ask smokey') || bodyText.includes('chat with us')) {
            // Contextual chat hint
        }

        return {
            url,
            ai_tools: Array.from(ai_tools),
            use_case: Array.from(use_case),
            headless_detected,
            signals,
            tech_stack: Array.from(tech_stack),
            discovered_at: new Date().toISOString()
        };

    } catch (error: any) {
        console.error(`[Discovery] Scan failed for ${url}:`, error);
        return {
            url,
            ai_tools: [],
            use_case: [],
            headless_detected: false,
            signals: [`error:${error.message}`],
            tech_stack: [],
            discovered_at: new Date().toISOString()
        };
    }
}
