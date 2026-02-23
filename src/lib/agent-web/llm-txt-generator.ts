/**
 * LLM.txt Generator — Machine-readable sitemaps for AI agents
 *
 * Follows the llm.txt convention (proposed by Cloudflare):
 * structured markdown served at /{brandSlug}/llm.txt
 *
 * Makes dispensary menus, products, deals, and loyalty programs
 * discoverable by AI shopping agents and LLM crawlers.
 */

import type { Brand, Product } from '@/types/products';
import type { BundleDeal } from '@/types/bundles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PublicMenuSettings = any;

const BASE_URL = 'https://bakedbot.ai';
const MAX_PRODUCTS_IN_LLM_TXT = 100;

/**
 * Generate llm.txt content for a specific brand/dispensary
 */
export function generateBrandLlmTxt(
    brand: Brand,
    products: Product[],
    bundles: BundleDeal[],
    loyaltySettings: PublicMenuSettings | null,
    brandSlug: string
): string {
    const lines: string[] = [];
    const brandType = brand.type === 'dispensary' ? 'Cannabis Dispensary' : 'Cannabis Brand';

    // Header
    lines.push(`# ${brand.name} - ${brandType}`);
    if (brand.description) {
        lines.push(`> ${brand.description}`);
    }
    lines.push('');

    // Menu summary
    lines.push('## Menu');
    lines.push(`- Total Products: ${products.length}`);
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    if (categories.length > 0) {
        lines.push(`- Categories: ${categories.join(', ')}`);
    }
    lines.push(`- Full Menu: ${BASE_URL}/${brandSlug}`);
    lines.push(`- Agent API (JSON-LD): ${BASE_URL}/api/agent/${brandSlug}`);
    lines.push('');

    // Products by category (capped)
    if (products.length > 0) {
        lines.push('## Products by Category');
        const productsByCategory = groupByCategory(products);
        let productCount = 0;

        for (const [category, categoryProducts] of Object.entries(productsByCategory)) {
            if (productCount >= MAX_PRODUCTS_IN_LLM_TXT) break;

            lines.push(`### ${category} (${categoryProducts.length})`);
            for (const product of categoryProducts) {
                if (productCount >= MAX_PRODUCTS_IN_LLM_TXT) break;
                lines.push(formatProductLine(product));
                productCount++;
            }
            lines.push('');
        }

        if (products.length > MAX_PRODUCTS_IN_LLM_TXT) {
            lines.push(`> Showing ${MAX_PRODUCTS_IN_LLM_TXT} of ${products.length} products. See Agent API for full catalog: ${BASE_URL}/api/agent/${brandSlug}`);
            lines.push('');
        }
    }

    // Store info
    const storeInfo = buildStoreInfoSection(brand);
    if (storeInfo.length > 0) {
        lines.push('## Store Info');
        lines.push(...storeInfo);
        lines.push('');
    }

    // Active deals & bundles
    if (bundles.length > 0) {
        lines.push('## Active Deals & Bundles');
        for (const bundle of bundles) {
            const savings = bundle.savingsPercent
                ? ` (Save ${Math.round(bundle.savingsPercent)}%)`
                : '';
            lines.push(`- ${bundle.name}: ${bundle.description || bundle.type}${savings}`);
        }
        lines.push('');
    }

    // Loyalty program
    if (loyaltySettings) {
        const loyaltyLines = buildLoyaltySection(loyaltySettings);
        if (loyaltyLines.length > 0) {
            lines.push('## Loyalty Program');
            lines.push(...loyaltyLines);
            lines.push('');
        }
    }

    // Contact
    lines.push('## Contact');
    if (brand.website) lines.push(`- Website: ${brand.website}`);
    const phone = brand.phone || brand.location?.phone || brand.contactPhone;
    if (phone) lines.push(`- Phone: ${phone}`);
    if (brand.contactEmail) lines.push(`- Email: ${brand.contactEmail}`);
    lines.push(`- AI Budtender: ${BASE_URL}/${brandSlug} (chat available on menu page)`);
    lines.push('');

    // Footer
    lines.push('---');
    lines.push(`Powered by BakedBot AI | ${BASE_URL}`);
    lines.push(`Generated: ${new Date().toISOString()}`);

    return lines.join('\n');
}

/**
 * Generate the global platform-level llm.txt
 */
export function generateGlobalLlmTxt(
    brands: Array<{ name: string; slug: string }>
): string {
    const lines: string[] = [];

    lines.push('# BakedBot AI');
    lines.push('> The first cannabis commerce platform built for both the human web and the agent web.');
    lines.push('');
    lines.push('BakedBot AI powers dispensary and brand storefronts with AI agents,');
    lines.push('real-time POS integration, loyalty programs, and compliance automation.');
    lines.push('');

    // API access
    lines.push('## API Access');
    lines.push('- Agent API: `GET /api/agent/{brandSlug}` — Returns JSON-LD (schema.org) structured product catalog');
    lines.push('- Per-brand LLM.txt: `GET /{brandSlug}/llm.txt` — Machine-readable brand/menu summary');
    lines.push('- Content-Type: `application/ld+json` (Agent API) | `text/plain` (llm.txt)');
    lines.push('');

    // Brand directory
    if (brands.length > 0) {
        lines.push('## Dispensary & Brand Directory');
        for (const brand of brands) {
            lines.push(`- [${brand.name}](${BASE_URL}/${brand.slug}/llm.txt)`);
        }
        lines.push('');
    }

    // Platform features
    lines.push('## Platform Features');
    lines.push('- Real-time POS-synced product menus with terpene and cannabinoid profiles');
    lines.push('- AI budtender (Smokey) for personalized product recommendations');
    lines.push('- Loyalty programs with points, tier rewards, and redemption');
    lines.push('- Bundle deals and promotional pricing');
    lines.push('- Compliance-verified content (jurisdiction-aware)');
    lines.push('- Competitive intelligence and dynamic pricing');
    lines.push('');

    // Data available
    lines.push('## Data Available Per Product');
    lines.push('- Name, category, description, images');
    lines.push('- Price, availability, dynamic pricing badges');
    lines.push('- THC/CBD percentages');
    lines.push('- Full terpene profiles (name + percentage)');
    lines.push('- Cannabinoid profiles');
    lines.push('- Effects (e.g., Relaxed, Energetic, Creative)');
    lines.push('- Strain type (indica, sativa, hybrid)');
    lines.push('- Brand/manufacturer name');
    lines.push('- Weight and serving information');
    lines.push('');

    // Contact
    lines.push('## Contact');
    lines.push(`- Website: ${BASE_URL}`);
    lines.push('- Email: hello@bakedbot.ai');
    lines.push('');

    lines.push('---');
    lines.push(`Generated: ${new Date().toISOString()}`);

    return lines.join('\n');
}

// --- Helpers ---

function groupByCategory(products: Product[]): Record<string, Product[]> {
    const groups: Record<string, Product[]> = {};
    for (const product of products) {
        const cat = product.category || 'Other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(product);
    }
    return groups;
}

function formatProductLine(product: Product): string {
    const parts: string[] = [`- ${product.name}`];

    if (product.price != null && product.price > 0) {
        parts.push(`$${product.price.toFixed(2)}`);
    }

    if (product.thcPercent != null) {
        parts.push(`THC: ${product.thcPercent}%`);
    }

    if (product.cbdPercent != null) {
        parts.push(`CBD: ${product.cbdPercent}%`);
    }

    if (product.strainType) {
        parts.push(product.strainType);
    }

    if (product.effects?.length) {
        parts.push(`Effects: ${product.effects.slice(0, 3).join(', ')}`);
    }

    if (product.terpenes?.length) {
        const topTerpenes = product.terpenes
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 3)
            .map(t => t.name);
        parts.push(`Terpenes: ${topTerpenes.join(', ')}`);
    }

    return parts.join(' | ');
}

function buildStoreInfoSection(brand: Brand): string[] {
    const lines: string[] = [];

    // Address
    const addr = brand.location?.address || brand.address;
    const city = brand.location?.city || brand.city;
    const state = brand.location?.state || brand.state;
    const zip = brand.location?.zip || brand.zip;

    if (addr || city) {
        const addressParts = [addr, city, state, zip].filter(Boolean);
        lines.push(`- Address: ${addressParts.join(', ')}`);
    }

    // Phone
    const phone = brand.phone || brand.location?.phone || brand.contactPhone;
    if (phone) lines.push(`- Phone: ${phone}`);

    // Hours
    if (brand.hours && Object.keys(brand.hours).length > 0) {
        lines.push('- Hours:');
        for (const [day, hours] of Object.entries(brand.hours)) {
            lines.push(`  - ${day}: ${hours}`);
        }
    }

    // License
    if (brand.licenseNumber) {
        lines.push(`- License: ${brand.licenseNumber}`);
    }

    return lines;
}

function buildLoyaltySection(settings: PublicMenuSettings): string[] {
    const lines: string[] = [];

    if (settings.pointsPerDollar) {
        lines.push(`- Points per Dollar: ${settings.pointsPerDollar}`);
    }

    if (settings.tiers?.length) {
        lines.push('- Tiers:');
        for (const tier of settings.tiers) {
            const multiplier = tier.multiplier > 1 ? ` (${tier.multiplier}x points)` : '';
            lines.push(`  - ${tier.name}: ${tier.pointsRequired}+ points${multiplier}`);
        }
    }

    if (settings.redemptionTiers?.length) {
        lines.push('- Redemption:');
        for (const tier of settings.redemptionTiers) {
            lines.push(`  - ${tier.points} points = $${tier.value} off`);
        }
    }

    if (settings.discountPrograms?.length) {
        const activePrograms = settings.discountPrograms.filter((p: { enabled: boolean }) => p.enabled);
        if (activePrograms.length > 0) {
            lines.push('- Discount Programs:');
            for (const program of activePrograms) {
                lines.push(`  - ${program.name}: ${program.description}`);
            }
        }
    }

    return lines;
}
