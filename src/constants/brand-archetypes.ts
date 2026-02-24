/**
 * Brand Archetype Definitions — Single Source of Truth
 *
 * 6 cannabis-specific archetypes with metadata for UI, agent prompts, and voice defaults.
 * Used by: ArchetypeSelector UI, brand-guide-prompt.ts, Spec 04 (Voice Sliders).
 *
 * DO NOT duplicate these definitions elsewhere. Import from this file.
 */

export const BRAND_ARCHETYPES = {
  wellness_caregiver: {
    id: 'wellness_caregiver',
    label: 'Wellness & Caregiver',
    shortLabel: 'Wellness',
    description: 'Nurturing, educational, health-focused. You prioritize patient care, dosage guidance, and therapeutic outcomes.',
    icon: '🌿',
    color: '#4CAF50',
    brandExamples: ['Surterra Wellness', 'medical dispensaries'],
    voiceDefaults: {
      formality: 4,    // 1=casual, 5=professional
      education: 5,    // 1=entertaining, 5=clinical
      energy: 2,       // 1=calm, 5=high energy
      boldness: 2,     // 1=conservative, 5=provocative
      community: 3,    // 1=product-first, 5=community-first
    },
    smokeySample: "Welcome to {dispensary}. I can help you find the right product for your needs. Are you looking for something specific, or would you like guidance based on the effects you're seeking?",
    craigSubjectSample: "Your personalized wellness guide is ready, {first_name}",
    fontDirection: 'clean_rounded',
    photographyDirection: 'clinical',
  },

  explorer_adventure: {
    id: 'explorer_adventure',
    label: 'Explorer & Adventure',
    shortLabel: 'Explorer',
    description: 'Outdoor, nature-connected, adventurous. Your brand evokes discovery, freedom, and the natural world.',
    icon: '🏔️',
    color: '#795548',
    brandExamples: ['Wyld', 'Sunday Goods'],
    voiceDefaults: {
      formality: 2,
      education: 3,
      energy: 4,
      boldness: 3,
      community: 3,
    },
    smokeySample: "Hey there! Ready to explore something new? I can point you toward some amazing strains — whether you're winding down after a hike or gearing up for a weekend adventure.",
    craigSubjectSample: "New terrain to explore: fresh drops just landed 🌲",
    fontDirection: 'mixed_serif_sans',
    photographyDirection: 'nature',
  },

  rebel_streetwear: {
    id: 'rebel_streetwear',
    label: 'Rebel & Streetwear',
    shortLabel: 'Rebel',
    description: 'Bold, culture-forward, boundary-pushing. You challenge the status quo and speak to trendsetters.',
    icon: '🔥',
    color: '#FF5722',
    brandExamples: ['Cookies', 'Alien Labs'],
    voiceDefaults: {
      formality: 1,
      education: 2,
      energy: 5,
      boldness: 5,
      community: 3,
    },
    smokeySample: "Yo! Welcome to {dispensary}. We got heat dropping all week. What are you vibing with — flower, concentrates, or you want me to put you on something crazy?",
    craigSubjectSample: "🔥 New drop alert — this won't last",
    fontDirection: 'bold_display_geometric',
    photographyDirection: 'lifestyle',
  },

  artisan_craft: {
    id: 'artisan_craft',
    label: 'Artisan & Craft',
    shortLabel: 'Artisan',
    description: 'Quality-obsessed, heritage, craftsmanship. You emphasize process, sourcing, and the art of cannabis.',
    icon: '✨',
    color: '#B8860B',
    brandExamples: ['Kiva Confections', 'Lowell Farms'],
    voiceDefaults: {
      formality: 4,
      education: 4,
      energy: 2,
      boldness: 2,
      community: 3,
    },
    smokeySample: "Welcome to {dispensary}. Our curated selection features small-batch cultivators and expertly crafted products. I'd love to help you discover something exceptional — what experience are you looking for?",
    craigSubjectSample: "Crafted with care: meet our newest artisan selections",
    fontDirection: 'elegant_serif_humanist',
    photographyDirection: 'product_forward',
  },

  premium_luxury: {
    id: 'premium_luxury',
    label: 'Premium & Luxury',
    shortLabel: 'Premium',
    description: 'Exclusive, aspirational, design-forward. Your brand commands premium positioning and refined taste.',
    icon: '💎',
    color: '#212121',
    brandExamples: ['STIIIZY', '710 Labs'],
    voiceDefaults: {
      formality: 5,
      education: 3,
      energy: 3,
      boldness: 3,
      community: 1,
    },
    smokeySample: "Welcome to {dispensary}. Our collection features the finest cultivators and most sought-after products. How may I assist your selection today?",
    craigSubjectSample: "Exclusively for you: limited reserve now available",
    fontDirection: 'condensed_sans_serif',
    photographyDirection: 'lifestyle',
  },

  community_heritage: {
    id: 'community_heritage',
    label: 'Community & Heritage',
    shortLabel: 'Community',
    description: 'Local-first, social equity, inclusive. You reinvest in your community and champion access for all.',
    icon: '🤝',
    color: '#1565C0',
    brandExamples: ['Grasshopper Club', 'Ivy Hall', 'Starbuds'],
    voiceDefaults: {
      formality: 2,
      education: 3,
      energy: 3,
      boldness: 3,
      community: 5,
    },
    smokeySample: "Hey, welcome to {dispensary}! We're so glad you're here. This is more than a shop — it's a community. What can I help you find today?",
    craigSubjectSample: "From our family to yours: this week at {dispensary}",
    fontDirection: 'warm_friendly_sans',
    photographyDirection: 'lifestyle',
  },
} as const;

export type ArchetypeId = keyof typeof BRAND_ARCHETYPES;

export type ArchetypeDefinition = typeof BRAND_ARCHETYPES[ArchetypeId];

/**
 * Get archetype definition by ID. Returns null for invalid IDs.
 */
export function getArchetypeById(id: string): ArchetypeDefinition | null {
  return (BRAND_ARCHETYPES as Record<string, ArchetypeDefinition>)[id] ?? null;
}

/**
 * Returns voice defaults as [formality, education, energy, boldness, community].
 * If secondary provided, blends 70% primary + 30% secondary.
 */
export function getVoiceDefaults(primaryId: ArchetypeId, secondaryId?: ArchetypeId | null): [number, number, number, number, number] {
  const primary = BRAND_ARCHETYPES[primaryId];
  if (!secondaryId || !(secondaryId in BRAND_ARCHETYPES)) {
    const v = primary.voiceDefaults;
    return [v.formality, v.education, v.energy, v.boldness, v.community];
  }
  const sec = BRAND_ARCHETYPES[secondaryId].voiceDefaults;
  const p = primary.voiceDefaults;
  return [
    Math.round(p.formality * 0.7 + sec.formality * 0.3),
    Math.round(p.education * 0.7 + sec.education * 0.3),
    Math.round(p.energy * 0.7 + sec.energy * 0.3),
    Math.round(p.boldness * 0.7 + sec.boldness * 0.3),
    Math.round(p.community * 0.7 + sec.community * 0.3),
  ];
}

/**
 * Suggest an archetype based on website scan data.
 * Scores each archetype from color palette and hero text keywords.
 */
export function suggestArchetype(scannedData: {
  dominantColor?: { hue: number; lightness: number };
  heroText?: string;
}): ArchetypeId {
  const scores: Record<ArchetypeId, number> = {
    wellness_caregiver: 0,
    explorer_adventure: 0,
    rebel_streetwear: 0,
    artisan_craft: 0,
    premium_luxury: 0,
    community_heritage: 0,
  };

  const hue = scannedData.dominantColor?.hue ?? 0;
  const lightness = scannedData.dominantColor?.lightness ?? 50;

  if (lightness < 25) scores.premium_luxury += 3;
  if (hue >= 80 && hue <= 160) scores.wellness_caregiver += 2;
  if (hue >= 15 && hue <= 45) scores.explorer_adventure += 2;
  if ((hue >= 0 && hue <= 15) || hue >= 345) scores.rebel_streetwear += 2;
  if (hue >= 200 && hue <= 260) scores.community_heritage += 2;

  const heroText = (scannedData.heroText ?? '').toLowerCase();
  const keywords: Record<ArchetypeId, string[]> = {
    wellness_caregiver: ['wellness', 'health', 'medical', 'patient', 'care', 'therapeutic', 'relief'],
    explorer_adventure: ['explore', 'adventure', 'discover', 'nature', 'wild', 'journey', 'outdoor'],
    rebel_streetwear: ['culture', 'lifestyle', 'drop', 'fire', 'heat', 'fresh', 'vibe'],
    artisan_craft: ['craft', 'artisan', 'curated', 'small-batch', 'quality', 'handcrafted'],
    premium_luxury: ['exclusive', 'luxury', 'reserve', 'select', 'elite', 'finest', 'collection'],
    community_heritage: ['community', 'equity', 'local', 'family', 'together', 'neighborhood', 'reinvest'],
  };

  for (const [archetype, words] of Object.entries(keywords)) {
    for (const word of words) {
      if (heroText.includes(word)) scores[archetype as ArchetypeId] += 2;
    }
  }

  const sorted = (Object.entries(scores) as [ArchetypeId, number][]).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}
