import { supportService } from '@/server/services/support/tickets';
import { createServerClient } from '@/firebase/server-client';

// Mock Firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-123')
}));

describe('Support Service', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;

    beforeEach(() => {
        // Setup Firestore Mocks
        mockDoc = {
            set: jest.fn().mockResolvedValue({}),
            get: jest.fn(),
            update: jest.fn()
        };

        mockCollection = {
            doc: jest.fn().mockReturnValue(mockDoc),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn()
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue(mockCollection)
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should create a support ticket', async () => {
        const ticket = await supportService.createTicket('Test issue', 'felisha', { severity: 'high' });

        expect(createServerClient).toHaveBeenCalled();
        expect(mockFirestore.collection).toHaveBeenCalledWith('tickets');
        expect(mockCollection.doc).toHaveBeenCalledWith('mock-uuid-123');
        expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            id: 'mock-uuid-123',
            description: 'Test issue',
            source: 'felisha',
            status: 'open',
            metadata: { severity: 'high' }
        }));
        expect(ticket.id).toBeDefined();
        expect(ticket.id).toBe('mock-uuid-123');
        expect(ticket.status).toBe('open');
        expect(ticket.createdAt).toBeInstanceOf(Date);
    });

    it('should retrieve open support tickets', async () => {
        const mockTicketData = {
            id: 'ticket-123',
            description: 'Test issue',
            status: 'open',
            createdAt: { toDate: () => new Date() }
        };

        mockCollection.get.mockResolvedValue({
            docs: [{
                data: () => mockTicketData,
                id: 'ticket-123'
            }]
        });

        const tickets = await supportService.getOpenTickets();

        expect(mockFirestore.collection).toHaveBeenCalledWith('tickets');
        expect(mockCollection.where).toHaveBeenCalledWith('status', 'in', ['new', 'open', 'investigating']);
        expect(mockCollection.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
        expect(mockCollection.limit).toHaveBeenCalledWith(10);
        expect(tickets.length).toBe(1);
        expect(tickets[0].id).toBe('ticket-123');
        expect(tickets[0].createdAt).toBeInstanceOf(Date);
    });
});
