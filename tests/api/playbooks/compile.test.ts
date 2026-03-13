import { POST } from '@/app/api/playbooks/compile/route';
import { PlaybookCompilerService } from '@/server/services/playbook-compiler';

jest.mock('@/server/services/playbook-compiler');
jest.mock('@/server/services/playbook-auth', () => ({
    resolveRequestedOrgId: jest.fn().mockResolvedValue({
        user: { uid: 'user_1' },
        orgId: 'org_1',
    }),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

describe('POST /api/playbooks/compile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if required fields are missing', async () => {
        const req = {
            json: async () => ({ orgId: 'org_1' }),
        } as any;

        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.error).toBe('Missing required fields');
    });

    it('should call compiler and return result on success', async () => {
        const mockCompileResult = { status: 'compiled', spec: { playbookId: 'pb_1' } };
        (PlaybookCompilerService.prototype.compile as jest.Mock).mockResolvedValue(mockCompileResult);

        const req = {
            json: async () => ({
                orgId: 'org_1',
                prompt: 'test input'
            }),
        } as any;

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toEqual(mockCompileResult);
        expect(PlaybookCompilerService.prototype.compile).toHaveBeenCalledWith({
            userId: 'user_1',
            orgId: 'org_1',
            naturalLanguageInput: 'test input'
        });
    });
});
