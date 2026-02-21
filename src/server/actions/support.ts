'use server';

/**
 * Support Request Actions
 *
 * Handle creating support requests from brand/dispensary dashboards
 * that route to Super User inbox with bi-directional messaging.
 */

import { getServerSessionUser } from '@/server/auth/session';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InboxThread, InboxAgentPersona } from '@/types/inbox';

const INBOX_THREADS_COLLECTION = 'inbox_threads';

// Generate thread ID
function createInboxThreadId(): string {
  return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface CreateSupportRequestInput {
  type: 'escalation' | 'feedback';
  message: string;
  priority?: 'low' | 'medium' | 'high';
}

interface CreateSupportRequestResult {
  success: boolean;
  threadId?: string;
  error?: string;
}

/**
 * Create a support request that routes to Super User inbox
 *
 * Brand/dispensary users can create support requests that:
 * - Route to Super User inbox (assignedToRole: 'super_user')
 * - Support bi-directional messaging (Super Users can reply)
 * - Show in the requester's inbox (userId: current user)
 */
export async function createSupportRequest(
  input: CreateSupportRequestInput
): Promise<CreateSupportRequestResult> {
  try {
    const user = await getServerSessionUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only brand/dispensary users can create support requests
    const allowedRoles = ['brand', 'brand_admin', 'brand_member', 'dispensary', 'dispensary_admin'];
    if (!allowedRoles.includes(user.role)) {
      logger.warn('Unauthorized support request creation attempt', {
        userId: user.uid,
        role: user.role
      });
      return { success: false, error: 'Only brand/dispensary users can create support requests' };
    }

    const db = getAdminFirestore();
    const threadId = createInboxThreadId();

    // Determine agent and priority
    const primaryAgent: InboxAgentPersona = input.type === 'escalation' ? 'leo' : 'jack';
    const priority = input.priority || 'medium';

    // Create initial message (minimal structure for Firestore)
    const message = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content: input.message,
      timestamp: new Date(),
    };

    // Create thread
    const thread = {
      id: threadId,
      orgId: user.uid, // Use uid as fallback for orgId
      userId: user.uid, // Original requester
      type: input.type === 'escalation' ? 'support_escalation' : 'customer_feedback',
      status: 'active',
      title: `${input.type === 'escalation' ? 'Support Request' : 'Feedback'}: ${new Date().toLocaleDateString()}`,
      preview: input.message.slice(0, 100),
      primaryAgent,
      assignedAgents: ['leo', 'jack', 'linus'],
      artifactIds: [],
      messages: [message],
      assignedToRole: 'super_user', // KEY: Routes to Super User inbox
      tags: ['support_request', priority],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    } as InboxThread;

    // Write to Firestore
    await db.collection(INBOX_THREADS_COLLECTION).doc(threadId).set(thread);

    logger.info('Created support request', {
      threadId,
      userId: user.uid,
      type: input.type,
      priority,
    });

    return {
      success: true,
      threadId,
    };
  } catch (error) {
    logger.error('Failed to create support request', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: 'Failed to create support request. Please try again.',
    };
  }
}

/**
 * Get support requests assigned to Super Users
 *
 * Used by Super User dashboard to see all incoming support requests
 */
export async function getSuperUserSupportThreads(options?: {
  limit?: number;
  cursor?: string;
}): Promise<{
  success: boolean;
  threads?: InboxThread[];
  error?: string;
}> {
  try {
    const user = await getServerSessionUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only Super Users can view support threads
    if (user.role !== 'super_user' && user.role !== 'super_admin') {
      return { success: false, error: 'Only Super Users can view support requests' };
    }

    const db = getAdminFirestore();
    const pageSize = options?.limit || 50;

    // Query threads assigned to super_user role
    let query = db
      .collection(INBOX_THREADS_COLLECTION)
      .where('assignedToRole', '==', 'super_user')
      .orderBy('lastActivityAt', 'desc')
      .limit(pageSize + 1);

    // Apply cursor if provided
    if (options?.cursor) {
      const cursorDoc = await db.collection(INBOX_THREADS_COLLECTION).doc(options.cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const threads = snapshot.docs.map((doc) => doc.data() as InboxThread);

    logger.info('Retrieved Super User support threads', {
      userId: user.uid,
      count: threads.length,
    });

    return {
      success: true,
      threads,
    };
  } catch (error) {
    logger.error('Failed to get Super User support threads', { error });
    return {
      success: false,
      error: 'Failed to retrieve support requests',
    };
  }
}
