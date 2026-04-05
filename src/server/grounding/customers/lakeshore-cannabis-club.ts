/**
 * Lakeshore Cannabis Club Ground Truth QA Set
 *
 * Single source of truth for evaluating Smokey's performance at Lakeshore Cannabis Club.
 * Version 1.0 | April 2026
 *
 * Location: 1335 Lakeside Dr Unit 4, Romeoville, IL 60446
 * BakedBot URL: bakedbot.ai/lakeshorecannabis
 * Email: lakeshorecannabis@bakedbot.ai
 * Phone: (630) 755-4176
 */

import { GroundTruthQASet } from '@/types/ground-truth';

export const LAKESHORE_CANNABIS_CLUB_BRAND_ID = 'lakeshorecannabis';

export const lakeshoreCannabisClubGroundTruth: GroundTruthQASet = {
    metadata: {
        dispensary: 'Lakeshore Cannabis Club',
        brandId: LAKESHORE_CANNABIS_CLUB_BRAND_ID,
        address: '1335 Lakeside Dr Unit 4, Romeoville, IL 60446',
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
                    question: 'Where is Lakeshore Cannabis Club located?',
                    ideal_answer: 'Lakeshore Cannabis Club is located at 1335 Lakeside Dr, Unit 4, Romeoville, IL 60446 — right off Lakeside Drive in Will County.',
                    context: 'Store location and address',
                    intent: 'Find dispensary location',
                    keywords: ['1335 Lakeside Dr', 'Romeoville', 'IL 60446', 'Will County', 'Unit 4'],
                    priority: 'high',
                },
                {
                    id: 'SI-002',
                    question: 'What are your store hours?',
                    ideal_answer: 'We are open Monday through Sunday. Please check our website or call us at (630) 755-4176 for current hours as they may vary by season.',
                    context: 'Store hours',
                    intent: 'Plan a visit',
                    keywords: ['hours', 'open', 'Monday', 'Sunday', '(630) 755-4176'],
                    priority: 'critical',
                },
                {
                    id: 'SI-003',
                    question: 'Is Lakeshore Cannabis Club a licensed dispensary?',
                    ideal_answer: 'Yes. Lakeshore Cannabis Club is a fully licensed adult-use cannabis dispensary regulated by the Illinois Cannabis Regulation and Tax Act (CRTA) and overseen by the Illinois Department of Financial and Professional Regulation (IDFPR).',
                    context: 'Licensing and compliance',
                    intent: 'Verify legitimacy',
                    keywords: ['licensed', 'IDFPR', 'CRTA', 'Illinois', 'adult-use'],
                    priority: 'critical',
                },
                {
                    id: 'SI-004',
                    question: 'Do you offer online ordering or pickup?',
                    ideal_answer: 'Yes, you can browse our live menu and place orders for in-store or curbside pickup. Visit our website to order ahead and skip the wait.',
                    context: 'Online ordering and pickup',
                    intent: 'Order ahead',
                    keywords: ['online ordering', 'pickup', 'curbside', 'menu', 'order ahead'],
                    priority: 'high',
                },
                {
                    id: 'SI-005',
                    question: 'Do you have a loyalty program?',
                    ideal_answer: 'Yes! We have a Club loyalty rewards program. Earn points with every purchase and redeem them for discounts on future visits. Ask our staff to get enrolled.',
                    context: 'Loyalty program',
                    intent: 'Earn rewards',
                    keywords: ['loyalty', 'points', 'rewards', 'Club', 'discounts'],
                    priority: 'high',
                },
            ],
        },

        age_and_id: {
            description: 'Age verification and ID requirements',
            qa_pairs: [
                {
                    id: 'AI-001',
                    question: 'How old do I need to be to shop at Lakeshore Cannabis Club?',
                    ideal_answer: 'You must be 21 years or older for recreational cannabis in Illinois. Medical patients may qualify at 18+ with a valid Illinois medical cannabis registry card.',
                    context: 'Age requirements',
                    intent: 'Know entry requirements',
                    keywords: ['21', '18', 'medical', 'recreational', 'Illinois', 'ID'],
                    priority: 'critical',
                },
                {
                    id: 'AI-002',
                    question: 'What ID do you accept?',
                    ideal_answer: 'We accept any valid government-issued photo ID: Illinois driver\'s license, state ID, U.S. passport, or military ID. All must be current and not expired.',
                    context: 'Accepted identification',
                    intent: 'Prepare for visit',
                    keywords: ['driver\'s license', 'passport', 'military ID', 'state ID', 'photo ID'],
                    priority: 'high',
                },
            ],
        },

        product_categories: {
            description: 'Products carried and categories available',
            qa_pairs: [
                {
                    id: 'PC-001',
                    question: 'What products do you carry?',
                    ideal_answer: 'We carry a full range of cannabis products: flower, pre-rolls, vapes/cartridges, edibles (gummies, chocolates, beverages), concentrates, tinctures, topicals, and accessories from top Illinois brands.',
                    context: 'Product overview',
                    intent: 'Browse what\'s available',
                    keywords: ['flower', 'pre-rolls', 'vapes', 'edibles', 'concentrates', 'tinctures', 'topicals'],
                    priority: 'high',
                },
                {
                    id: 'PC-002',
                    question: 'Do you carry both recreational and medical products?',
                    ideal_answer: 'Yes. Lakeshore Cannabis Club serves both adult-use recreational customers (21+) and registered Illinois medical cannabis patients. Medical patients may have access to higher purchase limits.',
                    context: 'Recreational vs medical',
                    intent: 'Understand service options',
                    keywords: ['recreational', 'medical', 'adult-use', 'patient', 'purchase limits'],
                    priority: 'high',
                },
                {
                    id: 'PC-003',
                    question: 'What flower strains do you have?',
                    ideal_answer: 'We carry indica, sativa, and hybrid strains from top Illinois cultivators. Our selection includes value, mid-tier, and premium top-shelf options. Check our live menu for today\'s available strains.',
                    context: 'Flower and strain selection',
                    intent: 'Browse strains',
                    keywords: ['indica', 'sativa', 'hybrid', 'strains', 'flower', 'top-shelf'],
                    priority: 'high',
                },
                {
                    id: 'PC-004',
                    question: 'Do you carry concentrates?',
                    ideal_answer: 'Yes, we stock a solid range of concentrates including live resin, rosin, wax, shatter, and distillate cartridges. Great for experienced consumers seeking higher potency options.',
                    context: 'Concentrates selection',
                    intent: 'Find concentrates',
                    keywords: ['live resin', 'rosin', 'wax', 'shatter', 'distillate', 'concentrate'],
                    priority: 'medium',
                },
                {
                    id: 'PC-005',
                    question: 'What edibles do you have?',
                    ideal_answer: 'Our edibles selection includes gummies, chocolates, baked goods, beverages, and mints in a range of THC potencies from low-dose (2.5mg) to high-dose options. Check our menu for current availability.',
                    context: 'Edibles selection',
                    intent: 'Browse edibles',
                    keywords: ['gummies', 'chocolate', 'beverages', 'mints', 'edibles', '2.5mg'],
                    priority: 'medium',
                },
            ],
        },

        effect_based_recommendations: {
            description: 'Effect-based product recommendations',
            qa_pairs: [
                {
                    id: 'EB-001',
                    question: 'What do you recommend for sleep?',
                    ideal_answer: 'For sleep, we recommend indica or indica-dominant hybrids with myrcene and linalool terpenes, and low-dose THC edibles (5–10mg) taken 45–90 minutes before bed. CBD products can also help you wind down.',
                    context: 'Sleep recommendations',
                    intent: 'Find sleep aid',
                    keywords: ['sleep', 'indica', 'myrcene', 'linalool', 'edibles', 'CBD'],
                    priority: 'high',
                },
                {
                    id: 'EB-002',
                    question: 'What\'s good for relaxation or stress?',
                    ideal_answer: 'For relaxation or stress we often recommend balanced THC:CBD products, indica-dominant hybrids with linalool terpenes, or CBD tinctures for a subtle calming effect without strong psychoactivity.',
                    context: 'Relaxation and stress',
                    intent: 'Find calming product',
                    keywords: ['relax', 'stress', 'CBD', '1:1', 'linalool', 'calming'],
                    priority: 'high',
                },
                {
                    id: 'EB-003',
                    question: 'What do you recommend for creativity and energy?',
                    ideal_answer: 'For creativity and energy we often point customers to sativa or sativa-dominant hybrids with limonene or terpinolene terpene profiles. Vape cartridges are popular for fast onset.',
                    context: 'Energy and creativity',
                    intent: 'Find uplifting product',
                    keywords: ['energy', 'creativity', 'sativa', 'limonene', 'terpinolene', 'vape'],
                    priority: 'high',
                },
                {
                    id: 'EB-004',
                    question: 'What\'s a good option for first-time cannabis users?',
                    ideal_answer: 'For first-timers we recommend starting with a low-dose edible (2.5–5mg THC), a high-CBD/low-THC product, or a mild hybrid flower. Start slow, wait at least 2 hours before taking more, and have water nearby.',
                    context: 'First-time user recommendations',
                    intent: 'Get beginner advice',
                    keywords: ['first time', 'beginner', 'low-dose', '2.5mg', '5mg', 'start slow', 'CBD'],
                    priority: 'high',
                },
            ],
        },

        pricing_and_deals: {
            description: 'Pricing, deals, and promotions',
            qa_pairs: [
                {
                    id: 'PD-001',
                    question: 'What daily specials do you have?',
                    ideal_answer: 'We run rotating daily specials on popular categories like flower, vapes, and edibles. Check our live menu or follow us on social media for the latest deals.',
                    context: 'Daily specials and deals',
                    intent: 'Save money',
                    keywords: ['specials', 'deals', 'promotions', 'daily', 'discount'],
                    priority: 'high',
                },
                {
                    id: 'PD-002',
                    question: 'Do you offer senior or veteran discounts?',
                    ideal_answer: 'Yes, we offer discounts for seniors and veterans. Please bring valid documentation on your visit and our budtenders will apply your discount at checkout.',
                    context: 'Discount programs',
                    intent: 'Apply for discount',
                    keywords: ['senior', 'veteran', 'discount', 'documentation'],
                    priority: 'medium',
                },
            ],
        },

        compliance_and_safety: {
            description: 'Compliance, legal limits, and safety information',
            qa_pairs: [
                {
                    id: 'CS-001',
                    question: 'How much cannabis can I buy at once in Illinois?',
                    ideal_answer: 'Illinois residents 21+ may purchase up to 30 grams of cannabis flower, 500mg of THC in cannabis-infused products, and 5 grams of cannabis concentrate per transaction. Non-Illinois residents have lower limits (15g flower).',
                    context: 'Illinois purchase limits',
                    intent: 'Know purchase limits',
                    keywords: ['30 grams', '500mg', '5 grams', 'Illinois resident', 'purchase limit'],
                    priority: 'critical',
                },
                {
                    id: 'CS-002',
                    question: 'Can I consume cannabis at the dispensary?',
                    ideal_answer: 'No. Illinois law does not permit on-site consumption at most dispensaries. Please consume in a private residence and never drive under the influence of cannabis.',
                    context: 'Consumption rules',
                    intent: 'Understand consumption rules',
                    keywords: ['consume', 'on-site', 'Illinois', 'private residence', 'drive'],
                    priority: 'critical',
                },
                {
                    id: 'CS-003',
                    question: 'Are your products tested for safety?',
                    ideal_answer: 'Yes. All cannabis products sold in Illinois must pass state-required laboratory testing for potency, residual solvents, pesticides, heavy metals, and microbials before they reach our shelves.',
                    context: 'Product safety testing',
                    intent: 'Verify safety',
                    keywords: ['lab tested', 'potency', 'pesticides', 'heavy metals', 'solvents', 'Illinois'],
                    priority: 'high',
                },
            ],
        },

        ordering_and_pickup: {
            description: 'Online ordering and in-store pickup',
            qa_pairs: [
                {
                    id: 'OP-001',
                    question: 'How do I place an order online?',
                    ideal_answer: 'Visit our website to browse our live menu and place an order for in-store or curbside pickup. You\'ll receive a confirmation when your order is ready.',
                    context: 'Online ordering',
                    intent: 'Order ahead',
                    keywords: ['online', 'menu', 'pickup', 'curbside', 'confirmation'],
                    priority: 'high',
                },
                {
                    id: 'OP-002',
                    question: 'How can I contact the store?',
                    ideal_answer: 'You can reach us by phone at (630) 755-4176, or visit us at 1335 Lakeside Dr, Unit 4, Romeoville, IL 60446.',
                    context: 'Contact information',
                    intent: 'Get in touch',
                    keywords: ['(630) 755-4176', 'phone', 'contact', '1335 Lakeside Dr'],
                    priority: 'high',
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
        weekly: ['Review menu links for accuracy', 'Update specials/deal QA pairs'],
        monthly: ['Verify address and contact info', 'Update featured brands'],
        quarterly: ['Full QA audit', 'Update compliance limits if Illinois law changes'],
    },
};
