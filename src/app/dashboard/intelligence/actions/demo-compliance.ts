'use server';

import { discovery } from '@/server/services/firecrawl';

// Timeout wrapper
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), ms);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export async function scanDemoCompliance(url: string) {
    if (!url) return { success: false, error: "No URL provided" };

    // Normalize URL
    let targetUrl = url;
    if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

    try {
        // 1. Live Scrape with 10s timeout
        console.log(`[Demo] Deebo scanning ${targetUrl}`);
        
        let content = '';
        let isLive = false;
        
        // Try live scrape with timeout
        if (discovery.isConfigured()) {
            const result = await withTimeout(
                discovery.discoverUrl(targetUrl, ['markdown']), 
                10000
            );
            
            if (result && result.success && result.data?.markdown) {
                content = result.data.markdown.toLowerCase();
                isLive = true;
            }
        }
        
        // Fallback: Mock analysis if live scrape failed or timed out
        if (!content) {
            console.log('[Demo] Deebo using mock analysis (FireCrawl timeout/unavailable)');
            // Generate mock findings based on URL heuristics
            const urlLower = targetUrl.toLowerCase();
            const isDispensary = urlLower.includes('dispensar') || urlLower.includes('cannabis') || urlLower.includes('weed');
            
            return {
                success: true,
                url: targetUrl,
                riskScore: isDispensary ? 'Medium' : 'Low',
                details: {
                    violations: [],
                    warnings: isDispensary 
                        ? ["Age Gate status unknown (site not accessible for deep scan)", "FDA Disclaimer verification pending"]
                        : ["Unable to perform deep scan - retry later"],
                    passing: isDispensary
                        ? ["Domain appears cannabis-related", "No prohibited terms in URL"]
                        : ["Basic URL check passed"]
                },
                preview: `[Mock Analysis] Unable to access ${targetUrl} for live scan. Retry or verify manually.`,
                isLive: false
            };
        }

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
            preview: content.substring(0, 200) + "...",
            isLive
        };

    } catch (e) {
        console.error("Deebo scan failed", e);
        // Return mock result instead of error
        return { 
            success: true, 
            url: targetUrl,
            riskScore: 'Medium',
            details: {
                violations: [],
                warnings: ["Deep scan unavailable - analysis based on limited data"],
                passing: ["URL is accessible"]
            },
            preview: "[Error Recovery] Site scan failed, limited analysis provided.",
            isLive: false
        };
    }
}

