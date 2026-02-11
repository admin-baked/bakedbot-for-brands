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
}

export const CREATIVE_PROMPT_TEMPLATES: CreativePromptTemplate[] = [
  // PRODUCT SPOTLIGHTS
  {
    id: 'product_spotlight',
    label: 'Product Spotlight',
    description: 'Eye-catching post featuring a specific product',
    category: 'product',
    platforms: ['instagram_feed', 'facebook_feed'],
    promptTemplate: `Create an Instagram post highlighting {{productName}}.

Product Details:
- Type: {{productType}}
- THC: {{thc}}%
- Brand: {{brandName}}
- Effects: {{effects}}

Brand Voice: {{brandVoice}}
Brand Colors: {{brandColors}}

Include:
1. Attention-grabbing headline
2. Product benefits (2-3 bullet points)
3. Call-to-action
4. Relevant emojis
5. 3-5 hashtags

Keep it {{brandVoice}} and compliant with {{state}} regulations.`,
    variables: ['productName', 'productType', 'thc', 'brandName', 'effects', 'brandVoice', 'brandColors', 'state'],
    estimatedTime: '5-8 seconds',
    icon: 'package',
  },

  // DEAL ANNOUNCEMENTS
  {
    id: 'flash_sale',
    label: 'Flash Sale / Limited Time Offer',
    description: 'Create urgency for time-sensitive deals',
    category: 'deal',
    platforms: ['instagram_story', 'tiktok', 'facebook_story'],
    promptTemplate: `Create an urgent flash sale announcement for {{dealName}}.

Deal Details:
- Discount: {{discountPercent}}% OFF
- Products: {{products}}
- Ends: {{endTime}}
- Exclusions: {{exclusions}}

Brand Voice: {{brandVoice}}
Colors: {{brandColors}}

Requirements:
1. Create FOMO (fear of missing out)
2. Clear savings amount
3. Countdown or urgency language
4. Simple CTA ("Shop Now", "Save Today")
5. Compliance disclaimer if needed

Make it {{brandVoice}} but URGENT.`,
    variables: ['dealName', 'discountPercent', 'products', 'endTime', 'exclusions', 'brandVoice', 'brandColors'],
    estimatedTime: '5-8 seconds',
    icon: 'zap',
    exampleOutput: '⚡ FLASH SALE ⚡\n\n24 HOURS ONLY\n20% OFF Premium Flower\n\nSave BIG on:\n🌿 OG Kush\n🌿 Blue Dream\n🌿 Sour Diesel\n\nEnds Tonight at Midnight!\n\n👉 Shop Now\n\n#CannabisDeals #FlashSale',
  },

  // EDUCATION
  {
    id: 'terpene_tuesday',
    label: 'Terpene Tuesday Education',
    description: 'Educational post about terpene profiles',
    category: 'education',
    platforms: ['instagram_feed', 'linkedin'],
    promptTemplate: `Create a "Terpene Tuesday" educational post about {{terpeneName}}.

Terpene Info:
- Name: {{terpeneName}}
- Aroma: {{aroma}}
- Effects: {{effects}}
- Found in: {{foundIn}}
- Benefits: {{benefits}}

Brand Voice: {{brandVoice}}

Include:
1. Fun intro hook
2. What it smells like (layman's terms)
3. What it does (benefits)
4. What products have it
5. Educational tone but accessible

Make it informative yet {{brandVoice}}.`,
    variables: ['terpeneName', 'aroma', 'effects', 'foundIn', 'benefits', 'brandVoice'],
    estimatedTime: '6-10 seconds',
    icon: 'beaker',
  },

  // LIFESTYLE
  {
    id: 'lifestyle_moment',
    label: 'Lifestyle Moment',
    description: 'Relatable consumption scenario',
    category: 'lifestyle',
    platforms: ['instagram_reel', 'tiktok'],
    promptTemplate: `Create a relatable lifestyle post for {{scenario}}.

Scenario: {{scenarioDescription}}
Recommended Product: {{productName}}
Vibe: {{vibe}}

Brand Voice: {{brandVoice}}
Brand Colors: {{brandColors}}

Requirements:
1. Paint a vivid scene customers can relate to
2. Make product the hero without being salesy
3. Use sensory language (sights, sounds, feelings)
4. Include subtle product recommendation
5. Aspirational but authentic

Tone: {{brandVoice}}, relatable, and authentic.`,
    variables: ['scenario', 'scenarioDescription', 'productName', 'vibe', 'brandVoice', 'brandColors'],
    estimatedTime: '8-12 seconds',
    icon: 'coffee',
    exampleOutput: 'Picture this:\n\nFriday evening. Work is done. You sink into your couch, queue up your favorite show, and light up some Blue Dream.\n\nThe stress melts away. The world slows down. This is YOUR time.\n\n✨ Blue Dream: Your Friday night ritual.\n\n#SelfCare #FridayVibes',
  },

  // EVENTS
  {
    id: 'event_announcement',
    label: 'Event Announcement',
    description: 'Promote in-store or virtual events',
    category: 'event',
    platforms: ['instagram_feed', 'facebook_event', 'email'],
    promptTemplate: `Create an event announcement for {{eventName}}.

Event Details:
- Name: {{eventName}}
- Date: {{eventDate}}
- Time: {{eventTime}}
- Location: {{location}}
- What's Happening: {{activities}}
- Special Offers: {{specialOffers}}

Brand Voice: {{brandVoice}}
Brand Colors: {{brandColors}}

Include:
1. Exciting headline
2. Key event details (who, what, when, where)
3. What attendees get (deals, education, samples)
4. RSVP or registration CTA
5. Parking/accessibility info if needed

Make it exciting and {{brandVoice}}.`,
    variables: ['eventName', 'eventDate', 'eventTime', 'location', 'activities', 'specialOffers', 'brandVoice', 'brandColors'],
    estimatedTime: '8-12 seconds',
    icon: 'calendar',
  },

  // WEEKLY DEALS
  {
    id: 'weekly_deals_roundup',
    label: 'Weekly Deals Roundup',
    description: 'Showcase this week\'s best deals',
    category: 'deal',
    platforms: ['instagram_carousel', 'email', 'instagram_feed'],
    promptTemplate: `Create a weekly deals roundup for {{weekOf}}.

This Week's Deals:
{{dealsList}}

Store Name: {{storeName}}
Brand Voice: {{brandVoice}}
Brand Colors: {{brandColors}}

Requirements:
1. Catchy headline ("This Week's Fire Deals 🔥")
2. List each deal with product + savings
3. Validity period clear
4. Shop online or in-store CTA
5. Member-exclusive callout if applicable

Format as easy-to-scan list. Tone: {{brandVoice}} and value-focused.`,
    variables: ['weekOf', 'dealsList', 'storeName', 'brandVoice', 'brandColors'],
    estimatedTime: '10-15 seconds',
    icon: 'tag',
  },

  // CUSTOMER BIRTHDAYS
  {
    id: 'birthday_promo',
    label: 'Birthday Promotion',
    description: 'Personalized birthday offer',
    category: 'deal',
    platforms: ['email', 'sms'],
    promptTemplate: `Create a birthday promotion message for loyalty members.

Offer: {{birthdayOffer}}
Valid: {{validPeriod}}
Store: {{storeName}}

Brand Voice: {{brandVoice}}

Requirements:
1. Warm birthday greeting
2. Make them feel special (VIP treatment)
3. Clear offer details
4. Redemption instructions
5. Expiration date
6. Optional: Birthday product recommendation

Tone: Celebratory, {{brandVoice}}, and generous.`,
    variables: ['birthdayOffer', 'validPeriod', 'storeName', 'brandVoice'],
    estimatedTime: '5-8 seconds',
    icon: 'gift',
  },

  // COMPLIANCE
  {
    id: 'compliance_reminder',
    label: 'Responsible Use Reminder',
    description: 'Educational compliance post',
    category: 'compliance',
    platforms: ['instagram_story', 'facebook'],
    promptTemplate: `Create a responsible cannabis use reminder for {{topic}}.

Topic: {{topic}}
Key Message: {{keyMessage}}
State: {{state}}

Brand Voice: {{brandVoice}}

Requirements:
1. Educational, not preachy
2. Clear safety information
3. State-compliant language
4. Positive framing (wellness-focused)
5. Include disclaimer if needed

Tone: Helpful, {{brandVoice}}, and responsible.`,
    variables: ['topic', 'keyMessage', 'state', 'brandVoice'],
    estimatedTime: '6-10 seconds',
    icon: 'shield-check',
  },

  // NEW ARRIVALS
  {
    id: 'new_arrival',
    label: 'New Product Launch',
    description: 'Announce exciting new products',
    category: 'product',
    platforms: ['instagram_feed', 'tiktok', 'email'],
    promptTemplate: `Announce new product arrival: {{productName}}.

Product Details:
- Brand: {{brandName}}
- Type: {{productType}}
- What's Special: {{uniqueFeatures}}
- Price: {{price}}
- Available: {{availableDate}}

Brand Voice: {{brandVoice}}
Brand Colors: {{brandColors}}

Requirements:
1. Build excitement ("NEW ARRIVAL 🚀")
2. What makes it special/different
3. Who it's perfect for
4. Price and availability
5. "Get yours now" CTA

Make it exciting and {{brandVoice}}.`,
    variables: ['productName', 'brandName', 'productType', 'uniqueFeatures', 'price', 'availableDate', 'brandVoice', 'brandColors'],
    estimatedTime: '8-12 seconds',
    icon: 'sparkles',
  },

  // TESTIMONIAL/REVIEW
  {
    id: 'customer_testimonial',
    label: 'Customer Testimonial',
    description: 'Showcase positive customer review',
    category: 'lifestyle',
    platforms: ['instagram_story', 'facebook', 'website'],
    promptTemplate: `Create a testimonial post featuring a customer review.

Review Details:
- Customer: {{customerName}} (or "A Happy Customer")
- Rating: {{rating}}/5 stars
- Review: "{{reviewText}}"
- Product: {{productName}}

Brand Voice: {{brandVoice}}
Brand Colors: {{brandColors}}

Requirements:
1. Authentic quote presentation
2. Highlight key benefit from review
3. Product featured
4. "Join our family" CTA
5. Review platform badge (if applicable)

Tone: Grateful, {{brandVoice}}, and authentic.`,
    variables: ['customerName', 'rating', 'reviewText', 'productName', 'brandVoice', 'brandColors'],
    estimatedTime: '6-10 seconds',
    icon: 'quote',
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
