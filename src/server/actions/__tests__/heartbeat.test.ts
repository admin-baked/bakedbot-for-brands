/**
 * Unit Tests for Heartbeat Server Actions
 *
 * Tests CRUD operations for heartbeat configuration,
 * manual triggers, history retrieval, and role determination.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock auth
const mockRequireUser = jest.fn().mockResolvedValue({
    uid: 'test-user-123',
    orgId: 'org_test',
    role: 'dispensary',
});

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: any[]) => mockRequireUser(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock Firestore
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockHeartbeatDoc = jest.fn().mockReturnValue({ set: mockSet });
const mockSettingsCollection = jest.fn().mockReturnValue({ doc: mockHeartbeatDoc });
const mockTenantDoc = jest.fn().mockReturnValue({ collection: mockSettingsCollection });

let mockHistoryDocs: any[] = [];
let mockNotifDocs: any[] = [];
const mockHistoryGet = jest.fn().mockImplementation(() => Promise.resolve({
    docs: mockHistoryDocs,
    empty: mockHistoryDocs.length === 0,
}));
const mockNotifGet = jest.fn().mockImplementation(() => Promise.resolve({
    docs: mockNotifDocs,
    empty: mockNotifDocs.length === 0,
}));

const mockWhere = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockImplementation((name: string) => {
            if (name === 'tenants') {
                return { doc: mockTenantDoc };
            }
            if (name === 'heartbeat_executions') {
                return {
                    where: mockWhere,
                    orderBy: mockOrderBy,
                    limit: mockLimit,
                    get: mockHistoryGet,
                };
            }
            if (name === 'heartbeat_notifications') {
                return {
                    where: mockWhere,
                    orderBy: mockOrderBy,
                    limit: mockLimit,
                    get: mockNotifGet,
                };
            }
            return { doc: jest.fn() };
        }),
    }),
}));

// Mock heartbeat service
const mockGetTenantConfig = jest.fn().mockResolvedValue(null);
const mockSaveTenantConfig = jest.fn().mockResolvedValue(undefined);
const mockExecuteHeartbeat = jest.fn().mockResolvedValue({
    results: [
        { checkId: 'low_stock', status: 'warning', message: '5 products low stock' },
    ],
});

jest.mock('@/server/services/heartbeat', () => ({
    executeHeartbeat: (...args: any[]) => mockExecuteHeartbeat(...args),
    getTenantHeartbeatConfig: (...args: any[]) => mockGetTenantConfig(...args),
    saveTenantHeartbeatConfig: (...args: any[]) => mockSaveTenantConfig(...args),
}));

import {
    getHeartbeatConfig,
    updateHeartbeatConfig,
    toggleHeartbeatCheck,
    triggerHeartbeat,
    getHeartbeatHistory,
    getRecentAlerts,
} from '../heartbeat';

describe('Heartbeat Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireUser.mockResolvedValue({
            uid: 'test-user-123',
            orgId: 'org_test',
            role: 'dispensary',
        });
        mockGetTenantConfig.mockResolvedValue(null);
        mockHistoryDocs = [];
        mockNotifDocs = [];
    });

    describe('getHeartbeatConfig', () => {
        it('should return default config when no saved config exists', async () => {
            const result = await getHeartbeatConfig();

            expect(result.success).toBe(true);
            expect(result.config).toBeDefined();
            expect(result.config?.role).toBe('dispensary');
            expect(result.availableChecks).toBeDefined();
        });

        it('should return saved config when one exists', async () => {
            const savedConfig = {
                tenantId: 'org_test',
                role: 'dispensary' as const,
                enabled: true,
                interval: 15,
                enabledChecks: ['low_stock', 'expiring_batches'],
                channels: ['dashboard'],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            mockGetTenantConfig.mockResolvedValueOnce(savedConfig);

            const result = await getHeartbeatConfig();

            expect(result.success).toBe(true);
            expect(result.config).toEqual(savedConfig);
        });

        it('should determine role correctly for super_user', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'admin-123',
                orgId: 'org_admin',
                role: 'super_user',
            });

            const result = await getHeartbeatConfig();

            expect(result.success).toBe(true);
            expect(result.config?.role).toBe('super_user');
        });

        it('should determine role correctly for brand roles', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'brand-123',
                brandId: 'brand_test',
                role: 'brand_admin',
            });

            const result = await getHeartbeatConfig();

            expect(result.success).toBe(true);
            expect(result.config?.role).toBe('brand');
        });

        it('should handle auth errors gracefully', async () => {
            mockRequireUser.mockRejectedValueOnce(new Error('Not authenticated'));

            const result = await getHeartbeatConfig();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Not authenticated');
        });

        it('should fail when tenant context is missing', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'user-without-tenant',
                role: 'dispensary',
            });

            const result = await getHeartbeatConfig();

            expect(result).toEqual({
                success: false,
                error: 'Missing tenant context',
            });
        });
    });

    describe('updateHeartbeatConfig', () => {
        it('should save valid updates to Firestore', async () => {
            const result = await updateHeartbeatConfig({
                enabled: true,
                interval: 30,
            });

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    enabled: true,
                    interval: 30,
                    role: 'dispensary',
                    tenantId: 'org_test',
                }),
                { merge: true },
            );
        });

        it('should reject interval below 5 minutes', async () => {
            const result = await updateHeartbeatConfig({ interval: 3 });

            expect(result.success).toBe(false);
            expect(result.error).toContain('between 5 and 1440');
        });

        it('should reject interval above 1440 minutes', async () => {
            const result = await updateHeartbeatConfig({ interval: 2000 });

            expect(result.success).toBe(false);
            expect(result.error).toContain('between 5 and 1440');
        });

        it('should save channel updates', async () => {
            const result = await updateHeartbeatConfig({
                channels: ['dashboard', 'email'],
            });

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    channels: ['dashboard', 'email'],
                }),
                { merge: true },
            );
        });

        it('should write to tenants/{id}/settings/heartbeat', async () => {
            await updateHeartbeatConfig({ enabled: false });

            expect(mockTenantDoc).toHaveBeenCalledWith('org_test');
            expect(mockSettingsCollection).toHaveBeenCalledWith('settings');
            expect(mockHeartbeatDoc).toHaveBeenCalledWith('heartbeat');
        });

        it('should not write when tenant context is missing', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'user-without-tenant',
                role: 'dispensary',
            });

            const result = await updateHeartbeatConfig({ enabled: true });

            expect(result).toEqual({
                success: false,
                error: 'Missing tenant context',
            });
            expect(mockSet).not.toHaveBeenCalled();
        });
    });

    describe('toggleHeartbeatCheck', () => {
        it('should add check when enabling', async () => {
            mockGetTenantConfig.mockResolvedValueOnce({
                enabledChecks: ['low_stock'],
            });

            const result = await toggleHeartbeatCheck('expiring_batches' as any, true);

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    enabledChecks: expect.arrayContaining(['low_stock', 'expiring_batches']),
                }),
                { merge: true },
            );
        });

        it('should remove check when disabling', async () => {
            mockGetTenantConfig.mockResolvedValueOnce({
                enabledChecks: ['low_stock', 'expiring_batches'],
            });

            const result = await toggleHeartbeatCheck('expiring_batches' as any, false);

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    enabledChecks: ['low_stock'],
                }),
                { merge: true },
            );
        });

        it('should not duplicate when enabling already enabled check', async () => {
            mockGetTenantConfig.mockResolvedValueOnce({
                enabledChecks: ['expiring_batches'],
            });

            const result = await toggleHeartbeatCheck('expiring_batches' as any, true);

            expect(result.success).toBe(true);
            const savedChecks = mockSet.mock.calls[0][0].enabledChecks;
            const uniqueChecks = [...new Set(savedChecks)];
            expect(savedChecks.length).toBe(uniqueChecks.length);
        });

        it('should reject checks not available for the actor role', async () => {
            const result = await toggleHeartbeatCheck('system_errors' as any, true);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid check for role');
            expect(mockSet).not.toHaveBeenCalled();
        });
    });

    describe('triggerHeartbeat', () => {
        it('should execute heartbeat with force flag', async () => {
            const result = await triggerHeartbeat();

            expect(result.success).toBe(true);
            expect(result.results).toBeDefined();
            expect(mockExecuteHeartbeat).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: 'org_test',
                    userId: 'test-user-123',
                    role: 'dispensary',
                    force: true,
                }),
            );
        });

        it('should return check results', async () => {
            const result = await triggerHeartbeat();

            expect(result.results).toHaveLength(1);
            expect(result.results![0].checkId).toBe('low_stock');
            expect(result.results![0].status).toBe('warning');
        });

        it('should handle execution errors', async () => {
            mockExecuteHeartbeat.mockRejectedValueOnce(new Error('Execution failed'));

            const result = await triggerHeartbeat();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Execution failed');
        });
    });

    describe('getHeartbeatHistory', () => {
        it('should return empty array when no history', async () => {
            mockHistoryDocs = [];
            const result = await getHeartbeatHistory();

            expect(result.success).toBe(true);
            expect(result.executions).toEqual([]);
        });

        it('should return formatted execution history', async () => {
            const now = new Date();
            mockHistoryDocs = [
                {
                    data: () => ({
                        executionId: 'exec-1',
                        startedAt: { toDate: () => now },
                        completedAt: { toDate: () => now },
                        checksRun: 5,
                        resultsCount: 2,
                        overallStatus: 'warning',
                        notificationsSent: 1,
                    }),
                },
            ];

            const result = await getHeartbeatHistory();

            expect(result.success).toBe(true);
            expect(result.executions).toHaveLength(1);
            expect(result.executions![0].executionId).toBe('exec-1');
            expect(result.executions![0].checksRun).toBe(5);
        });

        it('should use custom limit parameter', async () => {
            await getHeartbeatHistory(10);

            expect(mockLimit).toHaveBeenCalledWith(10);
        });

        it('should query by tenant and order by startedAt desc', async () => {
            await getHeartbeatHistory();

            expect(mockWhere).toHaveBeenCalledWith('tenantId', '==', 'org_test');
            expect(mockOrderBy).toHaveBeenCalledWith('startedAt', 'desc');
        });
    });

    describe('getRecentAlerts', () => {
        it('should return empty array when no alerts', async () => {
            mockNotifDocs = [];
            const result = await getRecentAlerts();

            expect(result.success).toBe(true);
            expect(result.alerts).toEqual([]);
        });

        it('should filter out OK results and deduplicate', async () => {
            mockNotifDocs = [
                {
                    data: () => ({
                        results: [
                            { checkId: 'low_stock', status: 'warning', message: '5 items low' },
                            { checkId: 'margins', status: 'ok', message: 'Margins healthy' },
                            { checkId: 'low_stock', status: 'critical', message: '2 items critical' },
                        ],
                    }),
                },
            ];

            const result = await getRecentAlerts();

            expect(result.success).toBe(true);
            // Should have 1 alert (low_stock deduplicated, margins filtered as ok)
            expect(result.alerts).toHaveLength(1);
            expect(result.alerts![0].checkId).toBe('low_stock');
        });

        it('should query sent notifications ordered by sentAt desc', async () => {
            await getRecentAlerts();

            expect(mockWhere).toHaveBeenCalledWith('tenantId', '==', 'org_test');
            expect(mockWhere).toHaveBeenCalledWith('status', '==', 'sent');
            expect(mockOrderBy).toHaveBeenCalledWith('sentAt', 'desc');
        });
    });

    describe('Role determination', () => {
        it('should map admin to super_user', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'admin',
                orgId: 'org_admin',
                role: 'admin',
            });

            const result = await getHeartbeatConfig();

            expect(result.config?.role).toBe('super_user');
        });

        it('should map super_admin to super_user', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'super-admin',
                orgId: 'org_admin',
                role: 'super_admin',
            });

            const result = await getHeartbeatConfig();

            expect(result.config?.role).toBe('super_user');
        });

        it('should map brand_manager to brand', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'mgr',
                brandId: 'brand_1',
                role: 'brand_manager',
            });

            const result = await getHeartbeatConfig();

            expect(result.config?.role).toBe('brand');
        });

        it('should default to dispensary for unknown roles', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'unknown',
                orgId: 'org_1',
                role: undefined,
            });

            const result = await getHeartbeatConfig();

            expect(result.config?.role).toBe('dispensary');
        });

        it('should prioritize currentOrgId over orgId and brandId for tenantId', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'user-1',
                orgId: 'org_fallback',
                currentOrgId: 'org_current',
                brandId: 'brand_1',
                role: 'brand',
            });

            await updateHeartbeatConfig({ enabled: true });

            expect(mockTenantDoc).toHaveBeenCalledWith('org_current');
        });

        it('should use brandId when orgId and currentOrgId are missing', async () => {
            mockRequireUser.mockResolvedValueOnce({
                uid: 'user-1',
                orgId: undefined,
                currentOrgId: undefined,
                brandId: 'brand_1',
                role: 'brand',
            });

            await updateHeartbeatConfig({ enabled: true });

            expect(mockTenantDoc).toHaveBeenCalledWith('brand_1');
        });
    });
});
