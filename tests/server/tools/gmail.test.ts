import { gmailAction, GmailParams, GmailResult } from '@/server/tools/gmail';
import { getAdminFirestore } from '@/firebase/admin';

// Mock dependencies
jest.mock('server-only', () => ({}));
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Gmail Tool (gmailAction)', () => {
    const mockFirestore = {
        collection: jest.fn()
    };
    const mockDoc = {
        get: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
        mockFirestore.collection.mockReturnValue({ doc: jest.fn().mockReturnValue(mockDoc) });
    });

    describe('Authentication', () => {
        it('should return error if no access token is stored', async () => {
            mockDoc.get.mockResolvedValue({ data: () => null });

            const result = await gmailAction({ action: 'list' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Authentication required');
        });
    });

    describe('list action', () => {
        beforeEach(() => {
            mockDoc.get.mockResolvedValue({
                data: () => ({ accessToken: 'valid-token' })
            });
        });

        it('should list messages with query', async () => {
            mockFetch
                // First call: list messages
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        messages: [{ id: 'msg1' }, { id: 'msg2' }]
                    })
                })
                // Second and third calls: get message details
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        snippet: 'Hello...',
                        payload: { headers: [
                            { name: 'Subject', value: 'Test Subject' },
                            { name: 'From', value: 'sender@test.com' }
                        ]}
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({
                        snippet: 'Another...',
                        payload: { headers: [
                            { name: 'Subject', value: 'Subject 2' },
                            { name: 'From', value: 'other@test.com' }
                        ]}
                    })
                });

            const result = await gmailAction({ action: 'list', query: 'is:unread' });

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toEqual(expect.objectContaining({
                id: 'msg1',
                subject: 'Test Subject',
                from: 'sender@test.com'
            }));
        });

        it('should handle empty message list', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ messages: [] })
            });

            const result = await gmailAction({ action: 'list' });

            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
        });
    });

    describe('read action', () => {
        beforeEach(() => {
            mockDoc.get.mockResolvedValue({
                data: () => ({ accessToken: 'valid-token' })
            });
        });

        it('should return error if messageId is missing', async () => {
            const result = await gmailAction({ action: 'read' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing messageId');
        });

        it('should read message and decode body', async () => {
            const bodyText = 'Hello, this is the email body';
            const base64Body = Buffer.from(bodyText).toString('base64');

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    id: 'msg123',
                    snippet: 'Hello...',
                    payload: {
                        body: { data: base64Body }
                    }
                })
            });

            const result = await gmailAction({ action: 'read', messageId: 'msg123' });

            expect(result.success).toBe(true);
            expect(result.data.id).toBe('msg123');
            expect(result.data.body).toBe(bodyText);
        });
    });

    describe('send action', () => {
        beforeEach(() => {
            mockDoc.get.mockResolvedValue({
                data: () => ({ accessToken: 'valid-token' })
            });
        });

        it('should return error if to, subject, or body is missing', async () => {
            const result = await gmailAction({ action: 'send', to: 'test@test.com' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Missing to, subject, or body');
        });

        it('should send email successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 'sent-msg-123', threadId: 'thread-456' })
            });

            const result = await gmailAction({
                action: 'send',
                to: 'recipient@test.com',
                subject: 'Test Subject',
                body: 'Test body content'
            });

            expect(result.success).toBe(true);
            expect(result.data.id).toBe('sent-msg-123');
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/messages/send'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('raw')
                })
            );
        });
    });

    describe('Error handling', () => {
        it('should handle unknown action', async () => {
            mockDoc.get.mockResolvedValue({
                data: () => ({ accessToken: 'valid-token' })
            });

            const result = await gmailAction({ action: 'unknown' as any });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unknown action');
        });

        it('should handle API errors', async () => {
            mockDoc.get.mockResolvedValue({
                data: () => ({ accessToken: 'valid-token' })
            });
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Unauthorized'
            });

            const result = await gmailAction({ action: 'list' });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Gmail API error');
        });
    });
});
