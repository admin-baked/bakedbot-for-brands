'use server';

import { discovery } from '@/server/services/firecrawl';

export async function scanDemoCompliance(url: string) {
    if (!url) return { success: false, error: "No URL provided" };

    // Normalize URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

    try {
        // 1. Live Scrape
        console.log(`[Demo] Deebo scanning ${targetUrl}`);
        const result = await discovery.discoverUrl(targetUrl, ['markdown']);
        
        if (!result.success || !result.data?.markdown) {
             return { success: false, error: "Could not access site" };
        }

        const content = result.data.markdown.toLowerCase();
        
        // 2. Audit Logic (Simple Heuristics)
        const violations = [];
        const warnings = [];
        const passing = [];

        // Check 1: Age Gate (Heuristic: look for "21+", "age", "verify")
        if (content.includes('21+') || content.includes('age') || content.includes('verify')) {
            passing.push("Age Gate Detected");
        } else {
            warnings.push("No clear Age Gate detected (Critical)");
        }

        // Check 2: Prohibited Terms
        const prohibited = ['candy', 'kid', 'child', 'cure', 'heal'];
        const foundProhibited = prohibited.filter(t => content.includes(t));
        if (foundProhibited.length > 0) {
            violations.push(`Prohibited terms found: "${foundProhibited.join('", "')}"`);
        } else {
            passing.push("No prohibited terms found");
        }

        // Check 3: FDA Disclaimer
        if (content.includes('fda') || content.includes('diagnose') || content.includes('food and drug')) {
            passing.push("FDA Disclaimer found");
        } else {
            warnings.push("Missing FDA Disclaimer");
        }

        // Score
        const riskScore = violations.length > 0 ? 'High' : (warnings.length > 0 ? 'Medium' : 'Low');

        return {
            success: true,
            url: targetUrl,
            riskScore,
            details: { violations, warnings, passing },
            preview: content.substring(0, 200) + "..."
        };

    } catch (e) {
        console.error("Deebo scan failed", e);
        return { success: false, error: "Scan Failed" };
    }
}
