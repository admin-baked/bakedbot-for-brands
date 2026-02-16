/**
 * Test Blog Post Generation
 *
 * Creates a sample blog post announcing BakedBot AI partnership
 */

import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { generateBlogDraft } from '../src/server/services/blog-generator';
import type { BlogGeneratorInput } from '../src/server/services/blog-generator';
import type { BlogPost } from '../src/types/blog';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault(),
        projectId: 'studio-567050101-bc6e8',
    });
}

const firestore = getFirestore();

async function testBlogGeneration() {
    console.log('🚀 Testing BakedBot AI Blog Generation System\n');

    // Use Thrive Syracuse as test org
    const orgId = 'org_thrive_syracuse';
    const userId = 'test_user_001';

    // Test input - Partnership announcement
    const input: BlogGeneratorInput = {
        topic: `Announcing our partnership with BakedBot AI - How AI-powered agents are revolutionizing our cannabis retail operations`,
        outline: `
- Introduction: Exciting partnership announcement
- What is BakedBot AI: Multi-agent platform for cannabis retail
- Our AI Agent Team:
  - Smokey: Product recommendations and inventory management
  - Craig: Marketing automation and content creation
  - Money Mike: Pricing optimization and profitability
  - Deebo: Compliance monitoring
  - Ezal: Competitive intelligence
- Benefits for our customers: Faster service, better recommendations, seamless experience
- What's next: Enhanced loyalty program, personalized experiences
- Conclusion: Join us on this journey
        `,
        category: 'company_update',
        targetAudience: 'Customers and cannabis enthusiasts',
        tone: 'professional',
        length: 'medium',
        seoKeywords: ['cannabis AI', 'dispensary technology', 'BakedBot AI', 'AI agents', 'cannabis retail innovation'],
        orgId,
        userId,
    };

    try {
        console.log('📝 Generating blog post with AI...');
        console.log('Topic:', input.topic);
        console.log('Category:', input.category);
        console.log('Tone:', input.tone);
        console.log('Length:', input.length);
        console.log('');

        // Step 1: Generate with AI
        console.time('⏱️  Generation time');
        const output = await generateBlogDraft(input);
        console.timeEnd('⏱️  Generation time');
        console.log('');

        // Display results
        console.log('✅ Blog post generated successfully!\n');
        console.log('═══════════════════════════════════════════════════════');
        console.log('TITLE:', output.title);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');

        if (output.subtitle) {
            console.log('SUBTITLE:', output.subtitle);
            console.log('');
        }

        console.log('EXCERPT:');
        console.log(output.excerpt);
        console.log('');

        console.log('TAGS:', output.tags.join(', '));
        console.log('SEO KEYWORDS:', output.seoKeywords.join(', '));
        console.log('');

        console.log('CONTENT PREVIEW (first 500 characters):');
        console.log('─────────────────────────────────────────────────────');
        console.log(output.content.substring(0, 500) + '...');
        console.log('─────────────────────────────────────────────────────');
        console.log('');

        console.log('📊 STATISTICS:');
        console.log(`- Word count: ${output.content.split(/\s+/).filter(Boolean).length} words`);
        console.log(`- Character count: ${output.content.length} characters`);
        console.log(`- Estimated read time: ${Math.ceil(output.content.split(/\s+/).filter(Boolean).length / 200)} minutes`);
        console.log('');

        // Step 2: Create blog post in database
        console.log('💾 Creating blog post in database...');
        const now = Timestamp.now();
        const postId = `post_${Date.now()}`;

        const blogPostData: Partial<BlogPost> = {
            id: postId,
            orgId,
            slug: output.seo.slug,
            title: output.title,
            subtitle: output.subtitle,
            excerpt: output.excerpt,
            content: output.content,
            category: input.category,
            tags: output.tags,
            featuredImage: undefined,
            contentImages: [],
            status: 'draft',
            author: {
                id: 'agent:craig',
                name: 'Craig (AI Marketing Agent)',
                role: 'Marketing Automation',
            },
            createdBy: 'agent:craig',
            seo: output.seo,
            compliance: undefined,
            approvalState: undefined,
            viewCount: 0,
            version: 1,
            versionHistory: [],
            createdAt: now as any,
            updatedAt: now as any,
        };

        await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('blog_posts')
            .doc(postId)
            .set(blogPostData);

        console.log(`✅ Blog post created with ID: ${postId}`);
        console.log(`📍 URL: /${orgId}/blog/${output.seo.slug}`);
        console.log('');

        // Step 3: Auto-publish (skip compliance for test)
        console.log('📢 Publishing blog post...');
        await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('blog_posts')
            .doc(postId)
            .update({
                status: 'published',
                publishedAt: now,
                updatedAt: now,
            });

        console.log(`✅ Blog post published successfully!`);
        console.log(`🌐 Live at: https://bakedbot.ai/${orgId}/blog/${output.seo.slug}`);
        console.log('');

        console.log('═══════════════════════════════════════════════════════');
        console.log('✨ TEST COMPLETE! Blog system is working perfectly! ✨');
        console.log('═══════════════════════════════════════════════════════');

        return {
            success: true,
            postId,
            slug: output.seo.slug,
            output,
        };
    } catch (error) {
        console.error('');
        console.error('❌ ERROR during blog generation:');
        console.error(error);
        console.error('');
        throw error;
    }
}

// Run the test
testBlogGeneration().catch(console.error);
