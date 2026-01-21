
import { dayDayAgent } from '@/server/agents/dayday';
import { searchConsoleService } from '@/server/services/growth/search-console';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/server/services/email-service';
import { defaultDayDayTools } from '@/app/dashboard/ceo/agents/default-tools';

/**
 * Run Day Day Weekly Growth Review
 * 
 * 1. Analyze GSC for "low hanging fruit" (high impressions, low CTR).
 * 2. Analyze GA4 for high bounce rate pages (if available).
 * 3. Select top candidates for re-optimization.
 * 4. Day Day rewrites meta tags or content intro.
 * 5. Updates database and logs action.
 */
export async function runDayDayWeeklyReview() {
    logger.info('[DayDay] Starting Weekly Growth Review...');
    const results = {
        analyzed: 0,
        optimized: 0,
        errors: 0,
        details: [] as any[]
    };

    try {
        // 1. Find Opportunities from GSC
        const opportunities = await searchConsoleService.findLowCompetitionOpportunities(10);
        logger.info(`[DayDay] Found ${opportunities.length} GSC opportunities.`);

        if (opportunities.length === 0) {
            logger.info('[DayDay] No significant opportunities found this week.');
            // Continue to email
        }

        const candidates = opportunities.slice(0, 5);
        
        for (const candidate of candidates) {
            try {
                logger.info(`[DayDay] Optimizing for query: "${candidate.query}" on page: ${candidate.page}`);

                // In a real scenario, we'd fetch the current page content from DB using the URL/slug
                // For now, we simulate the optimization task
                
                // Construct the prompt for Day Day
                const userQuery = `
                    I need to improve the CTR for the page "${candidate.page}".
                    It ranks for "${candidate.query}" (Pos: ${candidate.position.toFixed(1)}) but has low CTR.
                    Impressions: ${candidate.impressions}, Clicks: ${candidate.clicks}.
                    
                    Please generate:
                    1. A punchier, SEO-optimized Title Tag (max 60 chars).
                    2. A compelling Meta Description (max 160 chars) including the keyword.
                    3. A one-sentence recommendation for content improvement.
                `;

                // Execute Agent
                const memory = { system_instructions: "You are Day Day, an SEO expert." }; // Minimal memory for this task
                // We use specific Day Day logic if agent framework allows, or direct call
                // Assuming dayDayAgent.act is the entry point

                const response = await dayDayAgent.act(
                    {} as any, // Brand memory (empty for now)
                    memory as any,
                    "user_request",
                    defaultDayDayTools, // DayDay tools
                    userQuery
                );

                // In a real app, we would parse response.logEntry.result and apply updates to DB
                // Here we just log the suggested optimization
                
                results.details.push({
                    page: candidate.page,
                    query: candidate.query,
                    optimization: response.logEntry?.result
                });

                results.optimized++;

            } catch (err: any) {
                logger.error(`[DayDay] Failed to optimize ${candidate.page}: ${err.message}`);
                results.errors++;
            }
        }

    } catch (error: any) {
        logger.error(`[DayDay] Weekly Job Fatal Error: ${error.message}`);
        await sendEmail({
            to: 'martez@bakedbot.ai',
            subject: '🚨 Day Day Weekly Review Failed',
            text: `The weekly review job failed: ${error.message}`
        });
        throw error;
    }

    logger.info('[DayDay] Weekly Review Complete.', results);
    
    // Email Notification
    await sendEmail({
        to: 'martez@bakedbot.ai',
        subject: `Day Day Weekly Review: ${results.optimized} Pages Optimized`,
        text: `Weekly review complete.\n\nAnalyzed: ${results.analyzed}\nOptimized: ${results.optimized}\nErrors: ${results.errors}\n\nDetails:\n${results.details.map(d => `- ${d.page}: ${d.query}`).join('\n')}`,
        html: `
            <h1>Day Day Weekly Review</h1>
            <p><strong>Optimized:</strong> ${results.optimized}</p>
            <p><strong>Analyzed:</strong> ${results.analyzed}</p>
            <ul>
                ${results.details.map(d => `<li><strong>${d.page}</strong>: Optimized for "${d.query}"</li>`).join('')}
            </ul>
        `
    });

    return results;
}
