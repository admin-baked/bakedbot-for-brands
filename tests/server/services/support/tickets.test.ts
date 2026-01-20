
import { supportService } from '@/server/services/support/tickets';
import { createServerClient } from '@/firebase/server-client';

// Mock Firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
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
        expect(mockFirestore.collection).toHaveBeenCalledWith('support_tickets');
        expect(mockDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            description: 'Test issue',
            source: 'felisha',
            status: 'open',
            metadata: { severity: 'high' }
        }));
        expect(ticket.id).toBeDefined();
        expect(ticket.status).toBe('open');
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
                data: () => mockTicketData
            }]
        });

        const tickets = await supportService.getOpenTickets();

        expect(mockFirestore.collection).toHaveBeenCalledWith('support_tickets');
        expect(mockCollection.where).toHaveBeenCalledWith('status', 'in', ['open', 'investigating']);
        expect(tickets.length).toBe(1);
        expect(tickets[0].id).toBe('ticket-123');
    });
});
