'use server';

/**
 * Artifact Server Actions
 * 
 * Server actions for managing artifacts - share, publish, and retrieve.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { requireUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import { Artifact, ArtifactMetadata } from '@/types/artifact';

const ARTIFACTS_COLLECTION = 'artifacts';
const SHARED_ARTIFACTS_COLLECTION = 'shared_artifacts';

/**
 * Save an artifact to Firestore
 */
export async function saveArtifact(artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>) {
    const user = await requireUser();
    const db = getAdminFirestore();
    
    const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc();
    const now = Timestamp.now();
    
    const artifactData = {
        ...artifact,
        ownerId: user.uid,
        createdAt: now,
        updatedAt: now,
    };
    
    await artifactRef.set(artifactData);
    
    return {
        id: artifactRef.id,
        ...artifact,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
    } as Artifact;
}

/**
 * Share an artifact - creates a public share link
 */
export async function shareArtifact(artifactId: string, title: string, content: string, type: string, metadata?: ArtifactMetadata) {
    const user = await requireUser();
    const db = getAdminFirestore();
    
    // Generate unique share ID
    const shareId = nanoid(12);
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai'}/artifacts/${shareId}`;
    
    const sharedArtifactRef = db.collection(SHARED_ARTIFACTS_COLLECTION).doc(shareId);
    const now = Timestamp.now();
    
    const sharedData = {
        shareId,
        originalArtifactId: artifactId,
        ownerId: user.uid,
        ownerName: user.displayName || 'Anonymous',
        title,
        content,
        type,
        metadata: {
            ...metadata,
            isPublished: true,
            shareId,
            shareUrl,
        },
        createdAt: now,
        updatedAt: now,
        views: 0,
    };
    
    await sharedArtifactRef.set(sharedData);
    
    // If we have the original artifact, update its metadata
    if (artifactId) {
        const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(artifactId);
        const artifactDoc = await artifactRef.get();
        if (artifactDoc.exists) {
            await artifactRef.update({
                'metadata.isPublished': true,
                'metadata.shareId': shareId,
                'metadata.shareUrl': shareUrl,
                updatedAt: now,
            });
        }
    }
    
    revalidatePath('/dashboard');
    
    return {
        success: true,
        shareId,
        shareUrl,
    };
}

/**
 * Get a shared artifact by shareId (public - no auth required)
 */
export async function getSharedArtifact(shareId: string) {
    const db = getAdminFirestore();
    
    const sharedRef = db.collection(SHARED_ARTIFACTS_COLLECTION).doc(shareId);
    const sharedDoc = await sharedRef.get();
    
    if (!sharedDoc.exists) {
        return null;
    }
    
    // Increment view count
    await sharedRef.update({
        views: (sharedDoc.data()?.views || 0) + 1,
    });
    
    const data = sharedDoc.data();
    return {
        id: sharedDoc.id,
        shareId: data?.shareId,
        title: data?.title,
        content: data?.content,
        type: data?.type,
        metadata: data?.metadata,
        ownerName: data?.ownerName,
        createdAt: data?.createdAt?.toDate(),
        views: (data?.views || 0) + 1,
    };
}

/**
 * Unshare an artifact - removes public access
 */
export async function unshareArtifact(shareId: string) {
    const user = await requireUser();
    const db = getAdminFirestore();
    
    const sharedRef = db.collection(SHARED_ARTIFACTS_COLLECTION).doc(shareId);
    const sharedDoc = await sharedRef.get();
    
    if (!sharedDoc.exists) {
        return { success: false, error: 'Shared artifact not found' };
    }
    
    // Verify ownership
    if (sharedDoc.data()?.ownerId !== user.uid) {
        return { success: false, error: 'Not authorized' };
    }
    
    await sharedRef.delete();
    
    // Update original artifact metadata
    const originalId = sharedDoc.data()?.originalArtifactId;
    if (originalId) {
        const artifactRef = db.collection(ARTIFACTS_COLLECTION).doc(originalId);
        await artifactRef.update({
            'metadata.isPublished': false,
            'metadata.shareId': null,
            'metadata.shareUrl': null,
        });
    }
    
    revalidatePath('/dashboard');
    
    return { success: true };
}

/**
 * Get user's artifacts
 */
export async function getUserArtifacts() {
    const user = await requireUser();
    const db = getAdminFirestore();
    
    const snapshot = await db
        .collection(ARTIFACTS_COLLECTION)
        .where('ownerId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
    })) as Artifact[];
}
