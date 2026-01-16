
import { RolePermissionService } from '@/server/services/letta/role-permissions';
import { CustomerAgentManager } from '@/server/services/letta/customer-agent-manager';

// Mock dependencies
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockFirestore = { collection: mockCollection };

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({ firestore: mockFirestore }))
}));

// Mock client cleanly to avoid API Key checks at top-level
jest.mock('@/server/services/letta/client', () => ({
    LettaAgent: class {},
    lettaClient: {
        listAgents: jest.fn(),
        createAgent: jest.fn(),
        createBlock: jest.fn(),
        sendMessage: jest.fn(),
        getCoreMemory: jest.fn()
    }
}));

jest.mock('@/server/services/letta/customer-agent-manager', () => ({
    CustomerAgentManager: jest.fn(),
}));

jest.mock('@/server/agents/deebo', () => ({
    deebo: { checkContent: jest.fn() }
}));

jest.mock('@/server/services/vector-search/rag-service', () => ({
    ragService: { search: jest.fn() }
}));

jest.mock('@/lib/email/mailjet', () => ({
    sendGenericEmail: jest.fn()
}));

describe('RolePermissionService', () => {
    let service: RolePermissionService;
    let mockAgentManager: any;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new RolePermissionService();
        
        // Mock the prototype of CustomerAgentManager to intercept calls
        mockAgentManager = {
            getCustomerAgent: jest.fn().mockResolvedValue({ id: 'agent-123', name: 'Mrs. Parker' })
        };
        // @ts-ignore
        CustomerAgentManager.prototype.getCustomerAgent = mockAgentManager.getCustomerAgent;
    });

    describe('getMrsParkerForRole', () => {
        const userId = 'user-123';
        const customerId = 'cust-456';

        it('should allow Super User to access any customer agent (ignoring tenant)', async () => {
            // Mock customer data exists but belongs to a different tenant
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({ tenantId: 'tenant-others', name: 'Customer A' })
            });

            // Super user with a totally different tenant context shouldn't matter
            const agent = await service.getMrsParkerForRole(userId, 'super_user', 'tenant-my-own', customerId);

            expect(agent).toBeDefined();
            expect(mockGet).toHaveBeenCalled(); // Should fetch customer data
            expect(mockAgentManager.getCustomerAgent).toHaveBeenCalledWith(customerId, expect.any(Object));
        });

        it('should allow Brand users to access their OWN customers', async () => {
            const myTenantId = 'tenant-brand-1';
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({ tenantId: myTenantId, name: 'My Customer' })
            });

            const agent = await service.getMrsParkerForRole(userId, 'brand', myTenantId, customerId);

            expect(agent).toBeDefined();
            expect(mockAgentManager.getCustomerAgent).toHaveBeenCalled();
        });

        it('should DENY Brand users access to OTHER tenants customers', async () => {
            const myTenantId = 'tenant-brand-1';
            mockGet.mockResolvedValue({
                exists: true,
                data: () => ({ tenantId: 'tenant-competitor', name: 'Comp Customer' })
            });

            await expect(service.getMrsParkerForRole(userId, 'brand', myTenantId, customerId))
                .rejects
                .toThrow(/Unauthorized/);
            
            expect(mockAgentManager.getCustomerAgent).not.toHaveBeenCalled();
        });

        it('should throw if customer does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });

            await expect(service.getMrsParkerForRole(userId, 'brand', 't1', customerId))
                .rejects
                .toThrow(/Customer(.*)not found/);
        });

        it('should throw on invalid roles', async () => {
            // @ts-ignore
            await expect(service.getMrsParkerForRole(userId, 'hacker', 't1', 'c1'))
                .rejects
                .toThrow(/Invalid role/);
        });
    });
});
