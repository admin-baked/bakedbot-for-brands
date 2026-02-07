/**
 * Brand Guide Templates
 *
 * Pre-built brand guide templates for different cannabis categories.
 * Each template provides sensible defaults for visual identity, brand voice,
 * messaging, and compliance guidelines.
 */

import type {
  BrandGuideTemplate,
  BrandGuideTemplateCategory,
  BrandPersonalityTrait,
  BrandTone,
  USState,
} from '@/types/brand-guide';

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export const BRAND_GUIDE_TEMPLATES: Record<
  BrandGuideTemplateCategory,
  BrandGuideTemplate
> = {
  premium: {
    id: 'premium',
    name: 'Premium Cannabis',
    category: 'premium',
    description:
      'Sophisticated, high-end brand positioning for craft cannabis and luxury products. Perfect for brands emphasizing quality, exclusivity, and connoisseurship.',
    preview: '/templates/premium-preview.jpg',
    defaults: {
      visualIdentity: {
        colors: {
          primary: {
            hex: '#1A1A1A',
            name: 'Midnight Black',
            usage: 'Primary brand color, headers, luxury elements',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 16.5,
              textReadable: true,
            },
          },
          secondary: {
            hex: '#C9A05F',
            name: 'Gold Leaf',
            usage: 'Accent color, CTAs, premium highlights',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 4.8,
              textReadable: true,
            },
          },
          accent: {
            hex: '#2D5016',
            name: 'Forest Green',
            usage: 'Secondary accents, botanical elements',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 7.2,
              textReadable: true,
            },
          },
          text: {
            hex: '#2C2C2C',
            name: 'Charcoal',
            usage: 'Body text, descriptions',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 14.2,
              textReadable: true,
            },
          },
          background: {
            hex: '#FAFAF8',
            name: 'Cream White',
            usage: 'Page backgrounds, cards',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 1.05,
              textReadable: true,
            },
          },
          strainTypes: {
            indica: {
              hex: '#4A148C',
              name: 'Deep Purple',
              usage: 'Indica products, relaxation messaging',
            },
            sativa: {
              hex: '#FF6F00',
              name: 'Sunset Orange',
              usage: 'Sativa products, energy messaging',
            },
            hybrid: {
              hex: '#00695C',
              name: 'Teal',
              usage: 'Hybrid products, balanced messaging',
            },
          },
        },
        typography: {
          headingFont: {
            family: 'Playfair Display',
            weights: [400, 700, 900],
            source: 'google',
            fallbacks: ['Georgia', 'serif'],
            license: 'Open Font License',
          },
          bodyFont: {
            family: 'Inter',
            weights: [400, 500, 600],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
            license: 'Open Font License',
          },
          scale: {
            base: 16,
            ratio: 1.333, // Perfect Fourth
          },
        },
        spacing: {
          scale: 8,
          borderRadius: 'sm',
          customRadius: {
            button: 4,
            card: 8,
            input: 4,
            modal: 12,
          },
        },
        imagery: {
          style: 'lifestyle',
          guidelines:
            'High-end lifestyle photography with natural lighting. Focus on premium packaging, elegant consumption moments, and sophisticated environments.',
          filters: 'Rich tones, slightly desaturated, high contrast',
        },
      },
      voice: {
        personality: ['Sophisticated', 'Trustworthy', 'Authentic'] as BrandPersonalityTrait[],
        tone: 'sophisticated' as BrandTone,
        vocabulary: {
          preferred: [
            { term: 'Flower', instead: 'Bud', context: 'All product references' },
            { term: 'Cannabis', instead: 'Weed', context: 'Formal communications' },
            { term: 'Cultivated', instead: 'Grown', context: 'Product descriptions' },
            { term: 'Connoisseur', instead: 'User', context: 'Target audience' },
            { term: 'Experience', instead: 'High', context: 'Effects descriptions' },
          ],
          avoid: [
            { term: 'Weed', reason: 'Too casual for premium positioning' },
            { term: 'Pot', reason: 'Outdated, unprofessional' },
            { term: 'Stoned', reason: 'Lacks sophistication' },
            { term: 'Cheap', reason: 'Contradicts premium positioning' },
          ],
          cannabisTerms: [
            {
              term: 'Terpene',
              definition:
                'Aromatic compounds that give cannabis its distinctive scents and flavors',
              pronunciation: 'TUR-peen',
              audience: 'all',
            },
            {
              term: 'Trichome',
              definition:
                'Crystal-like structures containing cannabinoids and terpenes',
              audience: 'advanced',
            },
          ],
        },
        writingStyle: {
          sentenceLength: 'varied',
          paragraphLength: 'moderate',
          useEmojis: false,
          useExclamation: false,
          useQuestions: true,
          useHumor: false,
          formalityLevel: 4,
          complexity: 'advanced',
          perspective: 'second-person',
        },
        sampleContent: [
          {
            type: 'product_description',
            content:
              'Cultivated with meticulous care, this small-batch flower exemplifies our commitment to quality. Each hand-trimmed bud reveals intricate trichome coverage and complex terpene profiles that discerning connoisseurs appreciate.',
            audience: 'Premium cannabis enthusiasts',
          },
        ],
      },
      messaging: {
        tagline: 'Elevated Experiences',
        positioning: 'Premium craft cannabis for the discerning connoisseur',
        missionStatement:
          'To elevate cannabis culture through exceptional quality, artisanal cultivation, and uncompromising standards.',
        valuePropositions: [
          'Small-batch, hand-crafted cultivation',
          'Expert curation and quality control',
          'Sophisticated, discreet consumption',
          'Exclusive access to rare genetics',
        ],
        keyMessages: [
          {
            audience: 'Experienced consumers',
            message:
              'Discover complexity and nuance in every carefully cultivated strain',
          },
          {
            audience: 'First-time premium buyers',
            message:
              'Experience the difference that artisanal quality and attention to detail create',
          },
        ],
        brandStory: {
          origin:
            'Founded by passionate cultivators committed to preserving the art of small-batch cannabis cultivation.',
          values: ['Quality', 'Craftsmanship', 'Authenticity', 'Sustainability'],
          differentiators: [
            'Hand-selected genetics',
            'Micro-batch production',
            'Extended curing process',
            'Direct relationships with master growers',
          ],
        },
      },
      compliance: {
        primaryState: 'CA' as USState,
        operatingStates: ['CA', 'OR', 'WA'] as USState[],
        requiredDisclaimers: {
          age: 'For use only by adults 21 years of age and older. Keep out of reach of children.',
          health: 'These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.',
          legal: 'Cannabis products are for legal adult use only. Possession and distribution are subject to state and local laws.',
        },
        ageGateLanguage:
          'This website contains cannabis product information. You must be 21 years or older to enter.',
        medicalClaims: 'none',
        contentRestrictions: [
          {
            restriction: 'No imagery appealing to minors',
            reason: 'State compliance requirements',
            alternatives: 'Sophisticated adult-focused lifestyle imagery',
          },
        ],
      },
    },
    popularInStates: ['CA', 'OR', 'WA', 'CO'],
    featured: true,
  },

  medical: {
    id: 'medical',
    name: 'Medical & Wellness',
    category: 'medical',
    description:
      'Professional, compassionate brand positioning for medical cannabis providers. Emphasizes healing, wellness, and patient care.',
    preview: '/templates/medical-preview.jpg',
    defaults: {
      visualIdentity: {
        colors: {
          primary: {
            hex: '#1B5E20',
            name: 'Medical Green',
            usage: 'Primary brand color, healing associations',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 8.2,
              textReadable: true,
            },
          },
          secondary: {
            hex: '#4FC3F7',
            name: 'Calm Blue',
            usage: 'Calming elements, trust signals',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 4.9,
              textReadable: true,
            },
          },
          accent: {
            hex: '#81C784',
            name: 'Light Green',
            usage: 'Wellness elements, positive messaging',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 5.1,
              textReadable: true,
            },
          },
          text: {
            hex: '#212121',
            name: 'Near Black',
            usage: 'Body text, medical information',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 15.8,
              textReadable: true,
            },
          },
          background: {
            hex: '#FFFFFF',
            name: 'Pure White',
            usage: 'Clinical, clean backgrounds',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 1.0,
              textReadable: true,
            },
          },
        },
        typography: {
          headingFont: {
            family: 'Poppins',
            weights: [500, 600, 700],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
          bodyFont: {
            family: 'Open Sans',
            weights: [400, 600],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
        },
        spacing: {
          scale: 8,
          borderRadius: 'md',
        },
        imagery: {
          style: 'product-focused',
          guidelines:
            'Clean, professional medical product photography. Include educational diagrams, patient testimonials, and clinical environments.',
          filters: 'Natural lighting, high clarity, professional',
        },
      },
      voice: {
        personality: [
          'Professional',
          'Empowering',
          'Educational',
          'Trustworthy',
        ] as BrandPersonalityTrait[],
        tone: 'empathetic' as BrandTone,
        vocabulary: {
          preferred: [
            { term: 'Patient', instead: 'Customer', context: 'Medical context' },
            { term: 'Medicine', instead: 'Product', context: 'Medical benefits' },
            { term: 'Therapeutic', instead: 'Fun', context: 'Effects' },
            { term: 'Treatment', instead: 'Use', context: 'Medical applications' },
          ],
          avoid: [
            { term: 'High', reason: 'Medical context requires clinical language' },
            { term: 'Recreational', reason: 'Focus is on medical benefits' },
            { term: 'Party', reason: 'Contradicts medical positioning' },
          ],
          cannabisTerms: [
            {
              term: 'CBD',
              definition:
                'Cannabidiol - non-intoxicating compound with potential therapeutic benefits',
              audience: 'all',
            },
            {
              term: 'THC',
              definition:
                'Tetrahydrocannabinol - primary psychoactive compound in cannabis',
              audience: 'all',
            },
          ],
        },
        writingStyle: {
          sentenceLength: 'medium',
          paragraphLength: 'moderate',
          useEmojis: false,
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
            content:
              'This balanced CBD:THC ratio provides therapeutic relief while maintaining mental clarity. Recommended for patients seeking symptom management throughout the day.',
            audience: 'Medical patients',
          },
        ],
      },
      messaging: {
        tagline: 'Healing Through Nature',
        positioning:
          'Compassionate medical cannabis care for patients seeking natural relief',
        missionStatement:
          'To improve quality of life through safe, effective, and accessible medical cannabis solutions.',
        valuePropositions: [
          'Evidence-based product recommendations',
          'Patient education and support',
          'Clinical-grade quality standards',
          'Personalized treatment plans',
        ],
        keyMessages: [
          {
            audience: 'New medical patients',
            message:
              'Start your healing journey with expert guidance and pharmaceutical-grade products',
          },
          {
            audience: 'Experienced patients',
            message:
              'Optimize your treatment with our diverse selection and knowledgeable staff',
          },
        ],
      },
      compliance: {
        primaryState: 'CA' as USState,
        operatingStates: ['CA'] as USState[],
        requiredDisclaimers: {
          age: 'For qualified patients only. Valid medical marijuana card required.',
          health: 'These statements have not been evaluated by the FDA. Not intended to diagnose, treat, cure, or prevent any disease.',
          legal: 'For legal medical use only. Must comply with state and local laws.',
        },
        stateSpecificRules: [],
        ageGateLanguage:
          'This website is for qualified medical marijuana patients only. Please verify your patient status to continue.',
        medicalClaims: 'supported',
        medicalClaimsGuidelines:
          'May reference published research and patient experiences. Cannot make unsupported health claims.',
        contentRestrictions: [],
      },
    },
    popularInStates: ['CA', 'MI', 'MA', 'IL', 'PA'],
    featured: true,
  },

  recreational: {
    id: 'recreational',
    name: 'Recreational & Fun',
    category: 'recreational',
    description:
      'Friendly, approachable brand positioning for recreational cannabis. Emphasizes enjoyment, social experiences, and lifestyle integration.',
    preview: '/templates/recreational-preview.jpg',
    defaults: {
      visualIdentity: {
        colors: {
          primary: {
            hex: '#00C853',
            name: 'Vibrant Green',
            usage: 'Primary brand color, energy and fun',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 4.7,
              textReadable: true,
            },
          },
          secondary: {
            hex: '#FFD600',
            name: 'Sunshine Yellow',
            usage: 'Accent color, positive vibes',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 5.2,
              textReadable: true,
            },
          },
          accent: {
            hex: '#FF6D00',
            name: 'Bright Orange',
            usage: 'CTAs, exciting elements',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 4.8,
              textReadable: true,
            },
          },
          text: {
            hex: '#263238',
            name: 'Slate',
            usage: 'Body text',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 13.5,
              textReadable: true,
            },
          },
          background: {
            hex: '#FAFAFA',
            name: 'Off White',
            usage: 'Backgrounds',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 1.02,
              textReadable: true,
            },
          },
        },
        typography: {
          headingFont: {
            family: 'Nunito',
            weights: [700, 800, 900],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
          bodyFont: {
            family: 'Lato',
            weights: [400, 700],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
        },
        spacing: {
          scale: 8,
          borderRadius: 'lg',
        },
        imagery: {
          style: 'lifestyle',
          guidelines:
            'Fun, social lifestyle photography. Show friends enjoying together, outdoor adventures, creative activities.',
          filters: 'Vibrant colors, high saturation, energetic feel',
        },
      },
      voice: {
        personality: [
          'Friendly',
          'Playful',
          'Authentic',
        ] as BrandPersonalityTrait[],
        tone: 'playful' as BrandTone,
        vocabulary: {
          preferred: [
            { term: 'Vibe', instead: 'Effect', context: 'Casual conversations' },
            { term: 'Chill', instead: 'Relax', context: 'Social settings' },
            { term: 'Enjoy', instead: 'Consume', context: 'Product usage' },
          ],
          avoid: [
            { term: 'Druggie', reason: 'Negative connotations' },
            { term: 'Dope', reason: 'Can be interpreted negatively' },
          ],
          cannabisTerms: [
            {
              term: 'Strain',
              definition: 'Variety of cannabis with unique characteristics',
              audience: 'all',
            },
            {
              term: 'Indica',
              definition: 'Cannabis variety known for relaxing effects',
              audience: 'all',
            },
            {
              term: 'Sativa',
              definition: 'Cannabis variety known for energizing effects',
              audience: 'all',
            },
          ],
        },
        writingStyle: {
          sentenceLength: 'short',
          paragraphLength: 'concise',
          useEmojis: true,
          emojiFrequency: 'occasional',
          useExclamation: true,
          useQuestions: true,
          useHumor: true,
          formalityLevel: 2,
          complexity: 'simple',
          perspective: 'second-person',
        },
        sampleContent: [
          {
            type: 'social_post',
            content:
              "Ready for the weekend? 🌿 This uplifting sativa is perfect for adventures with friends. Good vibes guaranteed! 😎",
            audience: 'Recreational consumers',
          },
        ],
      },
      messaging: {
        tagline: 'Life, Enhanced',
        positioning: 'Your go-to for good times and great vibes',
        missionStatement:
          'Making cannabis accessible, enjoyable, and a natural part of modern adult life.',
        valuePropositions: [
          'Wide variety for every occasion',
          'Expert budtender recommendations',
          'Great prices, better vibes',
          'Community-focused experiences',
        ],
        keyMessages: [
          {
            audience: 'First-time users',
            message: "New to cannabis? We'll help you find the perfect start!",
          },
          {
            audience: 'Regular consumers',
            message:
              "Your favorite spot for quality products and friendly service",
          },
        ],
      },
      compliance: {
        primaryState: 'CO' as USState,
        operatingStates: ['CO', 'CA', 'OR'] as USState[],
        requiredDisclaimers: {
          age: '21+ only. Please consume responsibly.',
        },
        ageGateLanguage:
          'Are you 21 or older? Enter to explore our products!',
        medicalClaims: 'none',
        contentRestrictions: [
          {
            restriction: 'No appeals to minors',
            reason: 'Regulatory compliance',
          },
        ],
      },
    },
    popularInStates: ['CO', 'WA', 'OR', 'CA', 'NV'],
    featured: true,
  },

  wellness: {
    id: 'wellness',
    name: 'Wellness & Lifestyle',
    category: 'wellness',
    description:
      'Holistic wellness brand positioning for CBD and low-THC products. Emphasizes self-care, balance, and natural health.',
    preview: '/templates/wellness-preview.jpg',
    defaults: {
      visualIdentity: {
        colors: {
          primary: {
            hex: '#7CB342',
            name: 'Sage Green',
            usage: 'Natural, wellness-focused',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 5.8,
              textReadable: true,
            },
          },
          secondary: {
            hex: '#BCAAA4',
            name: 'Warm Taupe',
            usage: 'Earthy, grounding elements',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 4.5,
              textReadable: true,
            },
          },
          accent: {
            hex: '#FFB74D',
            name: 'Honey Gold',
            usage: 'Warmth, positivity',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 5.1,
              textReadable: true,
            },
          },
          text: {
            hex: '#3E2723',
            name: 'Earth Brown',
            usage: 'Natural, readable text',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 12.3,
              textReadable: true,
            },
          },
          background: {
            hex: '#F5F5F0',
            name: 'Linen',
            usage: 'Soft, natural backgrounds',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 1.03,
              textReadable: true,
            },
          },
        },
        typography: {
          headingFont: {
            family: 'Crimson Text',
            weights: [400, 600],
            source: 'google',
            fallbacks: ['Georgia', 'serif'],
          },
          bodyFont: {
            family: 'Source Sans Pro',
            weights: [400, 600],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
        },
        spacing: {
          scale: 8,
          borderRadius: 'md',
        },
        imagery: {
          style: 'lifestyle',
          guidelines:
            'Serene wellness imagery: yoga, meditation, nature, self-care rituals. Soft focus, natural lighting.',
          filters: 'Soft, desaturated, calming tones',
        },
      },
      voice: {
        personality: [
          'Wellness-focused',
          'Empowering',
          'Authentic',
        ] as BrandPersonalityTrait[],
        tone: 'empathetic' as BrandTone,
        vocabulary: {
          preferred: [
            { term: 'Wellness', instead: 'Product', context: 'Benefits' },
            { term: 'Balance', instead: 'Effect', context: 'Outcomes' },
            { term: 'Ritual', instead: 'Use', context: 'Daily practice' },
            { term: 'Journey', instead: 'Experience', context: 'Personal growth' },
          ],
          avoid: [
            { term: 'Drug', reason: 'Medical/pharmaceutical connotation' },
            { term: 'High', reason: 'Not wellness-focused' },
          ],
          cannabisTerms: [
            {
              term: 'CBD',
              definition: 'Natural compound supporting balance and wellness',
              audience: 'all',
            },
            {
              term: 'Full Spectrum',
              definition: 'Contains all beneficial plant compounds working together',
              audience: 'all',
            },
          ],
        },
        writingStyle: {
          sentenceLength: 'medium',
          paragraphLength: 'moderate',
          useEmojis: true,
          emojiFrequency: 'rare',
          useExclamation: false,
          useQuestions: true,
          useHumor: false,
          formalityLevel: 3,
          complexity: 'moderate',
          perspective: 'second-person',
        },
        sampleContent: [
          {
            type: 'product_description',
            content:
              'Begin your day with intention. Our morning wellness tincture combines gentle CBD with adaptogens to help you find balance and focus naturally.',
            audience: 'Wellness-focused consumers',
          },
        ],
      },
      messaging: {
        tagline: 'Find Your Balance',
        positioning: 'Natural wellness through mindful plant medicine',
        missionStatement:
          'Empowering your wellness journey with pure, plant-based solutions for modern life.',
        valuePropositions: [
          'Organic, sustainably sourced',
          'Third-party lab tested',
          'Holistic wellness approach',
          'Educational resources and support',
        ],
        keyMessages: [
          {
            audience: 'CBD newcomers',
            message:
              'Discover gentle, natural support for stress, sleep, and overall wellness',
          },
          {
            audience: 'Wellness enthusiasts',
            message:
              'Elevate your self-care routine with premium plant-based wellness',
          },
        ],
      },
      compliance: {
        primaryState: 'CA' as USState,
        operatingStates: ['CA', 'OR', 'WA', 'CO'] as USState[],
        requiredDisclaimers: {
          health: 'These statements have not been evaluated by the FDA. Not intended to diagnose, treat, cure, or prevent any disease.',
          age: 'You must be 21 years or older to purchase.',
        },
        ageGateLanguage:
          'This website contains information about wellness products. You must be 21+ to enter.',
        medicalClaims: 'limited',
        medicalClaimsGuidelines:
          'May reference general wellness benefits. Cannot make specific medical claims.',
        contentRestrictions: [],
      },
    },
    popularInStates: ['CA', 'OR', 'WA', 'CO', 'NY'],
    featured: true,
  },

  craft: {
    id: 'craft',
    name: 'Craft & Artisanal',
    category: 'craft',
    description:
      'Small-batch, artisan brand positioning emphasizing craftsmanship, quality, and local roots.',
    preview: '/templates/craft-preview.jpg',
    defaults: {
      visualIdentity: {
        colors: {
          primary: {
            hex: '#5D4037',
            name: 'Roasted Coffee',
            usage: 'Earthy, artisanal feel',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 9.2,
              textReadable: true,
            },
          },
          secondary: {
            hex: '#8D6E63',
            name: 'Clay',
            usage: 'Warm, handcrafted elements',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 5.1,
              textReadable: true,
            },
          },
          accent: {
            hex: '#558B2F',
            name: 'Garden Green',
            usage: 'Natural, organic accents',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 6.8,
              textReadable: true,
            },
          },
          text: {
            hex: '#212121',
            name: 'Ink Black',
            usage: 'Body text',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 15.8,
              textReadable: true,
            },
          },
          background: {
            hex: '#FFF8E1',
            name: 'Natural Paper',
            usage: 'Organic, textured feel',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 1.08,
              textReadable: true,
            },
          },
        },
        typography: {
          headingFont: {
            family: 'Merriweather',
            weights: [400, 700, 900],
            source: 'google',
            fallbacks: ['Georgia', 'serif'],
          },
          bodyFont: {
            family: 'Roboto',
            weights: [400, 500],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
        },
        spacing: {
          scale: 8,
          borderRadius: 'sm',
        },
        imagery: {
          style: 'product-focused',
          guidelines:
            'Showcase the craft: close-ups of trichomes, hand-trimming, small-batch cultivation. Natural, unfiltered photography.',
          filters: 'Natural lighting, rich earth tones, authentic feel',
        },
      },
      voice: {
        personality: [
          'Authentic',
          'Friendly',
          'Trustworthy',
        ] as BrandPersonalityTrait[],
        tone: 'casual' as BrandTone,
        vocabulary: {
          preferred: [
            { term: 'Hand-crafted', instead: 'Made', context: 'Production' },
            { term: 'Small-batch', instead: 'Limited', context: 'Quantities' },
            { term: 'Local', instead: 'Regional', context: 'Sourcing' },
          ],
          avoid: [
            { term: 'Mass-produced', reason: 'Contradicts craft positioning' },
            { term: 'Industrial', reason: 'Lacks artisanal feel' },
          ],
          cannabisTerms: [],
        },
        writingStyle: {
          sentenceLength: 'varied',
          paragraphLength: 'moderate',
          useEmojis: false,
          useExclamation: true,
          useQuestions: true,
          useHumor: true,
          formalityLevel: 2,
          complexity: 'moderate',
          perspective: 'first-person',
        },
        sampleContent: [
          {
            type: 'product_description',
            content:
              "We've been growing this strain for three years, perfecting every detail. Hand-trimmed, slow-cured, and grown with love in our family-run facility.",
            audience: 'Craft cannabis enthusiasts',
          },
        ],
      },
      messaging: {
        tagline: 'Grown with Purpose',
        positioning: 'Small-batch cannabis crafted the right way',
        missionStatement:
          'Preserving the art of traditional cultivation while embracing sustainable practices.',
        valuePropositions: [
          'Family-owned and operated',
          'Sustainable farming practices',
          'Personal attention to every plant',
          'Direct from our farm to you',
        ],
        keyMessages: [],
      },
      compliance: {
        primaryState: 'OR' as USState,
        operatingStates: ['OR', 'CA'] as USState[],
        requiredDisclaimers: {
          age: 'For adult use only. 21+',
        },
        ageGateLanguage: 'Must be 21+ to enter',
        medicalClaims: 'none',
        contentRestrictions: [],
      },
    },
    popularInStates: ['OR', 'CA', 'WA', 'VT', 'ME'],
    featured: false,
  },

  corporate: {
    id: 'corporate',
    name: 'Corporate & Multi-State',
    category: 'corporate',
    description:
      'Professional, scalable brand positioning for MSOs (Multi-State Operators) and large cannabis corporations.',
    preview: '/templates/corporate-preview.jpg',
    defaults: {
      visualIdentity: {
        colors: {
          primary: {
            hex: '#1565C0',
            name: 'Corporate Blue',
            usage: 'Trust, professionalism',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 7.5,
              textReadable: true,
            },
          },
          secondary: {
            hex: '#424242',
            name: 'Steel Gray',
            usage: 'Corporate elements',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 10.2,
              textReadable: true,
            },
          },
          accent: {
            hex: '#43A047',
            name: 'Professional Green',
            usage: 'Cannabis association',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 5.9,
              textReadable: true,
            },
          },
          text: {
            hex: '#212121',
            name: 'Text Black',
            usage: 'Body text',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 15.8,
              textReadable: true,
            },
          },
          background: {
            hex: '#FFFFFF',
            name: 'White',
            usage: 'Clean backgrounds',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 1.0,
              textReadable: true,
            },
          },
        },
        typography: {
          headingFont: {
            family: 'Roboto',
            weights: [500, 700],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
          bodyFont: {
            family: 'Open Sans',
            weights: [400, 600],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
        },
        spacing: {
          scale: 8,
          borderRadius: 'sm',
        },
        imagery: {
          style: 'white-background',
          guidelines:
            'Professional product photography on white backgrounds. Clean, consistent, corporate.',
          filters: 'High clarity, neutral, professional',
        },
      },
      voice: {
        personality: [
          'Professional',
          'Trustworthy',
        ] as BrandPersonalityTrait[],
        tone: 'professional' as BrandTone,
        vocabulary: {
          preferred: [
            { term: 'Cannabis', instead: 'Marijuana', context: 'All communications' },
            { term: 'Products', instead: 'Goods', context: 'Inventory' },
          ],
          avoid: [
            { term: 'Weed', reason: 'Unprofessional' },
            { term: 'Pot', reason: 'Informal' },
          ],
          cannabisTerms: [],
        },
        writingStyle: {
          sentenceLength: 'medium',
          paragraphLength: 'moderate',
          useEmojis: false,
          useExclamation: false,
          useQuestions: false,
          useHumor: false,
          formalityLevel: 5,
          complexity: 'moderate',
          perspective: 'third-person',
        },
        sampleContent: [],
      },
      messaging: {
        tagline: 'Leading the Industry Forward',
        positioning: 'Trusted cannabis solutions at scale',
        missionStatement:
          'Advancing the cannabis industry through innovation, quality, and regulatory excellence.',
        valuePropositions: [
          'Consistent quality across all locations',
          'Regulatory compliance expertise',
          'Extensive product selection',
          'Industry-leading standards',
        ],
        keyMessages: [],
      },
      compliance: {
        primaryState: 'CA' as USState,
        operatingStates: ['CA', 'IL', 'MA', 'MI', 'NV', 'CO', 'OR'] as USState[],
        requiredDisclaimers: {
          age: 'For use only by adults 21 years of age and older. Keep out of reach of children.',
        },
        ageGateLanguage:
          'You must be 21 years or older to access this website.',
        medicalClaims: 'none',
        contentRestrictions: [],
      },
    },
    popularInStates: ['CA', 'IL', 'MA', 'MI', 'NV'],
    featured: false,
  },

  lifestyle: {
    id: 'lifestyle',
    name: 'Lifestyle & Culture',
    category: 'lifestyle',
    description:
      'Modern cannabis lifestyle brand emphasizing culture, community, and creative expression.',
    preview: '/templates/lifestyle-preview.jpg',
    defaults: {
      visualIdentity: {
        colors: {
          primary: {
            hex: '#E91E63',
            name: 'Bold Pink',
            usage: 'Vibrant, attention-grabbing',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 4.9,
              textReadable: true,
            },
          },
          secondary: {
            hex: '#9C27B0',
            name: 'Creative Purple',
            usage: 'Artistic, expressive',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 5.2,
              textReadable: true,
            },
          },
          accent: {
            hex: '#00BCD4',
            name: 'Electric Blue',
            usage: 'Modern, energetic',
            accessibility: {
              wcagLevel: 'AA',
              contrastRatio: 4.8,
              textReadable: true,
            },
          },
          text: {
            hex: '#212121',
            name: 'Black',
            usage: 'Text',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 15.8,
              textReadable: true,
            },
          },
          background: {
            hex: '#FAFAFA',
            name: 'Light Gray',
            usage: 'Modern, clean',
            accessibility: {
              wcagLevel: 'AAA',
              contrastRatio: 1.02,
              textReadable: true,
            },
          },
        },
        typography: {
          headingFont: {
            family: 'Bebas Neue',
            weights: [400],
            source: 'google',
            fallbacks: ['Impact', 'sans-serif'],
          },
          bodyFont: {
            family: 'Work Sans',
            weights: [400, 600],
            source: 'google',
            fallbacks: ['Arial', 'sans-serif'],
          },
        },
        spacing: {
          scale: 8,
          borderRadius: 'lg',
        },
        imagery: {
          style: 'lifestyle',
          guidelines:
            'Urban lifestyle, creative culture, music, art, fashion. Bold, colorful, expressive.',
          filters: 'High contrast, vibrant, modern',
        },
      },
      voice: {
        personality: [
          'Playful',
          'Innovative',
          'Authentic',
        ] as BrandPersonalityTrait[],
        tone: 'casual' as BrandTone,
        vocabulary: {
          preferred: [
            { term: 'Vibe', instead: 'Feel', context: 'Culture' },
            { term: 'Squad', instead: 'Group', context: 'Community' },
            { term: 'Fire', instead: 'Great', context: 'Quality' },
          ],
          avoid: [],
          cannabisTerms: [],
        },
        writingStyle: {
          sentenceLength: 'short',
          paragraphLength: 'concise',
          useEmojis: true,
          emojiFrequency: 'frequent',
          useExclamation: true,
          useQuestions: true,
          useHumor: true,
          formalityLevel: 1,
          complexity: 'simple',
          perspective: 'first-person',
        },
        sampleContent: [
          {
            type: 'social_post',
            content:
              "Dropping this Friday! 🔥 Our limited edition collab with @LocalArtist is about to change the game. Who's ready? 👀💨",
            audience: 'Culture-focused consumers',
          },
        ],
      },
      messaging: {
        tagline: 'Live Your Best High',
        positioning: 'Cannabis culture for the creative generation',
        missionStatement:
          'Celebrating cannabis as part of modern culture, creativity, and community.',
        valuePropositions: [
          'Limited edition drops',
          'Artist collaborations',
          'Community events',
          'Cultural relevance',
        ],
        keyMessages: [],
      },
      compliance: {
        primaryState: 'CA' as USState,
        operatingStates: ['CA', 'CO', 'OR'] as USState[],
        requiredDisclaimers: {
          age: '21+ vibes only',
        },
        ageGateLanguage: 'Are you 21+? Let us go!',
        medicalClaims: 'none',
        contentRestrictions: [],
      },
    },
    popularInStates: ['CA', 'CO', 'OR', 'NY', 'IL'],
    featured: false,
  },
};

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

export function getTemplateById(
  id: BrandGuideTemplateCategory
): BrandGuideTemplate | undefined {
  return BRAND_GUIDE_TEMPLATES[id];
}

export function getAllTemplates(): BrandGuideTemplate[] {
  return Object.values(BRAND_GUIDE_TEMPLATES);
}

export function getFeaturedTemplates(): BrandGuideTemplate[] {
  return Object.values(BRAND_GUIDE_TEMPLATES).filter((t) => t.featured);
}

export function getTemplatesByState(state: USState): BrandGuideTemplate[] {
  return Object.values(BRAND_GUIDE_TEMPLATES).filter(
    (t) => t.popularInStates?.includes(state)
  );
}

export function searchTemplates(query: string): BrandGuideTemplate[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(BRAND_GUIDE_TEMPLATES).filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.category.toLowerCase().includes(lowerQuery)
  );
}
