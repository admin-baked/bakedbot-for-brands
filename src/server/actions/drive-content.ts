'use server';

/**
 * Drive File Content Actions
 *
 * Server actions for editing file content (text/markdown/JSON) stored in BakedBot Drive.
 * Re-uploads updated content to Firebase Storage and updates the Firestore metadata doc.
 */

import { getStorage } from 'firebase-admin/storage';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || 'bakedbot-global-assets';

/**
 * Save updated text content for a Drive file.
 *
 * Overwrites the file in Firebase Storage at its existing storagePath,
 * regenerates the signed download URL, and updates size + updatedAt in Firestore.
 */
export async function updateFileContent(
  fileId: string,
  content: string
): Promise<{ success: boolean; downloadUrl?: string; error?: string }> {
  try {
    const user = await requireUser();
    const db = getAdminFirestore();

    // Fetch the drive_files doc
    const docRef = db.collection('drive_files').doc(fileId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { success: false, error: 'File not found' };
    }

    const data = snap.data()!;

    // Ownership check — only owner can edit
    if (data.ownerId !== user.uid) {
      return { success: false, error: 'Not authorized to edit this file' };
    }

    const { storagePath, mimeType } = data as { storagePath: string; mimeType: string };

    // Re-upload content to the same storage path (overwrites)
    const buffer = Buffer.from(content, 'utf-8');
    const storage = getStorage();
    const bucket = storage.bucket(BUCKET_NAME);
    const fileRef = bucket.file(storagePath);

    await fileRef.save(buffer, {
      contentType: mimeType || 'text/plain',
      metadata: {
        metadata: {
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        },
      },
    });

    // Get a new signed URL (old one still works but this regenerates freshly)
    const [downloadUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '03-01-2500',
    });

    // Update Firestore metadata
    await docRef.update({
      size: buffer.length,
      downloadUrl,
      updatedAt: Date.now(),
    });

    logger.info('Drive file content updated', { fileId, uid: user.uid, size: buffer.length });

    return { success: true, downloadUrl };
  } catch (error) {
    logger.error('updateFileContent failed', { fileId, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save file',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Tools
// ─────────────────────────────────────────────────────────────────────────────

export type AiFileAction =
  | 'summarize'
  | 'improve'
  | 'key_points'
  | 'ask'
  | 'follow_up'
  | 'parse_json'
  | 'describe_image';

const AI_SYSTEM_PROMPTS: Record<AiFileAction, string> = {
  summarize:
    'You are a concise document analyst. Summarize the provided content in 3-5 sentences. Focus on the key facts, decisions, and takeaways. Respond with plain text only.',
  improve:
    'You are an expert editor. Rewrite the provided content to be clearer, more professional, and better structured. Preserve all factual information. Respond with the improved content only.',
  key_points:
    'Extract the key points from the provided content. Format as a clean bullet list (use "• " prefix). Each bullet should be one concise sentence. Respond with the bullets only.',
  ask:
    'You are a helpful assistant. Answer the user\'s question based solely on the provided document content. Be concise and accurate.',
  follow_up:
    'You are a strategic advisor analyzing a business document. Based on the content, suggest 3-5 concrete follow-up actions or next steps. Format as a numbered list.',
  parse_json:
    'You are a JSON analyst. Explain what this JSON data represents in plain English. Describe the structure, key fields, and what the data means. Be concise.',
  describe_image:
    'Describe what you see in this image in detail. Focus on relevant content for a cannabis/retail business context.',
};

/**
 * Process a Drive file with AI.
 *
 * The file content is passed inline (fetched client-side and sent as string).
 * Returns the AI-generated response as a string.
 */
export async function aiProcessFile(
  fileContent: string,
  action: AiFileAction,
  userQuestion?: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    await requireUser();

    const systemPrompt = AI_SYSTEM_PROMPTS[action];
    if (!systemPrompt) {
      return { success: false, error: 'Unknown AI action' };
    }

    // For 'ask', include the user's question in the prompt
    const userMessage =
      action === 'ask' && userQuestion
        ? `Document:\n\n${fileContent}\n\n---\nQuestion: ${userQuestion}`
        : `Document:\n\n${fileContent}`;

    // Cap content length to ~40k chars (~10k tokens) to stay within limits
    const truncated =
      userMessage.length > 40000
        ? userMessage.slice(0, 40000) + '\n\n[Content truncated for length]'
        : userMessage;

    const result = await callClaude({
      systemPrompt,
      userMessage: truncated,
      model: 'claude-haiku-4-5-20251001', // Use Haiku for speed + cost efficiency
      maxTokens: 2048,
    });

    return { success: true, result };
  } catch (error) {
    logger.error('aiProcessFile failed', { action, error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI processing failed',
    };
  }
}
