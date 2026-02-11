'use server';

/**
 * Collaboration Session Actions
 *
 * Server actions for managing real-time collaboration sessions.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

interface CreateSessionRequest {
  projectId: string;
  userId: string;
  userName: string;
}

interface SessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

interface SessionInfo {
  sessionId: string;
  projectId: string;
  createdBy: string;
  createdAt: string;
  participantCount: number;
  isActive: boolean;
}

/**
 * Create a new collaboration session
 */
export async function createCollaborationSession(
  request: CreateSessionRequest
): Promise<SessionResponse> {
  try {
    const db = getAdminFirestore();

    // Check if session already exists for this project
    const existingSession = await db
      .collection('vibe_collaboration_sessions')
      .where('projectId', '==', request.projectId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (!existingSession.empty) {
      const session = existingSession.docs[0];
      return {
        success: true,
        sessionId: session.id,
      };
    }

    // Create new session
    const sessionRef = await db.collection('vibe_collaboration_sessions').add({
      projectId: request.projectId,
      createdBy: request.userId,
      createdAt: new Date().toISOString(),
      isActive: true,
      participantCount: 0,
    });

    logger.info('[COLLAB-ACTIONS] Session created', {
      sessionId: sessionRef.id,
      projectId: request.projectId,
    });

    return {
      success: true,
      sessionId: sessionRef.id,
    };
  } catch (error) {
    logger.error('[COLLAB-ACTIONS] Failed to create session', { error });
    return {
      success: false,
      error: 'Failed to create collaboration session',
    };
  }
}

/**
 * Get session info
 */
export async function getSessionInfo(
  sessionId: string
): Promise<SessionInfo | null> {
  try {
    const db = getAdminFirestore();
    const sessionDoc = await db
      .collection('vibe_collaboration_sessions')
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      return null;
    }

    const data = sessionDoc.data();
    return {
      sessionId: sessionDoc.id,
      projectId: data?.projectId || '',
      createdBy: data?.createdBy || '',
      createdAt: data?.createdAt || '',
      participantCount: data?.participantCount || 0,
      isActive: data?.isActive || false,
    };
  } catch (error) {
    logger.error('[COLLAB-ACTIONS] Failed to get session info', { error });
    return null;
  }
}

/**
 * End collaboration session
 */
export async function endCollaborationSession(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();
    const sessionRef = db.collection('vibe_collaboration_sessions').doc(sessionId);
    const session = await sessionRef.get();

    if (!session.exists) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    // Only creator can end session
    if (session.data()?.createdBy !== userId) {
      return {
        success: false,
        error: 'Only session creator can end the session',
      };
    }

    await sessionRef.update({
      isActive: false,
      endedAt: new Date().toISOString(),
    });

    logger.info('[COLLAB-ACTIONS] Session ended', { sessionId });

    return { success: true };
  } catch (error) {
    logger.error('[COLLAB-ACTIONS] Failed to end session', { error });
    return {
      success: false,
      error: 'Failed to end session',
    };
  }
}

/**
 * Get active sessions for a project
 */
export async function getProjectSessions(
  projectId: string
): Promise<SessionInfo[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('vibe_collaboration_sessions')
      .where('projectId', '==', projectId)
      .where('isActive', '==', true)
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        sessionId: doc.id,
        projectId: data.projectId || '',
        createdBy: data.createdBy || '',
        createdAt: data.createdAt || '',
        participantCount: data.participantCount || 0,
        isActive: data.isActive || false,
      };
    });
  } catch (error) {
    logger.error('[COLLAB-ACTIONS] Failed to get project sessions', { error });
    return [];
  }
}

/**
 * Generate shareable collaboration link
 */
export async function generateCollaborationLink(
  sessionId: string
): Promise<{ link: string; error?: string }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai';
    const link = `${baseUrl}/vibe/beta/collaborate/${sessionId}`;

    return { link };
  } catch (error) {
    logger.error('[COLLAB-ACTIONS] Failed to generate link', { error });
    return {
      link: '',
      error: 'Failed to generate collaboration link',
    };
  }
}
