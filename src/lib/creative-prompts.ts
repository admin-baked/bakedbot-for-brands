/**
 * Creative Preset Prompts
 *
 * Pre-configured prompts for common creative content generation scenarios
 */

export interface CreativePromptTemplate {
  id: string;
  label: string;
  description: string;
  category: 'product' | 'deal' | 'education' | 'lifestyle' | 'event' | 'compliance';
  platforms: string[];
  promptTemplate: string;
  variables: string[];
  estimatedTime: string;
  icon?: string;
  exampleOutput?: string;
  /** Visual style direction for FLUX.1 image generation — photography genre, lighting, mood */
  imageStyle?: string;
}

export const CREATIVE_PROMPT_TEMPLATES: CreativePromptTemplate[] = [
  // PRODUCT SPOTLIGHTS
  {
    id: 'product_spotlight',
    label: 'Product Spotlight',
    description: 'Hero product feature — bold visual, sensory language, single CTA',
    category: 'product',
    platforms: ['instagram_feed', 'facebook_feed'],
    promptTemplate: `Write an Instagram product spotlight for {{productName}}.

Product: {{productName}} ({{productType}})
THC: {{thc}}% | Brand: {{brandName}}
Effects: {{effects}}
Brand Voice: {{brandVoice}}

RULES:
- Open with a sensory hook (smell, taste, feeling) — NOT "Check out" or "Introducing"
- 2-3 lines of body copy max. Be specific — mention terpene notes, effects, or occasion
- Single CTA at the end. Period.
- Emojis: 1-2 max, placed to add rhythm not decoration
- Compliant with {{state}} regulations. No medical claims.`,
    variables: ['productName', 'productType', 'thc', 'brandName', 'effects', 'brandVoice', 'brandColors', 'state'],
    estimatedTime: '5-8 seconds',
    icon: 'package',
    imageStyle: 'dramatic product photography, single cannabis product centered on dark surface, colored gel rim lighting in brand colors, smoke wisps, shallow depth of field, reflection on glossy black surface',
    exampleOutput: `Pine forest after rain. That's the first thing you notice.

{{productName}} — {{thc}}% THC, heavy on the myrcene, and built for the kind of evening where nothing else matters.

Now on the menu. Link in bio.`,
  },

  // DEAL ANNOUNCEMENTS
  {
    id: 'flash_sale',
    label: 'Flash Sale / Limited Time Offer',
    description: 'Time-sensitive offer — urgency without desperation',
    category: 'deal',
    platforms: ['instagram_story', 'tiktok', 'facebook_story'],
    promptTemplate: `Write a flash sale announcement for {{dealName}}.

Deal: {{discountPercent}}% OFF on {{products}}
Ends: {{endTime}}
Exclusions: {{exclusions}}
Brand Voice: {{brandVoice}}

RULES:
- Create urgency through scarcity, not screaming. Confidence > desperation.
- Lead with the savings number — it's the hook
- Story format: 2-3 short lines that work as text overlays
- One clean CTA
- No emoji walls. 1-2 max.
- If exclusions exist, add a brief disclaimer line`,
    variables: ['dealName', 'discountPercent', 'products', 'endTime', 'exclusions', 'brandVoice', 'brandColors'],
    estimatedTime: '5-8 seconds',
    icon: 'zap',
    imageStyle: 'bold graphic design aesthetic, high contrast color blocking, large typography-friendly negative space, neon accent glow on dark background, modern retail energy',
    exampleOutput: `{{discountPercent}}% off. Today only.

{{products}} — the good stuff, while it lasts.

Ends {{endTime}}. Don't sleep on it.`,
  },

  // EDUCATION
  {
    id: 'terpene_tuesday',
    label: 'Terpene Tuesday Education',
    description: 'Educational deep-dive — teach one thing well, build authority',
    category: 'education',
    platforms: ['instagram_feed', 'linkedin'],
    promptTemplate: `Write a Terpene Tuesday post about {{terpeneName}}.

Terpene: {{terpeneName}}
Aroma: {{aroma}} | Effects: {{effects}}
Found in: {{foundIn}} (non-cannabis examples too)
Benefits: {{benefits}}
Brand Voice: {{brandVoice}}

RULES:
- Open with a relatable comparison ("You know that smell when..." or "Ever wondered why...")
- Teach ONE thing clearly — don't info dump
- Use analogies to everyday life, not science jargon
- Connect back to products naturally at the end
- Carousel format: each slide = one fact. Keep slides to 1-2 sentences.
- Save the product mention for the last line`,
    variables: ['terpeneName', 'aroma', 'effects', 'foundIn', 'benefits', 'brandVoice'],
    estimatedTime: '6-10 seconds',
    icon: 'beaker',
    imageStyle: 'scientific flat lay on white marble, terpene-rich botanicals arranged artfully (citrus peels, lavender, pine needles), soft overhead diffused lighting, clean editorial composition, macro texture detail',
    exampleOutput: `You know that calming smell when you walk through a lavender field?

That's linalool — and it's in more strains than you'd think.

This terpene shows up in lavender, birch bark, and some of the most relaxing cultivars on our menu. It's what gives certain strains that floral, almost spa-like quality.

Next time you're choosing, ask about the terpene profile. Your nose already knows what it likes.`,
  },

  // LIFESTYLE
  {
    id: 'lifestyle_moment',
    label: 'Lifestyle Moment',
    description: 'Aspirational scene — the audience should feel it, not read about it',
    category: 'lifestyle',
    platforms: ['instagram_reel', 'tiktok'],
    promptTemplate: `Write a lifestyle post for the scenario: {{scenario}}.

Scene: {{scenarioDescription}}
Product: {{productName}} | Vibe: {{vibe}}
Brand Voice: {{brandVoice}}

RULES:
- Write in second person present tense ("You're..." not "Picture this:")
- Paint the scene in 3-4 sensory-rich lines — sights, sounds, textures
- Product appears naturally in the scene, never as the pitch
- No "imagine" or "picture this" openers — just drop them into the moment
- For reels: hook line + 1 sentence. For feed: full scene.
- End with the product as the quiet hero, not the headline`,
    variables: ['scenario', 'scenarioDescription', 'productName', 'vibe', 'brandVoice', 'brandColors'],
    estimatedTime: '8-12 seconds',
    icon: 'coffee',
    imageStyle: 'cinematic lifestyle photography, warm golden hour light through sheer curtains, cozy interior with plants and soft textures, earth tones and warm amber, shallow depth of field, intimate framing',
    exampleOutput: `Friday. Laptop closed. Phone on silent.

You're on the balcony with the last of the golden hour, a playlist you forgot you made, and {{productName}} doing exactly what it's supposed to.

Nothing scheduled. Nowhere to be.

This is the reset.`,
  },

  // EVENTS
  {
    id: 'event_announcement',
    label: 'Event Announcement',
    description: 'Event promo — build anticipation, make it feel unmissable',
    category: 'event',
    platforms: ['instagram_feed', 'facebook_event', 'email'],
    promptTemplate: `Write an event announcement for {{eventName}}.

Event: {{eventName}}
When: {{eventDate}} at {{eventTime}}
Where: {{location}}
What: {{activities}}
Specials: {{specialOffers}}
Brand Voice: {{brandVoice}}

RULES:
- Lead with what makes it worth showing up — not the logistics
- Date/time/location go in a clean block AFTER the hook
- Build anticipation: tease what's happening without over-explaining
- Single CTA: RSVP, save the date, or link in bio
- For Instagram: format the details block with line breaks so it's scannable
- Keep it under 100 words`,
    variables: ['eventName', 'eventDate', 'eventTime', 'location', 'activities', 'specialOffers', 'brandVoice', 'brandColors'],
    estimatedTime: '8-12 seconds',
    icon: 'calendar',
    imageStyle: 'event poster aesthetic, bold geometric shapes, high contrast, neon color accents on dark background, dynamic diagonal composition, modern festival energy, clean negative space for text overlay',
    exampleOutput: `This one's going to be different.

{{eventName}} — live music, vendor pop-ups, and a few surprises we're keeping under wraps.

{{eventDate}} | {{eventTime}}
{{location}}

Save your spot. Link in bio.`,
  },

  // WEEKLY DEALS
  {
    id: 'weekly_deals_roundup',
    label: 'Weekly Deals Roundup',
    description: 'Curated weekly picks — editorial, not a flyer',
    category: 'deal',
    platforms: ['instagram_carousel', 'email', 'instagram_feed'],
    promptTemplate: `Write a weekly deals roundup for {{weekOf}}.

Deals: {{dealsList}}
Store: {{storeName}}
Brand Voice: {{brandVoice}}

RULES:
- Frame it as "staff picks" or "this week's lineup" — not a coupon flyer
- Each deal gets 1 line: product name + what makes it worth it + savings
- Open with a hook that creates anticipation, not "This week's deals are..."
- For carousel: slide 1 = hook headline, slides 2-4 = one deal each, last slide = CTA
- For feed: scannable list with line breaks between deals
- One CTA at the end
- If member-exclusive deals exist, call that out as a perk`,
    variables: ['weekOf', 'dealsList', 'storeName', 'brandVoice', 'brandColors'],
    estimatedTime: '10-15 seconds',
    icon: 'tag',
    imageStyle: 'editorial flat lay arrangement of cannabis products on clean surface, soft directional lighting, organized grid composition, warm neutral tones, magazine-style product grouping',
    exampleOutput: `The lineup this week is strong.

Our staff pulled their favorites — here's what's moving:

{{dealsList}}

Available through Sunday at {{storeName}}. Members get first pick.`,
  },

  // CUSTOMER BIRTHDAYS
  {
    id: 'birthday_promo',
    label: 'Birthday Promotion',
    description: 'Personal birthday message — warm, generous, not corporate',
    category: 'deal',
    platforms: ['email', 'sms'],
    promptTemplate: `Write a birthday message for a loyalty member.

Offer: {{birthdayOffer}}
Valid: {{validPeriod}}
Store: {{storeName}}
Brand Voice: {{brandVoice}}

RULES:
- Sound like a friend, not a brand. "Happy birthday" is fine — don't overthink it.
- Lead with the celebration, then the offer
- Keep redemption details simple: 1-2 sentences max
- For SMS: under 160 characters total
- For email: short subject line + 3-4 sentence body
- No corporate language ("We at {{storeName}} would like to...")`,
    variables: ['birthdayOffer', 'validPeriod', 'storeName', 'brandVoice'],
    estimatedTime: '5-8 seconds',
    icon: 'gift',
    imageStyle: 'celebratory still life, birthday candle warm glow, soft bokeh background, warm amber tones, intimate close-up, gift wrapping textures',
    exampleOutput: `Happy birthday! This one's on us.

{{birthdayOffer}} — just mention it at the counter or use code BDAY at checkout.

Good through {{validPeriod}}. Enjoy your day.`,
  },

  // COMPLIANCE
  {
    id: 'compliance_reminder',
    label: 'Responsible Use Reminder',
    description: 'Safety-first content — informative, never preachy',
    category: 'compliance',
    platforms: ['instagram_story', 'facebook'],
    promptTemplate: `Write a responsible use reminder about {{topic}}.

Topic: {{topic}}
Key Message: {{keyMessage}}
State: {{state}}
Brand Voice: {{brandVoice}}

RULES:
- Informative, not preachy. You're sharing knowledge, not lecturing.
- Frame positively — what TO do, not what NOT to do
- Keep it short: 2-3 sentences for stories, 4-5 for feed
- Include any required {{state}} disclaimers naturally
- This should feel like advice from a knowledgeable friend`,
    variables: ['topic', 'keyMessage', 'state', 'brandVoice'],
    estimatedTime: '6-10 seconds',
    icon: 'shield-check',
    imageStyle: 'clean infographic aesthetic, soft gradient background, minimal icons, wellness color palette (sage green, cream, soft blue), clean modern typography space',
    exampleOutput: `Quick reminder: start low, go slow.

Whether you're new or just trying something different, give it time to work before reaching for more. Your body will tell you what it needs.

Questions? Our budtenders are always here to help.`,
  },

  // NEW ARRIVALS
  {
    id: 'new_arrival',
    label: 'New Product Launch',
    description: 'Drop announcement — build hype through exclusivity and specificity',
    category: 'product',
    platforms: ['instagram_feed', 'tiktok', 'email'],
    promptTemplate: `Write a new product drop announcement for {{productName}}.

Product: {{productName}} by {{brandName}}
Type: {{productType}}
What's Special: {{uniqueFeatures}}
Price: {{price}} | Available: {{availableDate}}
Brand Voice: {{brandVoice}}

RULES:
- Treat it like a drop, not an ad. Build anticipation.
- Lead with what makes it DIFFERENT — not that it's new (they can see that)
- Be specific about what makes it special: genetics, process, flavor, effects
- One line about who it's for (occasion or consumer type)
- Price and availability as a clean sign-off, not buried in copy
- For TikTok: 1 punchy line + date. That's it.`,
    variables: ['productName', 'brandName', 'productType', 'uniqueFeatures', 'price', 'availableDate', 'brandVoice', 'brandColors'],
    estimatedTime: '8-12 seconds',
    icon: 'sparkles',
    imageStyle: 'product reveal photography, dramatic top-down unwrapping moment, dark luxurious background, accent lighting revealing product details, anticipation and premium feel',
    exampleOutput: `{{productName}} just landed.

{{uniqueFeatures}} — this is the one people have been asking about.

{{price}} | Available {{availableDate}}
First come, first served.`,
  },

  // TESTIMONIAL/REVIEW
  {
    id: 'customer_testimonial',
    label: 'Customer Testimonial',
    description: 'Social proof — let the customer speak, then get out of the way',
    category: 'lifestyle',
    platforms: ['instagram_story', 'facebook', 'website'],
    promptTemplate: `Write a testimonial post featuring this customer review.

Customer: {{customerName}} | Rating: {{rating}}/5
Review: "{{reviewText}}"
Product: {{productName}}
Brand Voice: {{brandVoice}}

RULES:
- Let the quote do the heavy lifting. Don't paraphrase what they already said.
- Pull the most specific, vivid part of the review as the hook
- Add 1-2 lines of context from the brand, max
- CTA: invite others to share their experience, not "join our family"
- For stories: quote on a clean background, product name, that's it
- Keep your brand voice in the setup, but the quote IS the content`,
    variables: ['customerName', 'rating', 'reviewText', 'productName', 'brandVoice', 'brandColors'],
    estimatedTime: '6-10 seconds',
    icon: 'quote',
    imageStyle: 'testimonial card aesthetic, large pull-quote typography, warm neutral background, subtle star rating, clean minimalist design with generous white space, editorial magazine feel',
    exampleOutput: `"{{reviewText}}"
— {{customerName}}

{{productName}}. The reviews speak for themselves.

Had a great experience? We'd love to hear about it.`,
  },
];

/**
 * Get prompts by category
 */
export function getPromptsByCategory(category: CreativePromptTemplate['category']) {
  return CREATIVE_PROMPT_TEMPLATES.filter(p => p.category === category);
}

/**
 * Get prompts by platform
 */
export function getPromptsByPlatform(platform: string) {
  return CREATIVE_PROMPT_TEMPLATES.filter(p => p.platforms.includes(platform));
}

/**
 * Get prompt by ID
 */
export function getPromptById(id: string) {
  return CREATIVE_PROMPT_TEMPLATES.find(p => p.id === id);
}

/**
 * Fill template with actual data
 */
export function fillPromptTemplate(
  templateId: string,
  variables: Record<string, string>
): string {
  const template = getPromptById(templateId);
  if (!template) throw new Error(`Template ${templateId} not found`);

  let filled = template.promptTemplate;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return filled;
}
