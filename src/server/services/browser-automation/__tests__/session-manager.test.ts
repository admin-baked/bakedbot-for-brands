import { BrowserSessionManager } from '../session-manager';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { BrowserAction, SessionOptions, BrowserSession } from '@/types/browser-automation';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock RTRVR service
jest.mock('@/server/services/rtrvr/mcp', () => ({
  getBrowserTabs: jest.fn(),
  getPageData: jest.fn(),
  takePageAction: jest.fn(),
  listDevices: jest.fn(),
  executeMCPTool: jest.fn(),
}));

import {
  getBrowserTabs,
  getPageData,
  takePageAction,
  listDevices,
  executeMCPTool,
} from '@/server/services/rtrvr/mcp';

describe('BrowserSessionManager', () => {
  let sessionManager: BrowserSessionManager;
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockAdd: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockGet = jest.fn();
    mockAdd = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();
    mockDoc = jest.fn().mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
    });

    const mockLimit = jest.fn().mockReturnValue({ get: mockGet });
    const mockOrderBy = jest.fn().mockReturnValue({ get: mockGet, limit: mockLimit });
    const mockWhere2 = jest.fn().mockReturnValue({
      limit: mockLimit,
      get: mockGet,
      orderBy: mockOrderBy,
    });
    const mockWhere = jest.fn().mockReturnValue({
      where: mockWhere2,
      orderBy: mockOrderBy,
      limit: mockLimit,
      get: mockGet,
    });

    mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
      add: mockAdd,
      get: mockGet,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
    });

    mockFirestore = {
      collection: mockCollection,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

    // Default RTRVR mocks
    (listDevices as jest.Mock).mockResolvedValue({ success: true, data: { result: [] } });
    (getBrowserTabs as jest.Mock).mockResolvedValue({ success: true, data: { result: [] } });
    (takePageAction as jest.Mock).mockResolvedValue({ success: true });

    sessionManager = new BrowserSessionManager();
  });

  describe('createSession', () => {
    it('should create a new browser session', async () => {
      // No existing active session
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });
      mockAdd.mockResolvedValueOnce({ id: 'session-123' });

      const result = await sessionManager.createSession('user-1', {
        taskDescription: 'Test task',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('session-123');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          status: 'active',
          taskDescription: 'Test task',
        })
      );
    });

    it('should fail if active session already exists', async () => {
      // Existing active session
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'existing-session',
          data: () => ({
            userId: 'user-1',
            status: 'active',
            lastActivityAt: { toMillis: () => Date.now() },
          }),
        }],
      });

      const result = await sessionManager.createSession('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('active session already exists');
    });

    it('should fail if RTRVR device not available', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });
      (listDevices as jest.Mock).mockResolvedValueOnce({ success: false, error: 'No devices' });

      const result = await sessionManager.createSession('user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('RTRVR');
    });

    it('should navigate to initial URL if provided', async () => {
      mockGet
        .mockResolvedValueOnce({ empty: true, docs: [] }) // getActiveSession
        .mockResolvedValueOnce({ // getSession for executeAction
          exists: true,
          id: 'session-123',
          data: () => ({
            userId: 'user-1',
            status: 'active',
            tabs: [],
          }),
        });
      mockAdd.mockResolvedValueOnce({ id: 'session-123' });

      const result = await sessionManager.createSession('user-1', {
        initialUrl: 'https://example.com',
      });

      expect(result.success).toBe(true);
      expect(takePageAction).toHaveBeenCalled();
    });
  });

  describe('executeAction', () => {
    const mockSession: Partial<BrowserSession> = {
      id: 'session-123',
      userId: 'user-1',
      status: 'active',
      tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Test' }],
    };

    beforeEach(() => {
      mockGet.mockResolvedValue({
        exists: true,
        id: 'session-123',
        data: () => mockSession,
      });
    });

    it('should execute a navigate action', async () => {
      (takePageAction as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { result: { url: 'https://newsite.com' } },
      });

      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://newsite.com',
      };

      const result = await sessionManager.executeAction('session-123', action);

      expect(result.success).toBe(true);
      expect(takePageAction).toHaveBeenCalled();
    });

    it('should execute a click action', async () => {
      (takePageAction as jest.Mock).mockResolvedValueOnce({ success: true });

      const action: BrowserAction = {
        type: 'click',
        selector: '#button',
      };

      const result = await sessionManager.executeAction('session-123', action);

      expect(result.success).toBe(true);
    });

    it('should execute a type action', async () => {
      (takePageAction as jest.Mock).mockResolvedValueOnce({ success: true });

      const action: BrowserAction = {
        type: 'type',
        selector: '#input',
        value: 'test value',
      };

      const result = await sessionManager.executeAction('session-123', action);

      expect(result.success).toBe(true);
    });

    it('should execute a screenshot action', async () => {
      (takePageAction as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { result: 'base64-screenshot-data' },
      });

      const action: BrowserAction = {
        type: 'screenshot',
      };

      const result = await sessionManager.executeAction('session-123', action);

      expect(result.success).toBe(true);
    });

    it('should execute a wait action', async () => {
      const action: BrowserAction = {
        type: 'wait',
        waitMs: 100,
      };

      const result = await sessionManager.executeAction('session-123', action);

      expect(result.success).toBe(true);
    });

    it('should reject action when session not found', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const action: BrowserAction = {
        type: 'click',
        selector: '#button',
      };

      const result = await sessionManager.executeAction('invalid-session', action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should reject action when session is not active', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'session-123',
        data: () => ({ ...mockSession, status: 'paused' }),
      });

      const action: BrowserAction = {
        type: 'click',
        selector: '#button',
      };

      const result = await sessionManager.executeAction('session-123', action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not active');
    });
  });

  describe('getSessionState', () => {
    it('should return session state with tabs', async () => {
      const mockSession = {
        id: 'session-123',
        userId: 'user-1',
        status: 'active',
        tabs: [{ id: 'tab-1', url: 'https://example.com', title: 'Test', active: true }],
      };

      mockGet
        .mockResolvedValueOnce({ // getSession
          exists: true,
          id: 'session-123',
          data: () => mockSession,
        })
        .mockResolvedValueOnce({ // recording check
          empty: true,
          docs: [],
        });

      (getBrowserTabs as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { result: [{ id: 'tab-1', url: 'https://example.com', title: 'Test', active: true }] },
      });

      const result = await sessionManager.getSessionState('session-123');

      expect(result.success).toBe(true);
      expect(result.data?.session.status).toBe('active');
    });

    it('should return error when session not found', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await sessionManager.getSessionState('invalid-session');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });
  });

  describe('getTabs', () => {
    it('should return browser tabs from RTRVR', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'session-123',
        data: () => ({
          userId: 'user-1',
          status: 'active',
        }),
      });

      (getBrowserTabs as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          result: [
            { id: 'tab-1', url: 'https://example.com', title: 'Example' },
            { id: 'tab-2', url: 'https://test.com', title: 'Test' },
          ],
        },
      });

      const result = await sessionManager.getTabs('session-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return error when session not found', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await sessionManager.getTabs('invalid-session');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });
  });

  describe('endSession', () => {
    it('should mark session as completed', async () => {
      const result = await sessionManager.endSession('session-123');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });
  });

  describe('pauseSession', () => {
    it('should mark session as paused', async () => {
      const result = await sessionManager.pauseSession('session-123');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paused',
        })
      );
    });
  });

  describe('resumeSession', () => {
    it('should mark paused session as active', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'session-123',
        data: () => ({
          userId: 'user-1',
          status: 'paused',
        }),
      });

      const result = await sessionManager.resumeSession('session-123');

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
        })
      );
    });

    it('should fail if session is not paused', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'session-123',
        data: () => ({
          userId: 'user-1',
          status: 'active',
        }),
      });

      const result = await sessionManager.resumeSession('session-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not paused');
    });
  });

  describe('getSessionHistory', () => {
    it('should return session history for user', async () => {
      const mockSessions = [
        { id: 'session-1', data: () => ({ startedAt: Timestamp.now() }) },
        { id: 'session-2', data: () => ({ startedAt: Timestamp.now() }) },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockSessions,
      });

      const sessions = await sessionManager.getSessionHistory('user-1');

      expect(sessions).toHaveLength(2);
    });
  });
});
