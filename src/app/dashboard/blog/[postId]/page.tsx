/**
 * Blog Post Editor
 *
 * Create and edit blog posts with live preview, SEO settings, compliance checking
 */

import { redirect, notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth-helpers';
import { getBlogPost } from '@/server/actions/blog';
import { BlogPostEditorClient } from './page-client';

interface BlogPostEditorPageProps {
    params: Promise<{ postId: string }>;
}

export default async function BlogPostEditorPage({ params }: BlogPostEditorPageProps) {
    const { postId } = await params;
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    const orgId = user.orgId || user.uid;

    if (!orgId) {
        redirect('/dashboard');
    }

    // Handle "new" post
    if (postId === 'new') {
        return (
            <BlogPostEditorClient
                orgId={orgId}
                userId={user.uid}
                userEmail={user.email || ''}
                post={null}
            />
        );
    }

    // Fetch existing post
    const post = await getBlogPost(postId);

    if (!post || post.orgId !== orgId) {
        notFound();
    }

    return (
        <BlogPostEditorClient
            orgId={orgId}
            userId={user.uid}
            userEmail={user.email || ''}
            post={post}
        />
    );
}
