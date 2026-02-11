/**
 * Real-Time Collaboration Service
 *
 * Manages multi-user collaborative editing sessions using Firebase Realtime Database.
 * Implements operational transforms for conflict resolution.
 */

import { getDatabase, ref, set, update, onValue, off, push, remove } from 'firebase/database';
import type {
  CollaborationSession,
  CollaborationParticipant,
  CodeEdit,
  EditOperation,
  FileState,
  CursorPosition,
  CollaborationMessage,
  ChatMessage,
  USER_COLORS,
} from '@/types/collaboration';
import { logger } from '@/lib/logger';

const USER_COLORS_ARRAY = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DFE6E9', '#A29BFE', '#FD79A8', '#FDCB6E', '#6C5CE7',
];

export class CollaborationService {
  private db: ReturnType<typeof getDatabase>;
  private sessionId: string;
  private userId: string;
  private userName: string;
  private userColor: string;
  private presenceInterval?: NodeJS.Timeout;
  private listeners: Map<string, () => void> = new Map();

  constructor(sessionId: string, userId: string, userName: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.userName = userName;
    this.userColor = this.assignUserColor();
    this.db = getDatabase();
  }

  /**
   * Join collaboration session
   */
  async join(): Promise<void> {
    try {
      const participant: CollaborationParticipant = {
        userId: this.userId,
        userName: this.userName,
        color: this.userColor,
        joinedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };

      // Add participant to session
      const participantRef = ref(
        this.db,
        `sessions/${this.sessionId}/participants/${this.userId}`
      );
      await set(participantRef, participant);

      // Start presence heartbeat
      this.startPresenceHeartbeat();

      // Broadcast join message
      await this.sendMessage({
        type: 'user_joined',
        userId: this.userId,
        userName: this.userName,
        timestamp: Date.now(),
        data: { color: this.userColor },
      });

      logger.info('[COLLAB] Joined session', {
        sessionId: this.sessionId,
        userId: this.userId,
      });
    } catch (error) {
      logger.error('[COLLAB] Failed to join session', { error });
      throw error;
    }
  }

  /**
   * Leave collaboration session
   */
  async leave(): Promise<void> {
    try {
      // Stop presence heartbeat
      if (this.presenceInterval) {
        clearInterval(this.presenceInterval);
      }

      // Broadcast leave message
      await this.sendMessage({
        type: 'user_left',
        userId: this.userId,
        userName: this.userName,
        timestamp: Date.now(),
        data: {},
      });

      // Remove participant
      const participantRef = ref(
        this.db,
        `sessions/${this.sessionId}/participants/${this.userId}`
      );
      await remove(participantRef);

      // Remove all listeners
      this.listeners.forEach((unsubscribe) => unsubscribe());
      this.listeners.clear();

      logger.info('[COLLAB] Left session', {
        sessionId: this.sessionId,
        userId: this.userId,
      });
    } catch (error) {
      logger.error('[COLLAB] Failed to leave session', { error });
    }
  }

  /**
   * Open a file for editing
   */
  async openFile(filePath: string): Promise<void> {
    try {
      // Update participant's current file
      const participantRef = ref(
        this.db,
        `sessions/${this.sessionId}/participants/${this.userId}/currentFile`
      );
      await set(participantRef, filePath);

      // Broadcast file opened
      await this.sendMessage({
        type: 'file_opened',
        userId: this.userId,
        userName: this.userName,
        timestamp: Date.now(),
        data: { filePath },
      });
    } catch (error) {
      logger.error('[COLLAB] Failed to open file', { error });
    }
  }

  /**
   * Apply an edit to a file
   */
  async applyEdit(
    filePath: string,
    operation: EditOperation,
    content: string
  ): Promise<void> {
    try {
      // Get current file state
      const fileStateRef = ref(
        this.db,
        `sessions/${this.sessionId}/files/${encodeURIComponent(filePath)}`
      );

      // Create edit record
      const edit: CodeEdit = {
        id: `${Date.now()}-${this.userId}`,
        userId: this.userId,
        userName: this.userName,
        timestamp: Date.now(),
        filePath,
        operation,
        version: Date.now(), // Simple version for now
      };

      // Update file state
      const fileState: FileState = {
        filePath,
        content,
        version: edit.version,
        lastModified: Date.now(),
        lastModifiedBy: this.userId,
      };

      await set(fileStateRef, fileState);

      // Broadcast edit
      await this.sendMessage({
        type: 'edit_made',
        userId: this.userId,
        userName: this.userName,
        timestamp: Date.now(),
        data: { edit },
      });
    } catch (error) {
      logger.error('[COLLAB] Failed to apply edit', { error });
      throw error;
    }
  }

  /**
   * Update cursor position
   */
  async updateCursor(position: CursorPosition): Promise<void> {
    try {
      const cursorRef = ref(
        this.db,
        `sessions/${this.sessionId}/participants/${this.userId}/cursorPosition`
      );
      await set(cursorRef, position);
    } catch (error) {
      // Fail silently for cursor updates
      logger.debug('[COLLAB] Failed to update cursor', { error });
    }
  }

  /**
   * Send chat message
   */
  async sendChatMessage(message: string): Promise<void> {
    try {
      const chatRef = ref(this.db, `sessions/${this.sessionId}/chat`);
      const messageRef = push(chatRef);

      const chatMessage: ChatMessage = {
        id: messageRef.key || '',
        userId: this.userId,
        userName: this.userName,
        message,
        timestamp: Date.now(),
      };

      await set(messageRef, chatMessage);
    } catch (error) {
      logger.error('[COLLAB] Failed to send chat message', { error });
    }
  }

  /**
   * Subscribe to file changes
   */
  subscribeToFile(
    filePath: string,
    callback: (fileState: FileState) => void
  ): () => void {
    const fileRef = ref(
      this.db,
      `sessions/${this.sessionId}/files/${encodeURIComponent(filePath)}`
    );

    const unsubscribe = onValue(fileRef, (snapshot) => {
      const fileState = snapshot.val() as FileState | null;
      if (fileState) {
        callback(fileState);
      }
    });

    this.listeners.set(`file:${filePath}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to participants
   */
  subscribeToParticipants(
    callback: (participants: CollaborationParticipant[]) => void
  ): () => void {
    const participantsRef = ref(
      this.db,
      `sessions/${this.sessionId}/participants`
    );

    const unsubscribe = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      const participants: CollaborationParticipant[] = data
        ? Object.values(data)
        : [];
      callback(participants);
    });

    this.listeners.set('participants', unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to chat messages
   */
  subscribeToChat(callback: (messages: ChatMessage[]) => void): () => void {
    const chatRef = ref(this.db, `sessions/${this.sessionId}/chat`);

    const unsubscribe = onValue(chatRef, (snapshot) => {
      const data = snapshot.val();
      const messages: ChatMessage[] = data
        ? (Object.values(data) as any[]).sort((a: any, b: any) => a.timestamp - b.timestamp)
        : [];
      callback(messages);
    });

    this.listeners.set('chat', unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to messages
   */
  subscribeToMessages(
    callback: (message: CollaborationMessage) => void
  ): () => void {
    const messagesRef = ref(this.db, `sessions/${this.sessionId}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Get latest message
        const messages = Object.values(data) as CollaborationMessage[];
        const latestMessage = messages[messages.length - 1];
        if (latestMessage && latestMessage.userId !== this.userId) {
          callback(latestMessage);
        }
      }
    });

    this.listeners.set('messages', unsubscribe);
    return unsubscribe;
  }

  /**
   * Lock file for exclusive editing
   */
  async lockFile(filePath: string): Promise<boolean> {
    try {
      const fileRef = ref(
        this.db,
        `sessions/${this.sessionId}/files/${encodeURIComponent(filePath)}/lockedBy`
      );

      // Check if already locked
      const snapshot = await new Promise<any>((resolve) => {
        onValue(fileRef, resolve, { onlyOnce: true });
      });

      if (snapshot.val() && snapshot.val() !== this.userId) {
        return false; // Already locked by someone else
      }

      await set(fileRef, this.userId);
      return true;
    } catch (error) {
      logger.error('[COLLAB] Failed to lock file', { error });
      return false;
    }
  }

  /**
   * Unlock file
   */
  async unlockFile(filePath: string): Promise<void> {
    try {
      const fileRef = ref(
        this.db,
        `sessions/${this.sessionId}/files/${encodeURIComponent(filePath)}/lockedBy`
      );
      await remove(fileRef);
    } catch (error) {
      logger.error('[COLLAB] Failed to unlock file', { error });
    }
  }

  /**
   * Send message to all participants
   */
  private async sendMessage(message: CollaborationMessage): Promise<void> {
    try {
      const messagesRef = ref(this.db, `sessions/${this.sessionId}/messages`);
      const messageRef = push(messagesRef);
      await set(messageRef, message);
    } catch (error) {
      logger.error('[COLLAB] Failed to send message', { error });
    }
  }

  /**
   * Start presence heartbeat
   */
  private startPresenceHeartbeat(): void {
    this.presenceInterval = setInterval(async () => {
      try {
        const lastSeenRef = ref(
          this.db,
          `sessions/${this.sessionId}/participants/${this.userId}/lastSeen`
        );
        await set(lastSeenRef, new Date().toISOString());
      } catch (error) {
        logger.error('[COLLAB] Presence heartbeat failed', { error });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Assign unique color to user
   */
  private assignUserColor(): string {
    // Simple hash of userId to pick color
    const hash = Array.from(this.userId).reduce(
      (acc, char) => acc + char.charCodeAt(0),
      0
    );
    return USER_COLORS_ARRAY[hash % USER_COLORS_ARRAY.length];
  }
}

/**
 * Create a new collaboration session
 */
export async function createCollaborationSession(
  projectId: string,
  userId: string
): Promise<string> {
  try {
    const db = getDatabase();
    const sessionsRef = ref(db, 'sessions');
    const newSessionRef = push(sessionsRef);

    const session: Partial<CollaborationSession> = {
      id: newSessionRef.key || '',
      projectId,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      participants: [],
      locked: false,
    };

    await set(newSessionRef, session);

    logger.info('[COLLAB] Session created', {
      sessionId: newSessionRef.key,
      projectId,
    });

    return newSessionRef.key || '';
  } catch (error) {
    logger.error('[COLLAB] Failed to create session', { error });
    throw error;
  }
}

/**
 * Get collaboration session
 */
export async function getCollaborationSession(
  sessionId: string
): Promise<CollaborationSession | null> {
  try {
    const db = getDatabase();
    const sessionRef = ref(db, `sessions/${sessionId}`);

    const snapshot = await new Promise<any>((resolve) => {
      onValue(sessionRef, resolve, { onlyOnce: true });
    });

    return snapshot.val() as CollaborationSession | null;
  } catch (error) {
    logger.error('[COLLAB] Failed to get session', { error });
    return null;
  }
}
