/**
 * Create Partnership Announcement Blog Post
 *
 * Creates a pre-written blog post announcing BakedBot AI partnership
 * Run with: npx tsx scripts/create-partnership-blog.ts
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

async function createPartnershipBlog() {
    console.log('🚀 Creating BakedBot AI Partnership Announcement Blog Post\n');

    const orgId = 'org_thrive_syracuse';
    const now = Timestamp.now();
    const postId = `post_${Date.now()}`;

    const slug = 'announcing-bakedbot-ai-partnership';

    const title = "Announcing Our Partnership with BakedBot AI";

    const subtitle = "How AI-Powered Agents Are Revolutionizing Our Cannabis Retail Operations";

    const excerpt = "We're thrilled to announce our partnership with BakedBot AI, bringing cutting-edge artificial intelligence to enhance your shopping experience. Discover how our new AI agent team is working behind the scenes to provide better recommendations, personalized service, and seamless operations.";

    const content = `# Welcome to the Future of Cannabis Retail

We are excited to announce a groundbreaking partnership with BakedBot AI that will transform how we serve you. This collaboration brings state-of-the-art artificial intelligence directly into our operations, creating a more personalized, efficient, and enjoyable shopping experience.

## What is BakedBot AI?

BakedBot AI is a multi-agent commerce platform specifically designed for the cannabis industry. Unlike generic AI solutions, BakedBot understands the unique complexities of cannabis retail—from compliance requirements to product education and customer preferences. Their platform powers everything from product recommendations to marketing automation, all while keeping you in our brand's ecosystem.

## Meet Your AI Agent Team

Behind the scenes, a dedicated team of AI agents is now working to enhance every aspect of your experience:

### Smokey - Your Personal Budtender

Smokey is our AI budtender who knows our entire product catalog inside and out. Whether you're looking for help managing pain, improving sleep, or just exploring new strains, Smokey provides personalized recommendations based on your preferences and past purchases. Think of Smokey as your knowledgeable friend who's always available to help you find exactly what you need.

### Craig - Marketing & Content Creator

Craig handles all our marketing communications, from SMS promotions to email newsletters. But this isn't generic spam—Craig learns what products and deals interest you most, ensuring you only get relevant updates about products you actually care about. Craig also creates educational content to help you make informed decisions about cannabis.

### Money Mike - Pricing & Deals

Money Mike constantly monitors our pricing to ensure you're getting the best value. He identifies opportunities for bundles, manages our loyalty program, and creates personalized deals based on your shopping patterns. Mike's goal is simple: maximize your savings while maintaining our profitability.

### Deebo - Compliance Guardian

Deebo is our compliance enforcer, ensuring everything we do meets state regulations and industry best practices. From age verification to marketing content review, Deebo works 24/7 to keep us compliant so you can shop with confidence knowing we're operating legally and ethically.

### Ezal - Competitive Intelligence

Ezal keeps tabs on the broader cannabis market, monitoring trends, competitor pricing, and emerging products. This intelligence helps us stay ahead of the curve, stock the products you want, and price them competitively. Ezal ensures we're always offering you the best selection in the market.

## What This Means for You

This partnership delivers tangible benefits that enhance your shopping experience:

**Smarter Recommendations** - No more guessing. Our AI agents learn your preferences and suggest products you'll actually love.

**Personalized Deals** - Get offers on products you want, not random promotions that don't interest you.

**Faster Service** - AI-powered inventory management means we're better stocked with your favorites.

**Better Education** - Access AI-generated content that helps you understand different strains, consumption methods, and effects.

**Seamless Experience** - From browsing to checkout to delivery, every step is optimized by AI working behind the scenes.

## What's Next?

This partnership is just the beginning. In the coming months, you'll see:

- **Enhanced Loyalty Program** - Powered by AI to offer more personalized rewards and tier benefits
- **Product Recommendations** - In-store and online suggestions tailored to your needs
- **Educational Content** - AI-generated guides, strain profiles, and cannabis knowledge
- **Smarter Inventory** - We'll always have what you want in stock
- **Better Communication** - More relevant, less frequent marketing messages

## Join Us on This Journey

We're committed to using technology to enhance—not replace—the personal touch that makes cannabis retail special. Our AI agents augment our human team, giving them superpowers to serve you better.

We invite you to experience the difference AI-powered retail makes. Visit us in-store or online, and see how BakedBot AI is already working to improve your experience.

Thank you for being part of this exciting evolution in cannabis retail. Together, we're building the future of how people discover, learn about, and purchase cannabis products.

---

*Questions about our AI agents? Want to learn more about BakedBot AI? Reach out to our team—we'd love to share more about how technology is enhancing your shopping experience.*`;

    const tags = [
        'BakedBot AI',
        'Technology',
        'Innovation',
        'Partnership',
        'Customer Experience',
        'AI Agents'
    ];

    const seoKeywords = [
        'cannabis AI',
        'dispensary technology',
        'BakedBot AI',
        'AI agents',
        'cannabis retail innovation',
        'smart dispensary',
        'AI budtender'
    ];

    try {
        console.log('💾 Creating blog post in Firestore...');

        const blogPostData = {
            id: postId,
            orgId,
            slug,
            title,
            subtitle,
            excerpt,
            content,
            category: 'company_update',
            tags,
            status: 'published',
            publishedAt: now,
            author: {
                id: 'agent:craig',
                name: 'Craig (AI Marketing Agent)',
                role: 'Marketing Automation',
            },
            createdBy: 'agent:craig',
            seo: {
                title: `${title} | Thrive Syracuse`,
                metaDescription: excerpt.substring(0, 160),
                slug,
                keywords: seoKeywords,
            },
            viewCount: 0,
            version: 1,
            versionHistory: [],
            createdAt: now,
            updatedAt: now,
        };

        await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('blog_posts')
            .doc(postId)
            .set(blogPostData);

        console.log('✅ Blog post created successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('BLOG POST DETAILS');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`\nID: ${postId}`);
        console.log(`Title: ${title}`);
        console.log(`Subtitle: ${subtitle}`);
        console.log(`Category: company_update`);
        console.log(`Status: published`);
        console.log(`Tags: ${tags.join(', ')}`);
        console.log(`Word Count: ${content.split(/\s+/).length}`);
        console.log(`\nPublic URL: https://bakedbot.ai/${orgId}/blog/${slug}`);
        console.log(`Direct Link: https://bakedbot.ai/org_thrive_syracuse/blog/${slug}`);
        console.log('\nFirestore Path:');
        console.log(`  tenants/${orgId}/blog_posts/${postId}`);
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✨ Partnership announcement is now live! ✨');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ ERROR creating blog post:');
        console.error(error);
        process.exit(1);
    }
}

createPartnershipBlog().catch(console.error);
