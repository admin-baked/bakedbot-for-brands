/**
 * Blog Management Dashboard
 *
 * Main page for managing blog posts - view, create, edit, publish
 */

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth-helpers';
import { getBlogPosts } from '@/server/actions/blog';
import { BlogDashboardClient } from './page-client';

export default async function BlogDashboardPage() {
    const user = await requireUser(['brand', 'dispensary', 'super_user']);

    // Get orgId from user
    const orgId = user.orgId || user.uid;

    if (!orgId) {
        redirect('/dashboard');
    }

    // Fetch all blog posts for this organization
    const posts = await getBlogPosts(
        { orgId },
        { limit: 100 } // Load first 100 posts
    );

    return (
        <BlogDashboardClient
            orgId={orgId}
            userId={user.uid}
            initialPosts={posts}
            userRole={user.role}
        />
    );
}
