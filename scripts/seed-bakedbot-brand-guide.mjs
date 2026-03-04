#!/usr/bin/env node
/**
 * Seed BakedBot AI Brand Guide
 *
 * Populates the brand guide for org_bakedbot_platform with BakedBot AI's
 * official brand identity from the BakedBot AI Brand Guidelines document.
 *
 * Colors: Dark Jungle Green (#0D211D), Brunswick Green (#23504A),
 *         Pine Green (#00766D), Emerald Green (#22AD85), Honeydew (#DFF4E9)
 * Typography: Satoshi (primary) + Okomito Next Bold (logo only)
 *
 * Usage: node scripts/seed-bakedbot-brand-guide.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

// --- Firebase Admin Init ---
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
}

const serviceAccountKey = envVars.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// --- Constants ---
const BRAND_ID = 'org_bakedbot_platform';
const now = Timestamp.now();

// ============================================================
// BRAND DATA — Sourced from BakedBot AI Brand Guidelines PDF
// ============================================================

const brandGuide = {
  id: BRAND_ID,
  brandId: BRAND_ID,
  brandName: 'BakedBot AI',

  // ---- Visual Identity ----
  visualIdentity: {
    logo: {
      primary: '', // Will be set when logo is uploaded to Firebase Storage
      specifications: {
        minWidth: 120,
        clearSpace: 16,
        fileFormats: ['svg', 'png', 'pdf'],
      },
    },
    colors: {
      primary: {
        hex: '#0D211D',
        rgb: { r: 13, g: 33, b: 29 },
        name: 'Dark Jungle Green',
        usage: 'Primary dark backgrounds, navigation, hero sections',
        accessibility: {
          wcagLevel: 'AAA',
          contrastRatio: 17.8,
          textReadable: true,
        },
      },
      secondary: {
        hex: '#23504A',
        rgb: { r: 35, g: 80, b: 74 },
        name: 'Brunswick Green',
        usage: 'Sidebar backgrounds, cards, secondary surfaces',
        accessibility: {
          wcagLevel: 'AA',
          contrastRatio: 8.2,
          textReadable: true,
        },
      },
      accent: {
        hex: '#00766D',
        rgb: { r: 0, g: 118, b: 109 },
        name: 'Pine Green',
        usage: 'Active states, links, highlighted elements',
        accessibility: {
          wcagLevel: 'AA',
          contrastRatio: 5.1,
          textReadable: true,
        },
      },
      text: {
        hex: '#DFF4E9',
        rgb: { r: 223, g: 244, b: 233 },
        name: 'Honeydew',
        usage: 'Primary text on dark backgrounds, light surface text',
        accessibility: {
          wcagLevel: 'AAA',
          contrastRatio: 16.4,
          textReadable: true,
        },
      },
      background: {
        hex: '#DFF4E9',
        rgb: { r: 223, g: 244, b: 233 },
        name: 'Honeydew',
        usage: 'Light background surfaces, cards on light theme',
        accessibility: {
          wcagLevel: 'AA',
          contrastRatio: 4.5,
          textReadable: true,
        },
      },
      extended: [
        {
          hex: '#22AD85',
          rgb: { r: 34, g: 173, b: 133 },
          name: 'Emerald Green',
          usage: 'Primary CTA buttons, success states, key highlights, gradient endpoints',
          accessibility: {
            wcagLevel: 'AA',
            contrastRatio: 4.7,
            textReadable: true,
          },
        },
      ],
    },
    typography: {
      headingFont: {
        family: 'Satoshi',
        weights: [900, 700, 400],
        source: 'custom',
        fallbacks: ['Inter', 'system-ui', 'sans-serif'],
        license: 'Fontshare Commercial License',
      },
      bodyFont: {
        family: 'Satoshi',
        weights: [400, 500, 700],
        source: 'custom',
        fallbacks: ['Inter', 'system-ui', 'sans-serif'],
        license: 'Fontshare Commercial License',
      },
      accentFont: {
        family: 'Okomito Next',
        weights: [700],
        source: 'custom',
        fallbacks: ['Satoshi', 'sans-serif'],
        license: 'Commercial — logo use only',
      },
      scale: {
        base: 16,
        ratio: 1.25,
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      scale: 8,
      baseUnit: 8,
      borderRadius: 'md',
      customRadius: {
        button: 8,
        card: 12,
        input: 8,
        modal: 16,
      },
    },
    imagery: {
      style: 'abstract',
      guidelines:
        'Use clean, tech-forward imagery. Prefer dark backgrounds with green gradient accents. Avoid stock cannabis leaf imagery — focus on data visualization, AI interfaces, and premium brand aesthetic.',
    },
    iconography: {
      style: 'outlined',
      library: 'Lucide Icons',
    },
  },

  // ---- Voice & Personality ----
  voice: {
    personality: ['Professional', 'Innovative', 'Trustworthy', 'Educational', 'Empowering'],
    tone: 'professional',
    subTones: {
      social: 'educational',
      email: 'professional',
      customer_service: 'empathetic',
      educational: 'authoritative',
    },
    vocabulary: {
      preferred: [
        { term: 'Cannabis', instead: 'Marijuana / Weed / Pot', context: 'Always in all contexts' },
        { term: 'Dispensary', instead: 'Pot shop / Weed store', context: 'When referring to retail partners' },
        { term: 'Flower', instead: 'Bud / Nug', context: 'When referring to the product category' },
        { term: 'Consumers', instead: 'Users / Smokers', context: 'When referring to end customers' },
        { term: 'AI Agent', instead: 'Bot / Chatbot', context: 'When describing BakedBot AI capabilities' },
        { term: 'Agentic Commerce', instead: 'Automated selling', context: 'Describing our platform approach' },
        { term: 'Cannabis Brands', instead: 'Weed companies', context: 'Referring to our brand customers' },
      ],
      avoid: [
        { term: 'Weed', reason: 'Unprofessional — use Cannabis or Flower' },
        { term: 'Pot', reason: 'Unprofessional — use Cannabis' },
        { term: 'Marijuana', reason: 'Legacy / politically charged — prefer Cannabis' },
        { term: 'Stoned / High / Baked', reason: 'Not brand-appropriate in professional materials (except Smokey the agent who uses casual cannabis vernacular intentionally)' },
        { term: 'Get lit', reason: 'Inappropriate in client-facing B2B content' },
        { term: 'Drug', reason: 'Stigmatizing — use Cannabis product or product' },
        { term: 'Chatbot', reason: 'Undersells our agentic AI — use AI Agent or Agent' },
      ],
      cannabisTerms: [
        { term: 'Terpenes', definition: 'Aromatic compounds in cannabis that influence flavor and effect', pronunciation: 'TUR-peens', audience: 'all' },
        { term: 'Cannabinoid', definition: 'Active chemical compounds found in cannabis (e.g., THC, CBD)', pronunciation: 'kuh-NAB-ih-noid', audience: 'all' },
        { term: 'Indica', definition: 'Cannabis cultivar associated with relaxing, sedative effects', pronunciation: 'IN-dih-kuh', audience: 'all' },
        { term: 'Sativa', definition: 'Cannabis cultivar associated with uplifting, energizing effects', pronunciation: 'suh-TEE-vuh', audience: 'all' },
        { term: 'Hybrid', definition: 'Cross-bred cannabis strain combining indica and sativa genetics', audience: 'all' },
        { term: 'COA', definition: 'Certificate of Analysis — third-party lab test verifying cannabinoid/terpene content', audience: 'advanced' },
        { term: 'MSO', definition: 'Multi-State Operator — cannabis company licensed in multiple states', audience: 'advanced' },
        { term: 'Compliance', definition: 'Adherence to state and local cannabis marketing and sales regulations', audience: 'all' },
      ],
      brandSpecific: [
        { term: 'BakedBot AI', definition: 'Our full brand name — always use "BakedBot AI", never "BakedBot" alone in formal materials', trademarked: false },
        { term: 'Agentic Commerce OS', definition: 'Our platform positioning — a multi-agent operating system for cannabis commerce', trademarked: false },
        { term: 'The Squad', definition: 'Informal reference to our 6 AI agents (Smokey, Craig, Ezal, Deebo, Leo, Linus)', trademarked: false },
        { term: 'Smokey', definition: 'Our AI budtender agent — product search, recommendations, and consumer engagement', trademarked: false },
        { term: 'Craig', definition: 'Our AI marketer agent — campaigns, SMS/email marketing, and audience segmentation', trademarked: false },
        { term: 'Deebo', definition: 'Our AI compliance enforcer — content moderation and regulatory guardrails', trademarked: false },
        { term: 'Ezal', definition: 'Our competitive intelligence agent — market and competitor monitoring', trademarked: false },
      ],
    },
    writingStyle: {
      sentenceLength: 'varied',
      paragraphLength: 'concise',
      useEmojis: false,
      emojiFrequency: 'rare',
      useExclamation: false,
      useQuestions: true,
      useHumor: false,
      formalityLevel: 4,
      complexity: 'moderate',
      perspective: 'second-person',
    },
    sampleContent: [
      {
        type: 'product_description',
        content: 'BakedBot AI is the agentic commerce OS built for the legal cannabis industry. Six specialized AI agents work 24/7 — handling marketing, compliance, competitive intelligence, and customer engagement so your team can focus on growing.',
        context: 'Homepage hero description',
        audience: 'Cannabis brands and dispensaries',
        aiGenerated: false,
      },
      {
        type: 'email',
        content: 'Your campaign hit 38% open rate this week — 2.4x the cannabis industry average. Here\'s what Craig found: your "Relaxation" segment responds best to evening sends on Thursdays.',
        context: 'Weekly performance email to brand customer',
        audience: 'Brand marketing managers',
        aiGenerated: false,
      },
      {
        type: 'social_post',
        content: 'Cannabis marketing without compliance guardrails is a liability. BakedBot AI\'s Deebo agent reviews every piece of content before it goes out — so you never have to guess if a claim crosses the line.',
        context: 'LinkedIn / educational content',
        audience: 'Cannabis brand founders and CMOs',
        aiGenerated: false,
      },
    ],
  },

  // ---- Messaging ----
  messaging: {
    brandName: 'BakedBot AI',
    tagline: 'The Agentic Commerce OS for Cannabis Brands',
    alternateTaglines: [
      'AI Agents That Work While You Sleep',
      'Cannabis Marketing, Automated.',
      'Where AI Meets the Legal Cannabis Industry',
    ],
    positioning:
      'BakedBot AI is the only agentic AI platform purpose-built for the legal cannabis industry — combining multi-agent automation, compliance guardrails, and deep retail integrations into a single operating system.',
    missionStatement:
      'To help cannabis brands reach their target audience, drive measurable revenue, and stay compliant — through AI agents that work autonomously, 24/7.',
    visionStatement:
      'To become the operating system for cannabis commerce: the layer that connects brands, dispensaries, and consumers through intelligent, compliant automation.',
    valuePropositions: [
      '6 specialized AI agents handle marketing, compliance, analytics, and engagement without manual effort',
      'Built-in compliance guardrails prevent regulatory violations before content ever goes live',
      'Deep POS and dispensary integrations turn real-time sales data into automated marketing action',
      'Multi-brand architecture lets agencies and MSOs manage all clients from a single dashboard',
      'Cannabis-specific AI trained on industry data — not generic marketing tools retrofitted for cannabis',
    ],
    keyMessages: [
      {
        audience: 'Cannabis Brand Founders',
        message: 'Stop spending 20+ hours/week on marketing tasks. BakedBot AI runs your campaigns, monitors competitors, and keeps you compliant — autonomously.',
        supportingPoints: [
          'Craig handles SMS, email, and social campaigns with zero manual setup',
          'Ezal monitors competitors daily and surfaces actionable intel',
          'Deebo reviews all content before it publishes — no compliance surprises',
        ],
      },
      {
        audience: 'Dispensary Operators',
        message: 'Turn your POS data into personalized customer marketing without a marketing team.',
        supportingPoints: [
          'Smokey engages customers with product recommendations and deals',
          'Loyalty automation re-activates lapsed customers on autopilot',
          'Brand partner marketplace connects you with brands who pay for shelf attention',
        ],
      },
      {
        audience: 'Cannabis Investors & Media',
        message: 'BakedBot AI is building the commerce infrastructure layer for a $50B+ industry that\'s been left behind by mainstream marketing tools.',
        supportingPoints: [
          'Cannabis-specific compliance at the model layer — not just keyword filters',
          'Agentic AI architecture positions us ahead of the AI agent adoption curve',
          'Network effects: more brands → more dispensary data → better AI models',
        ],
      },
    ],
    targetAudience: {
      primary: 'Cannabis brand founders and CMOs at licensed brands in adult-use states, seeking to scale marketing operations without proportionally scaling headcount',
      secondary: 'Dispensary operators looking to improve customer retention, loyalty, and brand partnership revenue without a dedicated marketing team',
      segments: [
        {
          segment: 'Emerging Cannabis Brands',
          description: 'Series A-C funded brands with $2M-$20M in revenue, 1-10 SKUs, operating in 1-3 states',
          characteristics: ['Under-resourced marketing team', 'Compliance-anxious', 'Growth-focused', 'Data-hungry'],
        },
        {
          segment: 'Multi-State Operators (MSOs)',
          description: 'Brands or operators licensed in 3+ states with $20M+ revenue',
          characteristics: ['Fragmented marketing stack', 'Need centralized brand management', 'Agency-managed marketing', 'Scale efficiency critical'],
        },
        {
          segment: 'Independent Dispensaries',
          description: 'Single-location or small chain dispensaries, $1M-$10M revenue',
          characteristics: ['No dedicated marketing staff', 'Alleaves/Jane/Dutchie POS', 'Brand relationship focused', 'Loyalty program gaps'],
        },
        {
          segment: 'Cannabis Marketing Agencies',
          description: 'Agencies managing 3+ cannabis brand clients',
          characteristics: ['Need white-label tools', 'Client reporting burden', 'Compliance liability concerns', 'Efficiency-driven'],
        },
      ],
    },
    elevatorPitch:
      'BakedBot AI is the AI operating system for cannabis brands. Six specialized agents handle marketing, compliance, competitive intel, and customer engagement — automatically. Brands using BakedBot AI see 3x faster campaign deployment and eliminate compliance violations entirely.',
    originStory:
      'BakedBot AI was born from a simple observation: the cannabis industry — a $50B+ market — was being forced to use generic marketing tools that were never designed for a regulated, highly compliance-sensitive industry. Existing platforms didn\'t understand THC, terpenes, or state advertising laws. BakedBot AI was built from the ground up to be cannabis-native: with AI agents trained on industry data, compliance guardrails baked into every action, and integrations with the dispensary systems brands actually use.',
    brandStory: {
      origin: 'Founded to solve the compliance-marketing gap in the legal cannabis industry',
      values: [
        'Compliance first — we never compromise on regulatory standards',
        'Cannabis-native — built specifically for this industry, not adapted from generic tools',
        'Autonomous action — agents that do the work, not just recommendations',
        'Transparent AI — brands always know what their agents are doing',
        'Industry advocacy — we believe cannabis businesses deserve enterprise-grade tools',
      ],
      differentiators: [
        'Only agentic AI platform purpose-built for cannabis',
        'Deebo compliance engine reviews all content before publication',
        'Direct POS integrations with Alleaves, Jane, Dutchie',
        'Multi-agent architecture vs. single-chatbot competitors',
        'Cannabis-specific vocabulary and regulatory knowledge at the model layer',
      ],
    },
    doNotSay: [
      'Cures or treats any medical condition',
      'Safe for all consumers (cannabis is not for minors)',
      'Guaranteed results or performance claims',
      'Competitors are inferior (use differentiation, not disparagement)',
      '"Weed platform" or "marijuana software" in professional materials',
    ],
  },

  // ---- Compliance ----
  compliance: {
    primaryState: 'NY',
    operatingStates: ['NY', 'CA', 'CO', 'IL', 'MA', 'MI', 'NJ', 'NV', 'OR', 'WA'],
    requiredDisclaimers: {
      age: 'For use by adults 21+ only. Keep out of reach of children.',
      health: 'Cannabis may impair concentration, coordination, and judgment. Do not operate vehicles or machinery while using cannabis.',
      legal: 'Cannabis remains federally illegal. This platform operates exclusively within licensed, legal adult-use markets.',
    },
    stateSpecificRules: [],
    ageGateLanguage: 'You must be 21 or older to access cannabis brand content. By continuing, you confirm you are of legal age in your jurisdiction.',
    medicalClaims: 'none',
    medicalClaimsGuidelines:
      'BakedBot AI content must NEVER include medical or health benefit claims. No language suggesting cannabis treats, cures, or prevents any condition. Deebo (compliance agent) auto-rejects all such content.',
    contentRestrictions: [
      {
        restriction: 'No targeting of minors in any marketing content',
        reason: 'Federal and state law',
        alternatives: 'Use age-gated channels and verified adult audience segments only',
      },
      {
        restriction: 'No medical efficacy claims',
        reason: 'FTC and state cannabis advertising regulations',
        alternatives: 'Use "may support", "some consumers report", or cite third-party research without making direct claims',
      },
      {
        restriction: 'No implied endorsement by celebrities without explicit partnership',
        reason: 'FTC endorsement guidelines',
        alternatives: 'Use verified brand ambassador partnerships with clear disclosure',
      },
      {
        restriction: 'No advertising on platforms that do not allow cannabis content (Google Ads, Facebook/Meta Ads)',
        reason: 'Platform terms of service',
        alternatives: 'Use compliant channels: email, SMS, in-app, organic social, programmatic cannabis-specific networks',
      },
    ],
    restrictions: [
      'No medical claims of any kind',
      'Age-gating required on all consumer-facing content',
      'No content that appeals primarily to minors (cartoon characters, school themes, candy imagery)',
      'No cross-state promotion where cannabis is not legal',
    ],
    lastReviewedAt: new Date('2026-01-01'),
    reviewedBy: 'Deebo (BakedBot AI Compliance Agent)',
  },

  // ---- Assets ----
  assets: {
    heroImages: [],
    productPhotography: {
      style: 'abstract',
      examples: [],
      guidelines:
        'Use abstract, tech-forward visuals. Dark green backgrounds with subtle gradient accents. Data visualization and AI interface mockups preferred. No raw cannabis product photography in B2B materials.',
    },
    templates: {
      instagram: [],
      instagramStory: [],
      facebook: [],
      twitter: [],
      email: [],
      printable: [],
    },
    videos: [],
    documents: [],
    customAssets: [],
  },

  // ---- Archetype ----
  archetype: {
    primary: 'innovator',
    secondary: 'sage',
    selected_at: now,
    suggested_by_scanner: null,
  },

  // ---- Suggestions (empty — to be populated by AI) ----
  suggestions: [],

  // ---- Source ----
  source: {
    method: 'manual_entry',
    lastManualUpdate: new Date(),
    manualOverrides: ['colors', 'typography', 'messaging', 'voice', 'compliance'],
    aiGenerationPrompt: null,
  },

  // ---- Sharing ----
  sharing: {
    isPublic: false,
    allowedVendors: [],
    downloadEnabled: false,
    accessControl: 'private',
  },

  // ---- Metadata ----
  completenessScore: 88,
  status: 'active',
  version: 1,
  versionHistory: [],
  createdAt: now,
  createdBy: 'seed-script',
  lastUpdatedAt: now,
  lastUpdatedBy: 'seed-script',
};

// ============================================================
// WRITE TO FIRESTORE
// ============================================================

async function seed() {
  console.log(`\n🌿 Seeding BakedBot AI brand guide → brandGuides/${BRAND_ID}`);

  const docRef = db.collection('brandGuides').doc(BRAND_ID);
  const existing = await docRef.get();

  if (existing.exists) {
    console.log('⚠️  Brand guide already exists. Updating...');
    // Preserve createdAt from existing doc
    const existingData = existing.data();
    brandGuide.createdAt = existingData.createdAt || now;
    brandGuide.createdBy = existingData.createdBy || 'seed-script';
    brandGuide.version = (existingData.version || 0) + 1;
    brandGuide.lastUpdatedAt = now;
    await docRef.set(brandGuide, { merge: false }); // Full replace
    console.log(`✅ Updated to version ${brandGuide.version}`);
  } else {
    await docRef.set(brandGuide);
    console.log('✅ Created new brand guide');
  }

  console.log('\n📊 Summary:');
  console.log(`   Brand Name: ${brandGuide.brandName}`);
  console.log(`   Tagline: ${brandGuide.messaging.tagline}`);
  console.log(`   Status: ${brandGuide.status}`);
  console.log(`   Completeness: ${brandGuide.completenessScore}%`);
  console.log(`   Colors: ${Object.keys(brandGuide.visualIdentity.colors).filter(k => k !== 'extended').join(', ')} + Emerald CTA`);
  console.log(`   Fonts: Satoshi (primary) + Okomito Next Bold (logo)`);
  console.log(`   Voice: ${brandGuide.voice.personality.join(', ')}`);
  console.log(`   Archetype: ${brandGuide.archetype.primary} / ${brandGuide.archetype.secondary}`);
  console.log('\n🏁 Done.');
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
