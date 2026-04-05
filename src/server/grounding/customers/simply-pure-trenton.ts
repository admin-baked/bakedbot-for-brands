/**
 * Simply Pure Trenton Ground Truth QA Set
 *
 * Single source of truth for evaluating Smokey's performance at Simply Pure Trenton.
 * Version 1.0 | April 2026
 *
 * Location: 1531 N Olden Avenue Ext, Trenton, NJ 08638
 * BakedBot URL: bakedbot.ai/simplypuretrenton
 * Email: simplypuretrenton@bakedbot.ai
 * Phone: (609) 388-7679
 *
 * Note: First Black-owned social equity dispensary in Ewing Township, NJ.
 */

import { GroundTruthQASet } from '@/types/ground-truth';

export const SIMPLY_PURE_TRENTON_BRAND_ID = 'simplypuretrenton';

export const simplyPureTrentonGroundTruth: GroundTruthQASet = {
    metadata: {
        dispensary: 'Simply Pure Trenton',
        brandId: SIMPLY_PURE_TRENTON_BRAND_ID,
        address: '1531 N Olden Avenue Ext, Trenton, NJ 08638',
        version: '1.0',
        created: '2026-04-04',
        last_updated: '2026-04-04',
        total_qa_pairs: 36,
        author: 'BakedBot AI',
    },

    categories: {
        store_information: {
            description: 'Basic dispensary information including location, licensing, and brand identity',
            qa_pairs: [
                {
                    id: 'SI-001',
                    question: 'Where is Simply Pure Trenton located?',
                    ideal_answer: 'Simply Pure Trenton is located at 1531 N Olden Avenue Ext, Trenton, NJ 08638, in Ewing Township, New Jersey.',
                    context: 'Store location and address',
                    intent: 'Find dispensary location',
                    keywords: ['1531 N Olden', 'Trenton', 'NJ 08638', 'Ewing Township'],
                    priority: 'high',
                },
                {
                    id: 'SI-002',
                    question: 'What are your hours?',
                    ideal_answer: 'We are open every day from 9:00 AM to 10:00 PM, including weekends and most holidays.',
                    context: 'Store hours',
                    intent: 'Plan a visit',
                    keywords: ['9 AM', '10 PM', 'daily', 'open', 'hours'],
                    priority: 'critical',
                },
                {
                    id: 'SI-003',
                    question: 'Is Simply Pure Trenton a licensed dispensary?',
                    ideal_answer: 'Yes. Simply Pure Trenton is a fully licensed adult-use cannabis dispensary regulated by the New Jersey Cannabis Regulatory Commission (NJCRC). We are proud to be Ewing Township\'s first Black-owned, social equity dispensary.',
                    context: 'Licensing and social equity identity',
                    intent: 'Verify legitimacy',
                    keywords: ['licensed', 'NJCRC', 'social equity', 'Black-owned', 'Ewing Township'],
                    priority: 'critical',
                },
                {
                    id: 'SI-004',
                    question: 'Do you offer curbside pickup or delivery?',
                    ideal_answer: 'Yes, we offer in-store pickup and curbside pickup. You can browse our menu and place orders online at simplypuretrenton.com.',
                    context: 'Pickup and ordering options',
                    intent: 'Order ahead',
                    keywords: ['curbside', 'pickup', 'online ordering', 'simplypuretrenton.com'],
                    priority: 'high',
                },
                {
                    id: 'SI-005',
                    question: 'What is the Pure Privilege Rewards Program?',
                    ideal_answer: 'Pure Privilege is our loyalty rewards program that gives you points on every purchase and exclusive member benefits. Download our app to manage your points and get a $1 pre-roll on your next visit.',
                    context: 'Loyalty program',
                    intent: 'Earn rewards',
                    keywords: ['Pure Privilege', 'loyalty', 'points', 'rewards', 'app'],
                    priority: 'high',
                },
                {
                    id: 'SI-006',
                    question: 'Do you offer first-time visitor discounts?',
                    ideal_answer: 'Yes! New customers get up to 25% off their first three visits — 15% off the 1st purchase, 20% off the 2nd, and 25% off the 3rd.',
                    context: 'New customer promotions',
                    intent: 'Save on first visit',
                    keywords: ['first visit', '15%', '20%', '25%', 'new customer'],
                    priority: 'high',
                },
            ],
        },

        age_and_id: {
            description: 'Age verification and ID requirements',
            qa_pairs: [
                {
                    id: 'AI-001',
                    question: 'How old do I need to be to purchase cannabis at Simply Pure Trenton?',
                    ideal_answer: 'You must be 21 years of age or older to purchase recreational cannabis in New Jersey. Please bring a valid government-issued photo ID.',
                    context: 'Age and ID requirements',
                    intent: 'Know entry requirements',
                    keywords: ['21', 'ID', 'government-issued', 'age', 'adult-use'],
                    priority: 'critical',
                },
                {
                    id: 'AI-002',
                    question: 'What forms of ID do you accept?',
                    ideal_answer: 'We accept valid government-issued photo ID: driver\'s license, state ID, passport, or military ID. All IDs must be current and unexpired.',
                    context: 'Accepted identification',
                    intent: 'Prepare for visit',
                    keywords: ['driver\'s license', 'state ID', 'passport', 'military ID', 'photo ID'],
                    priority: 'high',
                },
            ],
        },

        product_categories: {
            description: 'Products carried and categories available',
            qa_pairs: [
                {
                    id: 'PC-001',
                    question: 'What types of products do you carry?',
                    ideal_answer: 'We carry flower, vaporizers/cartridges, pre-rolls, edibles, concentrates, tinctures, topicals, and accessories from top New Jersey brands.',
                    context: 'Product categories overview',
                    intent: 'Browse what\'s available',
                    keywords: ['flower', 'vapes', 'pre-rolls', 'edibles', 'concentrates', 'tinctures', 'topicals'],
                    priority: 'high',
                },
                {
                    id: 'PC-002',
                    question: 'Do you carry indica, sativa, and hybrid strains?',
                    ideal_answer: 'Yes, we stock a curated selection of indica, sativa, and hybrid flower strains across all price tiers — from value options to top-shelf premium.',
                    context: 'Strain types',
                    intent: 'Find specific effect',
                    keywords: ['indica', 'sativa', 'hybrid', 'strains', 'flower'],
                    priority: 'high',
                },
                {
                    id: 'PC-003',
                    question: 'Do you carry Fernway products?',
                    ideal_answer: 'Yes! Fernway is one of our featured brands. We carry their vape cartridges and other products. Check our live menu for current availability.',
                    context: 'Featured brand availability',
                    intent: 'Find specific brand',
                    keywords: ['Fernway', 'vape', 'cartridge', 'brand'],
                    priority: 'medium',
                },
                {
                    id: 'PC-004',
                    question: 'What edibles do you have?',
                    ideal_answer: 'We carry a variety of edibles including gummies, chocolates, baked goods, and beverages. Potencies range from low-dose (2.5–5mg) to high-dose options. Check our online menu for today\'s full selection.',
                    context: 'Edibles selection',
                    intent: 'Browse edibles',
                    keywords: ['gummies', 'chocolate', 'baked goods', 'beverages', 'edibles', 'mg'],
                    priority: 'medium',
                },
                {
                    id: 'PC-005',
                    question: 'Do you have concentrates?',
                    ideal_answer: 'Yes, we carry concentrates including wax, live resin, rosin, and distillate. Great for experienced consumers. Ask a budtender for guidance on consumption methods.',
                    context: 'Concentrates selection',
                    intent: 'Find concentrates',
                    keywords: ['concentrates', 'wax', 'live resin', 'rosin', 'distillate'],
                    priority: 'medium',
                },
            ],
        },

        effect_based_recommendations: {
            description: 'Effect-based product recommendations for customers',
            qa_pairs: [
                {
                    id: 'EB-001',
                    question: 'What do you recommend for sleep?',
                    ideal_answer: 'For sleep we recommend indica or indica-dominant hybrids high in myrcene and linalool terpenes, as well as low-dose THC edibles (5–10mg) taken 1–2 hours before bed. CBD tinctures can also help with relaxation without strong psychoactive effects.',
                    context: 'Sleep recommendations',
                    intent: 'Find sleep aid',
                    keywords: ['sleep', 'indica', 'myrcene', 'linalool', 'edibles', 'CBD'],
                    priority: 'high',
                },
                {
                    id: 'EB-002',
                    question: 'What\'s good for anxiety or stress relief?',
                    ideal_answer: 'For anxiety or stress we recommend low-THC, high-CBD products or balanced 1:1 THC:CBD options. Hybrids with linalool or limonene terpenes are often calming. Start low and go slow, especially if you\'re new.',
                    context: 'Anxiety and stress relief',
                    intent: 'Find calming product',
                    keywords: ['anxiety', 'stress', 'CBD', '1:1', 'linalool', 'limonene', 'calming'],
                    priority: 'high',
                },
                {
                    id: 'EB-003',
                    question: 'What\'s good for energy and focus?',
                    ideal_answer: 'For daytime energy and focus we typically recommend sativa or sativa-dominant hybrids with terpinolene or limonene profiles. Vape cartridges offer quick onset for on-the-go use.',
                    context: 'Energy and focus recommendations',
                    intent: 'Find energizing product',
                    keywords: ['energy', 'focus', 'sativa', 'terpinolene', 'limonene', 'daytime'],
                    priority: 'high',
                },
                {
                    id: 'EB-004',
                    question: 'What do you recommend for pain relief?',
                    ideal_answer: 'For pain we often suggest indica-dominant strains with high myrcene, topicals for localized relief, or balanced THC:CBD tinctures. Concentrates can provide stronger relief for experienced consumers.',
                    context: 'Pain relief recommendations',
                    intent: 'Find pain relief product',
                    keywords: ['pain', 'indica', 'myrcene', 'topicals', 'tincture', 'THC:CBD'],
                    priority: 'high',
                },
            ],
        },

        pricing_and_deals: {
            description: 'Pricing tiers, deals, and promotions',
            qa_pairs: [
                {
                    id: 'PD-001',
                    question: 'What are your current deals?',
                    ideal_answer: 'Check our live menu at simplypuretrenton.com or ask a budtender for today\'s specials. We run regular promotions on flower, vapes, and edibles. New customers get up to 25% off their first three visits.',
                    context: 'Current deals and promotions',
                    intent: 'Save money',
                    keywords: ['deals', 'specials', 'promotions', 'discount', '25% off'],
                    priority: 'high',
                },
                {
                    id: 'PD-002',
                    question: 'Do you have a budget flower option?',
                    ideal_answer: 'Yes, we carry value flower options alongside premium selections. We\'ve had Green Joy 4.5g jars available at competitive price points. Check our current menu for exact pricing.',
                    context: 'Budget flower options',
                    intent: 'Find affordable flower',
                    keywords: ['budget', 'value', 'affordable', 'flower', 'Green Joy', '4.5g'],
                    priority: 'medium',
                },
                {
                    id: 'PD-003',
                    question: 'Do you price match competitors?',
                    ideal_answer: 'We work hard to keep our prices competitive with dispensaries in the area. Check our daily specials and loyalty program to maximize your savings.',
                    context: 'Competitive pricing',
                    intent: 'Understand pricing strategy',
                    keywords: ['price match', 'competitive', 'pricing', 'savings'],
                    priority: 'medium',
                },
            ],
        },

        compliance_and_safety: {
            description: 'Compliance, legal limits, and safety information',
            qa_pairs: [
                {
                    id: 'CS-001',
                    question: 'How much cannabis can I purchase at one time in New Jersey?',
                    ideal_answer: 'Adults 21+ may purchase up to 1 ounce (28.35g) of cannabis or its equivalent in other forms per transaction in New Jersey.',
                    context: 'Purchase limits',
                    intent: 'Know legal purchase limit',
                    keywords: ['1 ounce', '28.35g', 'purchase limit', 'New Jersey', 'per transaction'],
                    priority: 'critical',
                },
                {
                    id: 'CS-002',
                    question: 'Can I consume cannabis in your store?',
                    ideal_answer: 'No. New Jersey law does not permit on-site consumption at dispensaries. Please consume in private residences only and never drive under the influence.',
                    context: 'On-site consumption rules',
                    intent: 'Understand consumption rules',
                    keywords: ['consume', 'on-site', 'NJ law', 'private', 'drive'],
                    priority: 'critical',
                },
                {
                    id: 'CS-003',
                    question: 'Are your products lab tested?',
                    ideal_answer: 'Yes. All cannabis products sold in New Jersey must pass rigorous state-mandated lab testing for potency, pesticides, and contaminants before reaching our shelves.',
                    context: 'Product safety and lab testing',
                    intent: 'Verify product safety',
                    keywords: ['lab tested', 'potency', 'pesticides', 'contaminants', 'state-mandated'],
                    priority: 'high',
                },
            ],
        },

        ordering_and_pickup: {
            description: 'Online ordering, pickup, and app information',
            qa_pairs: [
                {
                    id: 'OP-001',
                    question: 'How do I place an order online?',
                    ideal_answer: 'Visit simplypuretrenton.com or our Dutchie menu to browse our live inventory and place an order for in-store or curbside pickup. You\'ll get a notification when it\'s ready.',
                    context: 'Online ordering process',
                    intent: 'Order ahead',
                    keywords: ['online', 'simplypuretrenton.com', 'Dutchie', 'pickup', 'order'],
                    priority: 'high',
                },
                {
                    id: 'OP-002',
                    question: 'Do you have a mobile app?',
                    ideal_answer: 'Yes! Download the Simply Pure Trenton app to manage your Pure Privilege points, get exclusive deals, and receive a $1 pre-roll on your next visit after download.',
                    context: 'Mobile app',
                    intent: 'Download app',
                    keywords: ['app', 'mobile', '$1 preroll', 'Pure Privilege', 'download'],
                    priority: 'medium',
                },
            ],
        },
    },

    evaluation_config: {
        scoring_weights: {
            keyword_coverage: 0.4,
            intent_match: 0.3,
            factual_accuracy: 0.2,
            tone_appropriateness: 0.1,
        },
        target_metrics: {
            overall_accuracy: 0.85,
            compliance_accuracy: 1.0,
            product_recommendations: 0.9,
            store_information: 0.95,
        },
        priority_levels: {
            critical: 'Must be 100% accurate — regulatory and safety content',
            high: 'Target 95% accuracy — frequently asked questions',
            medium: 'Target 85% accuracy — supplementary information',
        },
    },

    maintenance_schedule: {
        weekly: ['Review menu links for accuracy', 'Update deal/promo QA pairs'],
        monthly: ['Verify hours and address', 'Update featured brands'],
        quarterly: ['Full QA audit', 'Update compliance limits if NJ law changes'],
    },
};
