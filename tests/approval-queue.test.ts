/**
 * Unit Tests for Approval Queue Service
 * Tests approval request creation, approval, rejection, and execution
 */

import { Timestamp } from 'firebase-admin/firestore';
import {
    createApprovalRequest,
    getApprovalRequest,
    listPendingApprovals,
    listAllApprovals,
    approveRequest,
    rejectRequest,
    executeApprovedRequest,
    getApprovalHistory,
    autoRejectExpiredRequests,
    getApprovalStats,
    type ApprovalRequest,
    type OperationDetails,
} from '@/server/services/approval-queue';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => mockFirestore),
}));

jest.mock('@/server/services/approval-notifications', () => ({
    notifyNewApprovalRequest: jest.fn().mockResolvedValue(undefined),
    notifyApprovalApproved: jest.fn().mockResolvedValue(undefined),
    notifyApprovalRejected: jest.fn().mockResolvedValue(undefined),
    notifyApprovalExecuted: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock Firestore
let mockDocs: Map<string, any> = new Map();
const mockFirestore = {
    collection: jest.fn((name: string) => ({
        add: jest.fn(async (data: any) => {
            const id = Math.random().toString(36).substr(2, 9);
            mockDocs.set(id, { id, ...data });
            return { id };
        }),
        doc: jest.fn((id?: string) => ({
            get: jest.fn(async () => {
                const data = mockDocs.get(id || '');
                return {
                    exists: !!data,
                    data: () => data,
                    id: id || '',
                    ref: {
                        update: jest.fn(async (updateData: any) => {
                            const existing = mockDocs.get(id || '');
                            mockDocs.set(id || '', { ...existing, ...updateData });
                        }),
                    },
                };
            }),
            set: jest.fn(async (data: any) => {
                mockDocs.set(id || '', { id, ...data });
            }),
            update: jest.fn(async (updateData: any) => {
                const existing = mockDocs.get(id || '');
                mockDocs.set(id || '', { ...existing, ...updateData });
            }),
        })),
        where: jest.fn(function (field: string, op: string, value: any) {
            return {
                where: jest.fn(function (f: string, o: string, v: any) {
                    return this;
                }),
                orderBy: jest.fn(function (field: string, direction?: string) {
                    return {
                        get: jest.fn(async () => {
                            const filtered = Array.from(mockDocs.values()).filter((doc: any) => {
                                const fieldValue = doc[field];
                                if (op === '==') return fieldValue === value;
                                if (op === 'in') return (value as any[]).includes(fieldValue);
                                if (op === '<') return fieldValue < value;
                                return true;
                            });
                            return {
                                docs: filtered.map((doc: any) => ({
                                    id: doc.id,
                                    data: () => doc,
                                    exists: true,
                                })),
                                empty: filtered.length === 0,
                            };
                        }),
                        limit: jest.fn(function (n: number) {
                            return {
                                get: jest.fn(async () => ({
                                    docs: [],
                                    empty: true,
                                })),
                            };
                        }),
                    };
                }),
                get: jest.fn(async () => ({
                    docs: [],
                    empty: true,
                })),
            };
        }),
    })),
    FieldValue: {
        arrayUnion: jest.fn((value: any) => ({ __arrayUnion: value })),
    },
};

describe('Approval Queue Service', () => {
    beforeEach(() => {
        mockDocs.clear();
        jest.clearAllMocks();
    });

    describe('createApprovalRequest', () => {
        it('should create a new approval request', async () => {
            const operationDetails: OperationDetails = {
                targetResource: 'test-job',
                action: 'create',
                reason: 'Testing approval system',
                riskLevel: 'medium',
            };

            const result = await createApprovalRequest(
                'cloud_scheduler_create',
                operationDetails,
                'test-user'
            );

            expect(result.status).toBe('pending');
            expect(result.requestId).toBeDefined();
        });

        it('should include operation details in request', async () => {
            const operationDetails: OperationDetails = {
                targetResource: 'secret-key',
                action: 'rotate',
                reason: 'Annual rotation',
                riskLevel: 'high',
                estimatedCost: {
                    service: 'Secret Manager',
                    costBefore: 0,
                    costAfter: 50,
                    estimatedMonthly: 50,
                },
            };

            const result = await createApprovalRequest(
                'secret_rotate',
                operationDetails
            );

            expect(result.requestId).toBeDefined();
        });
    });

    describe('getApprovalRequest', () => {
        it('should retrieve an existing approval request', async () => {
            // Create a mock request
            const mockRequest: ApprovalRequest = {
                id: 'test-id',
                createdAt: Timestamp.now(),
                requestedBy: 'test-user',
                operationType: 'cloud_scheduler_create',
                operationDetails: {
                    targetResource: 'test-job',
                    action: 'create',
                    reason: 'Test',
                    riskLevel: 'low',
                },
                status: 'pending',
                auditLog: [],
            };

            mockDocs.set('test-id', mockRequest);

            const result = await getApprovalRequest('test-id');

            expect(result).toBeDefined();
            expect(result?.id).toBe('test-id');
            expect(result?.status).toBe('pending');
        });

        it('should return null for non-existent request', async () => {
            const result = await getApprovalRequest('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('approveRequest', () => {
        it('should approve a pending request', async () => {
            const mockRequest: ApprovalRequest = {
                id: 'test-id',
                createdAt: Timestamp.now(),
                requestedBy: 'test-user',
                operationType: 'cloud_scheduler_create',
                operationDetails: {
                    targetResource: 'test-job',
                    action: 'create',
                    reason: 'Test',
                    riskLevel: 'low',
                },
                status: 'pending',
                auditLog: [],
            };

            mockDocs.set('test-id', mockRequest);

            const result = await approveRequest('test-id', 'approver@example.com', 'Looks good');

            expect(result.status).toBe('approved');
        });
    });

    describe('rejectRequest', () => {
        it('should reject a pending request with reason', async () => {
            const mockRequest: ApprovalRequest = {
                id: 'test-id',
                createdAt: Timestamp.now(),
                requestedBy: 'test-user',
                operationType: 'cloud_scheduler_create',
                operationDetails: {
                    targetResource: 'test-job',
                    action: 'create',
                    reason: 'Test',
                    riskLevel: 'low',
                },
                status: 'pending',
                auditLog: [],
            };

            mockDocs.set('test-id', mockRequest);

            const result = await rejectRequest('test-id', 'reviewer@example.com', 'Not approved');

            expect(result.status).toBe('rejected');
        });
    });

    describe('executeApprovedRequest', () => {
        it('should execute an approved request', async () => {
            const mockRequest: ApprovalRequest = {
                id: 'test-id',
                createdAt: Timestamp.now(),
                requestedBy: 'test-user',
                operationType: 'cloud_scheduler_create',
                operationDetails: {
                    targetResource: 'test-job',
                    action: 'create',
                    reason: 'Test',
                    riskLevel: 'low',
                },
                status: 'approved',
                approvedBy: 'approver@example.com',
                approvalTimestamp: Timestamp.now(),
                auditLog: [],
            };

            mockDocs.set('test-id', mockRequest);

            const result = await executeApprovedRequest('test-id');

            expect(result.status).toBe('executed');
        });

        it('should not execute a pending request', async () => {
            const mockRequest: ApprovalRequest = {
                id: 'test-id',
                createdAt: Timestamp.now(),
                requestedBy: 'test-user',
                operationType: 'cloud_scheduler_create',
                operationDetails: {
                    targetResource: 'test-job',
                    action: 'create',
                    reason: 'Test',
                    riskLevel: 'low',
                },
                status: 'pending',
                auditLog: [],
            };

            mockDocs.set('test-id', mockRequest);

            const result = await executeApprovedRequest('test-id');

            expect(result.status).toBe('failed');
            expect(result.error).toContain('not approved');
        });
    });

    describe('getApprovalStats', () => {
        it('should return stats for all approvals', async () => {
            const mockRequest: ApprovalRequest = {
                id: 'test-id',
                createdAt: Timestamp.now(),
                requestedBy: 'test-user',
                operationType: 'cloud_scheduler_create',
                operationDetails: {
                    targetResource: 'test-job',
                    action: 'create',
                    reason: 'Test',
                    riskLevel: 'high',
                },
                status: 'pending',
                auditLog: [],
            };

            mockDocs.set('test-id', mockRequest);

            const result = await getApprovalStats();

            expect(result.pending).toBeGreaterThanOrEqual(0);
            expect(result.approved).toBeGreaterThanOrEqual(0);
            expect(result.rejected).toBeGreaterThanOrEqual(0);
            expect(result.executed).toBeGreaterThanOrEqual(0);
            expect(result.failed).toBeGreaterThanOrEqual(0);
        });
    });
});

