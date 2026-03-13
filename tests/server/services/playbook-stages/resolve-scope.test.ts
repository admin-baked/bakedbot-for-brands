import { resolveScopeExecutor } from '@/server/services/playbook-stages/resolve-scope';
import { getAdminFirestore } from '@/firebase/admin';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/server/services/playbook-artifact-service', () => ({
    ArtifactPersistenceService: jest.fn().mockImplementation(() => ({
        persist: jest.fn().mockResolvedValue({
            artifact: { id: 'art_123', storagePath: 'test/path.json' }
        })
    }))
}));

describe('resolveScopeExecutor', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        data: () => ({
                            competitors: [{ id: 'comp_1' }, 'comp_2']
                        })
                    })
                })
            })
        };
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    it('should resolve competitors explicitly provided', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: {
                scope: {
                    orgId: 'org_1',
                    competitorIds: ['comp_a', 'comp_b']
                }
            }
        };

        const result = await resolveScopeExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.stageOutput).toEqual({
            orgId: 'org_1',
            competitorIds: ['comp_a', 'comp_b']
        });
        expect(mockFirestore.collection).not.toHaveBeenCalled();
    });

    it('should fetch competitors from org profile if requested', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: {
                scope: {
                    orgId: 'org_1',
                    competitorIds: ['comp_a', 'detect_from_org_profile']
                }
            }
        };

        const result = await resolveScopeExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.stageOutput.competitorIds).toEqual(['comp_1', 'comp_2', 'comp_a']);
        expect(mockFirestore.collection).toHaveBeenCalledWith('tenants');
    });
});
