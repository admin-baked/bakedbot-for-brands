
/**
 * Weedmaps Scraper Tool
 * 
 * Extracts product data from Weedmaps dispensary menu pages.
 * Supports brand-filtered URLs like:
 * https://weedmaps.com/dispensaries/dispensary-name?filter[brandSlugs][]=brand-name
 */

import * as cheerio from 'cheerio';

export interface WeedmapsProduct {
    name: string;
    price: number | null;
    priceDisplay: string;
    category: string;
    thc?: string;
    inStock: boolean;
    lowStock: boolean;
    brand: string;
    dispensary: string;
    url: string;
    scrapedAt: Date;
}

export interface WeedmapsScrapeResult {
    success: boolean;
    dispensary: string;
    brand: string;
    products: WeedmapsProduct[];
    error?: string;
}

/**
 * Scrape products from a Weedmaps dispensary page
 */
export async function scrapeWeedmapsMenu(url: string): Promise<WeedmapsScrapeResult> {
    try {
        // Extract dispensary slug and brand from URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const dispensarySlug = pathParts[pathParts.length - 1] || 'unknown';
        const brandFilter = urlObj.searchParams.get('filter[brandSlugs][]') || 
                           urlObj.searchParams.get('filter%5BbrandSlugs%5D%5B%5D') || 
                           'all';

        console.log(`[Weedmaps] Scraping ${dispensarySlug} for brand: ${brandFilter}`);

        // Fetch page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        if (!response.ok) {
            return {
                success: false,
                dispensary: dispensarySlug,
                brand: brandFilter,
                products: [],
                error: `HTTP ${response.status}: ${response.statusText}`
            };
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const products: WeedmapsProduct[] = [];

        // Weedmaps product card selectors (may need updates as site changes)
        // Common patterns: product cards, menu items
        $('[data-testid="product-card"], .product-card, .menu-item, [class*="ProductCard"]').each((i, el) => {
            const $el = $(el);
            
            // Extract product name
            const name = $el.find('[class*="product-name"], [class*="ProductName"], h3, h4').first().text().trim() ||
                        $el.find('a[href*="/products/"]').first().text().trim();
            
            if (!name) return; // Skip if no name found

            // Extract price
            const priceText = $el.find('[class*="price"], [class*="Price"]').first().text().trim();
            const priceMatch = priceText.match(/\$?([\d.]+)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : null;

            // Extract THC
            const thcText = $el.find('[class*="thc"], [class*="THC"]').text().trim();
            const thc = thcText.match(/[\d.]+%/) ? thcText.match(/[\d.]+%/)?.[0] : undefined;

            // Stock status
            const stockText = $el.text().toLowerCase();
            const lowStock = stockText.includes('low stock') || stockText.includes('few left');
            const outOfStock = stockText.includes('out of stock') || stockText.includes('sold out');
            const inStock = !outOfStock;

            // Category (flower, edibles, etc.)
            const category = $el.find('[class*="category"], [class*="Category"]').first().text().trim() || 
                            $el.closest('[data-category]').attr('data-category') || 
                            'Unknown';

            products.push({
                name,
                price,
                priceDisplay: priceText || (price ? `$${price.toFixed(2)}` : 'N/A'),
                category,
                thc,
                inStock,
                lowStock,
                brand: brandFilter,
                dispensary: dispensarySlug,
                url,
                scrapedAt: new Date()
            });
        });

        // Fallback: Try JSON-LD structured data
        if (products.length === 0) {
            $('script[type="application/ld+json"]').each((i, el) => {
                try {
                    const json = JSON.parse($(el).html() || '{}');
                    if (json['@type'] === 'Product' || json.offers) {
                        products.push({
                            name: json.name || 'Unknown Product',
                            price: json.offers?.price ? parseFloat(json.offers.price) : null,
                            priceDisplay: json.offers?.price ? `$${json.offers.price}` : 'N/A',
                            category: json.category || 'Unknown',
                            inStock: json.offers?.availability !== 'OutOfStock',
                            lowStock: false,
                            brand: brandFilter,
                            dispensary: dispensarySlug,
                            url,
                            scrapedAt: new Date()
                        });
                    }
                } catch (e) { /* ignore parse errors */ }
            });
        }

        console.log(`[Weedmaps] Found ${products.length} products at ${dispensarySlug}`);

        return {
            success: true,
            dispensary: dispensarySlug,
            brand: brandFilter,
            products
        };

    } catch (error: any) {
        console.error('[Weedmaps] Scrape error:', error);
        return {
            success: false,
            dispensary: 'unknown',
            brand: 'unknown',
            products: [],
            error: error.message
        };
    }
}

/**
 * Scrape multiple dispensaries and return combined results
 */
export async function scrapeMultipleDispensaries(urls: string[]): Promise<{
    success: boolean;
    totalProducts: number;
    results: WeedmapsScrapeResult[];
}> {
    const results: WeedmapsScrapeResult[] = [];
    
    for (const url of urls) {
        const result = await scrapeWeedmapsMenu(url);
        results.push(result);
        
        // Rate limiting - 1 second between requests
        await new Promise(r => setTimeout(r, 1000));
    }

    const totalProducts = results.reduce((sum, r) => sum + r.products.length, 0);

    return {
        success: results.some(r => r.success),
        totalProducts,
        results
    };
}

/**
 * Format products for Google Sheets (returns 2D array)
 */
export function formatProductsForSheets(products: WeedmapsProduct[]): string[][] {
    // Header row
    const header = ['Date', 'Dispensary', 'Product', 'Price', 'Stock Status', 'THC', 'Category'];
    
    const rows = products.map(p => [
        new Date().toLocaleDateString(),
        p.dispensary,
        p.name,
        p.priceDisplay,
        p.lowStock ? 'Low Stock' : (p.inStock ? 'In Stock' : 'Out of Stock'),
        p.thc || 'N/A',
        p.category
    ]);

    return [header, ...rows];
}
