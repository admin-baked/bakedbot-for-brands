/**
 * AI Settings Server Actions Tests
 *
 * Tests for CRUD operations on tenant and user AI settings.
 */

import {
    getTenantAISettings,
    saveTenantAISettings,
    getUserAISettings,
    saveUserAISettings,
    loadAISettingsForAgent,
    getMyAISettings,
    getMyTenantAISettings,
} from '../ai-settings';
import { DEFAULT_TENANT_AI_SETTINGS, DEFAULT_USER_AI_SETTINGS } from '@/types/ai-settings';

// Mock Firebase Admin
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: mockCollection,
    })),
}));

// Mock auth
const mockRequireUser = jest.fn();
jest.mock('@/server/auth/auth', () => ({
    requireUser: () => mockRequireUser(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('AI Settings Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireUser.mockResolvedValue({
            uid: 'user-123',
            role: 'super_user',
            currentOrgId: 'tenant-123',
            orgId: 'tenant-123',
        });

        // Setup default mock chain
        mockDoc.mockReturnValue({
            get: mockGet,
            set: mockSet,
            collection: mockCollection,
        });
        mockCollection.mockReturnValue({
            doc: mockDoc,
        });
        mockSet.mockResolvedValue(undefined);
    });

    describe('getTenantAISettings', () => {
        it('returns defaults for invalid tenant id', async () => {
            const result = await getTenantAISettings('bad/tenant');

            expect(result).toEqual(DEFAULT_TENANT_AI_SETTINGS);
            expect(mockCollection).not.toHaveBeenCalledWith('tenants');
        });

        it('returns default settings when document does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });

            const result = await getTenantAISettings('tenant-123');

            expect(result).toEqual(DEFAULT_TENANT_AI_SETTINGS);
            expect(mockCollection).toHaveBeenCalledWith('tenants');
            expect(mockDoc).toHaveBeenCalledWith('tenant-123');
        });

        it('returns parsed settings when document exists', async () => {
            const storedSettings = {
                customInstructions: 'Test instructions',
                tone: 'professional',
                responseLength: 'brief',
                preferredLanguage: 'en',
                businessContext: 'Test business',
                alwaysMention: ['loyalty'],
                avoidTopics: ['competitors'],
                features: {
                    autoSuggestProducts: true,
                    includeComplianceReminders: true,
                    showConfidenceScores: false,
                    enableVoiceResponses: false,
                },
            };

            mockGet.mockResolvedValue({
                exists: true,
                data: () => storedSettings,
            });

            const result = await getTenantAISettings('tenant-123');

            expect(result.customInstructions).toBe('Test instructions');
            expect(result.tone).toBe('professional');
            expect(result.alwaysMention).toEqual(['loyalty']);
        });

        it('returns defaults when stored data is invalid', async () => {
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    tone: 'invalid-tone', // Invalid enum value
                }),
            });

            const result = await getTenantAISettings('tenant-123');

            expect(result).toEqual(DEFAULT_TENANT_AI_SETTINGS);
        });

        it('returns defaults on error', async () => {
            mockGet.mockRejectedValue(new Error('Firestore error'));

            const result = await getTenantAISettings('tenant-123');

            expect(result).toEqual(DEFAULT_TENANT_AI_SETTINGS);
        });

        it('returns defaults for non-super users without org context', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
            });

            const result = await getTenantAISettings('tenant-123');

            expect(result).toEqual(DEFAULT_TENANT_AI_SETTINGS);
            expect(mockCollection).not.toHaveBeenCalledWith('tenants');
        });
    });

    describe('saveTenantAISettings', () => {
        beforeEach(() => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
                currentOrgId: 'tenant-123',
                orgId: 'tenant-123',
            });
            mockGet.mockResolvedValue({ exists: false }); // No existing settings
        });

        it('saves valid settings successfully', async () => {
            const settings = {
                customInstructions: 'New instructions',
                tone: 'casual' as const,
            };

            const result = await saveTenantAISettings('tenant-123', settings);

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    customInstructions: 'New instructions',
                    tone: 'casual',
                    updatedBy: 'user-123',
                }),
                { merge: true }
            );
        });

        it('rejects invalid settings', async () => {
            const settings = {
                tone: 'invalid-tone' as any, // Invalid
            };

            const result = await saveTenantAISettings('tenant-123', settings);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid settings');
            expect(mockSet).not.toHaveBeenCalled();
        });

        it('returns error on Firestore failure', async () => {
            mockSet.mockRejectedValue(new Error('Write failed'));

            const settings = {
                customInstructions: 'Test',
            };

            const result = await saveTenantAISettings('tenant-123', settings);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Write failed');
        });

        it('merges with existing settings', async () => {
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    customInstructions: 'Old instructions',
                    tone: 'friendly',
                    alwaysMention: ['old topic'],
                }),
            });

            const settings = {
                customInstructions: 'New instructions',
                // tone should remain 'friendly' from existing
            };

            const result = await saveTenantAISettings('tenant-123', settings);

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    customInstructions: 'New instructions',
                    tone: 'friendly', // preserved from existing
                }),
                { merge: true }
            );
        });

        it('rejects cross-tenant writes for non-super users', async () => {
            const result = await saveTenantAISettings('tenant-other', {
                customInstructions: 'Nope',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
            expect(mockSet).not.toHaveBeenCalled();
        });

        it('rejects tenant writes for non-super users without org context', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
            });

            const result = await saveTenantAISettings('tenant-123', {
                customInstructions: 'Nope',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
            expect(mockSet).not.toHaveBeenCalled();
        });

        it('rejects invalid tenant id', async () => {
            const result = await saveTenantAISettings('bad/tenant', {
                customInstructions: 'Nope',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid tenant id');
            expect(mockSet).not.toHaveBeenCalled();
        });

        it('rejects non-admin tenant writes for same-org staff role', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_staff',
                currentOrgId: 'tenant-123',
                orgId: 'tenant-123',
            });

            const result = await saveTenantAISettings('tenant-123', {
                customInstructions: 'Nope',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
            expect(mockSet).not.toHaveBeenCalled();
        });
    });

    describe('getUserAISettings', () => {
        it('returns default settings when document does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });

            const result = await getUserAISettings('user-123');

            expect(result).toEqual(DEFAULT_USER_AI_SETTINGS);
            expect(mockCollection).toHaveBeenCalledWith('users');
            expect(mockDoc).toHaveBeenCalledWith('user-123');
        });

        it('returns parsed settings when document exists', async () => {
            const storedSettings = {
                customInstructions: 'User instructions',
                preferredTone: 'casual',
                responseFormat: 'bullets',
                experienceLevel: 'beginner',
                accessibility: {
                    simpleLanguage: true,
                    avoidJargon: true,
                    largerText: false,
                },
            };

            mockGet.mockResolvedValue({
                exists: true,
                data: () => storedSettings,
            });

            const result = await getUserAISettings('user-123');

            expect(result.customInstructions).toBe('User instructions');
            expect(result.preferredTone).toBe('casual');
            expect(result.accessibility.simpleLanguage).toBe(true);
        });

        it('returns defaults when stored data is invalid', async () => {
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    experienceLevel: 'invalid-level', // Invalid
                }),
            });

            const result = await getUserAISettings('user-123');

            expect(result).toEqual(DEFAULT_USER_AI_SETTINGS);
        });

        it('returns defaults for unauthorized cross-user reads', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
                currentOrgId: 'tenant-123',
                orgId: 'tenant-123',
            });

            const result = await getUserAISettings('user-999');

            expect(result).toEqual(DEFAULT_USER_AI_SETTINGS);
            expect(mockCollection).not.toHaveBeenCalledWith('users');
        });

        it('returns defaults for invalid user id', async () => {
            const result = await getUserAISettings('bad/user');

            expect(result).toEqual(DEFAULT_USER_AI_SETTINGS);
            expect(mockCollection).not.toHaveBeenCalledWith('users');
        });
    });

    describe('saveUserAISettings', () => {
        beforeEach(() => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
                currentOrgId: 'tenant-123',
                orgId: 'tenant-123',
            });
            mockGet.mockResolvedValue({ exists: false });
        });

        it('saves valid settings successfully', async () => {
            const settings = {
                customInstructions: 'My preferences',
                preferredTone: 'formal' as const,
            };

            const result = await saveUserAISettings(settings);

            expect(result.success).toBe(true);
            expect(mockCollection).toHaveBeenCalledWith('users');
            expect(mockDoc).toHaveBeenCalledWith('user-123');
            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    customInstructions: 'My preferences',
                    preferredTone: 'formal',
                }),
                { merge: true }
            );
        });

        it('rejects invalid settings', async () => {
            const settings = {
                experienceLevel: 'super-expert' as any, // Invalid
            };

            const result = await saveUserAISettings(settings);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid settings');
        });

        it('includes updatedAt timestamp', async () => {
            const settings = {
                customInstructions: 'Test',
            };

            await saveUserAISettings(settings);

            expect(mockSet).toHaveBeenCalledWith(
                expect.objectContaining({
                    updatedAt: expect.any(String),
                }),
                { merge: true }
            );
        });
    });

    describe('loadAISettingsForAgent', () => {
        it('loads both tenant and user settings', async () => {
            // First call for tenant settings
            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        customInstructions: 'Tenant instructions',
                        tone: 'friendly',
                    }),
                })
                // Second call for user settings
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        customInstructions: 'User instructions',
                        experienceLevel: 'beginner',
                    }),
                });

            const result = await loadAISettingsForAgent('tenant-123', 'user-456');

            expect(result.tenant).not.toBeNull();
            expect(result.user).not.toBeNull();
            expect(result.tenant?.customInstructions).toBe('Tenant instructions');
            expect(result.user?.customInstructions).toBe('User instructions');
        });

        it('returns null tenant when no tenantId provided', async () => {
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    customInstructions: 'User instructions',
                }),
            });

            const result = await loadAISettingsForAgent(undefined, 'user-123');

            expect(result.tenant).toBeNull();
            expect(result.user).not.toBeNull();
        });

        it('returns null user when no userId provided', async () => {
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    customInstructions: 'Tenant instructions',
                }),
            });

            const result = await loadAISettingsForAgent('tenant-123', undefined);

            expect(result.tenant).not.toBeNull();
            expect(result.user).toBeNull();
        });

        it('handles errors gracefully by returning defaults', async () => {
            // When Firestore throws, individual getters catch and return defaults
            mockGet.mockRejectedValue(new Error('Network error'));

            const result = await loadAISettingsForAgent('tenant-123', 'user-456');

            // Since getTenantAISettings and getUserAISettings catch errors internally
            // and return defaults, loadAISettingsForAgent receives defaults, not nulls
            expect(result.tenant).toEqual(DEFAULT_TENANT_AI_SETTINGS);
            expect(result.user).toEqual(DEFAULT_USER_AI_SETTINGS);
        });

        it('returns null for unauthorized tenant/user targets for non-super users', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
                currentOrgId: 'tenant-123',
                orgId: 'tenant-123',
            });

            const result = await loadAISettingsForAgent('tenant-other', 'user-999');

            expect(result.tenant).toBeNull();
            expect(result.user).toBeNull();
        });

        it('does not load tenant settings for non-super users without org context', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
            });

            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    customInstructions: 'User instructions',
                }),
            });

            const result = await loadAISettingsForAgent('tenant-123', 'user-123');

            expect(result.tenant).toBeNull();
            expect(result.user).not.toBeNull();
        });
    });

    describe('getMyAISettings', () => {
        it('returns current user settings', async () => {
            mockRequireUser.mockResolvedValue({ uid: 'current-user' });
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({
                    customInstructions: 'My settings',
                    experienceLevel: 'experienced',
                }),
            });

            const result = await getMyAISettings();

            expect(result.customInstructions).toBe('My settings');
            expect(mockDoc).toHaveBeenCalledWith('current-user');
        });
    });

    describe('getMyTenantAISettings', () => {
        it('returns tenant settings for user with brandId', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
                currentOrgId: 'brand-456',
                orgId: 'brand-456',
            });

            // First call: get user document
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ brandId: 'brand-456' }),
            });

            // Second call: get tenant AI settings
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    customInstructions: 'Brand instructions',
                    tone: 'professional',
                }),
            });

            const result = await getMyTenantAISettings();

            expect(result).not.toBeNull();
            expect(result?.customInstructions).toBe('Brand instructions');
        });

        it('returns null when user has no org association', async () => {
            mockRequireUser.mockResolvedValue({ uid: 'user-123' });

            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({}), // No brandId, orgId, or currentOrgId
            });

            const result = await getMyTenantAISettings();

            expect(result).toBeNull();
        });

        it('uses currentOrgId as fallback', async () => {
            mockRequireUser.mockResolvedValue({
                uid: 'user-123',
                role: 'dispensary_admin',
                currentOrgId: 'org-789',
                orgId: 'org-789',
            });

            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({ currentOrgId: 'org-789' }),
                })
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        customInstructions: 'Org instructions',
                    }),
                });

            const result = await getMyTenantAISettings();

            expect(result).not.toBeNull();
            expect(result?.customInstructions).toBe('Org instructions');
        });
    });
});
