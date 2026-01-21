import { TaskScheduler } from '../task-scheduler';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import type { BrowserTask, BrowserTaskCreate, TaskSchedule } from '@/types/browser-automation';

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

// Mock session manager
jest.mock('../session-manager', () => ({
  browserSessionManager: {
    createSession: jest.fn(),
    endSession: jest.fn(),
  },
}));

// Mock workflow recorder
jest.mock('../workflow-recorder', () => ({
  workflowRecorder: {
    runWorkflow: jest.fn(),
  },
}));

import { browserSessionManager } from '../session-manager';
import { workflowRecorder } from '../workflow-recorder';

describe('TaskScheduler', () => {
  let taskScheduler: TaskScheduler;
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
    mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
      add: mockAdd,
      get: mockGet,
      where: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              get: mockGet,
            }),
          }),
        }),
        orderBy: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet,
          }),
          get: mockGet,
        }),
        get: mockGet,
      }),
    });

    mockFirestore = {
      collection: mockCollection,
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

    taskScheduler = new TaskScheduler();
  });

  describe('scheduleTask', () => {
    it('should create a new scheduled task', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'task-123' });

      const taskCreate: BrowserTaskCreate = {
        name: 'Daily Report',
        description: 'Generate daily report',
        schedule: {
          type: 'daily',
          time: '09:00',
          timezone: 'America/Los_Angeles',
        },
        workflowId: 'workflow-123',
      };

      const task = await taskScheduler.scheduleTask('user-1', taskCreate);

      expect(task.id).toBe('task-123');
      expect(task.name).toBe('Daily Report');
      expect(task.status).toBe('scheduled');
      expect(task.enabled).toBe(true);
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          name: 'Daily Report',
          status: 'scheduled',
        })
      );
    });

    it('should schedule one-time task', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'task-123' });

      const runAt = new Date(Date.now() + 3600000); // 1 hour from now
      const taskCreate: BrowserTaskCreate = {
        name: 'One-time Task',
        schedule: {
          type: 'once',
          runAt: Timestamp.fromDate(runAt),
          timezone: 'America/Los_Angeles',
        },
      };

      const task = await taskScheduler.scheduleTask('user-1', taskCreate);

      expect(task.schedule.type).toBe('once');
    });

    it('should default to America/Los_Angeles timezone', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'task-123' });

      const taskCreate: BrowserTaskCreate = {
        name: 'Test Task',
        schedule: {
          type: 'daily',
          time: '10:00',
        },
      };

      const task = await taskScheduler.scheduleTask('user-1', taskCreate);

      expect(task.schedule.timezone).toBe('America/Los_Angeles');
    });
  });

  describe('updateTask', () => {
    it('should update task properties', async () => {
      await taskScheduler.updateTask('task-123', {
        name: 'Updated Task',
        description: 'Updated description',
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Task',
          description: 'Updated description',
        })
      );
    });

    it('should recalculate nextRunAt when schedule changes', async () => {
      await taskScheduler.updateTask('task-123', {
        schedule: {
          type: 'weekly',
          time: '14:00',
          daysOfWeek: [1, 3, 5],
          timezone: 'America/Los_Angeles',
        },
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule: expect.objectContaining({
            type: 'weekly',
          }),
          nextRunAt: expect.any(Object),
        })
      );
    });
  });

  describe('cancelTask', () => {
    it('should cancel task and disable it', async () => {
      await taskScheduler.cancelTask('task-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          enabled: false,
        })
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete task', async () => {
      await taskScheduler.deleteTask('task-123');

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('getTask', () => {
    it('should return task by ID', async () => {
      const mockTask = {
        id: 'task-123',
        userId: 'user-1',
        name: 'Test Task',
        status: 'scheduled',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'task-123',
        data: () => mockTask,
      });

      const task = await taskScheduler.getTask('task-123');

      expect(task).toBeDefined();
      expect(task?.name).toBe('Test Task');
    });

    it('should return null when task not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const task = await taskScheduler.getTask('invalid');

      expect(task).toBeNull();
    });
  });

  describe('listTasks', () => {
    it('should return all tasks for user', async () => {
      const mockTasks = [
        { id: 'task-1', data: () => ({ name: 'Task 1' }) },
        { id: 'task-2', data: () => ({ name: 'Task 2' }) },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockTasks,
      });

      const tasks = await taskScheduler.listTasks('user-1');

      expect(tasks).toHaveLength(2);
    });
  });

  describe('getDueTasks', () => {
    it('should return tasks due for execution', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          data: () => ({
            name: 'Due Task',
            status: 'scheduled',
            enabled: true,
            nextRunAt: Timestamp.fromDate(new Date(Date.now() - 60000)),
          }),
        },
      ];

      mockGet.mockResolvedValueOnce({
        docs: mockTasks,
      });

      const tasks = await taskScheduler.getDueTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe('Due Task');
    });
  });

  describe('executeTask', () => {
    it('should execute task with workflow', async () => {
      const mockTask = {
        id: 'task-123',
        userId: 'user-1',
        name: 'Test Task',
        workflowId: 'workflow-123',
        schedule: { type: 'daily', time: '09:00', timezone: 'America/Los_Angeles' },
        status: 'scheduled',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'task-123',
        data: () => mockTask,
      });

      (browserSessionManager.createSession as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      (workflowRecorder.runWorkflow as jest.Mock).mockResolvedValueOnce({
        workflowId: 'workflow-123',
        success: true,
        stepsCompleted: 3,
        totalSteps: 3,
        duration: 5000,
      });

      (browserSessionManager.endSession as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await taskScheduler.executeTask('task-123');

      expect(result.success).toBe(true);
      expect(result.stepsCompleted).toBe(3);
      expect(browserSessionManager.createSession).toHaveBeenCalled();
      expect(workflowRecorder.runWorkflow).toHaveBeenCalledWith('workflow-123', 'session-123');
      expect(browserSessionManager.endSession).toHaveBeenCalledWith('session-123');
    });

    it('should handle task without workflow', async () => {
      const mockTask = {
        id: 'task-123',
        userId: 'user-1',
        name: 'Test Task',
        workflowId: null,
        schedule: { type: 'once', timezone: 'America/Los_Angeles' },
        status: 'scheduled',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'task-123',
        data: () => mockTask,
      });

      (browserSessionManager.createSession as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      (browserSessionManager.endSession as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await taskScheduler.executeTask('task-123');

      expect(result.success).toBe(true);
      expect(workflowRecorder.runWorkflow).not.toHaveBeenCalled();
    });

    it('should throw error when task not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      await expect(taskScheduler.executeTask('invalid')).rejects.toThrow('Task not found');
    });

    it('should handle session creation failure', async () => {
      const mockTask = {
        id: 'task-123',
        userId: 'user-1',
        name: 'Test Task',
        workflowId: 'workflow-123',
        schedule: { type: 'daily', time: '09:00', timezone: 'America/Los_Angeles' },
        status: 'scheduled',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'task-123',
        data: () => mockTask,
      });

      (browserSessionManager.createSession as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Failed to create session',
      });

      await expect(taskScheduler.executeTask('task-123')).rejects.toThrow('Failed to create session');
    });

    it('should mark one-time task as completed after execution', async () => {
      const mockTask = {
        id: 'task-123',
        userId: 'user-1',
        name: 'One-time Task',
        workflowId: null,
        schedule: { type: 'once', timezone: 'America/Los_Angeles' },
        status: 'scheduled',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'task-123',
        data: () => mockTask,
      });

      (browserSessionManager.createSession as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      (browserSessionManager.endSession as jest.Mock).mockResolvedValueOnce(undefined);

      await taskScheduler.executeTask('task-123');

      // Should have two updates: one for results, one for completion
      expect(mockUpdate).toHaveBeenCalledTimes(3); // running + results + completed
    });
  });

  describe('runNow', () => {
    it('should execute task immediately', async () => {
      const mockTask = {
        id: 'task-123',
        userId: 'user-1',
        name: 'Test Task',
        workflowId: null,
        schedule: { type: 'daily', time: '09:00', timezone: 'America/Los_Angeles' },
        status: 'scheduled',
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'task-123',
        data: () => mockTask,
      });

      (browserSessionManager.createSession as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: { id: 'session-123' },
      });

      (browserSessionManager.endSession as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await taskScheduler.runNow('task-123');

      expect(result.success).toBe(true);
    });
  });

  describe('enableTask', () => {
    it('should enable task and recalculate nextRunAt', async () => {
      const mockTask = {
        id: 'task-123',
        userId: 'user-1',
        name: 'Test Task',
        schedule: { type: 'daily', time: '09:00', timezone: 'America/Los_Angeles' },
        enabled: false,
      };

      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'task-123',
        data: () => mockTask,
      });

      await taskScheduler.enableTask('task-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          status: 'scheduled',
        })
      );
    });

    it('should throw error when task not found', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      await expect(taskScheduler.enableTask('invalid')).rejects.toThrow('Task not found');
    });
  });

  describe('disableTask', () => {
    it('should disable task', async () => {
      await taskScheduler.disableTask('task-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe('calculateNextRun', () => {
    // Test the private method through the public interface
    it('should calculate next run for daily schedule', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'task-123' });

      const taskCreate: BrowserTaskCreate = {
        name: 'Daily Task',
        schedule: {
          type: 'daily',
          time: '09:00',
          timezone: 'America/Los_Angeles',
        },
      };

      const task = await taskScheduler.scheduleTask('user-1', taskCreate);

      expect(task.nextRunAt).toBeDefined();
    });

    it('should calculate next run for weekly schedule', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'task-123' });

      const taskCreate: BrowserTaskCreate = {
        name: 'Weekly Task',
        schedule: {
          type: 'weekly',
          time: '10:00',
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
          timezone: 'America/Los_Angeles',
        },
      };

      const task = await taskScheduler.scheduleTask('user-1', taskCreate);

      expect(task.nextRunAt).toBeDefined();
    });

    it('should calculate next run for monthly schedule', async () => {
      mockAdd.mockResolvedValueOnce({ id: 'task-123' });

      const taskCreate: BrowserTaskCreate = {
        name: 'Monthly Task',
        schedule: {
          type: 'monthly',
          time: '08:00',
          dayOfMonth: 15,
          timezone: 'America/Los_Angeles',
        },
      };

      const task = await taskScheduler.scheduleTask('user-1', taskCreate);

      expect(task.nextRunAt).toBeDefined();
    });
  });
});
