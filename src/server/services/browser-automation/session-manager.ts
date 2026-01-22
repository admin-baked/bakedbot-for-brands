/**
 * BakedBot AI in Chrome - Session Manager
 *
 * Manages browser sessions using RTRVR MCP infrastructure.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { FieldValue, Timestamp, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';
import {
  getBrowserTabs,
  getPageData,
  takePageAction,
  listDevices,
  executeMCPTool,
} from '@/server/services/rtrvr/mcp';
import type {
  BrowserSession,
  BrowserTab,
  SessionOptions,
  SessionState,
  BrowserAction,
  ActionResult,
} from '@/types/browser-automation';

const SESSIONS_COLLECTION = 'browser_sessions';
const EXTENSION_DEVICES_COLLECTION = 'extension_devices';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get available devices for a user from our local registry.
 * Falls back to RTRVR's listDevices if no local devices found.
 */
async function getAvailableDevices(userId: string): Promise<{
  success: boolean;
  devices: Array<{ id: string; name: string; online: boolean }>;
  error?: string;
}> {
  try {
    const db = getAdminFirestore();

    // First check our local device registry
    const snapshot = await db
      .collection(EXTENSION_DEVICES_COLLECTION)
      .where('userId', '==', userId)
      .get();

    if (!snapshot.empty) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const devices = snapshot.docs.map(doc => {
        const data = doc.data();
        const lastSeen = data.lastSeenAt?.toMillis?.() || 0;
        const isOnline = lastSeen > fiveMinutesAgo;
        return {
          id: doc.id,
          name: data.deviceName || 'Chrome Browser',
          online: isOnline,
        };
      });

      // Prefer online devices
      const onlineDevices = devices.filter(d => d.online);
      if (onlineDevices.length > 0) {
        return { success: true, devices: onlineDevices };
      }

      // Return all devices even if offline (might come back online)
      if (devices.length > 0) {
        return { success: true, devices };
      }
    }

    // Fall back to RTRVR's listDevices
    const rtrvResult = await listDevices();
    if (rtrvResult.success && rtrvResult.data?.result) {
      const rtrvDevices = rtrvResult.data.result as Array<{ id: string; name: string; online: boolean }>;
      return { success: true, devices: rtrvDevices };
    }

    return {
      success: false,
      devices: [],
      error: 'No available devices found. Please sign in to the Chrome extension at least once.',
    };
  } catch (error) {
    logger.error('[SessionManager] Failed to get available devices', { error, userId });
    return {
      success: false,
      devices: [],
      error: 'Failed to check device availability',
    };
  }
}

export class BrowserSessionManager {
  /**
   * Create a new browser session
   */
  async createSession(
    userId: string,
    options?: SessionOptions
  ): Promise<ActionResult<BrowserSession>> {
    try {
      // Check for existing active session
      const existingSession = await this.getActiveSession(userId);
      if (existingSession) {
        return {
          success: false,
          error: 'An active session already exists. End it first or resume.',
        };
      }

      // Get available devices - first from our registry, then RTRVR
      const devicesResult = await getAvailableDevices(userId);
      if (!devicesResult.success || devicesResult.devices.length === 0) {
        return {
          success: false,
          error: devicesResult.error || 'No available devices found. Please sign in to the Chrome extension at least once.',
        };
      }

      // Select device - prefer provided deviceId, then first online device
      let deviceId = options?.deviceId;
      if (!deviceId) {
        const onlineDevice = devicesResult.devices.find(d => d.online);
        deviceId = onlineDevice?.id || devicesResult.devices[0]?.id;
      }

      logger.info('[BrowserSession] Selected device', {
        deviceId,
        userId,
        availableDevices: devicesResult.devices.length,
      });

      // Get initial tabs
      const tabsResult = await getBrowserTabs({ deviceId });
      const tabs: BrowserTab[] = tabsResult.success && tabsResult.data?.result
        ? (tabsResult.data.result as BrowserTab[])
        : [];

      const now = Timestamp.now();
      const session: Omit<BrowserSession, 'id'> = {
        userId,
        status: 'active',
        deviceId,
        tabs,
        taskDescription: options?.taskDescription,
        startedAt: now,
        lastActivityAt: now,
      };

      const docRef = await getAdminFirestore().collection(SESSIONS_COLLECTION).add(session);

      logger.info('[BrowserSession] Created new session', {
        sessionId: docRef.id,
        userId,
        deviceId,
        tabCount: tabs.length,
      });

      // Navigate to initial URL if provided
      if (options?.initialUrl) {
        await this.executeAction(docRef.id, {
          type: 'navigate',
          url: options.initialUrl,
        });
      }

      return {
        success: true,
        data: { id: docRef.id, ...session } as BrowserSession,
      };
    } catch (error) {
      logger.error('[BrowserSession] Failed to create session', { error, userId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      };
    }
  }

  /**
   * Get active session for user
   */
  async getActiveSession(userId: string): Promise<BrowserSession | null> {
    try {
      // Query without orderBy to avoid composite index requirement
      const snapshot = await getAdminFirestore()
        .collection(SESSIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

      if (snapshot.empty) return null;

      // Sort in memory and get the most recent
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BrowserSession[];

      sessions.sort((a, b) => {
        const aTime = a.startedAt?.toMillis?.() || 0;
        const bTime = b.startedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      const doc = sessions[0];
      if (!doc) return null;

      // Check for timeout
      const lastActivity = (doc.lastActivityAt as any)?.toMillis?.() || 0;
      if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
        await this.endSession(doc.id);
        return null;
      }

      return doc;
    } catch (error) {
      logger.error('[SessionManager] getActiveSession failed', { error, userId });
      return null;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<BrowserSession | null> {
    const doc = await getAdminFirestore().collection(SESSIONS_COLLECTION).doc(sessionId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as BrowserSession;
  }

  /**
   * Get full session state including current page info
   */
  async getSessionState(sessionId: string): Promise<ActionResult<SessionState>> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.status !== 'active') {
        return { success: false, error: 'Session is not active' };
      }

      // Refresh tabs
      const tabsResult = await getBrowserTabs({ deviceId: session.deviceId });
      const tabs: BrowserTab[] = tabsResult.success && tabsResult.data?.result
        ? (tabsResult.data.result as BrowserTab[])
        : session.tabs;

      // Get active tab data
      const activeTab = tabs.find(t => t.active) || tabs[0];
      let pageTitle: string | undefined;
      let currentUrl: string | undefined;

      if (activeTab) {
        currentUrl = activeTab.url;
        pageTitle = activeTab.title;
      }

      // Update session with refreshed tabs
      await getAdminFirestore().collection(SESSIONS_COLLECTION).doc(sessionId).update({
        tabs,
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      // Check if recording
      const recordingSnapshot = await getAdminFirestore()
        .collection('recording_sessions')
        .where('sessionId', '==', sessionId)
        .where('status', '==', 'recording')
        .limit(1)
        .get();

      return {
        success: true,
        data: {
          session: { ...session, tabs },
          currentUrl,
          pageTitle,
          isRecording: !recordingSnapshot.empty,
        },
      };
    } catch (error) {
      logger.error('[BrowserSession] Failed to get session state', { error, sessionId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session state',
      };
    }
  }

  /**
   * Execute a browser action
   */
  async executeAction(
    sessionId: string,
    action: BrowserAction
  ): Promise<ActionResult> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.status !== 'active') {
        return { success: false, error: 'Session is not active' };
      }

      let result: ActionResult;

      switch (action.type) {
        case 'navigate':
          result = await this.navigate(session, action.url!);
          break;

        case 'click':
          result = await this.click(session, action.selector!, action.tabId);
          break;

        case 'type':
          result = await this.type(session, action.selector!, action.value!, action.tabId);
          break;

        case 'scroll':
          result = await this.scroll(session, action.value || 'down', action.tabId);
          break;

        case 'screenshot':
          result = await this.screenshot(session);
          break;

        case 'wait':
          await new Promise(resolve => setTimeout(resolve, action.waitMs || 1000));
          result = { success: true };
          break;

        case 'execute_script':
          result = await this.executeScript(session, action.script!, action.tabId);
          break;

        default:
          result = { success: false, error: `Unknown action type: ${action.type}` };
      }

      // Update last activity
      if (result.success) {
        await getAdminFirestore().collection(SESSIONS_COLLECTION).doc(sessionId).update({
          lastActivityAt: FieldValue.serverTimestamp(),
        });
      }

      return result;
    } catch (error) {
      logger.error('[BrowserSession] Action failed', { error, sessionId, action });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Action failed',
      };
    }
  }

  /**
   * Navigate to a URL
   */
  private async navigate(
    session: BrowserSession,
    url: string
  ): Promise<ActionResult> {
    const result = await takePageAction(
      [{ toolName: 'navigate', args: { url } }],
      session.deviceId
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    logger.info('[BrowserSession] Navigated', { sessionId: session.id, url });
    return { success: true, data: { url } };
  }

  /**
   * Click an element
   */
  private async click(
    session: BrowserSession,
    selector: string,
    tabId?: number
  ): Promise<ActionResult> {
    const result = await takePageAction(
      [{ tabId, toolName: 'click', args: { selector } }],
      session.deviceId
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  }

  /**
   * Type text into an element
   */
  private async type(
    session: BrowserSession,
    selector: string,
    text: string,
    tabId?: number
  ): Promise<ActionResult> {
    const result = await takePageAction(
      [{ tabId, toolName: 'type', args: { selector, text } }],
      session.deviceId
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  }

  /**
   * Scroll the page
   */
  private async scroll(
    session: BrowserSession,
    direction: string,
    tabId?: number
  ): Promise<ActionResult> {
    const result = await takePageAction(
      [{ tabId, toolName: 'scroll', args: { direction } }],
      session.deviceId
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
  }

  /**
   * Take a screenshot
   */
  private async screenshot(session: BrowserSession): Promise<ActionResult<string>> {
    const result = await takePageAction(
      [{ toolName: 'screenshot', args: {} }],
      session.deviceId
    );

    if (!result.success || !result.data?.result) {
      return { success: false, error: result.error || 'Screenshot failed' };
    }

    return { success: true, data: result.data.result as string };
  }

  /**
   * Execute JavaScript on the page
   */
  private async executeScript(
    session: BrowserSession,
    script: string,
    tabId?: number
  ): Promise<ActionResult> {
    const result = await executeMCPTool({
      tool: 'execute_javascript',
      params: { script, tabId },
      deviceId: session.deviceId,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data?.result };
  }

  /**
   * Pause a session
   */
  async pauseSession(sessionId: string): Promise<ActionResult> {
    try {
      await getAdminFirestore().collection(SESSIONS_COLLECTION).doc(sessionId).update({
        status: 'paused',
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      logger.info('[BrowserSession] Session paused', { sessionId });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause session',
      };
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession(sessionId: string): Promise<ActionResult<BrowserSession>> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      if (session.status !== 'paused') {
        return { success: false, error: 'Session is not paused' };
      }

      await getAdminFirestore().collection(SESSIONS_COLLECTION).doc(sessionId).update({
        status: 'active',
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      logger.info('[BrowserSession] Session resumed', { sessionId });
      return { success: true, data: { ...session, status: 'active' } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume session',
      };
    }
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<ActionResult> {
    try {
      await getAdminFirestore().collection(SESSIONS_COLLECTION).doc(sessionId).update({
        status: 'completed',
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      logger.info('[BrowserSession] Session ended', { sessionId });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end session',
      };
    }
  }

  /**
   * Get session history for user
   */
  async getSessionHistory(
    userId: string,
    limit = 10
  ): Promise<BrowserSession[]> {
    try {
      const snapshot = await getAdminFirestore()
        .collection(SESSIONS_COLLECTION)
        .where('userId', '==', userId)
        .get();

      // Sort in memory to avoid composite index requirement
      let sessions = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as BrowserSession));
      sessions.sort((a, b) => {
        const aTime = a.startedAt?.toMillis?.() || 0;
        const bTime = b.startedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      return sessions.slice(0, limit);
    } catch (error) {
      logger.error('[SessionManager] getSessionHistory failed', { error, userId });
      return [];
    }
  }

  /**
   * Get current browser tabs
   */
  async getTabs(sessionId: string): Promise<ActionResult<BrowserTab[]>> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const result = await getBrowserTabs({ deviceId: session.deviceId });
    if (!result.success) {
      return { success: false, error: result.error };
    }

    const tabs = (result.data?.result as BrowserTab[]) || [];
    return { success: true, data: tabs };
  }
}

// Export singleton instance
export const browserSessionManager = new BrowserSessionManager();
