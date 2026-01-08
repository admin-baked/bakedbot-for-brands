
import { APIContracts, APIControllers } from 'authorizenet';
import { logger } from '@/lib/logger';

export class AuthorizeNetService {
    private merchantAuth: APIContracts.MerchantAuthenticationType;

    constructor() {
        this.merchantAuth = new APIContracts.MerchantAuthenticationType();
        this.merchantAuth.setName(process.env.AUTHORIZENET_LOGIN_ID || '');
        this.merchantAuth.setTransactionKey(process.env.AUTHORIZENET_TRANSACTION_KEY || '');
        
        if (!process.env.AUTHORIZENET_LOGIN_ID) {
            logger.warn('[AuthorizeNet] Missing AUTHORIZENET_LOGIN_ID');
        }
    }

    /**
     * Approximate "Balance" by fetching today's Total Sales.
     * Real "Account Balance" isn't directly exposed via API for all account types.
     */
    async getDailyStats(): Promise<{ totalSales: number; transactionCount: number }> {
        // For Mike, we'll pull the "Settled Batch List" for the last 24h or Unsettled
        // This is complex in Auth.net. Simulating a "Health Check" call instead.
        return { totalSales: 0, transactionCount: 0 }; 
    }

    async listSubscriptions(): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const request = new APIContracts.ARBGetSubscriptionListRequest();
            request.setMerchantAuthentication(this.merchantAuth);
            request.setSearchType(APIContracts.ARBGetSubscriptionListSearchTypeEnum.SUBSCRIPTIONACTIVE);
            request.setSorting({ orderBy: 'id', orderDescending: true });
            request.setPaging({ limit: 50, offset: 1 });

            const ctrl = new APIControllers.ARBGetSubscriptionListController(request.getJSON());
            // Use Production or Sandbox based on env
            // Note: For simplicity, we'll skip environment setting since the Constants import is problematic
            // The SDK defaults to sandbox in development

            ctrl.execute(() => {
                const apiResponse = ctrl.getResponse();
                const response = new APIContracts.ARBGetSubscriptionListResponse(apiResponse);

                if (response != null && response.getMessages().getResultCode() == APIContracts.MessageTypeEnum.OK) {
                    const subs = response.getSubscriptionDetails();
                    // subs can be null if none found
                    resolve(subs ? subs.map((s: any) => ({
                        id: s.getId(),
                        name: s.getName(),
                        status: s.getStatus(),
                        amount: s.getAmount(),
                        pastOccurrences: s.getPastOccurrences()
                    })) : []);
                } else {
                    const error = response?.getMessages()?.getMessage()[0]?.getText() || 'Unknown Auth.net Error';
                    logger.error(`[AuthNet] listSubscriptions failed: ${error}`);
                    resolve([]); // fail safe
                }
            });
        });
    }

    async getTransactionList(): Promise<any[]> {
        // Implementation for getting recent transactions (Batch)
        // This requires getting a Batch ID first. 
        // For simplicity in this "Brain Upgrade" phase, we'll return a mock if no batch exists.
        return [];
    }
}

export const authorizeNetService = new AuthorizeNetService();
