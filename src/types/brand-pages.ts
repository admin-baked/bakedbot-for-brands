/**
 * Brand Pages Types
 *
 * Editable content for brand/dispensary pages (About, Careers, Locations, Contact, Rewards/Loyalty, Press)
 */

import { Timestamp } from '@google-cloud/firestore';

export type BrandPageType =
    | 'about'       // About Us page
    | 'careers'     // Careers/Jobs page
    | 'locations'   // Locations page
    | 'contact'     // Contact page
    | 'loyalty'     // Rewards/Loyalty program page
    | 'press';      // Press & Media page

// ============================================================================
// About Page
// ============================================================================

export interface AboutPageContent {
    heroTitle?: string;
    heroDescription?: string;
    story?: string; // Rich text/markdown
    mission?: string;
    vision?: string;
    values: AboutValue[];
    teamMembers?: TeamMember[];
}

export interface AboutValue {
    id: string;
    icon: string; // Lucide icon name
    title: string;
    description: string;
}

export interface TeamMember {
    id: string;
    name: string;
    role: string;
    bio?: string;
    photo?: string;
    linkedin?: string;
}

// ============================================================================
// Careers Page
// ============================================================================

export interface CareersPageContent {
    heroTitle?: string;
    heroDescription?: string;
    applyEmail?: string;
    benefits: CareerBenefit[];
    openPositions: JobPosition[];
    culture?: string; // Rich text about company culture
}

export interface CareerBenefit {
    id: string;
    icon: string; // Lucide icon name
    title: string;
    description: string;
}

export interface JobPosition {
    id: string;
    title: string;
    department: string;
    location: string;
    type: 'full-time' | 'part-time' | 'contract';
    description: string;
    requirements: string[];
    responsibilities: string[];
    salary?: string;
    applyUrl?: string;
    isActive: boolean;
}

// ============================================================================
// Locations Page
// ============================================================================

export interface LocationsPageContent {
    heroTitle?: string;
    heroDescription?: string;
    locations: LocationInfo[];
}

export interface LocationInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    email?: string;
    hours?: string; // e.g., "Mon-Fri: 9am-9pm\nSat-Sun: 10am-8pm"
    mapUrl?: string;
    features?: string[]; // e.g., ['Pickup', 'Delivery', 'Curbside']
    isPrimary: boolean;
}

// ============================================================================
// Contact Page
// ============================================================================

export interface ContactPageContent {
    heroTitle?: string;
    heroDescription?: string;
    generalEmail?: string;
    supportEmail?: string;
    salesEmail?: string;
    phone?: string;
    address?: string;
    socialLinks?: SocialLinks;
    formEnabled: boolean;
    formRecipient?: string; // Email to receive form submissions
}

export interface SocialLinks {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
}

// ============================================================================
// Loyalty/Rewards Page
// ============================================================================

export interface LoyaltyPageContent {
    heroTitle?: string;
    heroDescription?: string;
    program: LoyaltyProgram;
    howItWorks: LoyaltyStep[];
    tiers: LoyaltyTier[];
    benefits: string[];
    termsUrl?: string;
}

export interface LoyaltyProgram {
    name: string;
    description: string;
    pointsPerDollar: number; // e.g., 1 point per $1 spent
    signupBonus?: number; // Points for signing up
}

export interface LoyaltyStep {
    id: string;
    step: number;
    icon: string; // Lucide icon name
    title: string;
    description: string;
}

export interface LoyaltyTier {
    id: string;
    name: string;
    pointsRequired: number;
    pointsMultiplier: number; // e.g., 1.0, 1.25, 1.5
    benefits: string[];
    color?: string; // Badge color
}

// ============================================================================
// Press Page
// ============================================================================

export interface PressPageContent {
    heroTitle?: string;
    heroDescription?: string;
    pressContact: PressContact;
    pressKit: PressKitItem[];
    recentNews?: PressRelease[];
}

export interface PressContact {
    name?: string;
    email: string;
    phone?: string;
}

export interface PressKitItem {
    id: string;
    title: string;
    description: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: string;
    type: 'logo' | 'fact-sheet' | 'brand-guide' | 'other';
}

export interface PressRelease {
    id: string;
    title: string;
    date: string;
    summary: string;
    url?: string;
}

// ============================================================================
// Combined Brand Page Document
// ============================================================================

export interface BrandPageDoc {
    orgId: string;
    pageType: BrandPageType;

    // Content (one of these will be populated based on pageType)
    aboutContent?: AboutPageContent;
    careersContent?: CareersPageContent;
    locationsContent?: LocationsPageContent;
    contactContent?: ContactPageContent;
    loyaltyContent?: LoyaltyPageContent;
    pressContent?: PressPageContent;

    // Metadata
    isPublished: boolean;
    lastEditedBy: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================================================
// Default Content Templates
// ============================================================================

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
    heroTitle: 'About Us',
    heroDescription: 'Learn more about our mission and values.',
    values: [
        {
            id: 'quality',
            icon: 'Award',
            title: 'Quality',
            description: 'Premium products, rigorously tested'
        },
        {
            id: 'community',
            icon: 'Users',
            title: 'Community',
            description: 'Supporting local communities'
        },
        {
            id: 'compliance',
            icon: 'ShieldCheck',
            title: 'Compliance',
            description: 'Strict regulatory adherence'
        },
        {
            id: 'care',
            icon: 'Heart',
            title: 'Care',
            description: 'Customer-first approach'
        }
    ],
    teamMembers: [],
};

export const DEFAULT_CAREERS_CONTENT: CareersPageContent = {
    heroTitle: 'Join Our Team',
    heroDescription: 'We\'re always looking for passionate people to help us grow.',
    benefits: [
        {
            id: 'growth',
            icon: 'TrendingUp',
            title: 'Growth',
            description: 'Career development and advancement opportunities'
        },
        {
            id: 'culture',
            icon: 'Users',
            title: 'Culture',
            description: 'Inclusive and supportive team environment'
        },
        {
            id: 'benefits',
            icon: 'Heart',
            title: 'Benefits',
            description: 'Competitive pay, health insurance, and employee discounts'
        },
        {
            id: 'impact',
            icon: 'Award',
            title: 'Impact',
            description: 'Help shape the future of cannabis retail'
        }
    ],
    openPositions: [],
};

export const DEFAULT_LOCATIONS_CONTENT: LocationsPageContent = {
    heroTitle: 'Our Locations',
    heroDescription: 'Find a location near you.',
    locations: [],
};

export const DEFAULT_CONTACT_CONTENT: ContactPageContent = {
    heroTitle: 'Contact Us',
    heroDescription: 'Have questions? We\'d love to hear from you.',
    formEnabled: true,
    socialLinks: {},
};

export const DEFAULT_LOYALTY_CONTENT: LoyaltyPageContent = {
    heroTitle: 'Rewards Program',
    heroDescription: 'Earn points with every purchase and redeem for exclusive rewards.',
    program: {
        name: 'Loyalty Rewards',
        description: 'Join free and start earning',
        pointsPerDollar: 1,
        signupBonus: 100,
    },
    howItWorks: [
        {
            id: 'join',
            step: 1,
            icon: 'Gift',
            title: 'Join Free',
            description: 'Sign up in-store or online - it\'s completely free'
        },
        {
            id: 'earn',
            step: 2,
            icon: 'TrendingUp',
            title: 'Earn Points',
            description: 'Earn 1 point for every $1 spent'
        },
        {
            id: 'redeem',
            step: 3,
            icon: 'Star',
            title: 'Redeem Rewards',
            description: 'Exchange points for discounts and exclusive offers'
        },
        {
            id: 'vip',
            step: 4,
            icon: 'Award',
            title: 'Get VIP Perks',
            description: 'Unlock exclusive benefits as you level up'
        }
    ],
    tiers: [
        {
            id: 'silver',
            name: 'Silver',
            pointsRequired: 0,
            pointsMultiplier: 1.0,
            benefits: ['Earn 1 point per $1', 'Birthday reward', 'Early access to sales']
        },
        {
            id: 'gold',
            name: 'Gold',
            pointsRequired: 500,
            pointsMultiplier: 1.25,
            benefits: ['Earn 1.25 points per $1', 'All Silver benefits', 'Exclusive monthly deals', 'Free delivery']
        },
        {
            id: 'platinum',
            name: 'Platinum',
            pointsRequired: 1000,
            pointsMultiplier: 1.5,
            benefits: ['Earn 1.5 points per $1', 'All Gold benefits', 'Priority support', 'VIP events']
        }
    ],
    benefits: [],
};

export const DEFAULT_PRESS_CONTENT: PressPageContent = {
    heroTitle: 'Press & Media',
    heroDescription: 'Press resources, media kits, and company information.',
    pressContact: {
        email: 'press@company.com',
    },
    pressKit: [
        {
            id: 'logo',
            title: 'Brand Logo Package',
            description: 'High-resolution logos in various formats',
            type: 'logo'
        },
        {
            id: 'fact-sheet',
            title: 'Company Fact Sheet',
            description: 'Key facts and statistics',
            type: 'fact-sheet'
        },
        {
            id: 'brand-guide',
            title: 'Brand Guidelines',
            description: 'Logo usage and brand standards',
            type: 'brand-guide'
        }
    ],
    recentNews: [],
};
