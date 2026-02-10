/**
 * Thrive Syracuse Ground Truth QA Set
 *
 * Single source of truth for evaluating Smokey's performance at Thrive Syracuse.
 * Version 1.0 | January 2026
 *
 * Owner: Ade Adeyemi
 * Location: 3065 Erie Blvd E, Syracuse, NY 13224
 * BakedBot URL: bakedbot.ai/thrivesyracuse
 * Email: thrivesyracuse@bakedbot.ai
 */

import { GroundTruthQASet } from '@/types/ground-truth';

export const THRIVE_SYRACUSE_BRAND_ID = 'thrivesyracuse';

export const thriveGroundTruth: GroundTruthQASet = {
    metadata: {
        dispensary: 'Thrive Syracuse',
        brandId: THRIVE_SYRACUSE_BRAND_ID,
        address: '3065 Erie Blvd E, Syracuse, NY 13224',
        version: '1.0',
        created: '2026-01-22',
        last_updated: '2026-02-09',
        total_qa_pairs: 34,
        author: 'BakedBot AI',
    },

    categories: {
        store_information: {
            description: 'Basic dispensary information including location, licensing, and brand identity',
            qa_pairs: [
                {
                    id: 'SI-001',
                    question: 'Where is Thrive Syracuse located?',
                    ideal_answer: 'Thrive Syracuse is located at 3065 Erie Blvd E, Syracuse, NY 13224, off Exit 16S on I-690.',
                    context: 'Store location and address',
                    intent: 'Find dispensary location',
                    keywords: ['3065 Erie Blvd E', 'Syracuse', 'NY 13224', 'Exit 16S', 'I-690'],
                    priority: 'high',
                },
                {
                    id: 'SI-002',
                    question: 'What areas does Thrive Syracuse serve?',
                    ideal_answer: 'We serve Syracuse and surrounding areas including Eastwood, Salt Springs, Meadowbrook, DeWitt, East Syracuse, and the wider Syracuse region.',
                    context: 'Service area coverage',
                    intent: 'Understand delivery/service area',
                    keywords: ['Eastwood', 'Salt Springs', 'Meadowbrook', 'DeWitt', 'East Syracuse'],
                    priority: 'medium',
                },
                {
                    id: 'SI-003',
                    question: 'Is Thrive Syracuse a licensed dispensary?',
                    ideal_answer: "Yes, Thrive Syracuse is a fully licensed adult-use cannabis dispensary regulated by the New York State Office of Cannabis Management (OCM). Look for our NYS Dispensary Verification Tool posted at our entrance.",
                    context: 'Licensing and compliance',
                    intent: 'Verify legitimacy',
                    keywords: ['licensed', 'OCM', 'NYS Dispensary Verification Tool', 'regulated'],
                    priority: 'critical',
                },
                {
                    id: 'SI-004',
                    question: 'What makes Thrive Syracuse different from other dispensaries?',
                    ideal_answer: "Thrive Syracuse is committed to community reinvestment, reinvesting the majority of profits locally. We focus on quality products, customer education, and building a stronger future for Syracuse. Our knowledgeable staff and community-first approach set us apart.",
                    context: 'Brand differentiation',
                    intent: 'Understand unique value proposition',
                    keywords: ['community reinvestment', 'customer education', 'local', 'quality'],
                    priority: 'medium',
                },
                {
                    id: 'SI-005',
                    question: 'What are your hours?',
                    ideal_answer: 'Thrive Syracuse is open Monday through Saturday from 10am to 8pm, and Sunday from 11am to 6pm. Holiday hours may vary - check our website or call ahead for holiday schedules.',
                    context: 'Store hours',
                    intent: 'Plan a visit',
                    keywords: ['hours', 'open', 'Monday', 'Saturday', '10am', '8pm', 'Sunday', '11am', '6pm'],
                    priority: 'high',
                },
                {
                    id: 'SI-006',
                    question: 'When do you close?',
                    ideal_answer: 'We close at 8pm Monday through Saturday, and 6pm on Sunday. Our last order is accepted 15 minutes before closing.',
                    context: 'Closing time',
                    intent: 'Plan a visit',
                    keywords: ['close', '8pm', '6pm', 'last order'],
                    priority: 'high',
                },
                {
                    id: 'SI-007',
                    question: 'Are you open on Sunday?',
                    ideal_answer: 'Yes! We are open on Sunday from 11am to 6pm.',
                    context: 'Sunday hours',
                    intent: 'Plan weekend visit',
                    keywords: ['Sunday', 'open', '11am', '6pm', 'weekend'],
                    priority: 'high',
                },
            ],
        },

        age_and_id: {
            description: 'Age verification and ID requirements per NY law',
            qa_pairs: [
                {
                    id: 'AI-001',
                    question: 'How old do I need to be to shop at Thrive Syracuse?',
                    ideal_answer: 'You must be 21 years of age or older with a valid government-issued ID to purchase adult-use cannabis products at Thrive Syracuse.',
                    context: 'NY cannabis law requirements',
                    intent: 'Verify age requirements',
                    keywords: ['21', 'valid ID', 'government-issued'],
                    priority: 'critical',
                },
                {
                    id: 'AI-002',
                    question: 'What ID do I need to bring?',
                    ideal_answer: "Bring a valid government-issued photo ID such as a driver's license, state ID, or passport. We verify ID at check-in and again at point of sale.",
                    context: 'ID verification process',
                    intent: 'Prepare for visit',
                    keywords: ["driver's license", 'state ID', 'passport', 'photo ID'],
                    priority: 'high',
                },
            ],
        },

        product_categories: {
            description: 'Overview of product types available',
            qa_pairs: [
                {
                    id: 'PC-001',
                    question: 'What types of products do you carry?',
                    ideal_answer: 'We carry a full range of cannabis products including flower, pre-rolls, infused pre-rolls, vape pens, concentrates, edibles, drinks, wellness products (tinctures, topicals), and accessories. All products are sourced from trusted licensed New York State brands.',
                    context: 'Product category overview',
                    intent: 'Browse product options',
                    keywords: ['flower', 'pre-rolls', 'vapes', 'edibles', 'concentrates', 'tinctures', 'topicals'],
                    priority: 'high',
                },
                {
                    id: 'PC-002',
                    question: 'Do you sell flower?',
                    ideal_answer: 'Yes, we have a curated selection of premium cannabis flower from licensed NY cultivators. Our flower options include various strains across indica, sativa, and hybrid categories, with detailed potency and terpene information available.',
                    context: 'Flower category',
                    intent: 'Find flower products',
                    keywords: ['flower', 'strains', 'indica', 'sativa', 'hybrid', 'potency', 'terpene'],
                    priority: 'high',
                },
                {
                    id: 'PC-003',
                    question: 'What edibles do you have?',
                    ideal_answer: 'Our edibles selection includes gummies, chocolates, chews, and infused drinks. We carry products from trusted NY brands with clearly labeled THC content and serving sizes. For new users, we recommend starting with 2.5-5mg servings.',
                    context: 'Edibles category',
                    intent: 'Find edible products',
                    keywords: ['gummies', 'chocolates', 'drinks', 'THC content', 'serving size', '2.5mg', '5mg'],
                    priority: 'high',
                },
                {
                    id: 'PC-004',
                    question: 'Do you carry vape products?',
                    ideal_answer: 'Yes, we carry vape pens, cartridges, and all-in-one disposables. Options include distillate and live resin varieties. All vape products are lab-tested for purity and safety.',
                    context: 'Vape category',
                    intent: 'Find vape products',
                    keywords: ['vape pens', 'cartridges', 'disposables', 'distillate', 'live resin', 'lab-tested'],
                    priority: 'high',
                },
                {
                    id: 'PC-005',
                    question: 'Do you have concentrates?',
                    ideal_answer: 'Yes, our concentrate selection includes badder, live resin, and live rosin products. These are higher-potency options best suited for experienced consumers.',
                    context: 'Concentrates category',
                    intent: 'Find concentrate products',
                    keywords: ['concentrates', 'badder', 'live resin', 'live rosin', 'high potency'],
                    priority: 'medium',
                },
                {
                    id: 'PC-006',
                    question: 'What wellness products do you offer?',
                    ideal_answer: 'Our wellness category includes tinctures (both flavored and unflavored) and topicals like balms. These products are great for those seeking targeted relief without smoking.',
                    context: 'Wellness category',
                    intent: 'Find non-smokable options',
                    keywords: ['tinctures', 'topicals', 'balms', 'targeted relief'],
                    priority: 'medium',
                },
            ],
        },

        effect_based_recommendations: {
            description: 'Product recommendations based on desired effects',
            qa_pairs: [
                {
                    id: 'ER-001',
                    question: 'What do you recommend for sleep?',
                    ideal_answer: 'For sleep, I recommend looking at indica-dominant products or those with calming terpene profiles like myrcene and linalool. Our edibles with slower onset can provide longer-lasting effects through the night. Start with a low dose 1-2 hours before bed.',
                    context: 'Sleep/relaxation recommendations',
                    intent: 'Find products for sleep',
                    keywords: ['sleep', 'indica', 'myrcene', 'linalool', 'calming', 'relaxing'],
                    priority: 'high',
                },
                {
                    id: 'ER-002',
                    question: "What's good for relaxation?",
                    ideal_answer: "For relaxation, look for products labeled with effects like 'calm' or 'relaxed.' Indica strains and products with myrcene-dominant terpene profiles tend to promote relaxation. Tinctures and edibles offer a more gradual, body-focused experience.",
                    context: 'Relaxation recommendations',
                    intent: 'Find relaxing products',
                    keywords: ['relaxation', 'calm', 'indica', 'myrcene', 'body'],
                    priority: 'high',
                },
                {
                    id: 'ER-003',
                    question: 'I want something for energy and focus',
                    ideal_answer: "For energy and focus, consider sativa-dominant products or those with uplifting terpene profiles featuring limonene or pinene. Look for effects labeled 'energetic,' 'focused,' or 'uplifted.' These are great for daytime use.",
                    context: 'Energy/focus recommendations',
                    intent: 'Find energizing products',
                    keywords: ['energy', 'focus', 'sativa', 'limonene', 'pinene', 'uplifting', 'daytime'],
                    priority: 'high',
                },
                {
                    id: 'ER-004',
                    question: 'What do you have for creativity?',
                    ideal_answer: "For creativity, sativa or sativa-hybrid products often work well. Look for products with effects labeled 'creative,' 'inspired,' or 'happy.' Strains with terpinolene or limonene tend to promote a cerebral, creative mindset.",
                    context: 'Creativity recommendations',
                    intent: 'Find creativity-enhancing products',
                    keywords: ['creativity', 'creative', 'inspired', 'sativa', 'terpinolene', 'cerebral'],
                    priority: 'medium',
                },
                {
                    id: 'ER-005',
                    question: 'What should a first-time user try?',
                    ideal_answer: 'For first-time users, I recommend starting with low-dose edibles (2.5-5mg THC), a low-THC flower, or a balanced CBD:THC product. Start low, go slow, and wait at least 2 hours before consuming more edibles. Our staff can help guide you to the right starting point.',
                    context: 'New user recommendations',
                    intent: 'First-time purchase guidance',
                    keywords: ['first-time', 'beginner', 'low dose', '2.5mg', 'start low', 'go slow'],
                    priority: 'critical',
                },
            ],
        },

        brands_and_products: {
            description: 'Specific brand inquiries',
            qa_pairs: [
                {
                    id: 'BP-001',
                    question: 'What brands do you carry?',
                    ideal_answer: "We carry a variety of trusted licensed New York State brands. Popular brands in our selection include Off Hours, Kiefer's, and other NY-licensed producers. Our selection rotates based on availability, so check our current menu for the latest offerings.",
                    context: 'Brand availability',
                    intent: 'Find specific brands',
                    keywords: ['Off Hours', "Kiefer's", 'NY brands', 'licensed'],
                    priority: 'high',
                },
                {
                    id: 'BP-002',
                    question: 'Do you have Off Hours products?',
                    ideal_answer: "Yes, we carry Off Hours products when available. They're known for quality and competitive pricing. Check our current menu for availability, as stock varies.",
                    context: 'Specific brand inquiry',
                    intent: 'Find Off Hours products',
                    keywords: ['Off Hours'],
                    priority: 'medium',
                },
                {
                    id: 'BP-003',
                    question: "Do you have Kiefer's?",
                    ideal_answer: "Yes, we carry Kiefer's products. Customers appreciate their quality and value. Check our current menu for specific products in stock.",
                    context: 'Specific brand inquiry',
                    intent: "Find Kiefer's products",
                    keywords: ["Kiefer's", 'Kiefers'],
                    priority: 'medium',
                },
            ],
        },

        pricing_and_deals: {
            description: 'Pricing, promotions, and payment information',
            qa_pairs: [
                {
                    id: 'PD-001',
                    question: 'Do you have any deals or specials?',
                    ideal_answer: "Yes! We regularly run promotions and special offers. Check our menu for current deals marked as specials. We're known for competitive pricing - customers often find our prices on popular brands like Kiefer's and Off Hours are among the best in the area.",
                    context: 'Promotions and pricing',
                    intent: 'Find deals',
                    keywords: ['deals', 'specials', 'promotions', 'competitive pricing'],
                    priority: 'high',
                },
                {
                    id: 'PD-002',
                    question: 'What payment methods do you accept?',
                    ideal_answer: 'We accept cash and debit cards. ATM is available on-site. Due to federal banking regulations, credit cards are not accepted at cannabis dispensaries.',
                    context: 'Payment options',
                    intent: 'Prepare for payment',
                    keywords: ['cash', 'debit', 'ATM', 'payment'],
                    priority: 'high',
                },
                {
                    id: 'PD-003',
                    question: 'Do you have a loyalty program?',
                    ideal_answer: 'Yes! Thrive Syracuse has a rewards program where you earn 1 point for every $1 spent. Earn 100 points and get $5 off your next purchase. Sign up at the register - just provide your phone number and start earning rewards immediately on your first purchase.',
                    context: 'Loyalty program',
                    intent: 'Learn about rewards',
                    keywords: ['loyalty', 'rewards', 'points', '100 points', '$5 off', 'phone number'],
                    priority: 'high',
                },
                {
                    id: 'PD-004',
                    question: 'How do I check my rewards balance?',
                    ideal_answer: 'You can check your rewards balance at the register or ask any staff member. Just provide your phone number and we can look up your current points balance and any available rewards.',
                    context: 'Rewards balance check',
                    intent: 'Check loyalty status',
                    keywords: ['rewards', 'balance', 'points', 'phone number'],
                    priority: 'medium',
                },
            ],
        },

        compliance_and_safety: {
            description: 'Regulatory compliance and product safety information',
            qa_pairs: [
                {
                    id: 'CS-001',
                    question: 'Are your products tested?',
                    ideal_answer: 'Yes, all our products are lab-tested and fully compliant with New York State regulations. Every product includes a QR code or link to its Certificate of Analysis (CoA) showing lab test results for potency, contaminants, and purity.',
                    context: 'Product testing and safety',
                    intent: 'Verify product safety',
                    keywords: ['lab-tested', 'Certificate of Analysis', 'CoA', 'compliant', 'tested'],
                    priority: 'critical',
                },
                {
                    id: 'CS-002',
                    question: 'How do I know if a dispensary is legal?',
                    ideal_answer: 'Look for the NYS Dispensary Verification Tool posted near the entrance - all licensed dispensaries are required to display it. You can scan the QR code to verify the dispensary is on the official OCM list. Thrive Syracuse is a fully licensed, legal dispensary.',
                    context: 'Dispensary verification',
                    intent: 'Verify legitimacy',
                    keywords: ['NYS Dispensary Verification Tool', 'licensed', 'legal', 'OCM'],
                    priority: 'critical',
                },
                {
                    id: 'CS-003',
                    question: 'What are the possession limits in New York?',
                    ideal_answer: 'In New York, adults 21+ can legally possess up to 3 ounces of cannabis flower or up to 24 grams of concentrated cannabis for personal use.',
                    context: 'NY cannabis laws',
                    intent: 'Understand legal limits',
                    keywords: ['3 ounces', '24 grams', 'possession', 'legal limit'],
                    priority: 'critical',
                },
                {
                    id: 'CS-004',
                    question: 'Where can I consume cannabis?',
                    ideal_answer: 'In New York, adults may smoke or vape cannabis wherever tobacco smoking is allowed under smoke-free air laws, with some exceptions. You cannot consume in vehicles, on school grounds, or in most indoor public spaces. Please consume responsibly.',
                    context: 'Consumption laws',
                    intent: 'Understand where to consume',
                    keywords: ['consume', 'smoke', 'vape', 'smoke-free', 'responsible'],
                    priority: 'high',
                },
            ],
        },

        ordering_and_delivery: {
            description: 'Online ordering and delivery information',
            qa_pairs: [
                {
                    id: 'OD-001',
                    question: 'Can I order online?',
                    ideal_answer: 'Yes, you can browse our menu and place orders online for in-store pickup. This saves time and ensures your products are ready when you arrive.',
                    context: 'Online ordering',
                    intent: 'Order ahead',
                    keywords: ['online', 'order', 'pickup', 'menu'],
                    priority: 'high',
                },
                {
                    id: 'OD-002',
                    question: 'Do you offer delivery?',
                    ideal_answer: 'Delivery is coming to Thrive Syracuse in Spring 2026! We are finalizing our delivery zone which will cover Syracuse and surrounding areas within 15 miles. Sign up for our text alerts to be notified when delivery launches.',
                    context: 'Delivery service',
                    intent: 'Get delivery',
                    keywords: ['delivery', 'Spring 2026', '15 miles', 'text alerts'],
                    priority: 'high',
                },
                {
                    id: 'OD-003',
                    question: 'How do I sign up for text alerts?',
                    ideal_answer: 'Text THRIVE to 833-420-CANN (2266) to join our text alert list. You will get exclusive deals, new product drops, and be first to know when delivery launches.',
                    context: 'SMS signup',
                    intent: 'Join marketing list',
                    keywords: ['text', 'alerts', 'SMS', 'THRIVE', '833-420-CANN'],
                    priority: 'medium',
                },
            ],
        },
    },

    evaluation_config: {
        scoring_weights: {
            keyword_coverage: 0.40,
            intent_match: 0.30,
            factual_accuracy: 0.20,
            tone_appropriateness: 0.10,
        },
        target_metrics: {
            overall_accuracy: 0.90,
            compliance_accuracy: 1.00,
            product_recommendations: 0.85,
            store_information: 0.95,
        },
        priority_levels: {
            critical: 'Must be 100% accurate - regulatory and safety content',
            high: 'Target 95% accuracy - frequently asked questions',
            medium: 'Target 85% accuracy - supplementary information',
        },
    },

    maintenance_schedule: {
        weekly: [
            'Review Smokey chat logs for new question patterns',
            'Update inventory-specific answers (brands in stock, deals)',
            'Add seasonal promotions and event-specific content',
        ],
        monthly: [
            'Expand effect-based recommendations with new product data',
            'Review NY OCM regulatory changes for compliance accuracy',
            'Run evaluation tests against QA set and document accuracy',
        ],
        quarterly: [
            'Full QA set audit with Thrive Syracuse team',
            'Update store information (hours, services, delivery)',
            'Version control: archive previous version, increment version number',
        ],
    },
};

export default thriveGroundTruth;
