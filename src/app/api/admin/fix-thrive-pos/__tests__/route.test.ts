import { GET, POST } from '../route';
import { fixThriveSyracusePOS } from '../action';

jest.mock('next/server', () => ({
    NextRequest: class NextRequest {},
    NextResponse: {
        json: (body: any, init?: { status?: number; headers?: Record<string, string> }) => ({
            status: init?.status ?? 200,
            headers: {
                get: (key: string) => init?.headers?.[key] ?? null,
            },
            json: async () => body,
        }),
    },
}));

jest.mock('../action', () => ({
    fixThriveSyracusePOS: jest.fn(),
}));

describe('POST /api/admin/fix-thrive-pos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 405 for GET requests', async () => {
        const res = await GET();
        const json = await res.json();

        expect(res.status).toBe(405);
        expect(res.headers.get('Allow')).toBe('POST');
        expect(json.success).toBe(false);
    });

    it('returns 403 when admin action header is missing', async () => {
        const req = {
            headers: {
                get: jest.fn().mockReturnValue(null),
            },
        } as any;

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.success).toBe(false);
        expect(fixThriveSyracusePOS).not.toHaveBeenCalled();
    });

    it('runs fix action for valid POST header', async () => {
        (fixThriveSyracusePOS as jest.Mock).mockResolvedValue({
            success: true,
            logs: ['ok'],
        });

        const req = {
            headers: {
                get: jest.fn().mockReturnValue('fix-thrive-pos'),
            },
        } as any;

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(fixThriveSyracusePOS).toHaveBeenCalledTimes(1);
    });

    it('maps auth errors to 401', async () => {
        (fixThriveSyracusePOS as jest.Mock).mockRejectedValue(
            new Error('Unauthorized: No session cookie found.')
        );

        const req = {
            headers: {
                get: jest.fn().mockReturnValue('fix-thrive-pos'),
            },
        } as any;

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.success).toBe(false);
    });
});
