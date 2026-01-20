
import { chromium, Browser, Page } from 'playwright';
import { logger } from '@/lib/logger';
import * as cheerio from 'cheerio';

/**
 * BrowserService
 * 
 * Provides a safe, controlled interface for agents to browser the web.
 * Uses Playwright to interact with pages and Cheerio to convert to Markdown.
 * 
 * Capabilities:
 * - Navigate to URL
 * - Get page content (Markdown/Text)
 * - Click elements
 * - Fill forms
 * - JavaScript execution
 */
export class BrowserService {
    private static instance: BrowserService;
    
    // We intentionally don't keep persistent pages/contexts to avoid state leakage between tool calls
    // unless strictly necessary. For now, each interaction spins up a context.
    
    private constructor() {}

    public static getInstance(): BrowserService {
        if (!BrowserService.instance) {
            BrowserService.instance = new BrowserService();
        }
        return BrowserService.instance;
    }

    /**
     * Executes a browser action in a new context
     */
    public async browse(url: string, action: 'read' | 'screenshot' | 'click' | 'type' | 'search' = 'read', selector?: string, inputValue?: string): Promise<any> {
        logger.info(`[BrowserService] Browsing: ${url}, Action: ${action}`);
        
        let browser: Browser | null = null;
        
        try {
            // Launch browser if not already running (or reusable)
            // Note: For serverless/cloud envs, we might need a different strategy (e.g. Browserless.io or connecting to remote ws)
            // This implementation assumes local execution or container with browser support.
            browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            
            const context = await browser.newContext({
                viewport: { width: 1280, height: 800 },
                userAgent: 'BakedBot-Agent/1.0 (AI Assistant; +https://bakedbot.ai)'
            });
            
            const page = await context.newPage();
            
            // Navigate
            try {
                // If action is not 'read' (which implies initial load), and we are performing actions,
                // we technically need a session. But for this stateless tool, we go to URL first.
                // Ideal for 'testing': Agent says "Go here and type this".
                
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // Wait a bit for dynamic content if needed
                await page.waitForTimeout(1000); 
            } catch (e) {
                logger.error(`[BrowserService] Navigation failed: ${(e as Error).message}`);
                return { success: false, error: `Failed to load ${url}: ${(e as Error).message}` };
            }

            let result: any = { success: true, url: page.url() };

            switch (action) {
                case 'read':
                    // Convert to simplified markdown
                    result.title = await page.title();
                    result.content = await this.getPageMarkdown(page);
                    break;
                    
                case 'screenshot':
                    const buffer = await page.screenshot({ fullPage: true });
                    result.image = buffer.toString('base64');
                    break;
                    
                case 'click':
                    if (!selector) throw new Error('Selector required for click action');
                    try {
                        await page.waitForSelector(selector, { timeout: 5000 });
                        await page.click(selector);
                        // Wait for potential navigation or DOM update
                        await page.waitForLoadState('domcontentloaded');
                        await page.waitForTimeout(1000);
                        result.message = `Clicked ${selector}`;
                        result.newContent = await this.getPageMarkdown(page); // return new state
                    } catch (e) {
                         throw new Error(`Failed to click selector "${selector}": ${(e as Error).message}`);
                    }
                    break;
                    
                case 'type':
                    if (!selector || inputValue === undefined) throw new Error('Selector and input value required for type action');
                     try {
                        await page.waitForSelector(selector, { timeout: 5000 });
                        await page.fill(selector, inputValue);
                        result.message = `Typed "${inputValue}" into ${selector}`;
                    } catch (e) {
                         throw new Error(`Failed to type into selector "${selector}": ${(e as Error).message}`);
                    }
                    break;
            }

            return result;

        } catch (error) {
            logger.error(`[BrowserService] Error: ${(error as Error).message}`);
            return { success: false, error: (error as Error).message };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Converts page HTML to Markdown using Cheerio
     */
    private async getPageMarkdown(page: Page): Promise<string> {
        const html = await page.content();
        const $ = cheerio.load(html);

        // Remove scripts, styles, and other non-content elements
        $('script, style, noscript, iframe, svg, header, footer, nav').remove();

        // Helper to convert element to markdown
        // A full robust converter would be larger, this is a simplified version suitable for agents
        // focusing on structure: h1-h6, p, ul, ol, links.
        
        let markdown = '';
        
        $('body').find('*').each((_, el) => {
            const $el = $(el);
            // We traverse deep, but cheerio 'text' gets all children. 
            // Better strategy: Select specific blocks we care about.
        });

        // Simpler strategy: Use readability-like approach or just simple text preservation structure
        // Iterating mainly over headers and paragraphs
        
        const output: string[] = [];
        
        $('h1, h2, h3, h4, h5, h6, p, li, blockquote').each((_, el) => {
             const $el = $(el);
             const tag = (el as any).tagName?.toLowerCase() || '';
             const text = $el.text().trim();
             
             if (!text) return;
             
             switch(tag) {
                 case 'h1': output.push(`\n# ${text}\n`); break;
                 case 'h2': output.push(`\n## ${text}\n`); break;
                 case 'h3': output.push(`\n### ${text}\n`); break;
                 case 'h4': output.push(`\n#### ${text}\n`); break;
                 case 'h5': output.push(`\n##### ${text}\n`); break;
                 case 'h6': output.push(`\n###### ${text}\n`); break;
                 case 'p': output.push(`\n${text}\n`); break;
                 case 'li': output.push(`- ${text}`); break;
                 case 'blockquote': output.push(`\n> ${text}\n`); break;
             }
        });
        
        // Links are important for navigation
        const links: string[] = [];
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !href.startsWith('javascript:')) {
                links.push(`- [${text}](${href})`);
            }
        });

        if (links.length > 0) {
            output.push('\n### Links\n');
            // Limit links to avoid context window explosion
            output.push(...links.slice(0, 50)); 
            if (links.length > 50) output.push(`\n... (${links.length - 50} more links)`);
        }

        return output.join('\n');
    }
}

export const browserService = BrowserService.getInstance();
