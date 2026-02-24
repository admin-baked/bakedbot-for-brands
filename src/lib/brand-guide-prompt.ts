/**
 * Brand Guide → Agent Prompt Builder
 *
 * Converts a saved brand guide into a concise, structured "brand brief" that
 * can be injected into any agent's system prompt. This gives Craig, Smokey,
 * and other agents full brand context — voice, vocabulary, positioning — so
 * every piece of content they generate is on-brand.
 *
 * Usage:
 *   const brief = buildBrandBrief(brandGuide);
 *   agentMemory.system_instructions += `\n${brief}`;
 */

import type { BrandGuide, BrandVoice, BrandMessaging } from '@/types/brand-guide';
import { BRAND_ARCHETYPES } from '@/constants/brand-archetypes';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a formatted "brand brief" section ready to drop into a system prompt.
 * Returns empty string if brand guide has insufficient data to be useful.
 */
export function buildBrandBrief(brandGuide: BrandGuide | null | undefined): string {
    if (!brandGuide) return '';

    const sections: string[] = [];

    // Brand Archetype (Spec 01 — Brand Guide 2.0)
    const archetypeSection = buildArchetypeBlock(brandGuide);
    if (archetypeSection) sections.push(archetypeSection);

    // Messaging / Positioning
    const msgSection = buildMessagingSection(brandGuide.messaging);
    if (msgSection) sections.push(msgSection);

    // Brand Voice
    const voiceSection = buildVoiceSection(brandGuide.voice);
    if (voiceSection) sections.push(voiceSection);

    // Voice Samples (show Craig HOW to write)
    const samplesSection = buildSamplesSection(brandGuide.voice);
    if (samplesSection) sections.push(samplesSection);

    // Compliance / Disclaimers (critical for campaigns)
    const complianceSection = buildComplianceSection(brandGuide);
    if (complianceSection) sections.push(complianceSection);

    if (sections.length === 0) return '';

    return `=== BRAND GUIDE: ${brandGuide.brandName || 'This Brand'} ===
${sections.join('\n\n')}
=== END BRAND GUIDE ===`;
}

/**
 * Lighter version — just voice + vocabulary. Useful for Smokey's budtender context.
 */
export function buildBrandVoiceBrief(brandGuide: BrandGuide | null | undefined): string {
    if (!brandGuide?.voice) return '';

    const sections: string[] = [];
    const archetypeSection = buildArchetypeBlock(brandGuide);
    if (archetypeSection) sections.push(archetypeSection);
    const voiceSection = buildVoiceSection(brandGuide.voice);
    if (voiceSection) sections.push(voiceSection);
    if (sections.length === 0) return '';

    const brand = brandGuide.brandName || 'this brand';
    return `=== ${brand.toUpperCase()} BRAND VOICE ===\n${sections.join('\n\n')}\n=== END BRAND VOICE ===`;
}

/**
 * Formats the brand archetype selection into a compact agent prompt block.
 * Returns empty string if no archetype has been selected.
 * Max ~80 tokens.
 */
export function buildArchetypeBlock(brandGuide: BrandGuide | null | undefined): string {
    const archetype = brandGuide?.archetype;
    if (!archetype?.primary) return '';

    const primary = BRAND_ARCHETYPES[archetype.primary];
    if (!primary) return '';

    const lines = ['[BRAND ARCHETYPE]'];
    lines.push(`Primary: ${primary.icon} ${primary.label} — ${primary.description}`);

    if (archetype.secondary && BRAND_ARCHETYPES[archetype.secondary]) {
        const secondary = BRAND_ARCHETYPES[archetype.secondary];
        lines.push(`Secondary (30% blend): ${secondary.icon} ${secondary.label}`);
    }

    lines.push(`Smokey greeting style: "${primary.smokeySample.replace('{dispensary}', brandGuide?.brandName ?? 'this dispensary')}"`);
    lines.push(`Craig subject style: "${primary.craigSubjectSample.replace('{first_name}', '[Name]').replace('{dispensary}', brandGuide?.brandName ?? 'this dispensary')}"`);

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildMessagingSection(messaging: Partial<BrandMessaging> | undefined): string {
    if (!messaging) return '';

    const lines: string[] = ['[BRAND POSITIONING]'];

    if (messaging.tagline) lines.push(`Tagline: "${messaging.tagline}"`);
    if (messaging.positioning) lines.push(`Positioning: ${messaging.positioning}`);
    if (messaging.missionStatement) lines.push(`Mission: ${messaging.missionStatement}`);
    if (messaging.elevatorPitch) lines.push(`Elevator pitch: ${messaging.elevatorPitch}`);

    if (messaging.valuePropositions?.length) {
        lines.push(`Key promises: ${messaging.valuePropositions.slice(0, 3).join(' | ')}`);
    }

    if ((messaging as any).targetAudience?.primary) {
        lines.push(`Primary audience: ${(messaging as any).targetAudience.primary}`);
    }

    if (messaging.brandStory?.differentiators?.length) {
        lines.push(`Differentiators: ${messaging.brandStory.differentiators.slice(0, 3).join('; ')}`);
    }

    const dispensaryType = (messaging as any).dispensaryType;
    const location = [(messaging as any).city, (messaging as any).state].filter(Boolean).join(', ');
    if (dispensaryType) lines.push(`Type: ${dispensaryType} dispensary${location ? ` in ${location}` : ''}`);
    else if (location) lines.push(`Location: ${location}`);

    if (messaging.doNotSay?.length) {
        lines.push(`Never say: ${messaging.doNotSay.slice(0, 5).join(', ')}`);
    }

    return lines.length > 1 ? lines.join('\n') : '';
}

function buildVoiceSection(voice: Partial<BrandVoice> | undefined): string {
    if (!voice) return '';

    const lines: string[] = ['[BRAND VOICE — ALWAYS WRITE THIS WAY]'];

    if (voice.personality?.length) {
        lines.push(`Personality: ${voice.personality.join(', ')}`);
    }

    if (voice.tone) {
        const toneMap: Record<string, string> = {
            professional: 'Professional and polished',
            casual: 'Casual and conversational',
            playful: 'Playful and fun',
            sophisticated: 'Sophisticated and refined',
            educational: 'Educational and informative',
            empathetic: 'Warm and empathetic',
            authoritative: 'Authoritative and confident',
        };
        lines.push(`Tone: ${toneMap[voice.tone] || voice.tone}`);
    }

    if (voice.writingStyle) {
        const ws = voice.writingStyle;
        const styleNotes: string[] = [];
        if (ws.formalityLevel) {
            const formality = ws.formalityLevel <= 2 ? 'Very casual'
                : ws.formalityLevel === 3 ? 'Moderately formal'
                : ws.formalityLevel >= 4 ? 'Formal and professional' : '';
            if (formality) styleNotes.push(formality);
        }
        if (ws.sentenceLength === 'short') styleNotes.push('short punchy sentences');
        if (ws.sentenceLength === 'long') styleNotes.push('detailed thorough sentences');
        if (ws.useEmojis) styleNotes.push('use emojis');
        else styleNotes.push('no emojis');
        if (ws.useHumor) styleNotes.push('light humor OK');
        if (!ws.useExclamation) styleNotes.push('avoid exclamation points');
        if (ws.perspective && ws.perspective !== 'mixed') {
            styleNotes.push(`write in ${ws.perspective}`);
        }
        if (styleNotes.length) lines.push(`Writing style: ${styleNotes.join(', ')}`);
    }

    if (voice.subTones) {
        const st = voice.subTones;
        const channelTones: string[] = [];
        if (st.social) channelTones.push(`SMS/Social: ${st.social}`);
        if (st.email) channelTones.push(`Email: ${st.email}`);
        if (st.customer_service) channelTones.push(`CS: ${st.customer_service}`);
        if (channelTones.length) lines.push(`Channel tones: ${channelTones.join(' | ')}`);
    }

    // Vocabulary
    if (voice.vocabulary) {
        const vocab = voice.vocabulary;
        if (vocab.preferred?.length) {
            const preferred = vocab.preferred
                .slice(0, 5)
                .map(p => `"${p.term}"${p.instead ? ` (not "${p.instead}")` : ''}`)
                .join(', ');
            lines.push(`Preferred terms: ${preferred}`);
        }
        if (vocab.avoid?.length) {
            const avoid = vocab.avoid.slice(0, 5).map(a => `"${a.term}"`).join(', ');
            lines.push(`Avoid these terms: ${avoid}`);
        }
        if (vocab.cannabisTerms?.length) {
            const termNames = vocab.cannabisTerms.slice(0, 8).map(t => t.term).join(', ');
            lines.push(`Brand's cannabis vocabulary: ${termNames}`);
        }
    }

    return lines.length > 1 ? lines.join('\n') : '';
}

function buildSamplesSection(voice: Partial<BrandVoice> | undefined): string {
    if (!voice?.sampleContent?.length) return '';

    const samples = voice.sampleContent.slice(0, 3);
    const lines: string[] = ['[VOICE EXAMPLES — WRITE LIKE THESE]'];

    for (const sample of samples) {
        const label = {
            social_post: 'Social Post',
            email: 'Email',
            product_description: 'Product Description',
            customer_response: 'Customer Reply',
            blog: 'Blog',
        }[sample.type] || sample.type;

        lines.push(`${label}: "${sample.content.substring(0, 200)}"`);
    }

    return lines.join('\n');
}

function buildComplianceSection(brandGuide: BrandGuide): string {
    const compliance = brandGuide.compliance;
    if (!compliance) return '';

    const lines: string[] = ['[COMPLIANCE REQUIREMENTS]'];

    if (compliance.primaryState) {
        lines.push(`State: ${compliance.primaryState} — always include required disclaimers`);
    }

    if (compliance.requiredDisclaimers?.age) {
        lines.push(`Age disclaimer: "${compliance.requiredDisclaimers.age}"`);
    }

    if (compliance.medicalClaims === 'none') {
        lines.push('Medical claims: PROHIBITED — never suggest cannabis treats or cures anything');
    } else if (compliance.medicalClaims === 'limited') {
        lines.push('Medical claims: LIMITED — only reference terpenes/effects, never diagnoses');
    }

    if (compliance.contentRestrictions?.length) {
        const restrictions = compliance.contentRestrictions.slice(0, 3).map(r => r.restriction).join('; ');
        lines.push(`Content restrictions: ${restrictions}`);
    }

    return lines.length > 1 ? lines.join('\n') : '';
}
