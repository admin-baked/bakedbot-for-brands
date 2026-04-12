// ---------------------------------------------------------------------------
// Terpene Encyclopedia — static reference data (no DB needed)
// ---------------------------------------------------------------------------

export interface TerpeneInfo {
  name: string;
  slug: string;
  formula: string;
  aroma: string;
  effects: string[];
  medicalUses: string[];
  boilingPoint: string;
  alsoFoundIn: string[];
  description: string;
  strainExamples: string[];
  color: string; // Tailwind color key for UI theming
}

export const TERPENES: TerpeneInfo[] = [
  {
    name: 'Myrcene',
    slug: 'myrcene',
    formula: 'C\u2081\u2080H\u2081\u2086',
    aroma: 'Earthy, musky, herbal with hints of fruit',
    effects: ['Relaxing', 'Sedating', 'Pain relief'],
    medicalUses: ['Anti-inflammatory', 'Analgesic', 'Muscle relaxant', 'Sedative'],
    boilingPoint: '168\u00B0C (334\u00B0F)',
    alsoFoundIn: ['Mangoes', 'Lemongrass', 'Hops', 'Thyme'],
    description:
      'Myrcene is the most abundant terpene in modern cannabis cultivars, often comprising over 20% of the total terpene profile. It is believed to enhance cannabinoid absorption across the blood-brain barrier, contributing to the "couch-lock" effect associated with indica-dominant strains.',
    strainExamples: ['Blue Dream', 'OG Kush', 'Granddaddy Purple', 'Grape Ape'],
    color: 'green',
  },
  {
    name: 'Limonene',
    slug: 'limonene',
    formula: 'C\u2081\u2080H\u2081\u2086',
    aroma: 'Citrus, lemon, orange zest',
    effects: ['Uplifting', 'Mood-enhancing', 'Stress relief'],
    medicalUses: ['Anti-anxiety', 'Antidepressant', 'Anti-fungal', 'Gastric acid reflux relief'],
    boilingPoint: '176\u00B0C (349\u00B0F)',
    alsoFoundIn: ['Lemon rinds', 'Orange peels', 'Juniper', 'Peppermint'],
    description:
      'Limonene is the second most common terpene in nature and gives cannabis its distinctive citrus aroma. Research suggests it elevates serotonin and dopamine levels in key brain regions, supporting its reputation as a natural mood booster.',
    strainExamples: ['Super Lemon Haze', 'Durban Poison', 'Jack Herer', 'Wedding Cake'],
    color: 'amber',
  },
  {
    name: 'Pinene',
    slug: 'pinene',
    formula: 'C\u2081\u2080H\u2081\u2086',
    aroma: 'Sharp pine, fresh woodland',
    effects: ['Alert', 'Focused', 'Memory retention'],
    medicalUses: ['Bronchodilator', 'Anti-inflammatory', 'Antiseptic', 'Memory aid'],
    boilingPoint: '155\u00B0C (311\u00B0F)',
    alsoFoundIn: ['Pine needles', 'Rosemary', 'Basil', 'Dill'],
    description:
      'Pinene is the most widely encountered terpene in the natural world and is responsible for the fresh scent of pine forests. It is notable for its ability to counteract some of the short-term memory impairment associated with THC consumption.',
    strainExamples: ['Jack Herer', 'Snoop\u2019s Dream', 'Blue Dream', 'Critical Mass'],
    color: 'emerald',
  },
  {
    name: 'Caryophyllene',
    slug: 'caryophyllene',
    formula: 'C\u2081\u2085H\u2082\u2084',
    aroma: 'Spicy, peppery, woody',
    effects: ['Calming', 'Stress relief', 'Grounding'],
    medicalUses: ['Anti-inflammatory', 'Analgesic', 'Anti-anxiety', 'Neuroprotective'],
    boilingPoint: '130\u00B0C (266\u00B0F)',
    alsoFoundIn: ['Black pepper', 'Cloves', 'Cinnamon', 'Oregano'],
    description:
      'Caryophyllene is unique among terpenes because it directly binds to CB2 cannabinoid receptors, effectively acting as a dietary cannabinoid. This mechanism gives it potent anti-inflammatory properties without any psychoactive effects.',
    strainExamples: ['GSC (Girl Scout Cookies)', 'Original Glue', 'Bubba Kush', 'Chemdog'],
    color: 'orange',
  },
  {
    name: 'Linalool',
    slug: 'linalool',
    formula: 'C\u2081\u2080H\u2081\u2088O',
    aroma: 'Floral, lavender, sweet',
    effects: ['Relaxing', 'Calming', 'Sleep-promoting'],
    medicalUses: ['Anti-anxiety', 'Sedative', 'Anticonvulsant', 'Antidepressant'],
    boilingPoint: '198\u00B0C (388\u00B0F)',
    alsoFoundIn: ['Lavender', 'Birch bark', 'Coriander', 'Sweet basil'],
    description:
      'Linalool is the terpene responsible for the calming scent of lavender and has been used in traditional medicine for centuries. In cannabis, it contributes to sedative and anxiolytic effects, making it highly valued in strains targeting insomnia and anxiety.',
    strainExamples: ['Amnesia Haze', 'Lavender', 'LA Confidential', 'Zkittlez'],
    color: 'purple',
  },
  {
    name: 'Humulene',
    slug: 'humulene',
    formula: 'C\u2081\u2085H\u2082\u2084',
    aroma: 'Earthy, woody, hoppy',
    effects: ['Appetite suppressant', 'Focused', 'Grounding'],
    medicalUses: ['Anti-inflammatory', 'Antibacterial', 'Appetite suppressant', 'Anti-tumor'],
    boilingPoint: '106\u00B0C (223\u00B0F)',
    alsoFoundIn: ['Hops', 'Coriander', 'Ginseng', 'Sage'],
    description:
      'Humulene shares a chemical formula with caryophyllene and is abundant in hops, giving beer its characteristic bitterness. Unlike most cannabis terpenes, it acts as an appetite suppressant rather than a stimulant, making it notable for weight-conscious consumers.',
    strainExamples: ['Headband', 'White Widow', 'Pink Kush', 'Sour Diesel'],
    color: 'lime',
  },
  {
    name: 'Terpinolene',
    slug: 'terpinolene',
    formula: 'C\u2081\u2080H\u2081\u2086',
    aroma: 'Floral, herbal, piney with citrus notes',
    effects: ['Uplifting', 'Creative', 'Energizing'],
    medicalUses: ['Antioxidant', 'Antibacterial', 'Sedative (in higher doses)', 'Anti-fungal'],
    boilingPoint: '186\u00B0C (367\u00B0F)',
    alsoFoundIn: ['Nutmeg', 'Tea tree', 'Cumin', 'Lilac'],
    description:
      'Terpinolene is present in many cannabis strains but rarely dominates the profile, making terpinolene-dominant cultivars relatively uncommon. Its complex aroma blends floral, herbal, and citrus notes, and it is associated with uplifting, creative effects.',
    strainExamples: ['Jack Herer', 'Ghost Train Haze', 'Dutch Treat', 'XJ-13'],
    color: 'sky',
  },
  {
    name: 'Ocimene',
    slug: 'ocimene',
    formula: 'C\u2081\u2080H\u2081\u2086',
    aroma: 'Sweet, herbaceous, woody',
    effects: ['Uplifting', 'Energizing', 'Decongestant'],
    medicalUses: ['Anti-viral', 'Anti-fungal', 'Decongestant', 'Anti-inflammatory'],
    boilingPoint: '100\u00B0C (212\u00B0F)',
    alsoFoundIn: ['Mint', 'Parsley', 'Orchids', 'Kumquats'],
    description:
      'Ocimene is one of the lighter terpenes with a low boiling point, making it particularly volatile and aromatic. Plants produce it as a natural defense mechanism against pests, and in cannabis it contributes a sweet, herbaceous top note.',
    strainExamples: ['Golden Goat', 'Strawberry Cough', 'Space Queen', 'Chernobyl'],
    color: 'teal',
  },
  {
    name: 'Bisabolol',
    slug: 'bisabolol',
    formula: 'C\u2081\u2085H\u2082\u2086O',
    aroma: 'Sweet, floral, delicate chamomile',
    effects: ['Calming', 'Soothing', 'Gentle relaxation'],
    medicalUses: ['Anti-irritant', 'Anti-inflammatory', 'Antimicrobial', 'Analgesic'],
    boilingPoint: '153\u00B0C (307\u00B0F)',
    alsoFoundIn: ['Chamomile', 'Candeia tree', 'Sage'],
    description:
      'Bisabolol has been a staple in the cosmetics industry for decades due to its skin-soothing and anti-irritant properties. In cannabis, it adds a subtle floral sweetness and is believed to enhance the overall calming profile of the strain.',
    strainExamples: ['Harle-Tsu', 'ACDC', 'Pink Kush', 'Headband'],
    color: 'rose',
  },
  {
    name: 'Geraniol',
    slug: 'geraniol',
    formula: 'C\u2081\u2080H\u2081\u2088O',
    aroma: 'Rosy, sweet, citrusy',
    effects: ['Calming', 'Mood-enhancing', 'Neuroprotective'],
    medicalUses: ['Antioxidant', 'Neuroprotective', 'Anti-tumor', 'Anti-inflammatory'],
    boilingPoint: '230\u00B0C (446\u00B0F)',
    alsoFoundIn: ['Roses', 'Geraniums', 'Lemons', 'Tobacco'],
    description:
      'Geraniol is a primary component of rose oil and citronella and is widely used in perfumery. Emerging research points to promising neuroprotective and anti-tumor properties, making it a terpene of growing interest in medical cannabis.',
    strainExamples: ['Afghani', 'Headband', 'Island Sweet Skunk', 'Harlequin'],
    color: 'pink',
  },
  {
    name: 'Camphene',
    slug: 'camphene',
    formula: 'C\u2081\u2080H\u2081\u2086',
    aroma: 'Damp woodland, fir needles, herbal',
    effects: ['Grounding', 'Refreshing', 'Focused'],
    medicalUses: ['Cardiovascular support', 'Antioxidant', 'Anti-inflammatory', 'Analgesic'],
    boilingPoint: '159\u00B0C (318\u00B0F)',
    alsoFoundIn: ['Camphor tree', 'Turpentine', 'Ginger', 'Valerian'],
    description:
      'Camphene emits a damp, earthy aroma reminiscent of fir needles and is found alongside pinene in many conifer trees. Studies suggest it may help reduce cholesterol and triglycerides when absorbed, giving it potential cardiovascular benefits.',
    strainExamples: ['OG Kush', 'Ghost OG', 'Strawberry Banana', 'Mendocino Purps'],
    color: 'cyan',
  },
  {
    name: 'Borneol',
    slug: 'borneol',
    formula: 'C\u2081\u2080H\u2081\u2088O',
    aroma: 'Minty, camphor-like, herbal',
    effects: ['Stress relief', 'Calming', 'Refreshing'],
    medicalUses: ['Analgesic', 'Anti-insomnia', 'Bronchodilator', 'Anticoagulant'],
    boilingPoint: '210\u00B0C (410\u00B0F)',
    alsoFoundIn: ['Camphor', 'Rosemary', 'Mint', 'Mugwort'],
    description:
      'Borneol has been used in Chinese traditional medicine for over a thousand years as a calming and pain-relieving agent. It is notable for its ability to enhance the absorption of other compounds, potentially amplifying the effects of cannabinoids.',
    strainExamples: ['K13 Haze', 'Golden Haze', 'Amnesia Haze'],
    color: 'indigo',
  },
  {
    name: 'Valencene',
    slug: 'valencene',
    formula: 'C\u2081\u2085H\u2082\u2084',
    aroma: 'Sweet citrus, fresh orange, grapefruit',
    effects: ['Uplifting', 'Energizing', 'Alert'],
    medicalUses: ['Anti-inflammatory', 'Anti-allergenic', 'Insect repellent', 'Skin protectant'],
    boilingPoint: '123\u00B0C (253\u00B0F)',
    alsoFoundIn: ['Valencia oranges', 'Tangerines', 'Grapefruit', 'Nectarines'],
    description:
      'Valencene takes its name from Valencia oranges, where it was first isolated, and is responsible for the bright citrus aroma in many cannabis cultivars. It also functions as an effective natural insect repellent.',
    strainExamples: ['Tangie', 'Agent Orange', 'Jillybean', 'Clementine'],
    color: 'amber',
  },
  {
    name: 'Nerolidol',
    slug: 'nerolidol',
    formula: 'C\u2081\u2085H\u2082\u2086O',
    aroma: 'Woody, floral, citrus bark',
    effects: ['Sedating', 'Relaxing', 'Calming'],
    medicalUses: ['Anti-parasitic', 'Anti-fungal', 'Sedative', 'Skin penetration enhancer'],
    boilingPoint: '122\u00B0C (252\u00B0F)',
    alsoFoundIn: ['Neroli', 'Jasmine', 'Tea tree', 'Ginger'],
    description:
      'Nerolidol is a sesquiterpene found in many aromatic plants and is prized for its ability to enhance skin penetration. This property makes it a focus of pharmaceutical research as a transdermal delivery enhancer for topical cannabis products.',
    strainExamples: ['Island Sweet Skunk', 'Skywalker OG', 'Jack Herer', 'Blue Dream'],
    color: 'violet',
  },
  {
    name: 'Eucalyptol',
    slug: 'eucalyptol',
    formula: 'C\u2081\u2080H\u2081\u2088O',
    aroma: 'Cool, minty, eucalyptus',
    effects: ['Clear-headed', 'Refreshing', 'Energizing'],
    medicalUses: ['Anti-inflammatory', 'Analgesic', 'Bronchodilator', 'Antibacterial'],
    boilingPoint: '176\u00B0C (349\u00B0F)',
    alsoFoundIn: ['Eucalyptus', 'Tea tree', 'Bay leaves', 'Cardamom'],
    description:
      'Eucalyptol (also known as 1,8-cineole) makes up over 90% of eucalyptus essential oil and is widely used in cough suppressants and mouthwashes. In cannabis it appears in small concentrations but contributes a distinctive cooling, minty quality.',
    strainExamples: ['Super Silver Haze', 'Girl Scout Cookies', 'Headband', 'Bubba Kush'],
    color: 'teal',
  },
];

/** Look up a single terpene by slug. Returns undefined if not found. */
export function getTerpeneBySlug(slug: string): TerpeneInfo | undefined {
  return TERPENES.find((t) => t.slug === slug);
}

/** Return all terpene slugs — useful for generateStaticParams. */
export function getAllTerpeneSlugs(): string[] {
  return TERPENES.map((t) => t.slug);
}
