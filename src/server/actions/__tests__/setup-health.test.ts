/**
 * Unit tests for Setup Health server actions
 */

import { getSetupHealth } from '../setup-health';
import type { UserRole } from '@/types/agent-workspace';

// Mock the Gmail token storage
jest.mock('@/server/integrations/gmail/token-storage', () => ({
    getGmailToken: jest.fn()
}));

const { getGmailToken } = require('@/server/integrations/gmail/token-storage');

describe('getSetupHealth', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return setup health for brand role', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('user123', 'brand');
        
        expect(result).toHaveProperty('dataConnected');
        expect(result).toHaveProperty('publishingLive');
        expect(result).toHaveProperty('complianceReady');
        expect(result).toHaveProperty('deliveryChannels');
    });

    it('should return setup health for dispensary role', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('user456', 'dispensary');
        
        expect(result.dataConnected.status).toBe('red');
        expect(result.publishingLive.status).toBe('red');
    });

    it('should return setup health for owner role', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('owner123', 'owner');
        
        expect(result).toHaveProperty('dataConnected');
        expect(result).toHaveProperty('publishingLive');
    });

    it('should return setup health for customer role', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('customer123', 'customer');
        
        // Customer role should still get health status
        expect(result).toHaveProperty('dataConnected');
        expect(result.deliveryChannels.status).toBe('red');
    });

    it('should detect Gmail connection', async () => {
        getGmailToken.mockResolvedValue({ access_token: 'token123' });
        
        const result = await getSetupHealth('user123', 'brand');
        
        expect(result.deliveryChannels.status).toBe('yellow'); // Gmail but no SMS
        expect(result.deliveryChannels.message).toContain('Gmail');
    });

    it('should handle errors gracefully', async () => {
        getGmailToken.mockRejectedValue(new Error('Token error'));
        
        const result = await getSetupHealth('user123', 'brand');
        
        // Should return red statuses on error
        expect(result.dataConnected.status).toBe('red');
        expect(result.deliveryChannels.status).toBe('red');
    });

    it('should return correct action strings', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('user123', 'brand');
        
        expect(result.dataConnected.action).toBe('connect_brand_data');
        expect(result.publishingLive.action).toBe('create_first_page');
        expect(result.deliveryChannels.action).toBe('connect_gmail');
    });
});

describe('checkDataConnection', () => {
    it('should return red status for brand with no data', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('brand123', 'brand');
        
        expect(result.dataConnected.status).toBe('red');
        expect(result.dataConnected.message).toContain('No brand data');
    });

    it('should return red status for dispensary with no data', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('disp123', 'dispensary');
        
        expect(result.dataConnected.status).toBe('red');
        expect(result.dataConnected.message).toContain('No menu data');
    });
});

describe('checkPublishingStatus', () => {
    it('should return red status when no pages published', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('user123', 'brand');
        
        expect(result.publishingLive.status).toBe('red');
        expect(result.publishingLive.message).toContain('No pages created');
    });
});

describe('checkDeliveryChannels', () => {
    it('should return red when no channels connected', async () => {
        getGmailToken.mockResolvedValue(null);
        
        const result = await getSetupHealth('user123', 'brand');
        
        expect(result.deliveryChannels.status).toBe('red');
        expect(result.deliveryChannels.message).toContain('No delivery channels');
    });

    it('should handle token retrieval errors', async () => {
        getGmailToken.mockRejectedValue(new Error('Network error'));
        
        const result = await getSetupHealth('user123', 'brand');
        
        expect(result.deliveryChannels.status).toBe('red');
        expect(result.deliveryChannels.message).toContain('Unable to verify');
    });
});
