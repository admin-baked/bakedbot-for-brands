/**
 * Blog Author Profile Actions
 *
 * CRUD for platform blog author profiles (Super Users only).
 * Authors stored in top-level `blog_authors` collection.
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import type { BlogAuthorProfile } from '@/types/blog';
import { Timestamp } from '@google-cloud/firestore';

function generateAuthorSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 60);
}

/**
 * Create or update an author profile
 */
export async function upsertAuthorProfile(input: {
    name: string;
    title: string;
    bio: string;
    headshot?: string;
    socialLinks?: { twitter?: string; linkedin?: string; instagram?: string };
}): Promise<BlogAuthorProfile> {
    const user = await requireUser(['super_user']);

    try {
        const { firestore } = await createServerClient();
        const slug = generateAuthorSlug(input.name);
        const now = Timestamp.now();

        const existingDoc = await firestore.collection('blog_authors').doc(slug).get();

        if (existingDoc.exists) {
            // Update existing
            await existingDoc.ref.update({
                name: input.name,
                title: input.title,
                bio: input.bio,
                ...(input.headshot !== undefined && { headshot: input.headshot }),
                ...(input.socialLinks !== undefined && { socialLinks: input.socialLinks }),
                updatedAt: now,
            });

            logger.info('[upsertAuthorProfile] Updated author profile', { slug });
            return { slug, ...existingDoc.data(), ...input, updatedAt: now } as BlogAuthorProfile;
        }

        // Create new
        const profileData = {
            slug,
            name: input.name,
            title: input.title,
            bio: input.bio,
            headshot: input.headshot || null,
            socialLinks: input.socialLinks || {},
            userId: user.uid,
            createdAt: now,
            updatedAt: now,
        };

        await firestore.collection('blog_authors').doc(slug).set(profileData);
        logger.info('[upsertAuthorProfile] Created author profile', { slug });

        return profileData as unknown as BlogAuthorProfile;
    } catch (error) {
        logger.error('[upsertAuthorProfile] Error', { error });
        throw new Error('Failed to save author profile');
    }
}

/**
 * Get all author profiles
 */
export async function getAuthorProfiles(): Promise<BlogAuthorProfile[]> {
    try {
        const { firestore } = await createServerClient();
        const snapshot = await firestore
            .collection('blog_authors')
            .orderBy('name', 'asc')
            .get();

        return snapshot.docs.map(doc => ({
            slug: doc.id,
            ...doc.data(),
        })) as BlogAuthorProfile[];
    } catch (error) {
        logger.error('[getAuthorProfiles] Error', { error });
        return [];
    }
}

/**
 * Get a single author profile by slug (public, no auth)
 */
export async function getAuthorBySlug(slug: string): Promise<BlogAuthorProfile | null> {
    try {
        const { firestore } = await createServerClient();
        const doc = await firestore.collection('blog_authors').doc(slug).get();

        if (!doc.exists) return null;

        return { slug: doc.id, ...doc.data() } as BlogAuthorProfile;
    } catch (error) {
        logger.error('[getAuthorBySlug] Error', { error, slug });
        return null;
    }
}

/**
 * Delete an author profile (Super User only)
 */
export async function deleteAuthorProfile(slug: string): Promise<void> {
    await requireUser(['super_user']);

    try {
        const { firestore } = await createServerClient();
        await firestore.collection('blog_authors').doc(slug).delete();
        logger.info('[deleteAuthorProfile] Deleted author profile', { slug });
    } catch (error) {
        logger.error('[deleteAuthorProfile] Error', { error, slug });
        throw new Error('Failed to delete author profile');
    }
}
