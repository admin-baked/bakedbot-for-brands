/**
 * Hero Templates Library
 *
 * Pre-built hero templates for common use cases.
 */

import type { Hero, HeroStyle, HeroPurchaseModel } from '@/types/heroes';

export interface HeroTemplate {
  id: string;
  name: string;
  description: string;
  category: 'dispensary' | 'brand' | 'event' | 'medical' | 'luxury';
  thumbnail?: string;
  template: Partial<Omit<Hero, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>;
}

export const HERO_TEMPLATES: HeroTemplate[] = [
  {
    id: 'premium-flower',
    name: 'Premium Flower Brand',
    description: 'Perfect for high-quality flower brands emphasizing quality and local pickup',
    category: 'brand',
    template: {
      tagline: 'Premium Cannabis Flower',
      description: 'Experience the finest flower, grown with care and tested for quality.',
      primaryColor: '#16a34a',
      style: 'professional',
      purchaseModel: 'local_pickup',
      verified: true,
      primaryCta: {
        label: 'Find Near Me',
        action: 'find_near_me',
      },
      secondaryCta: {
        label: 'View Products',
        action: 'shop_now',
      },
      stats: {
        yearsInBusiness: 5,
        certifications: ['Lab Tested', 'Organic'],
      },
    },
  },
  {
    id: 'local-dispensary',
    name: 'Neighborhood Dispensary',
    description: 'Welcoming design for community-focused dispensaries',
    category: 'dispensary',
    template: {
      tagline: 'Your Neighborhood Cannabis Shop',
      description: 'Discover our curated selection of premium products from trusted brands.',
      primaryColor: '#059669',
      style: 'default',
      purchaseModel: 'hybrid',
      verified: true,
      primaryCta: {
        label: 'Shop Now',
        action: 'shop_now',
      },
      stats: {
        products: 200,
        rating: 4.8,
      },
    },
  },
  {
    id: 'luxury-brand',
    name: 'Luxury Cannabis',
    description: 'Sophisticated design for premium, high-end brands',
    category: 'luxury',
    template: {
      tagline: 'Elevated Cannabis Experience',
      description: 'Artisanal products crafted for the discerning connoisseur.',
      primaryColor: '#7c3aed',
      style: 'professional',
      purchaseModel: 'online_only',
      shipsNationwide: true,
      verified: true,
      primaryCta: {
        label: 'Shop Collection',
        action: 'shop_now',
      },
      stats: {
        rating: 4.9,
        awards: ['Best Premium Brand 2025'],
      },
    },
  },
  {
    id: 'medical-focus',
    name: 'Medical Dispensary',
    description: 'Professional design emphasizing healthcare and wellness',
    category: 'medical',
    template: {
      tagline: 'Medical Cannabis Solutions',
      description: 'Compassionate care and high-quality medical cannabis for patients.',
      primaryColor: '#0891b2',
      style: 'professional',
      purchaseModel: 'local_pickup',
      verified: true,
      primaryCta: {
        label: 'Book Consultation',
        action: 'custom',
        url: '/consultation',
      },
      secondaryCta: {
        label: 'View Products',
        action: 'shop_now',
      },
      stats: {
        yearsInBusiness: 10,
        certifications: ['Medical License', 'Lab Tested'],
      },
    },
  },
  {
    id: '420-event',
    name: '4/20 Event Promo',
    description: 'Bold design for 4/20 and special events',
    category: 'event',
    template: {
      tagline: '4/20 Sale - Up to 50% Off',
      description: 'Celebrate with exclusive deals on your favorite products!',
      primaryColor: '#a855f7',
      style: 'bold',
      purchaseModel: 'hybrid',
      verified: true,
      primaryCta: {
        label: 'Shop Deals',
        action: 'shop_now',
      },
      scheduledActivation: {
        startDate: new Date('2026-04-19T00:00:00'),
        endDate: new Date('2026-04-21T23:59:59'),
        autoDeactivate: true,
      },
    },
  },
  {
    id: 'edibles-brand',
    name: 'Gourmet Edibles',
    description: 'Appetizing design for edibles brands',
    category: 'brand',
    template: {
      tagline: 'Gourmet Cannabis Edibles',
      description: 'Delicious treats infused with premium cannabis. Taste the difference.',
      primaryColor: '#ea580c',
      style: 'minimal',
      purchaseModel: 'local_pickup',
      verified: true,
      primaryCta: {
        label: 'Find in Store',
        action: 'find_near_me',
      },
      stats: {
        certifications: ['Organic Ingredients', 'Lab Tested'],
        awards: ['Best Edibles 2025'],
      },
    },
  },
  {
    id: 'sustainable-brand',
    name: 'Eco-Friendly Cannabis',
    description: 'Natural design for sustainable, organic brands',
    category: 'brand',
    template: {
      tagline: 'Sustainably Grown Cannabis',
      description: 'Earth-friendly cultivation practices for pure, natural products.',
      primaryColor: '#059669',
      style: 'default',
      purchaseModel: 'local_pickup',
      verified: true,
      primaryCta: {
        label: 'Learn More',
        action: 'custom',
        url: '/sustainability',
      },
      secondaryCta: {
        label: 'Shop Products',
        action: 'shop_now',
      },
      stats: {
        certifications: ['Organic', 'Carbon Neutral', 'Sustainable Farming'],
      },
    },
  },
  {
    id: 'express-delivery',
    name: 'Fast Delivery Service',
    description: 'Modern design for delivery-focused dispensaries',
    category: 'dispensary',
    template: {
      tagline: 'Cannabis Delivered Fast',
      description: 'Order online, delivered to your door in under an hour.',
      primaryColor: '#3b82f6',
      style: 'bold',
      purchaseModel: 'online_only',
      verified: true,
      primaryCta: {
        label: 'Order Now',
        action: 'shop_now',
      },
      stats: {
        products: 150,
      },
    },
  },
  {
    id: 'craft-cannabis',
    name: 'Craft Cannabis',
    description: 'Artisanal design for small-batch, craft growers',
    category: 'brand',
    template: {
      tagline: 'Small Batch, Big Quality',
      description: 'Handcrafted cannabis grown in small batches for maximum potency and flavor.',
      primaryColor: '#92400e',
      style: 'professional',
      purchaseModel: 'local_pickup',
      verified: true,
      primaryCta: {
        label: 'Find Retailers',
        action: 'find_near_me',
      },
      stats: {
        yearsInBusiness: 3,
        certifications: ['Craft Certified', 'Lab Tested'],
      },
    },
  },
  {
    id: 'newcomer-welcome',
    name: 'Newcomer Friendly',
    description: 'Approachable design for cannabis newcomers',
    category: 'dispensary',
    template: {
      tagline: 'New to Cannabis? We\'ve Got You',
      description: 'Expert guidance and premium products in a welcoming environment.',
      primaryColor: '#10b981',
      style: 'default',
      purchaseModel: 'hybrid',
      verified: true,
      primaryCta: {
        label: 'Visit Us',
        action: 'find_near_me',
      },
      secondaryCta: {
        label: 'Learn More',
        action: 'custom',
        url: '/education',
      },
    },
  },
];

/**
 * Get all templates
 */
export function getAllTemplates(): HeroTemplate[] {
  return HERO_TEMPLATES;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: HeroTemplate['category']): HeroTemplate[] {
  return HERO_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): HeroTemplate | undefined {
  return HERO_TEMPLATES.find(t => t.id === id);
}

/**
 * Apply template to create new hero
 */
export function applyTemplate(
  templateId: string,
  brandName: string,
  orgId: string,
  overrides?: Partial<Hero>
): Partial<Hero> {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  return {
    ...template.template,
    brandName,
    orgId,
    active: false,
    displayOrder: 0,
    ...overrides,
  };
}
