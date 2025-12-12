
import { sheetsAction } from '../sheets';
import { getAdminFirestore } from '@/firebase/admin';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

global.fetch = jest.fn();

describe('sheetsAction', () => {
    const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        get: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
    });

    it('should fail if authentication is missing', async () => {
        mockDb.get.mockResolvedValue({
            data: () => ({})
        });

        const result = await sheetsAction({ action: 'read', spreadsheetId: '123', range: 'A1' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication required');
    });

    it('should read data successfully', async () => {
        mockDb.get.mockResolvedValue({
            data: () => ({ accessToken: 'test-token' })
        });

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                values: [['Name', 'Value'], ['Test', '100']],
                range: 'Sheet1!A1:B2'
            })
        });

        const result = await sheetsAction({
            action: 'read',
            spreadsheetId: 'sheet-1',
            range: 'A1:B2'
        });

        expect(result.success).toBe(true);
        expect(result.data.values).toHaveLength(2);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sheet-1/values/A1:B2'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-token'
                })
            })
        );
    });

    it('should append data successfully', async () => {
        mockDb.get.mockResolvedValue({
            data: () => ({ accessToken: 'test-token' })
        });

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ updates: { updatedRows: 1 } })
        });

        const result = await sheetsAction({
            action: 'append',
            spreadsheetId: 'sheet-1',
            range: 'A1',
            values: [['New', 'Row']]
        });

        expect(result.success).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/sheet-1/values/A1:append'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    range: 'A1',
                    majorDimension: 'ROWS',
                    values: [['New', 'Row']]
                })
            })
        );
    });

    it('should create spreadsheet successfully', async () => {
        mockDb.get.mockResolvedValue({
            data: () => ({ accessToken: 'test-token' })
        });

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                spreadsheetId: 'new-sheet-id',
                spreadsheetUrl: 'http://sheets/new-sheet-id',
                properties: { title: 'New Sheet' }
            })
        });

        const result = await sheetsAction({
            action: 'create',
            title: 'New Sheet'
        });

        expect(result.success).toBe(true);
        expect(result.data.spreadsheetId).toBe('new-sheet-id');
    });
});
