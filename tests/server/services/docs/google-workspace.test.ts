
import { googleWorkspaceService } from '@/server/services/docs/google-workspace';

// Mock googleapis
jest.mock('googleapis', () => ({
    google: {
        auth: {
            GoogleAuth: jest.fn().mockImplementation(() => ({
                getClient: jest.fn().mockResolvedValue({})
            }))
        },
        docs: jest.fn().mockReturnValue({
            documents: {
                create: jest.fn().mockResolvedValue({ data: { documentId: 'doc_123', title: 'Test Doc' } }),
                batchUpdate: jest.fn().mockResolvedValue({})
            }
        }),
        sheets: jest.fn().mockReturnValue({
            spreadsheets: {
                values: {
                    get: jest.fn().mockResolvedValue({ data: { values: [['Col1', 'Col2'], ['Val1', 'Val2']] } }),
                    append: jest.fn().mockResolvedValue({ data: { updates: { updatedRange: 'Sheet1!A3', updatedRows: 1 } } })
                }
            }
        })
    }
}));

describe('GoogleWorkspaceService', () => {
    it('should create a document', async () => {
        const res = await googleWorkspaceService.createDoc('Test Doc', 'Content');
        expect(res.id).toBe('doc_123');
        expect(res.title).toBe('Test Doc');
    });

    it('should read from a sheet', async () => {
        const res = await googleWorkspaceService.readSheet('sheet_id', 'A1:B2');
        expect(res.values).toHaveLength(2);
        expect(res.values[0][0]).toBe('Col1');
    });

    it('should append to a sheet', async () => {
        const res = await googleWorkspaceService.appendToSheet('sheet_id', 'A1', [['NewVal']]);
        expect(res.updatedRows).toBe(1);
    });
});
