
import { saveIntegrationConfig } from '@/app/dashboard/integrations/actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { grantPermission } from '@/server/services/permissions';

// Hoistable mocks
jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth');
jest.mock('@/server/services/permissions');

describe('saveIntegrationConfig', () => {
    let mockSet: jest.Mock;
    let mockUpdate: jest.Mock;
    let mockGet: jest.Mock;
    let mockDoc: jest.Mock;
    let mockCollection: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSet = jest.fn();
        mockUpdate = jest.fn();
        mockGet = jest.fn();
        
        const mockDocObj = {
            set: mockSet,
            update: mockUpdate,
            get: mockGet
        };
        mockDoc = jest.fn().mockReturnValue(mockDocObj);
        
        mockCollection = jest.fn().mockReturnValue({
            doc: mockDoc,
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: mockGet
        });

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection
            }
        });

        (grantPermission as jest.Mock).mockResolvedValue(true);
    });

    it('should save config to locations and legacy dispensary path', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ 
            uid: 'user_123', 
            locationId: 'loc_999',
            role: 'dispensary' 
        });

        const config = { storeId: '555', apiKey: 'secret' };
        await saveIntegrationConfig('dutchie', config);

        // Verify Location update
        expect(mockCollection).toHaveBeenCalledWith('locations');
        expect(mockDoc).toHaveBeenCalledWith('loc_999');
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            posConfig: expect.objectContaining({
                provider: 'dutchie',
                storeId: '555',
                status: 'active'
            })
        }));

        // Verify Legacy update
        expect(mockCollection).toHaveBeenCalledWith('dispensaries');
        expect(mockDoc).toHaveBeenCalledWith('user_123');
        expect(mockSet).toHaveBeenCalled();
    });

    it('should resolve location from orgId if not on user profile', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ 
            uid: 'user_123', 
            orgId: 'org_ABC',
            role: 'dispensary'
        });

        // Mock query for location (first call to get return from where().limit().get())
        // wait, I mocked `get` on the chain.
        // where().limit().get() 
        mockGet.mockResolvedValueOnce({
            empty: false,
            docs: [{ id: 'loc_from_org' }]
        });

        const config = { storeId: '777' };
        await saveIntegrationConfig('jane', config);

        expect(mockDoc).toHaveBeenCalledWith('loc_from_org');
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            posConfig: expect.objectContaining({ provider: 'jane' })
        }));
    });
});
