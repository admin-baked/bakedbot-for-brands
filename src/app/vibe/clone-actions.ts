'use server';

/**
 * Vibe Clone Actions
 *
 * Generate vibes by analyzing existing websites or uploaded themes.
 * Allows users to "vibe code" from inspiration or existing designs.
 */

import { logger } from '@/lib/logger';
import { callClaude } from '@/ai/claude';
import { v4 as uuidv4 } from 'uuid';
import type { PublicVibe } from './actions';

/**
 * Fetch and analyze a website URL to extract design elements
 */
async function analyzeWebsiteDesign(url: string): Promise<{
    success: boolean;
    analysis?: {
        colors: string[];
        fonts: string[];
        layout: string;
        style: string;
        description?: string;
        screenshots?: string[];
    };
    error?: string;
}> {
    try {
        // Validate URL
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('http')) {
            return { success: false, error: 'Invalid URL protocol. Use http or https.' };
        }

        logger.info('[VIBE-CLONE] Analyzing website', { url: url.substring(0, 100) });

        // Fetch the website HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; BakedBot/1.0; +https://bakedbot.ai)',
            },
        });

        if (!response.ok) {
            return { success: false, error: `Failed to fetch URL: ${response.statusText}` };
        }

        const html = await response.text();

        // Extract inline styles and first 10000 chars of HTML for analysis
        const htmlPreview = html.substring(0, 10000);

        // Use Claude to analyze the design
        const analysisPrompt = `Analyze this website HTML and extract design elements:

HTML Preview:
\`\`\`html
${htmlPreview}
\`\`\`

Extract and return a JSON object with:
{
  "colors": ["#hex1", "#hex2", ...], // Main brand colors (3-5 colors)
  "fonts": ["Font Name 1", "Font Name 2"], // Primary fonts
  "layout": "grid" | "flex" | "traditional" | "minimal",
  "style": "modern" | "classic" | "bold" | "minimal" | "luxury" | "playful",
  "description": "Brief description of the visual aesthetic"
}

Focus on extracting:
- Primary brand colors from backgrounds, headings, buttons
- Font families used
- Overall layout approach
- Design style/aesthetic

Return ONLY the JSON object, no other text.`;

        const claudeResponse = await callClaude({
            systemPrompt: 'You are a web design analyzer. Extract design elements from HTML and return structured JSON.',
            userMessage: analysisPrompt,
            temperature: 0.3,
        });

        // Parse Claude's response
        const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { success: false, error: 'Failed to parse design analysis' };
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return {
            success: true,
            analysis,
        };
    } catch (error) {
        logger.error('[VIBE-CLONE] Error analyzing website', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze website',
        };
    }
}

/**
 * Generate a vibe from a website URL
 */
export async function generateVibeFromURL(
    url: string
): Promise<{ success: boolean; data?: PublicVibe; error?: string }> {
    try {
        // Analyze the website
        const analysis = await analyzeWebsiteDesign(url);

        if (!analysis.success || !analysis.analysis) {
            return { success: false, error: analysis.error || 'Failed to analyze website' };
        }

        logger.info('[VIBE-CLONE] Website analyzed', { url, colors: analysis.analysis.colors });

        // Generate vibe config using Claude
        const vibePrompt = `Create a cannabis dispensary menu theme inspired by this website design:

Design Analysis:
- Colors: ${analysis.analysis.colors.join(', ')}
- Fonts: ${analysis.analysis.fonts.join(', ')}
- Layout: ${analysis.analysis.layout}
- Style: ${analysis.analysis.style}
- Description: ${analysis.analysis.description || 'N/A'}

Source URL: ${url}

Generate a VibeConfig that captures this aesthetic for a cannabis dispensary menu.
Adapt the colors and style to work well for cannabis/dispensary context.
Ensure good contrast and accessibility.

Return a complete VibeConfig JSON object.`;

        const claudeResponse = await callClaude({
            systemPrompt: `You are an expert web designer creating cannabis dispensary menu themes.
Generate complete VibeConfig objects with all required fields.
Focus on creating visually appealing, accessible designs.`,
            userMessage: vibePrompt,
            temperature: 0.7,
        });

        // Parse the vibe config
        const configMatch = claudeResponse.match(/\{[\s\S]*\}/);
        if (!configMatch) {
            return { success: false, error: 'Failed to generate vibe config' };
        }

        const config = JSON.parse(configMatch[0]);

        // Create public vibe
        const vibeId = `vibe_${uuidv4()}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        const vibe: PublicVibe = {
            id: vibeId,
            config: {
                ...config,
                name: config.name || `Cloned from ${new URL(url).hostname}`,
                description: config.description || `Inspired by ${url}`,
            },
            prompt: `Cloned from website: ${url}`,
            reasoning: `Analyzed and adapted design from ${url}. Colors: ${analysis.analysis.colors.join(', ')}`,
            suggestions: [
                'Try refining colors for better cannabis aesthetic',
                'Adjust fonts for your brand personality',
                'Test with actual product images',
            ],
            previewUrl: `/vibe/${vibeId}`,
            createdAt: now,
            expiresAt,
            views: 0,
            shares: 0,
            type: 'web',
        };

        return { success: true, data: vibe };
    } catch (error) {
        logger.error('[VIBE-CLONE] Error generating vibe from URL', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate vibe from URL',
        };
    }
}

/**
 * Analyze uploaded CSS file (WordPress theme style.css)
 */
export async function analyzeThemeCSS(
    cssContent: string
): Promise<{
    success: boolean;
    analysis?: {
        colors: string[];
        fonts: string[];
        spacing: string;
        borders: string;
        description?: string;
    };
    error?: string;
}> {
    try {
        logger.info('[VIBE-CLONE] Analyzing theme CSS', { length: cssContent.length });

        // Limit CSS to first 20000 chars for analysis
        const cssPreview = cssContent.substring(0, 20000);

        const analysisPrompt = `Analyze this CSS and extract design elements:

CSS Preview:
\`\`\`css
${cssPreview}
\`\`\`

Extract and return a JSON object with:
{
  "colors": ["#hex1", "#hex2", ...], // Main colors from CSS
  "fonts": ["Font Name 1", "Font Name 2"], // font-family values
  "spacing": "tight" | "normal" | "spacious", // padding/margin patterns
  "borders": "sharp" | "rounded" | "very-rounded", // border-radius usage
  "description": "Brief description of the design system"
}

Return ONLY the JSON object.`;

        const claudeResponse = await callClaude({
            systemPrompt: 'You are a CSS analyzer. Extract design tokens from CSS and return structured JSON.',
            userMessage: analysisPrompt,
            temperature: 0.3,
        });

        const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return { success: false, error: 'Failed to parse CSS analysis' };
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return { success: true, analysis };
    } catch (error) {
        logger.error('[VIBE-CLONE] Error analyzing CSS', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to analyze CSS',
        };
    }
}

/**
 * Generate vibe from uploaded theme CSS
 */
export async function generateVibeFromCSS(
    cssContent: string,
    themeName?: string
): Promise<{ success: boolean; data?: PublicVibe; error?: string }> {
    try {
        const analysis = await analyzeThemeCSS(cssContent);

        if (!analysis.success || !analysis.analysis) {
            return { success: false, error: analysis.error || 'Failed to analyze CSS' };
        }

        logger.info('[VIBE-CLONE] CSS analyzed', { colors: analysis.analysis.colors });

        const vibePrompt = `Create a cannabis dispensary menu theme from this CSS analysis:

Design Tokens:
- Colors: ${analysis.analysis.colors.join(', ')}
- Fonts: ${analysis.analysis.fonts.join(', ')}
- Spacing: ${analysis.analysis.spacing}
- Borders: ${analysis.analysis.borders}
${analysis.analysis.description ? `- Description: ${analysis.analysis.description}` : ''}

Theme Name: ${themeName || 'Uploaded Theme'}

Generate a VibeConfig that captures this design system for a cannabis menu.
Return a complete VibeConfig JSON object.`;

        const claudeResponse = await callClaude({
            systemPrompt: `You are an expert web designer creating cannabis dispensary menu themes.
Generate complete VibeConfig objects with all required fields.`,
            userMessage: vibePrompt,
            temperature: 0.7,
        });

        const configMatch = claudeResponse.match(/\{[\s\S]*\}/);
        if (!configMatch) {
            return { success: false, error: 'Failed to generate vibe config' };
        }

        const config = JSON.parse(configMatch[0]);

        const vibeId = `vibe_${uuidv4()}`;
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const vibe: PublicVibe = {
            id: vibeId,
            config: {
                ...config,
                name: config.name || themeName || 'Theme Import',
                description: config.description || 'Generated from uploaded theme CSS',
            },
            prompt: `Imported from ${themeName || 'uploaded CSS'}`,
            reasoning: `Analyzed uploaded theme CSS. Colors: ${analysis.analysis.colors.join(', ')}`,
            suggestions: [
                'Customize colors for your brand',
                'Adjust spacing to match your content',
                'Test with real product data',
            ],
            previewUrl: `/vibe/${vibeId}`,
            createdAt: now,
            expiresAt,
            views: 0,
            shares: 0,
            type: 'web',
        };

        return { success: true, data: vibe };
    } catch (error) {
        logger.error('[VIBE-CLONE] Error generating vibe from CSS', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate vibe from CSS',
        };
    }
}
