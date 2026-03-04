/**
 * Blog Generator Service
 *
 * AI-powered blog post generation using Claude with brand voice integration
 */

import { callClaude } from '@/ai/claude';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { BlogPost, BlogCategory } from '@/types/blog';
import type { BrandGuide } from '@/types/brand-guide';
import type { Citation } from '@/server/actions/blog-research';

export interface BlogGeneratorInput {
    topic: string;
    outline?: string;
    category: BlogCategory;
    targetAudience?: string;
    tone?: 'professional' | 'casual' | 'educational' | 'playful';
    length?: 'short' | 'medium' | 'long'; // 300w, 700w, 1200w
    seoKeywords?: string[];
    productToFeature?: string;
    orgId: string;
    userId: string;
}

export interface BlogGeneratorOutput {
    title: string;
    subtitle?: string;
    excerpt: string;
    content: string;
    tags: string[];
    seoKeywords: string[];
}

const WORD_COUNT_MAP = {
    short: 300,
    medium: 700,
    long: 1200,
};

const PLATFORM_ORG_ID = 'org_bakedbot_platform';

/**
 * Generate a blog post draft using AI
 */
export async function generateBlogDraft(
    input: BlogGeneratorInput
): Promise<BlogGeneratorOutput> {
    try {
        const firestore = getAdminFirestore();
        const isPlatform = input.orgId === PLATFORM_ORG_ID;

        let brandGuide: BrandGuide | null = null;
        let brandName = 'our brand';

        if (isPlatform) {
            // Platform blog uses BakedBot's own voice
            brandName = 'BakedBot AI';
        } else {
            // Per-org blog uses their brand guide
            const brandGuideDoc = await firestore
                .collection('brandGuides')
                .doc(input.orgId)
                .get();
            brandGuide = brandGuideDoc.exists ? (brandGuideDoc.data() as BrandGuide) : null;

            const tenantDoc = await firestore
                .collection('tenants')
                .doc(input.orgId)
                .get();
            const tenant = tenantDoc.exists ? tenantDoc.data() : null;
            brandName = tenant?.name || 'our brand';
        }

        // Build prompt
        const prompt = isPlatform
            ? buildPlatformBlogPrompt(input)
            : buildBlogPrompt(input, brandGuide, brandName);

        logger.info('[BlogGenerator] Generating blog post', {
            orgId: input.orgId,
            topic: input.topic,
            category: input.category,
            length: input.length,
            isPlatform,
        });

        // Generate with Claude
        const response = await callClaude({
            userMessage: prompt,
            temperature: 0.7,
            maxTokens: 4000,
        });

        // Parse response
        const parsed = parseBlogResponse(response);

        logger.info('[BlogGenerator] Blog post generated successfully', {
            orgId: input.orgId,
            titleLength: parsed.title.length,
            contentLength: parsed.content.length,
        });

        return parsed;
    } catch (error) {
        logger.error('[BlogGenerator] Error generating blog post', { error, input });
        throw new Error('Failed to generate blog post');
    }
}

/**
 * Generate a structured outline from a topic (for review before full draft)
 */
export async function generateBlogOutline(
    topic: string,
    category: BlogCategory,
    keywords?: string[]
): Promise<string> {
    const prompt = `Create a detailed blog post outline for a cannabis industry blog.

Topic: ${topic}
Category: ${category.replace('_', ' ')}
${keywords?.length ? `Target Keywords: ${keywords.join(', ')}` : ''}

Create a structured outline with:
1. A compelling title suggestion
2. 4-6 main sections (H2 headings) with brief descriptions
3. 2-3 sub-points per section
4. A conclusion section
5. Key takeaways or CTA suggestion

Format as a clean Markdown outline that can be used as a writing guide.
Keep it concise — outline only, no full paragraphs.`;

    try {
        const response = await callClaude({
            userMessage: prompt,
            temperature: 0.6,
            maxTokens: 1000,
        });
        return response.trim();
    } catch (error) {
        logger.error('[BlogGenerator] Error generating outline', { error });
        throw new Error('Failed to generate outline');
    }
}

/**
 * Build prompt for platform-level blog posts (BakedBot's own voice)
 */
function buildPlatformBlogPrompt(input: BlogGeneratorInput): string {
    const wordCount = WORD_COUNT_MAP[input.length || 'medium'];
    const tone = input.tone || 'professional';

    return `You are a content writer for BakedBot AI, an agentic commerce operating system for the cannabis industry.

Write a ${input.length || 'medium'} length blog post (approximately ${wordCount} words) about: ${input.topic}

${input.outline ? `Follow this outline:\n${input.outline}\n` : ''}

BakedBot Platform Voice:
- We are the leading cannabis technology platform combining AI agents, compliance automation, and data-driven marketing
- We speak with authority on cannabis industry trends, technology, marketing, and compliance
- Tone: ${tone}, knowledgeable, forward-thinking, industry-expert
- We use "cannabis" (not marijuana, weed, pot)
- We position ourselves as thought leaders empowering dispensaries and brands
- We reference real industry challenges: compliance complexity, customer retention, competitive markets

${input.targetAudience ? `Target Audience: ${input.targetAudience}` : 'Target Audience: Cannabis dispensary owners, brand managers, and industry professionals'}
${input.seoKeywords?.length ? `SEO Keywords to include naturally: ${input.seoKeywords.join(', ')}` : ''}

Category: ${input.category.replace('_', ' ')}

${input.productToFeature ? `Feature this product/capability: ${input.productToFeature}` : ''}

Compliance Rules:
- NO medical claims (do not use: cure, treat, heal, diagnose, therapy, medicine)
- Content targets 21+ professionals
- Focus on business outcomes, technology, compliance, and marketing strategy
- Use compliant terminology throughout

Format Requirements:
- Write in Markdown format
- Structure: Title (H1), optional subtitle, 2-3 sentence excerpt, then full article with H2/H3 sections
- Aim for exactly ${wordCount} words in the main content
- Include 3-5 relevant tags
- Include 5-10 SEO keywords

Output EXACTLY in this format:
TITLE: [Blog post title - compelling and SEO-friendly]
SUBTITLE: [Optional subtitle for context]
EXCERPT: [2-3 sentence summary that hooks the reader]
TAGS: [tag1, tag2, tag3, tag4, tag5]
SEO_KEYWORDS: [keyword1, keyword2, keyword3, keyword4, keyword5]
---
[Full blog post content in Markdown format with H2/H3 headings, paragraphs, lists, etc.]

Remember:
- Write as BakedBot's editorial voice — authoritative, helpful, industry-expert
- Include actionable insights for cannabis business professionals
- Reference industry data and trends where relevant
- ${wordCount} words for the main content`;
}

/**
 * Build the prompt for blog generation
 */
function buildBlogPrompt(
    input: BlogGeneratorInput,
    brandGuide: BrandGuide | null,
    brandName: string
): string {
    const wordCount = WORD_COUNT_MAP[input.length || 'medium'];
    const tone = input.tone || 'professional';

    // Extract brand voice
    const personality = brandGuide?.voice?.personality || 'professional and knowledgeable';
    const toneGuide = brandGuide?.voice?.tone || 'informative and friendly';
    const preferredTerms = brandGuide?.voice?.vocabulary?.preferred?.join(', ') || 'cannabis, products, quality';
    const avoidTerms = brandGuide?.voice?.vocabulary?.avoid?.join(', ') || 'marijuana, weed, pot';

    // Build state-specific compliance rules
    const complianceRules = `
Cannabis Compliance Rules:
- NO medical claims (do not use: cure, treat, heal, diagnose, therapy, medicine)
- Imply 21+ audience throughout
- Focus on experience, quality, and community
- Use compliant terminology: cannabis (not marijuana), THC/CBD (specific), consumption (not smoking)
- Avoid youth appeal: no cartoons, no "cool" language, no youth-targeted imagery
`;

    const prompt = `You are Craig, the marketing expert for ${brandName}.

Write a ${input.length || 'medium'} length blog post (approximately ${wordCount} words) about: ${input.topic}

${input.outline ? `Follow this outline:\n${input.outline}\n` : ''}

Brand Voice Guidelines:
- Personality: ${personality}
- Tone: ${toneGuide} (user preference: ${tone})
- Preferred Terms: ${preferredTerms}
- Avoid These Terms: ${avoidTerms}

${input.targetAudience ? `Target Audience: ${input.targetAudience}` : ''}
${input.seoKeywords && input.seoKeywords.length > 0 ? `SEO Keywords to include naturally: ${input.seoKeywords.join(', ')}` : ''}

Category: ${input.category.replace('_', ' ')}

${input.productToFeature ? `Feature this product: ${input.productToFeature}` : ''}

${complianceRules}

Format Requirements:
- Write in Markdown format
- Structure: Title (H1), optional subtitle, 2-3 sentence excerpt, then full article with H2/H3 sections
- Aim for exactly ${wordCount} words in the main content
- Include 3-5 relevant tags
- Include 5-10 SEO keywords

Output EXACTLY in this format:
TITLE: [Blog post title - compelling and SEO-friendly]
SUBTITLE: [Optional subtitle for context]
EXCERPT: [2-3 sentence summary that hooks the reader]
TAGS: [tag1, tag2, tag3, tag4, tag5]
SEO_KEYWORDS: [keyword1, keyword2, keyword3, keyword4, keyword5]
---
[Full blog post content in Markdown format with H2/H3 headings, paragraphs, lists, etc.]

Remember:
- Stay compliant with cannabis regulations
- Match the brand voice and tone
- Write for ${input.targetAudience || 'cannabis enthusiasts'}
- Be informative, engaging, and SEO-optimized
- ${wordCount} words for the main content`;

    return prompt;
}

/**
 * Parse the AI response into structured blog data
 */
function parseBlogResponse(response: string): BlogGeneratorOutput {
    try {
        const lines = response.split('\n');
        let title = '';
        let subtitle = '';
        let excerpt = '';
        let tags: string[] = [];
        let seoKeywords: string[] = [];
        let content = '';
        let inContent = false;

        for (const line of lines) {
            if (line.startsWith('TITLE:')) {
                title = line.replace('TITLE:', '').trim();
            } else if (line.startsWith('SUBTITLE:')) {
                subtitle = line.replace('SUBTITLE:', '').trim();
            } else if (line.startsWith('EXCERPT:')) {
                excerpt = line.replace('EXCERPT:', '').trim();
            } else if (line.startsWith('TAGS:')) {
                const tagString = line.replace('TAGS:', '').trim();
                tags = tagString
                    .split(',')
                    .map(t => t.trim())
                    .filter(Boolean);
            } else if (line.startsWith('SEO_KEYWORDS:')) {
                const keywordString = line.replace('SEO_KEYWORDS:', '').trim();
                seoKeywords = keywordString
                    .split(',')
                    .map(k => k.trim())
                    .filter(Boolean);
            } else if (line === '---') {
                inContent = true;
            } else if (inContent) {
                content += line + '\n';
            }
        }

        // Validate required fields
        if (!title || !excerpt || !content) {
            throw new Error('Missing required fields in AI response');
        }

        return {
            title,
            subtitle: subtitle || undefined,
            excerpt,
            content: content.trim(),
            tags,
            seoKeywords,
        };
    } catch (error) {
        logger.error('[BlogGenerator] Error parsing blog response', { error, response });
        throw new Error('Failed to parse AI response');
    }
}

/**
 * Generate a blog post draft using AI with Jina research context injected
 * Same as generateBlogDraft but prepends real research findings to ground the writing.
 * If citations are provided, at least 2 MUST appear as Markdown blockquotes in the article.
 */
export async function generateBlogDraftWithResearch(
    input: BlogGeneratorInput,
    researchContext: string,
    citations?: Citation[]
): Promise<BlogGeneratorOutput> {
    try {
        const firestore = getAdminFirestore();
        const isPlatform = input.orgId === PLATFORM_ORG_ID;

        let brandGuide: BrandGuide | null = null;
        let brandName = 'our brand';

        if (isPlatform) {
            brandName = 'BakedBot AI';
        } else {
            const brandGuideDoc = await firestore
                .collection('brandGuides')
                .doc(input.orgId)
                .get();
            brandGuide = brandGuideDoc.exists ? (brandGuideDoc.data() as BrandGuide) : null;

            const tenantDoc = await firestore
                .collection('tenants')
                .doc(input.orgId)
                .get();
            const tenant = tenantDoc.exists ? tenantDoc.data() : null;
            brandName = tenant?.name || 'our brand';
        }

        // Build base prompt (same as generateBlogDraft)
        const basePrompt = isPlatform
            ? buildPlatformBlogPrompt(input)
            : buildBlogPrompt(input, brandGuide, brandName);

        // Build the citations block if we have at least 2
        const usableCitations = citations && citations.length >= 2 ? citations : [];
        const citationsBlock = usableCitations.length > 0
            ? `== REQUIRED CITATIONS — you MUST include at least 2 of these as Markdown blockquotes in the article body ==

${usableCitations.map((c, i) =>
    `${i + 1}. "${c.quote}"
   — ${c.author}, ${c.company}
   Source: ${c.sourceTitle} (${c.url})`
).join('\n\n')}

CITATION FORMAT — use exactly this Markdown syntax for each citation in the article:
> "The quoted text here."
> — Person Name, Company Name

Place each blockquote naturally within the relevant section of the article (not all at the end).
`
            : '';

        // Prepend research context (and required citations) to ground the AI in real data
        const prompt = `== RESEARCH CONTEXT (use as factual grounding — do NOT copy verbatim, synthesize into original writing) ==
${researchContext}

${citationsBlock}== YOUR TASK ==
${basePrompt}`;

        logger.info('[BlogGenerator] Generating research-enriched blog post', {
            orgId: input.orgId,
            topic: input.topic,
            category: input.category,
            researchLength: researchContext.length,
        });

        const response = await callClaude({
            userMessage: prompt,
            temperature: 0.7,
            maxTokens: 4000,
        });

        const parsed = parseBlogResponse(response);

        logger.info('[BlogGenerator] Research-enriched blog post generated', {
            orgId: input.orgId,
            titleLength: parsed.title.length,
            contentLength: parsed.content.length,
        });

        return parsed;
    } catch (error) {
        logger.error('[BlogGenerator] Error generating research-enriched blog post', { error, input });
        throw new Error('Failed to generate research-enriched blog post');
    }
}

/**
 * Generate SEO-optimized title from content title
 */
export async function optimizeTitleForSEO(
    title: string,
    keywords: string[]
): Promise<string> {
    const prompt = `Given this blog post title: "${title}"

SEO Keywords to include: ${keywords.join(', ')}

Create an SEO-optimized title that:
- Is 50-60 characters long
- Includes the primary keyword near the beginning
- Is compelling and click-worthy
- Maintains the original meaning

Output only the optimized title, nothing else.`;

    try {
        const response = await callClaude({
            userMessage: prompt,
            temperature: 0.5,
            maxTokens: 100,
        });

        return response.trim().substring(0, 60);
    } catch (error) {
        logger.error('[BlogGenerator] Error optimizing title', { error });
        return title.substring(0, 60);
    }
}

/**
 * Generate meta description from excerpt
 */
export async function generateMetaDescription(
    excerpt: string,
    keywords: string[]
): Promise<string> {
    const prompt = `Given this blog excerpt: "${excerpt}"

SEO Keywords: ${keywords.join(', ')}

Create a meta description that:
- Is 150-160 characters long
- Includes primary keyword
- Has a call-to-action
- Is compelling for search results

Output only the meta description, nothing else.`;

    try {
        const response = await callClaude({
            userMessage: prompt,
            temperature: 0.5,
            maxTokens: 100,
        });

        return response.trim().substring(0, 160);
    } catch (error) {
        logger.error('[BlogGenerator] Error generating meta description', { error });
        return excerpt.substring(0, 160);
    }
}
