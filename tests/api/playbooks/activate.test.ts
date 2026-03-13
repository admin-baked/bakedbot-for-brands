import { POST } from '@/app/api/playbooks/[playbookId]/activate/route';

const mockUpdate = jest.fn();
const mockGetAuthorizedPlaybook = jest.fn();

jest.mock('@/server/services/playbook-auth', () => ({
    getAuthorizedPlaybook: (...args: unknown[]) => mockGetAuthorizedPlaybook(...args),
    PlaybookApiError: class PlaybookApiError extends Error {
        constructor(message: string, public status: number) {
            super(message);
        }
    },
}));

describe('POST /api/playbooks/[playbookId]/activate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUpdate.mockResolvedValue(undefined);
        mockGetAuthorizedPlaybook.mockResolvedValue({
            ref: {
                update: mockUpdate,
            },
        });
    });

    it('should activate a playbook via firestore update', async () => {
        const req = new Request('http://localhost/api/playbooks/pb_1/activate', { method: 'POST' });

        const res = await POST(req, { params: { playbookId: 'pb_1' } });
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.status).toBe('active');
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            status: 'active',
            active: true,
        }));
    });
});
