import { WorkflowRecorder } from '../workflow-recorder';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { WorkflowStep, RecordedWorkflow, RecordedAction } from '@/types/browser-automation';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  randomUUID: () => 'mock-uuid',
}));

// Mock session manager
jest.mock('../session-manager', () => ({
  browserSessionManager: {
    executeAction: jest.fn(),
  },
}));

import { browserSessionManager } from '../session-manager';

describe('WorkflowRecorder', () => {
  let workflowRecorder: WorkflowRecorder;
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockAdd: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockDocRef: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockGet = jest.fn();
    mockAdd = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();
    mockDocRef = { update: mockUpdate, delete: mockDelete };
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
    });

    mockFirestore = {
      collection: mockCollection,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

    workflowRecorder = new WorkflowRecorder();
  });

  describe('startRecording', () => {
    it('should create a new recording session', async () => {
      // No existing recording
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });
      mockAdd.mockResolvedValueOnce({ id: 'recording-123' });

      const recording = await workflowRecorder.startRecording(
        'user-1',
        'Test Workflow',
        'A test workflow',
        'session-123'
      );

      expect(recording.id).toBe('recording-123');
      expect(recording.name).toBe('Test Workflow');
      expect(recording.status).toBe('recording');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'Test Workflow',
          description: 'A test workflow',
          status: 'recording',
          steps: [],
        })
      );
    });

    it('should throw error if recording already exists', async () => {
      // Existing recording
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'existing-recording', data: () => ({}) }],
      });

      await expect(
        workflowRecorder.startRecording('user-1', 'Test')
      ).rejects.toThrow('recording is already in progress');
    });
  });

  describe('recordAction', () => {
    it('should add action to recording session', async () => {
      const action: RecordedAction = {
        type: 'navigate',
        url: 'https://example.com',
        timestamp: Date.now(),
      };

      await workflowRecorder.recordAction('recording-123', action);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('stopRecording', () => {
    it('should finalize recording and create workflow', async () => {
      const mockRecording = {
        userId: 'user-1',
        name: 'Test Workflow',
        description: 'A test workflow',
        status: 'recording',
        steps: [
          { id: 'step-1', type: 'navigate', params: { url: 'https://example.com' } },
          { id: 'step-2', type: 'click', params: { selector: '#button' } },
        ],
        startedAt: Timestamp.now(),
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'recording-123',
        data: () => mockRecording,
        ref: mockDocRef,
      });

      mockAdd.mockResolvedValueOnce({ id: 'workflow-123' });

      const workflow = await workflowRecorder.stopRecording('recording-123');

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe('workflow-123');
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.steps).toHaveLength(2);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'stopped',
        })
      );
    });

    it('should throw error when recording not found', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      await expect(workflowRecorder.stopRecording('invalid')).rejects.toThrow(
        'Recording not found'
      );
    });
  });

  describe('cancelRecording', () => {
    it('should delete recording session', async () => {
      await workflowRecorder.cancelRecording('recording-123');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow by ID', async () => {
      const mockWorkflow = {
        userId: 'user-1',
        name: 'Test Workflow',
        steps: [],
        status: 'active',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'workflow-123',
        data: () => mockWorkflow,
      });

      const workflow = await workflowRecorder.getWorkflow('workflow-123');

      expect(workflow).toBeDefined();
      expect(workflow?.name).toBe('Test Workflow');
    });

    it('should return null when workflow not found', async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const workflow = await workflowRecorder.getWorkflow('invalid');

      expect(workflow).toBeNull();
    });
  });

  describe('listWorkflows', () => {
    it('should return all workflows for user', async () => {
      const mockWorkflows = [
        { id: 'wf-1', data: () => ({ name: 'Workflow 1' }) },
        { id: 'wf-2', data: () => ({ name: 'Workflow 2' }) },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockWorkflows,
      });

      const workflows = await workflowRecorder.listWorkflows('user-1');

      expect(workflows).toHaveLength(2);
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow by ID', async () => {
      await workflowRecorder.deleteWorkflow('workflow-123');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow properties', async () => {
      await workflowRecorder.updateWorkflow('workflow-123', {
        name: 'Updated Workflow',
        description: 'Updated description',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Workflow',
          description: 'Updated description',
        })
      );
    });
  });

  describe('runWorkflow', () => {
    it('should execute all workflow steps', async () => {
      const mockWorkflow = {
        userId: 'user-1',
        name: 'Test Workflow',
        steps: [
          { id: 'step-1', type: 'navigate', params: { url: 'https://example.com' } },
          { id: 'step-2', type: 'click', params: { selector: '#button' } },
        ],
        status: 'active',
      };

      mockGet
        .mockResolvedValueOnce({ // getWorkflow
          exists: true,
          id: 'workflow-123',
          data: () => mockWorkflow,
        })
        .mockResolvedValueOnce({ // getWorkflow again for error handling
          exists: true,
          id: 'workflow-123',
          data: () => mockWorkflow,
        });

      (browserSessionManager.executeAction as jest.Mock)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const result = await workflowRecorder.runWorkflow('workflow-123', 'session-123');

      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(2);
      expect(result.totalSteps).toBe(2);
      expect(browserSessionManager.executeAction).toHaveBeenCalledTimes(2);
    });

    it('should stop on step failure', async () => {
      const mockWorkflow = {
        userId: 'user-1',
        name: 'Test Workflow',
        steps: [
          { id: 'step-1', type: 'navigate', params: { url: 'https://example.com' } },
          { id: 'step-2', type: 'click', params: { selector: '#button' } },
          { id: 'step-3', type: 'type', params: { selector: '#input', value: 'test' } },
        ],
        status: 'active',
      };

      mockGet
        .mockResolvedValueOnce({
          exists: true,
          id: 'workflow-123',
          data: () => mockWorkflow,
        })
        .mockResolvedValueOnce({
          exists: true,
          id: 'workflow-123',
          data: () => mockWorkflow,
        });

      (browserSessionManager.executeAction as jest.Mock)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Element not found' });

      const result = await workflowRecorder.runWorkflow('workflow-123', 'session-123');

      expect(result.success).toBe(false);
      expect(result.stepsCompleted).toBe(1);
      expect(result.totalSteps).toBe(3);
      expect(result.error).toContain('Element not found');
    });

    it('should return error when workflow not found', async () => {
      // First call for getWorkflow returns not found
      mockGet.mockResolvedValueOnce({ exists: false });
      // Second call for error handling in catch block also needs a response
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await workflowRecorder.runWorkflow('invalid', 'session-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Workflow not found');
    });

    it('should substitute variables in workflow steps', async () => {
      const mockWorkflow = {
        userId: 'user-1',
        name: 'Test Workflow',
        variables: [{ name: 'email', defaultValue: 'default@example.com' }],
        steps: [
          { id: 'step-1', type: 'type', params: { selector: '#email', value: '{{email}}' } },
        ],
        status: 'active',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'workflow-123',
        data: () => mockWorkflow,
      });

      (browserSessionManager.executeAction as jest.Mock).mockResolvedValueOnce({ success: true });

      const result = await workflowRecorder.runWorkflow('workflow-123', 'session-123', {
        email: 'custom@example.com',
      });

      expect(result.success).toBe(true);
      expect(browserSessionManager.executeAction).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({
          value: 'custom@example.com',
        })
      );
    });
  });

  describe('pauseRecording', () => {
    it('should pause recording', async () => {
      await workflowRecorder.pauseRecording('recording-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'paused',
        })
      );
    });
  });

  describe('resumeRecording', () => {
    it('should resume recording', async () => {
      await workflowRecorder.resumeRecording('recording-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'recording',
        })
      );
    });
  });
});
